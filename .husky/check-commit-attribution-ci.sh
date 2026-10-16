#!/usr/bin/env bash
set -euo pipefail

# Rejects commits that co-sign an LLM assistant. A model is not an author: the
# PR author owns the content. Assistance is traced with an `Assisted-by:`
# trailer instead, so a commit can be traced back to the model that helped
# write it. See docs/DEVELOPMENT.md, section "Assistants LLM".

RANGE="${1:-${BASE_REF:-origin/main}..HEAD}"

# Deliberately narrow: only unambiguous assistant signatures. A loose pattern
# (a bare "ai", for instance) would flag real contributors by name.
ASSISTANT_PATTERN='claude|anthropic|copilot|chatgpt|openai|codex|gemini|cursor|windsurf|devin|aider'

if ! git rev-parse --verify --quiet "${RANGE%%..*}" > /dev/null; then
  echo "⚠️  Base revision '${RANGE%%..*}' is unreachable; fetch it before running this check."
  exit 1
fi

COMMITS=$(git rev-list "$RANGE")

if [[ -z "$COMMITS" ]]; then
  echo "✅  No commit to check in ${RANGE}."
  exit 0
fi

echo "🔍 Checking commit attribution in ${RANGE}:"

FAILED=0

while IFS= read -r sha; do
  CO_AUTHORS=$(git show --no-patch --format=%B "$sha" \
    | grep -iE '^[[:space:]]*co-authored-by:' || true)

  [[ -z "$CO_AUTHORS" ]] && continue

  OFFENDING=$(echo "$CO_AUTHORS" | grep -iE "$ASSISTANT_PATTERN" || true)

  [[ -z "$OFFENDING" ]] && continue

  echo "—> ${sha} $(git show --no-patch --format=%s "$sha")"
  echo "$OFFENDING" | sed 's/^[[:space:]]*/    /'
  FAILED=1
done <<< "$COMMITS"

if [[ "$FAILED" -eq 1 ]]; then
  cat <<'MSG'

❌  An LLM assistant must not be credited as a co-author.
    Drop the `Co-authored-by:` line and use an `Assisted-by:` trailer instead:

        Assisted-by: claude-opus-5

    Rewrite the offending commits (git rebase -i / git commit --amend), then force-push.
    See docs/DEVELOPMENT.md, section "Assistants LLM".
MSG
  exit 1
fi

echo "✅  No LLM co-author found."
