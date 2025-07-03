#!/bin/bash
# Optimo_Prompt.Ai - Zero-Cost Deployment Script
set -euo pipefail

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Validate environment
validate_environment() {
  echo "Validating environment..."
  if ! command -v wrangler &> /dev/null; then
    echo "✗ Error: Wrangler CLI not found. Install with 'npm install -g wrangler'"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    echo "✗ Error: jq not found. Install with 'sudo apt-get install jq'"
    exit 1
  fi
  
  echo "✓ Environment validated"
}

# Configure Cloudflare Worker
configure_worker() {
  echo "Configuring Cloudflare Worker..."
  
  # Create wrangler.toml
  cat > "${WORKER_DIR}/wrangler.toml" <<EOL
name = "optimo-prompt-worker"
main = "worker.js"
compatibility_date = "$(date +'%Y-%m-%d')"
workers_dev = true
node_compat = true

kv_namespaces = [
  { binding = "KV", id = "${CF_NAMESPACE_ID}" }
]

[vars]
OPENROUTER_MODEL = "deepseek/deepseek-r1-0528:free"
FREE_TIER_LIMIT = "15"
PREMIUM_TIER_LIMIT = "100"
PREMIUM_PRODUCT_ID = "premium_monthly"
UNLIMITED_PRODUCT_ID = "unlimited_monthly"
ALLOWED_ORIGINS = "${ALLOWED_ORIGINS}"
BASE_URL = "${BASE_URL}"
CDN_URL = "${CDN_URL}"
CACHE_TTL = "3600"
EOL

  echo "✓ Worker configured"
}

# Deploy Cloudflare Worker
deploy_worker() {
  echo "Deploying Cloudflare Worker..."
  cd "${WORKER_DIR}"
  
  # Authenticate with Cloudflare
  wrangler login --ci
  
  # Deploy worker
  wrangler publish --env production
  
  WORKER_URL=$(wrangler info --env production | jq -r '.url')
  echo "✓ Worker deployed: ${WORKER_URL}"
}

# Deploy public assets
deploy_assets() {
  echo "Deploying public assets..."
  cd "${PUBLIC_DIR}"
  
  # Commit and push to GitHub
  git config --global user.name "Optimo Deploy Bot"
  git config --global user.email "deploy@optimo-prompt.ai"
  git add .
  git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M')" || true
  git push origin main
  
  echo "✓ Assets deployed to ${CDN_URL}"
}

# Configure GitHub Pages
configure_github_pages() {
  echo "Configuring GitHub Pages..."
  mkdir -p "${PROJECT_DIR}/docs"
  rsync -a --delete "${PUBLIC_DIR}/" "${PROJECT_DIR}/docs/"
  
  cd "${PROJECT_DIR}"
  git add docs/
  git commit -m "Update GitHub Pages: $(date +'%Y-%m-%d %H:%M')" || true
  git push origin main
  
  echo "✓ GitHub Pages configured"
}

# Main deployment flow
main() {
  validate_environment
  configure_worker
  deploy_worker
  deploy_assets
  configure_github_pages
  
  echo ""
  echo "🚀 Deployment successful!"
  echo "• Worker URL: ${WORKER_URL}"
  echo "• Website URL: ${BASE_URL}"
  echo "• CDN URL: ${CDN_URL}"
}

main