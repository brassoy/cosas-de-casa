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

variable "droplet_image" {
  type        = string
  description = "Imagen base del droplet. Ubuntu 24.04; el cloud-init instala Docker encima."
  default     = "ubuntu-24-04-x64"
}

variable "droplet_size" {
  type        = string
  description = "Tamaño del droplet. La pila completa (API NestJS + Supabase self-hosted: Postgres+Kong+GoTrue+PostgREST+Realtime+Storage+imgproxy+postgres-meta + el build de la web con Vite) pide 8GB de RAM como suelo sano. El build de la web y de la imagen de la API son hambrientos: con menos RAM el OOM killer puede matar el primer deploy a mitad (hay 2G de swap, pero no sustituye a la RAM)."
  default     = "s-4vcpu-8gb"
}

variable "droplet_name" {
  type        = string
  description = "Nombre del droplet."
  default     = "cosasdecasa-prod"
}

###############################################################################
# Block storage (datos que DEBEN persistir)
###############################################################################

variable "volume_name" {
  type        = string
  description = "Nombre del volumen de bloque. Determina el device path /dev/disk/by-id/scsi-0DO_Volume_<volume_name> que monta el bootstrap."
  default     = "cosasdecasa-data"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,63}$", var.volume_name))
    error_message = "volume_name debe ser minúsculas alfanuméricas + guiones, empezar por letra y máx 64 chars (si no, el device path no coincide con el que crea DO)."
  }
}

variable "volume_size_gb" {
  type        = number
  description = "Tamaño del volumen de datos en GB. Aloja la base Postgres de Supabase, los objetos de Storage (fotos de tareas y avatares), los datos de Caddy y los secretos generados en el primer boot."
  default     = 50
}

###############################################################################
# Dominio / DNS
#
# Cosas de Casa NO necesita un subdominio aparte para Realtime: Supabase Realtime
# viaja por Kong (el gateway) en el MISMO dominio, bajo la ruta /realtime/*. Por
# eso aquí solo hay un host (app_domain), a diferencia de HADARA que separaba el
# subdominio ws. para los websockets de Reverb.
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
  description = "Nombre con el que se registra la clave SSH en DigitalOcean."
  default     = "cosasdecasa-admin"
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
