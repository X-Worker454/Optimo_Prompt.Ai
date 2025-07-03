#!/bin/bash
# Optimo_Prompt.Ai - Secret Rotation Script
set -euo pipefail

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Initialize
init() {
  BACKUP_DIR="${PROJECT_DIR}/backups/secrets/$(date +'%Y-%m-%d_%H-%M-%S')"
  mkdir -p "${BACKUP_DIR}"
  
  echo "Starting secret rotation: $(date)"
  echo "Backup directory: ${BACKUP_DIR}"
}

# Rotate encryption secret
rotate_encryption_secret() {
  echo "Rotating encryption secret..."
  
  # Get current secret
  OLD_SECRET=$(wrangler secret get ENCRYPTION_SECRET --env production)
  echo "Old secret: ${OLD_SECRET:0:4}...${OLD_SECRET: -4}"
  
  # Generate new secret
  NEW_SECRET=$(openssl rand -base64 32 | tr -d '\n')
  
  # Backup old secret
  echo "${OLD_SECRET}" > "${BACKUP_DIR}/encryption-secret.old"
  
  # Update secret
  echo "${NEW_SECRET}" | wrangler secret put ENCRYPTION_SECRET --env production
  
  echo "✓ Encryption secret rotated"
}

# Rotate API key
rotate_api_key() {
  local key_name=$1
  local generate_cmd=$2
  
  echo "Rotating ${key_name}..."
  
  # Get current key
  OLD_KEY=$(wrangler secret get "${key_name}" --env production)
  echo "Old key: ${OLD_KEY:0:4}...${OLD_KEY: -4}"
  
  # Generate new key
  NEW_KEY=$(eval "${generate_cmd}")
  
  # Backup old key
  echo "${OLD_KEY}" > "${BACKUP_DIR}/${key_name}.old"
  
  # Update key
  echo "${NEW_KEY}" | wrangler secret put "${key_name}" --env production
  
  echo "✓ ${key_name} rotated"
}

# Rotate webhook secret
rotate_webhook_secret() {
  local secret_name=$1
  
  echo "Rotating ${secret_name}..."
  
  # Get current secret
  OLD_SECRET=$(wrangler secret get "${secret_name}" --env production)
  echo "Old secret: ${OLD_SECRET:0:4}...${OLD_SECRET: -4}"
  
  # Generate new secret
  NEW_SECRET=$(openssl rand -hex 32)
  
  # Backup old secret
  echo "${OLD_SECRET}" > "${BACKUP_DIR}/${secret_name}.old"
  
  # Update secret
  echo "${NEW_SECRET}" | wrangler secret put "${secret_name}" --env production
  
  echo "✓ ${secret_name} rotated"
  
  # Notify about external updates
  if [[ "${secret_name}" == "PADDLE_WEBHOOK_SECRET" ]]; then
    echo ""
    echo "⚠️ ACTION REQUIRED: Update Paddle dashboard with new webhook secret"
    echo "New secret: ${NEW_SECRET}"
    echo ""
  fi
}

# Redeploy worker
redeploy_worker() {
  echo "Redeploying worker..."
  cd "${WORKER_DIR}"
  wrangler publish --env production
  echo "✓ Worker redeployed"
}

# Main rotation flow
main() {
  init
  
  # Rotate secrets
  rotate_encryption_secret
  rotate_api_key "OPENROUTER_API_KEY" "openssl rand -hex 24"
  rotate_api_key "DEEPSEEK_API_KEY" "openssl rand -hex 32"
  rotate_webhook_secret "PADDLE_WEBHOOK_SECRET"
  
  # Redeploy
  redeploy_worker
  
  # Security cleanup
  find "${BACKUP_DIR}" -type f -exec chmod 600 {} \;
  
  echo ""
  echo "🔑 Secret rotation complete!"
  echo "• Backups stored in: ${BACKUP_DIR}"
  echo "• Worker URL: $(wrangler info --env production | jq -r '.url')"
  echo "• Next steps: Update Paddle dashboard with new webhook secret"
}

main