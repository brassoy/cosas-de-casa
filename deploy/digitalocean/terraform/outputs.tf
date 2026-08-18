output "reserved_ip" {
  description = "IP pública estable. Es la que apunta el DNS: migrar de droplet es reasignar ESTA ip, no tocar registros."
  value       = digitalocean_reserved_ip.cosasdecasa.ip_address
}

output "droplet_ipv4" {
  description = "IP directa del droplet (para SSH: ssh root@<ip>)."
  value       = digitalocean_droplet.cosasdecasa.ipv4_address
}

output "droplet_id" {
  description = "ID del droplet. Lo necesitas para reasignar la reserved IP a mano durante una migración: doctl compute reserved-ip-action assign <ip> <id>."
  value       = digitalocean_droplet.cosasdecasa.id
}

output "app_url" {
  description = "URL pública de la PWA una vez que Caddy emita el TLS."
  value       = "https://${var.app_domain}"
}

output "monthly_cost_estimate" {
  description = "Coste mensual aproximado de la infraestructura declarada aquí."
  value = format(
    "droplet %s + backups %s ≈ $%.2f/mes (sin block volume ni registro; la reserved IP no cuesta mientras esté asignada)",
    var.droplet_size,
    var.enable_backups ? "ON" : "OFF",
    (var.droplet_size == "s-1vcpu-1gb" ? 6 : var.droplet_size == "s-1vcpu-2gb" ? 12 : var.droplet_size == "s-2vcpu-4gb" ? 24 : 6) * (var.enable_backups ? 1.2 : 1.0)
  )
}

output "dns_nameservers_hint" {
  description = "Si manage_dns=true, apunta los nameservers de tu dominio a estos antes de que Caddy pueda emitir el cert."
  value       = var.manage_dns ? "ns1.digitalocean.com, ns2.digitalocean.com, ns3.digitalocean.com" : "manage_dns=false → crea el A record a mano apuntando a la reserved IP"
}

output "next_steps" {
  description = "Qué hacer tras el apply."
  value       = <<-EOT
    El droplet YA NO COMPILA ni baja de ningún registro. Tras este apply la pila
    NO arranca sola: hay que cargarle las imágenes desde tu máquina.

    1. Sigue el bootstrap (~2-3 min: prepara la máquina y espera las imágenes):
         ssh root@${digitalocean_droplet.cosasdecasa.ipv4_address} 'tail -f /var/log/cosasdecasa-bootstrap.log'
    2. Carga las imágenes y levanta la pila desde tu máquina:
         deploy/digitalocean/stack/deploy-from-local.sh ${digitalocean_droplet.cosasdecasa.ipv4_address}
    3. Si vienes de otro droplet, MIGRA LOS DATOS ANTES de mover la IP:
         deploy/digitalocean/stack/migrate-to-new-droplet.sh <ip-vieja> ${digitalocean_droplet.cosasdecasa.ipv4_address}
    4. Reasigna la reserved IP cuando el nuevo responda:
         doctl compute reserved-ip-action assign ${digitalocean_reserved_ip.cosasdecasa.ip_address} ${digitalocean_droplet.cosasdecasa.id}
    5. Comprueba que el DNS de ${var.app_domain} resuelve a ${digitalocean_reserved_ip.cosasdecasa.ip_address}.
    6. Vigila la RAM los primeros días — el margen en 1 GB es real pero no es holgado:
         ssh root@${digitalocean_reserved_ip.cosasdecasa.ip_address} 'free -m; docker stats --no-stream'
  EOT
}
