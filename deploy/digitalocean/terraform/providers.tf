terraform {
  required_version = ">= 1.6.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.43"
    }
  }

  # Recomendado para producción: guarda el state en un backend remoto cifrado
  # (DO Spaces es compatible con el backend S3). El state contiene el user_data
  # del droplet, que incluye la deploy key del repo — NO lo dejes en local sin
  # cifrar ni lo subas a git. Descomenta y rellena cuando tengas el bucket:
  #
  # backend "s3" {
  #   endpoints                   = { s3 = "https://fra1.digitaloceanspaces.com" }
  #   region                      = "us-east-1"   # ignorado por Spaces, pero requerido
  #   bucket                      = "cosasdecasa-tfstate"
  #   key                         = "digitalocean/cosasdecasa.tfstate"
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   use_path_style              = false
  # }
}

provider "digitalocean" {
  token = var.do_token
}
