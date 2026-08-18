###############################################################################
# Clave SSH del administrador
###############################################################################

# Se crea SOLO si no pasas admin_ssh_fingerprint. Si tu clave ya está registrada en
# la cuenta DO (p. ej. la compartes con otro proyecto), DO rechaza volver a subirla
# ("SSH Key is already in use"): en ese caso pon su fingerprint en admin_ssh_fingerprint
# y el droplet la referencia sin recrearla.
resource "digitalocean_ssh_key" "admin" {
  count      = var.admin_ssh_fingerprint == "" ? 1 : 0
  name       = var.admin_ssh_key_name
  public_key = var.admin_ssh_pubkey
}

###############################################################################
# Red privada
###############################################################################

resource "digitalocean_vpc" "cosasdecasa" {
  name   = "cosasdecasa-vpc"
  region = var.region
}

###############################################################################
# Droplet
#
# SIN BLOCK VOLUME (right-sizing 2026-08).
#
# Antes había un `digitalocean_volume` de 50 GB montado en /mnt/cosasdecasa-data.
# Se eliminó porque la medición en producción dio 77 MB de datos reales — un
# 0,15 % de ocupación por $5/mes. Ahora ese MISMO path es un directorio normal
# del disco de arranque, así que ni el compose ni los scripts cambiaron de ruta.
#
# CONSECUENCIA QUE NO PUEDES IGNORAR:
#   Con el volumen, destruir el droplet era barato: los datos sobrevivían fuera.
#   Ahora Postgres, Storage, los certs de Caddy y `secrets.env` viven EN el disco
#   de arranque. Destruir el droplet = destruir la base de datos.
#   Por eso abajo hay un bloque `lifecycle` con prevent_destroy, y por eso
#   `enable_backups` viene en true por defecto.
###############################################################################

resource "digitalocean_droplet" "cosasdecasa" {
  name       = var.droplet_name
  image      = var.droplet_image
  size       = var.droplet_size
  region     = var.region
  vpc_uuid   = digitalocean_vpc.cosasdecasa.id
  ssh_keys   = [var.admin_ssh_fingerprint != "" ? var.admin_ssh_fingerprint : digitalocean_ssh_key.admin[0].id]
  monitoring = true

  # Backups semanales gestionados por DO (+20 % ≈ $1.20/mes sobre el plan de $6).
  # Cubren el disco de arranque ENTERO, que ahora es donde vive el dato. Con el
  # volumen fuera de escena, esta es la única red de seguridad automática.
  backups = var.enable_backups

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    app_domain = var.app_domain
    acme_email = var.acme_email
    git_repo   = var.git_repo
    git_branch = var.git_branch
    # trimspace + "\n": garantiza EXACTAMENTE un salto de línea final. OpenSSH
    # rechaza la clave sin newline ("error in libcrypto"), y `$(cat ...)` en bash
    # se come el newline al exportar TF_VAR_git_deploy_private_key.
    git_deploy_key = "${trimspace(var.git_deploy_private_key)}\n"

    # Clave pública de CI para el auto-deploy (vacía = sin auto-deploy).
    ci_deploy_pubkey = trimspace(var.ci_deploy_pubkey)
  })

  lifecycle {
    # `user_data` es ForceNew en el provider: cualquier cambio en el cloud-init
    # (o en app_domain, git_branch, el tag de imagen...) recrearía el droplet y,
    # sin volumen, se llevaría la base de datos por delante.
    #
    # Lo ignoramos a propósito: el cloud-init SOLO importa en el primer arranque.
    # A partir de ahí quien despliega es redeploy.sh (docker pull + up), no el
    # cloud-init. Si de verdad necesitas re-bootstrapear, entra por SSH y lanza
    # bootstrap.sh a mano — es idempotente y respeta los secretos existentes.
    ignore_changes = [user_data]

    # Red de seguridad final: que `terraform destroy` o un plan con reemplazo
    # falle RUIDOSAMENTE en vez de borrar el dato en silencio. Para retirar el
    # droplet de verdad (p. ej. tras migrar a otro), quita esta línea de forma
    # consciente, o sácalo del state con `terraform state rm`.
    prevent_destroy = true
  }
}

###############################################################################
# IP reservada (estable aunque recrees el droplet)
#
# Esta es la pieza que hace la migración TRANSPARENTE: el DNS apunta aquí, no a
# la IP del droplet. Cambiar de máquina es reasignar esta IP — segundos de corte,
# sin tocar DNS ni esperar TTL.
###############################################################################

resource "digitalocean_reserved_ip" "cosasdecasa" {
  region = var.region

  lifecycle {
    # Perder la reserved IP significa perder la dirección que tiene el DNS
    # (y, con Cloudflare de por medio, un rato de NXDOMAIN hasta rehacerlo).
    prevent_destroy = true
  }
}

resource "digitalocean_reserved_ip_assignment" "cosasdecasa" {
  ip_address = digitalocean_reserved_ip.cosasdecasa.ip_address
  droplet_id = digitalocean_droplet.cosasdecasa.id
}

###############################################################################
# Firewall: solo SSH (restringible), HTTP y HTTPS entrantes.
# El resto de servicios (Postgres, Kong, GoTrue, PostgREST, Realtime, Storage,
# imgproxy, postgres-meta y la propia API NestJS) NO publican puertos al host en
# el compose de producción: viven en la red docker interna. Solo Caddy expone
# 80/443.
###############################################################################

resource "digitalocean_firewall" "cosasdecasa" {
  name        = "cosasdecasa-fw"
  droplet_ids = [digitalocean_droplet.cosasdecasa.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = [var.ssh_allowed_cidr]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # ICMP (ping) — útil para diagnóstico.
  inbound_rule {
    protocol         = "icmp"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Salida sin restricción (clonar repo, pull de imágenes, MiniMax/IA cloud, Web Push...).
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

###############################################################################
# DNS (opcional — solo si manage_dns = true y los NS del dominio están en DO)
###############################################################################

resource "digitalocean_domain" "cosasdecasa" {
  count = var.manage_dns ? 1 : 0
  name  = var.app_domain
}

resource "digitalocean_record" "app" {
  count  = var.manage_dns ? 1 : 0
  domain = digitalocean_domain.cosasdecasa[0].id
  type   = "A"
  name   = "@"
  value  = digitalocean_reserved_ip.cosasdecasa.ip_address
  ttl    = 300
}
