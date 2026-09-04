#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <public-hostname>" >&2
  exit 1
fi

public_hostname="$1"
install_root="/opt/ardi-opencti"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

cat > /etc/sysctl.d/90-ardi-opencti.conf <<EOF
vm.max_map_count=1048575
EOF
sysctl --system >/dev/null

install -d -m 0750 "$install_root"
if [[ ! -f "$install_root/.env" ]]; then
  umask 077
  admin_password="$(openssl rand -base64 36 | tr -d '\n')"
  admin_token="$(cat /proc/sys/kernel/random/uuid)"
  health_key="$(openssl rand -hex 32)"
  encryption_key="$(openssl rand -base64 32 | tr -d '\n')"
  minio_password="$(openssl rand -hex 32)"
  rabbitmq_password="$(openssl rand -base64 32 | tr -d '\n')"

  cat > "$install_root/.env" <<EOF
COMPOSE_PROJECT_NAME=ardi-intelligence
OPENCTI_VERSION=7.260904.0
OPENCTI_HOST=$public_hostname
OPENCTI_PUBLIC_URL=https://$public_hostname
OPENCTI_ADMIN_EMAIL=security-admin@ardi-sec.local
OPENCTI_ADMIN_PASSWORD=$admin_password
OPENCTI_ADMIN_TOKEN=$admin_token
OPENCTI_HEALTHCHECK_ACCESS_KEY=$health_key
OPENCTI_ENCRYPTION_KEY=$encryption_key
ELASTIC_MEMORY_SIZE=8G
MINIO_ROOT_USER=ardi-intelligence
MINIO_ROOT_PASSWORD=$minio_password
RABBITMQ_DEFAULT_USER=ardi-intelligence
RABBITMQ_DEFAULT_PASS=$rabbitmq_password
CONNECTOR_OPENCTI_ID=dd010812-9027-4726-bf7b-4936979955ae
CONNECTOR_MITRE_ID=8307ea1e-9356-408c-a510-2d7f8b28a0e2
EOF

  cat > /root/ardi-opencti-credentials <<EOF
OPENCTI_PUBLIC_URL=https://$public_hostname
OPENCTI_ADMIN_EMAIL=security-admin@ardi-sec.local
OPENCTI_ADMIN_PASSWORD=$admin_password
OPENCTI_ADMIN_TOKEN=$admin_token
EOF
  chmod 0600 "$install_root/.env" /root/ardi-opencti-credentials
fi

cd "$install_root"
docker compose pull
docker compose up -d --scale worker=3
