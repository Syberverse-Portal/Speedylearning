#!/usr/bin/env bash
# Publishes Speedy Learning to Cloudflare Pages and connects www.speedylearning.co.uk.
# Needs CLOUDFLARE_API_TOKEN (Pages: Edit, DNS: Edit) and CLOUDFLARE_ACCOUNT_ID in the environment.
set -euo pipefail
: "${CLOUDFLARE_API_TOKEN:?Add CLOUDFLARE_API_TOKEN to the environment}"
: "${CLOUDFLARE_ACCOUNT_ID:?Add CLOUDFLARE_ACCOUNT_ID to the environment}"
PROJECT=speedylearning
API=https://api.cloudflare.com/client/v4
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")
rm -rf dist && mkdir -p dist && cp index.html dist/index.html
curl -sS "${AUTH[@]}" -X POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" -d "{\"name\":\"$PROJECT\",\"production_branch\":\"main\"}" >/dev/null || true
npx --yes wrangler@3 pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true
for d in www.speedylearning.co.uk speedylearning.co.uk; do
  curl -sS "${AUTH[@]}" -X POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains" -d "{\"name\":\"$d\"}" | head -c 300; echo
done
echo "Done: https://www.speedylearning.co.uk (may take a few minutes to go live)"
