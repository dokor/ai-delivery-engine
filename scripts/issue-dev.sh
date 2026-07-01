#!/usr/bin/env bash
# issue-dev.sh — Prépare le développement d'une issue GitHub avec ADE
# Usage : ./scripts/issue-dev.sh <issue-number> [--repo <owner/repo>]
set -euo pipefail

ISSUE_NUMBER="${1:?Usage: $0 <issue-number> [--repo <owner/repo>]}"
REPO="${GITHUB_REPO:-dokor/ai-delivery-engine}"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    *) echo "Unknown option: $1" && exit 1 ;;
  esac
done

echo "📋 Lecture de l'issue #$ISSUE_NUMBER sur $REPO..."
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json number,title,body,labels,url)
TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | cut -c1-40)
BRANCH="feat/issue-${ISSUE_NUMBER}-${SLUG}"

echo "📌 Issue : $TITLE"
echo "🌿 Branche : $BRANCH"
echo ""

# Créer la branche si elle n'existe pas déjà
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "ℹ️  Branche existante, checkout..."
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
  echo "✅ Branche créée."
fi

# Marquer l'issue in-progress
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "in-progress" 2>/dev/null || true
echo "🏷️  Label 'in-progress' ajouté à l'issue."

# Sauvegarder l'issue en Markdown pour les prompts spécialistes
ISSUE_FILE="/tmp/issue-${ISSUE_NUMBER}-impl.md"
cat > "$ISSUE_FILE" << ISSUEEOF
# Issue #${ISSUE_NUMBER}: $TITLE

$(echo "$ISSUE_JSON" | jq -r '.body // "(aucune description)"')

---

URL: $(echo "$ISSUE_JSON" | jq -r '.url')
Labels: $(echo "$ISSUE_JSON" | jq -r '[.labels[].name] | join(", ")')
ISSUEEOF

echo "💾 Issue sauvegardée dans $ISSUE_FILE"
echo ""

# Générer les prompts spécialistes
echo "🧠 Génération des prompts spécialistes ADE..."
OUTPUTS_DIR="outputs/issue-${ISSUE_NUMBER}"
mkdir -p "$OUTPUTS_DIR"

for ROLE in tech-lead security qa; do
  node --experimental-strip-types src/promptSpecialist.ts "$ROLE" "$ISSUE_FILE" "$OUTPUTS_DIR" 2>/dev/null \
    && echo "   ✓ $ROLE" \
    || echo "   ⚠️  $ROLE (template non trouvé, continuer)"
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "🚀 Prêt. Dis à Claude Code :"
echo ""
echo "   \"Développe l'issue #${ISSUE_NUMBER} ($TITLE)."
echo "    Utilise la branche $BRANCH déjà créée."
echo "    Applique le workflow 2 de CLAUDE.md."
echo "    Les prompts spécialistes sont dans $OUTPUTS_DIR/\""
echo "═══════════════════════════════════════════════════"
