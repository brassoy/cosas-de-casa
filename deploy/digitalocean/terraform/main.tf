###############################################################################
# Clave SSH del administrador
###############################################################################

resource "digitalocean_ssh_key" "admin" {
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
# Volumen de datos persistentes
#
# Se crea preformateado en ext4 para que el bootstrap solo tenga que montarlo.
# Aloja TODO lo que debe sobrevivir a un rebuild del droplet: la base Postgres de
# Supabase, los objetos de Storage (fotos de tareas y avatares), los datos/certs
# de Caddy y el secrets.env con las contraseñas y el JWT_SECRET generados una vez.
###############################################################################

resource "digitalocean_volume" "data" {
  name                    = var.volume_name
  region                  = var.region
  size                    = var.volume_size_gb
  initial_filesystem_type = "ext4"
  description             = "Cosas de Casa: datos persistentes (Postgres, Storage, Caddy, secretos)"
}

###############################################################################
# Droplet
###############################################################################

resource "digitalocean_droplet" "cosasdecasa" {
  name       = var.droplet_name
  image      = var.droplet_image
  size       = var.droplet_size
  region     = var.region
  vpc_uuid   = digitalocean_vpc.cosasdecasa.id
  ssh_keys   = [digitalocean_ssh_key.admin.id]
  volume_ids = [digitalocean_volume.data.id]
  monitoring = true

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    app_domain = var.app_domain
    acme_email = var.acme_email
    git_repo   = var.git_repo
    git_branch = var.git_branch
    # trimspace + "\n": garantiza EXACTAMENTE un salto de línea final. OpenSSH
    # rechaza la clave sin newline ("error in libcrypto"), y `$(cat ...)` en bash
    # se come el newline al exportar TF_VAR_git_deploy_private_key.
    git_deploy_key = "${trimspace(var.git_deploy_private_key)}\n"
    data_device    = "/dev/disk/by-id/scsi-0DO_Volume_${var.volume_name}"
  })

  # OJO: user_data es ForceNew. Cambiar el cloud-init o cualquier var inyectada
  # (app_domain, acme_email, git_branch...) recrea el droplet en el próximo apply.
  # Es barato y seguro: el block volume de datos y la reserved IP persisten, y los
  # secretos viven en /mnt/cosasdecasa-data/secrets.env (volumen), que el bootstrap
  # reutiliza — así el JWT_SECRET, las keys derivadas y la contraseña de Postgres
  # no cambian al recrear (re-firmar las keys invalidaría las sesiones existentes).
}

###############################################################################
# IP reservada (estable aunque recrees el droplet)
###############################################################################

resource "digitalocean_reserved_ip" "cosasdecasa" {
  region = var.region
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
