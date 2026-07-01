#!/usr/bin/env bash
# issues-enrich.sh — Liste les issues GitHub non raffinées et génère les prompts d'enrichissement ADE
# Usage : ./scripts/issues-enrich.sh [--repo <owner/repo>]
set -euo pipefail

REPO="${GITHUB_REPO:-dokor/ai-delivery-engine}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    *) echo "Usage: $0 [--repo <owner/repo>]" && exit 1 ;;
  esac
done

echo "🔍 Issues ouvertes de $REPO (non raffinées)..."
echo ""

# Lister les issues sans label backlog-refined, ready-for-dev, in-progress
ISSUES=$(gh issue list --repo "$REPO" \
  --state open \
  --json number,title,labels \
  --limit 50 2>/dev/null)

COUNT=$(echo "$ISSUES" | jq '[.[] | select(.labels | map(.name) | (contains(["backlog-refined"]) or contains(["ready-for-dev"]) or contains(["in-progress"])) | not)] | length')

if [[ "$COUNT" -eq 0 ]]; then
  echo "✅ Toutes les issues sont déjà raffinées."
  exit 0
fi

echo "📋 $COUNT issue(s) à enrichir :"
echo ""
echo "$ISSUES" | jq -r '.[] | select(.labels | map(.name) | (contains(["backlog-refined"]) or contains(["ready-for-dev"]) or contains(["in-progress"])) | not) | "  #\(.number) — \(.title)"'
echo ""
echo "👉 Dis à Claude Code :"
echo "   \"Parcours ces issues GitHub ($REPO) et améliore leurs descriptions.\""
echo "   \"Utilise les templates ADE dans templates/ et applique le workflow 1 de CLAUDE.md.\""
