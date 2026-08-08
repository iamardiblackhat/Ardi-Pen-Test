#!/usr/bin/env bash
#
# Create the Google Compute Engine VM that hosts Ardi in production.
#
# Run this from your Mac. It creates cloud resources that cost money — it will
# print the plan and require confirmation before doing anything billable.
#
# Nothing about the running platform depends on the machine you run this from.
# Once the VM is up it serves clients whether your laptop is on or not.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
INSTANCE_NAME="${INSTANCE_NAME:-ardi-platform}"
# London. Keeps UK clients' security findings inside the UK, which avoids an
# international-transfer problem under UK GDPR before it can exist.
REGION="${REGION:-europe-west2}"
ZONE="${ZONE:-europe-west2-c}"
# 2 vCPU / 4GB. Postgres + the API + a scan worker. e2-small (2GB) works to
# start, but nuclei is memory-hungry once template count grows.
MACHINE_TYPE="${MACHINE_TYPE:-e2-medium}"
DISK_SIZE="${DISK_SIZE:-30GB}"
IMAGE_FAMILY="${IMAGE_FAMILY:-debian-12}"
IMAGE_PROJECT="${IMAGE_PROJECT:-debian-cloud}"

die() { printf '\nError: %s\n' "$1" >&2; exit 1; }

command -v gcloud >/dev/null 2>&1 || die "gcloud CLI not found. Install the Google Cloud SDK first."

if [[ -z "$PROJECT_ID" ]]; then
  die "PROJECT_ID is not set.

Usage:
  PROJECT_ID=your-project-id ./deploy/provision-vm.sh

List your projects with:  gcloud projects list"
fi

cat <<PLAN

  Ardi production VM — plan
  ─────────────────────────────────────────────
  Project        ${PROJECT_ID}
  Instance       ${INSTANCE_NAME}
  Zone           ${ZONE}  (${REGION})
  Machine        ${MACHINE_TYPE}
  Disk           ${DISK_SIZE} pd-balanced
  Image          ${IMAGE_FAMILY}
  Firewall       tcp:80, tcp:443 from 0.0.0.0/0  (tagged: ardi-web)

  This creates billable resources. Rough cost: GBP 12-25/month.

  NOTE: this VM is for the PLATFORM (API, database, frontend).
  Run the scan worker in a SEPARATE project — outbound scanning can
  trigger an abuse complaint, and Google suspends the whole project,
  not just the VM. Separate projects means an abuse report takes the
  scanner offline and leaves your clients' dashboards running.

PLAN

read -r -p "Create these resources? [y/N] " reply
[[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "Aborted. Nothing was created."; exit 0; }

echo "==> Enabling the Compute Engine API (no-op if already enabled)"
gcloud services enable compute.googleapis.com --project "$PROJECT_ID"

if gcloud compute instances describe "$INSTANCE_NAME" \
     --project "$PROJECT_ID" --zone "$ZONE" >/dev/null 2>&1; then
  echo "==> Instance '${INSTANCE_NAME}' already exists — leaving it alone."
else
  echo "==> Creating instance"
  gcloud compute instances create "$INSTANCE_NAME" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE_TYPE" \
    --image-family "$IMAGE_FAMILY" \
    --image-project "$IMAGE_PROJECT" \
    --boot-disk-size "$DISK_SIZE" \
    --boot-disk-type pd-balanced \
    --tags ardi-web \
    --scopes=logging-write,monitoring-write \
    --metadata=enable-oslogin=TRUE
fi

# Least privilege: HTTP/HTTPS only. SSH goes through IAP rather than a public
# port 22, so the box has no internet-facing SSH to brute force.
for rule in "allow-ardi-web:tcp:80,tcp:443:0.0.0.0/0" \
            "allow-ardi-iap-ssh:tcp:22:35.235.240.0/20"; do
  IFS=':' read -r name proto1 proto2 source <<<"$rule"
  if gcloud compute firewall-rules describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "==> Firewall rule '${name}' already exists"
  else
    echo "==> Creating firewall rule '${name}'"
    gcloud compute firewall-rules create "$name" \
      --project "$PROJECT_ID" \
      --allow "${proto1}${proto2:+,$proto2}" \
      --source-ranges "$source" \
      --target-tags ardi-web \
      --description "Ardi platform: ${name}"
  fi
done

IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
      --project "$PROJECT_ID" --zone "$ZONE" \
      --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

cat <<NEXT

  Done. The VM is running and will keep running independently of this machine.

  External IP   ${IP}
  SSH           gcloud compute ssh ${INSTANCE_NAME} --project ${PROJECT_ID} --zone ${ZONE} --tunnel-through-iap

  Next:
    1. Point your DNS A record at ${IP}
    2. Copy the setup script over and run it:
         gcloud compute scp deploy/setup-server.sh ${INSTANCE_NAME}: \\
           --project ${PROJECT_ID} --zone ${ZONE} --tunnel-through-iap
         gcloud compute ssh ${INSTANCE_NAME} --project ${PROJECT_ID} --zone ${ZONE} \\
           --tunnel-through-iap --command 'sudo bash setup-server.sh'

NEXT
