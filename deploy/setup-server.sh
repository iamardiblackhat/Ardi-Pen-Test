#!/usr/bin/env bash
#
# Prepare a fresh Debian 12 VM to run Ardi. Run ON THE SERVER as root.
#
# Installs: Node 24, PostgreSQL, Caddy, nmap, nuclei.
# Creates:  a non-login `ardi` service user, /opt/ardi, /var/lib/ardi.
#
# Idempotent — safe to re-run after a failure or to pick up changes.

set -euo pipefail

APP_USER="ardi"
APP_DIR="/opt/ardi"
DATA_DIR="/var/lib/ardi"
DB_NAME="ardi"
DB_USER="ardi"
NODE_MAJOR="24"

[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash setup-server.sh" >&2; exit 1; }

log() { printf '\n==> %s\n' "$1"; }

log "Updating package lists"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release git unzip ufw

log "Installing Node ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
corepack enable
node -v

log "Installing PostgreSQL"
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable --now postgresql

log "Installing scanner tooling (nmap, nuclei)"
apt-get install -y -qq nmap
if ! command -v nuclei >/dev/null 2>&1; then
  ARCH=$(dpkg --print-architecture)
  case "$ARCH" in
    amd64) NUCLEI_ARCH="linux_amd64" ;;
    arm64) NUCLEI_ARCH="linux_arm64" ;;
    *) echo "Unsupported architecture for nuclei: $ARCH" >&2; exit 1 ;;
  esac
  NUCLEI_VERSION="3.11.0"
  TMP=$(mktemp -d)
  curl -fsSL -o "$TMP/nuclei.zip" \
    "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_${NUCLEI_ARCH}.zip"
  unzip -q -o "$TMP/nuclei.zip" -d "$TMP"
  install -m 0755 "$TMP/nuclei" /usr/local/bin/nuclei
  rm -rf "$TMP"
fi
nmap --version | head -1
nuclei -version 2>&1 | head -1

log "Installing Caddy (TLS termination + reverse proxy)"
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
fi

log "Creating service user '${APP_USER}'"
# No login shell, no home-dir login: if the API is ever compromised, the
# attacker lands on an account that cannot log in interactively.
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home-dir "$DATA_DIR" "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR" "$DATA_DIR/reports" "$DATA_DIR/nuclei-templates"
chown -R "$APP_USER:$APP_USER" "$DATA_DIR"

log "Creating the database"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  DB_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 32)
  sudo -u postgres psql -qc "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
  sudo -u postgres psql -qc "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  echo "$DB_PASSWORD" > "$DATA_DIR/.db_password"
  chmod 600 "$DATA_DIR/.db_password"
  chown "$APP_USER:$APP_USER" "$DATA_DIR/.db_password"
  echo "    Database password written to ${DATA_DIR}/.db_password"
else
  echo "    Role '${DB_USER}' already exists — leaving the password alone."
fi

log "Fetching nuclei templates"
sudo -u "$APP_USER" nuclei -update-templates -templates-directory "$DATA_DIR/nuclei-templates" >/dev/null 2>&1 || \
  echo "    Template fetch failed — run it manually later, scans will not work without it."

log "Configuring the firewall"
# Caddy is the only public entry point. Postgres stays bound to localhost and
# is never exposed; the API is reached through Caddy, not directly.
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp   >/dev/null
ufw allow 80/tcp   >/dev/null
ufw allow 443/tcp  >/dev/null
ufw --force enable >/dev/null
ufw status verbose

cat <<'NEXT'

==> Base setup complete.

Remaining steps:

  1. Deploy the application code to /opt/ardi (git clone or rsync), then:
       cd /opt/ardi && pnpm install --frozen-lockfile && pnpm run build

  2. Create /opt/ardi/.env from deploy/.env.example. At minimum set:
       DATABASE_URL   (use the password in /var/lib/ardi/.db_password)
       JWT_SECRET     (generate: openssl rand -base64 48)
       ANTHROPIC_API_KEY  (for ARDI, the assistant)

  3. Push the database schema:
       cd /opt/ardi && pnpm --filter @workspace/db run push

  4. Install the services:
       cp deploy/ardi-api.service /etc/systemd/system/
       cp deploy/Caddyfile /etc/caddy/Caddyfile
       # edit /etc/caddy/Caddyfile and replace ardi.example.com with your domain
       systemctl daemon-reload
       systemctl enable --now ardi-api
       systemctl reload caddy

  5. Verify:
       curl -s localhost:8080/api/healthz
       systemctl status ardi-api --no-pager

Caddy obtains and renews TLS certificates automatically once DNS points here.

NEXT
