#!/usr/bin/env bash
# release-beta.sh — Publie une version beta (prerelease) du paquet npm sans
# jamais committer de changement de version sur main.
#
# Les "vraies" releases (bump de version, CHANGELOG, tag git, GitHub Release,
# publication npm sur le tag "latest") sont automatisées côté GitHub Actions
# via release-please (voir .github/workflows/release-please.yml). Ce script
# ne doit servir qu'à publier des versions de test (tag npm "beta").
#
# Usage : pnpm release:beta
set -euo pipefail

PKG_NAME=$(node -p "require('./package.json').name")
BASE_VERSION=$(node -p "require('./package.json').version.split('-')[0]")

# Sécurité : on ne veut jamais partir d'un package.json déjà modifié, sinon
# le `git checkout` de fin de script effacerait un travail non commité.
if [[ -n "$(git status --porcelain -- package.json package-lock.json 2>/dev/null)" ]]; then
  echo "❌ package.json (ou package-lock.json) contient des changements non commités." >&2
  echo "   Commit/stash-les avant de publier une beta." >&2
  exit 1
fi

echo "==> Vérification (typecheck + tests) avant publication beta"
pnpm typecheck
pnpm test

echo "==> Recherche de la dernière beta publiée pour ${PKG_NAME}"
LATEST_BETA=$(npm view "${PKG_NAME}" dist-tags.beta 2>/dev/null || echo "")

if [[ -n "$LATEST_BETA" && "$LATEST_BETA" == "${BASE_VERSION}-beta."* ]]; then
  LAST_N="${LATEST_BETA##*.}"
  NEXT_N=$((LAST_N + 1))
else
  NEXT_N=0
fi

BETA_VERSION="${BASE_VERSION}-beta.${NEXT_N}"

echo "==> Publication de ${PKG_NAME}@${BETA_VERSION} (dist-tag: beta)"
npm version "${BETA_VERSION}" --no-git-tag-version --allow-same-version
npm publish --tag beta --access public

# On revient à la version committée : le numéro de version "officiel" reste
# la responsabilité de release-please sur GitHub, jamais de ce script.
git checkout -- package.json package-lock.json 2>/dev/null || true

echo ""
echo "✅ ${PKG_NAME}@${BETA_VERSION} publié sur npm (tag beta)"
echo "   Installation : npm install ${PKG_NAME}@beta"
