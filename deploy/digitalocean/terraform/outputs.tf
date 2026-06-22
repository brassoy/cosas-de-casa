output "reserved_ip" {
  description = "IP pública estable. Apunta aquí el registro A si gestionas el DNS fuera de DO."
  value       = digitalocean_reserved_ip.cosasdecasa.ip_address
}

output "droplet_ipv4" {
  description = "IP directa del droplet (para SSH: ssh root@<ip>)."
  value       = digitalocean_droplet.cosasdecasa.ipv4_address
}

output "app_url" {
  description = "URL pública de la PWA una vez que Caddy emita el TLS."
  value       = "https://${var.app_domain}"
}

output "dns_nameservers_hint" {
  description = "Si manage_dns=true, apunta los nameservers de tu dominio a estos antes de que Caddy pueda emitir el cert."
  value       = var.manage_dns ? "ns1.digitalocean.com, ns2.digitalocean.com, ns3.digitalocean.com" : "manage_dns=false → crea el A record a mano apuntando a la reserved IP"
}

output "next_steps" {
  description = "Qué hacer tras el apply."
  value       = <<-EOT
    1. Espera a que termine el cloud-init (~10-20 min: se construyen las imágenes
       de Supabase + la API NestJS y se hace el build estático de la web con Vite).
       Sigue el log:  ssh root@${digitalocean_droplet.cosasdecasa.ipv4_address} 'tail -f /var/log/cosasdecasa-bootstrap.log'
    2. Verifica DNS: ${var.app_domain} debe resolver a ${digitalocean_reserved_ip.cosasdecasa.ip_address}.
    3. Abre https://${var.app_domain} (Caddy emite el TLS al primer acceso con DNS correcto).
    4. Post-deploy (ver README): restringe VITE_GOOGLE_MAPS_API_KEY por referrer HTTP,
       y revisa la nota sobre el JWT/JWKS de Supabase self-hosted (HS256 vs ES256).
  EOT
}
