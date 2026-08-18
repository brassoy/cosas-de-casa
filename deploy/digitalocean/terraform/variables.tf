###############################################################################
# Credenciales y región
###############################################################################

variable "do_token" {
  type        = string
  description = "DigitalOcean API token (con permiso de escritura). NO lo pongas en git: usa terraform.tfvars o la variable de entorno DIGITALOCEAN_TOKEN."
  sensitive   = true
}

variable "region" {
  type        = string
  description = "Región de DigitalOcean. fra1 (Frankfurt) es buena opción para una plataforma EU/España por latencia y RGPD."
  default     = "fra1"
}

###############################################################################
# Droplet
###############################################################################

variable "droplet_size" {
  type        = string
  description = <<-EOT
    Tamaño del droplet. `s-1vcpu-1gb` (1 vCPU / 1 GB / 25 GB) tras el
    right-sizing de 2026-08: la medición en producción dio 837 MB de RAM en los
    10 contenedores y 77 MB de datos reales, con la CPU al 93 % idle.

    ESTE TAMAÑO SOLO FUNCIONA CON LA PILA "SIN BUILDS":
      - Las imágenes se construyen en la máquina del desarrollador y se cargan
        aquí por SSH (deploy-from-local.sh). Compilar en el droplet (Vite +
        turbo + docker build del monorepo) NO cabe en 1 GB — moriría por OOM.
      - El compose fija `mem_limit` por servicio y la API arranca con
        `--max-old-space-size` (sin él Node acapara ~425 MB él solo, la mitad
        del presupuesto de la máquina).

    Si vuelves a construir en el droplet, sube como mínimo a `s-1vcpu-2gb`.
  EOT
  default     = "s-1vcpu-1gb"
}

variable "droplet_image" {
  type        = string
  description = "Imagen base del droplet. Ubuntu 24.04; el cloud-init instala Docker encima."
  default     = "ubuntu-24-04-x64"
}

variable "droplet_name" {
  type        = string
  description = "Nombre del droplet."
  default     = "cosasdecasa-prod"
}

variable "enable_backups" {
  type        = bool
  description = <<-EOT
    Backups gestionados por DigitalOcean (+20 % del coste del droplet: ~$1.20/mes
    sobre el plan de $6).

    RECOMENDADO EN TRUE, y aquí NO es opcional de verdad: al eliminar el block
    volume, los datos (Postgres, Storage, certs y `secrets.env`) viven en el
    DISCO DE ARRANQUE del droplet. Sin backups, destruir el droplet es destruir
    la base de datos. Antes había un volumen que sobrevivía al `ForceNew`; ahora
    la única red de seguridad es esta.
  EOT
  default     = true
}

###############################################################################
# Imágenes de contenedor
#
# El droplet NO construye y NO baja de ningún registro: las imágenes se le cargan
# por SSH desde la máquina del desarrollador con
# `deploy/digitalocean/stack/deploy-from-local.sh` (docker save | docker load).
# Por eso aquí no hay variables de registro ni credenciales que custodiar.
#
# Consecuencia operativa: tras un `terraform apply` que cree el droplet, la pila
# NO arranca sola. El bootstrap deja la máquina lista (Docker, directorios,
# secretos, .env) y se para a esperar las imágenes. Lánzalas con el script.
###############################################################################

###############################################################################
# Dominio / DNS
#
# Cosas de Casa NO necesita un subdominio aparte para Realtime: Supabase Realtime
# viaja por Kong (el gateway) en el MISMO dominio, bajo la ruta /realtime/*.
###############################################################################

variable "app_domain" {
  type        = string
  description = "Dominio principal de la PWA (p.ej. casa.tudominio.com). Caddy emite el cert TLS para este host. Sirve la web estática, la API (/api/*) y Supabase (/auth/*, /rest/*, /realtime/*, /storage/*) todo en el mismo origen."
}

variable "manage_dns" {
  type        = bool
  description = "Si true, Terraform crea la ZONA DNS de app_domain en DO y su A record. CUIDADO: exige delegar los nameservers de EXACTAMENTE app_domain a ns1/2/3.digitalocean.com — si app_domain es un subdominio (casa.tudominio.com) y solo delegaste la zona padre, los records NO resuelven y Caddy no consigue el cert. Para DNS en otro proveedor (Cloudflare…) o subdominios sin delegar, déjalo en false y crea a mano un A de app_domain apuntando a la reserved IP del output."
  default     = false
}

###############################################################################
# Acceso SSH
###############################################################################

variable "admin_ssh_pubkey" {
  type        = string
  description = "Clave pública SSH del administrador (contenido de ~/.ssh/id_ed25519.pub). Da acceso al droplet."
}

variable "admin_ssh_key_name" {
  type        = string
  description = "Nombre con el que se registra la clave SSH en DigitalOcean (solo si se crea)."
  default     = "cosasdecasa-admin"
}

variable "admin_ssh_fingerprint" {
  type        = string
  description = "Fingerprint MD5 de la clave SSH del admin si YA está registrada en la cuenta DO (la obtienes con `ssh-keygen -lf tu_clave.pub -E md5`). Si lo pones, Terraform NO intenta crear la clave (evita el error 'SSH Key is already in use') y la referencia por fingerprint. Vacío = crea la clave a partir de admin_ssh_pubkey."
  default     = ""
}

variable "ssh_allowed_cidr" {
  type        = string
  description = "CIDR autorizado a entrar por SSH (puerto 22). Restríngelo a tu IP fija si puedes; 0.0.0.0/0 deja SSH abierto al mundo."
  default     = "0.0.0.0/0"
}

variable "ci_deploy_pubkey" {
  type        = string
  description = "Clave PÚBLICA SSH dedicada al auto-deploy de CI (GitHub Actions). Si se define, el cloud-init la autoriza en el droplet (authorized_keys de root) para que el workflow entre por SSH. Genera el par con `ssh-keygen -t ed25519 -f cosasdecasa_ci -N \"\"`: pon aquí el .pub y el privado en el secret DEPLOY_SSH_KEY de GitHub. Vacío = sin auto-deploy."
  default     = ""
}

###############################################################################
# Origen del código (clone en el droplet)
#
# El droplet sigue clonando el repo, pero YA NO PARA COMPILAR: necesita el
# docker-compose.prod.yml, el Caddyfile, los scripts de despliegue y las
# migraciones SQL de Supabase (supabase/migrations/*.sql).
###############################################################################

variable "git_repo" {
  type        = string
  description = "URL del repositorio a clonar en el droplet."
  default     = "git@github.com:brassoy/cosas-de-casa.git"
}

variable "git_branch" {
  type        = string
  description = "Rama a desplegar."
  default     = "main"
}

variable "git_deploy_private_key" {
  type        = string
  description = "Clave privada SSH de tipo deploy key (read-only) del repo. OBLIGATORIA con el git_repo SSH por defecto (git@github.com:...): el clone falla sin ella. Solo puede ir vacía si cambias git_repo a una URL https:// pública."
  sensitive   = true
  default     = ""
}

###############################################################################
# TLS / Let's Encrypt
###############################################################################

variable "acme_email" {
  type        = string
  description = "Email para el registro ACME de Let's Encrypt (avisos de expiración de certs). Caddy lo usa para emitir el TLS."
}
