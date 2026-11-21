#!/usr/bin/env bash
# CI standard: local checks.
#
# THIS FILE IS IDENTICAL IN EVERY REPO. The canonical copy is
# ci-standard/files/.github/ci/ci-local.sh in ethanmonlux/staple.
#
# Runs each command in .github/ci/local-checks.txt (one per line, from the
# repo root) and records the output against the current commit.
#
#   .github/ci/ci-local.sh            run the checks
#   .github/ci/ci-local.sh --attach   run them if needed, then post the output
#                                     as a comment on this branch's pull request
#
# A pull request cannot pass its ready run without that comment for its head
# commit (see .github/workflows/pr-ready.yml).
set -u

root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2
# Inside a git hook, git exports GIT_DIR and friends. Drop them so the checks
# (and any test that runs git in a scratch repo) behave as they do by hand.
unset $(git rev-parse --local-env-vars) 2>/dev/null || true
sha=$(git rev-parse HEAD)
store="$(cd "$(git rev-parse --git-common-dir)" && pwd)/ci-local"
mkdir -p "$store"
log="$store/$sha.log"
pass="$store/$sha.pass"
cmds=".github/ci/local-checks.txt"
attach=0
[ "${1:-}" = "--attach" ] && attach=1

if [ ! -f "$cmds" ]; then
  echo "ci-local: $cmds is missing" >&2
  exit 2
fi

dirty=0
git diff --quiet HEAD -- || dirty=1

if [ ! -f "$pass" ] || [ "$dirty" = 1 ]; then
  rm -f "$pass"
  {
    echo "local checks for $sha"
    echo "host $(hostname)  started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$log"
  failed=""
  while IFS= read -r cmd || [ -n "$cmd" ]; do
    cmd=${cmd%$'\r'}
    case "$cmd" in ''|'#'*) continue ;; esac
    echo "\$ $cmd" | tee -a "$log"
    bash -c "$cmd" </dev/null 2>&1 | tee -a "$log"
    code=${PIPESTATUS[0]}
    echo "[exit $code] $cmd" | tee -a "$log"
    if [ "$code" -ne 0 ]; then failed="$cmd"; break; fi
  done < "$cmds"
  if [ -n "$failed" ]; then
    echo "ci-local: FAILED at: $failed" | tee -a "$log" >&2
    exit 1
  fi
  if [ "$dirty" = 1 ]; then
    echo "ci-local: passed, but there are uncommitted changes, so nothing is recorded for $sha. Commit, then run again." >&2
    [ "$attach" = 1 ] && exit 1
    exit 0
  fi
  echo "result pass  finished $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"
  : > "$pass"
  echo "ci-local: passed for $sha"
else
  echo "ci-local: already passed for $sha"
fi

[ "$attach" = 1 ] || exit 0

pr=$(gh pr view --json number --jq .number 2>/dev/null) || pr=""
if [ -z "$pr" ]; then
  echo "ci-local: no pull request for this branch yet; open it as a draft, then run --attach again" >&2
  exit 1
fi
marker="<!-- local-checks sha=$sha result=pass -->"
if gh pr view "$pr" --json comments --jq '.comments[].body' | grep -qF -- "$marker"; then
  echo "ci-local: output already attached to #$pr for $sha"
  exit 0
fi
body=$(mktemp)
{
  echo "$marker"
  echo "**Local checks passed** for \`${sha:0:7}\` on $(hostname)."
  echo
  grep -E '^\[exit [0-9]+\] ' "$log" | sed 's/^/- `/; s/$/`/'
  echo
  echo "<details><summary>Output (last 60 lines)</summary>"
  echo
  echo '```text'
  tail -n 60 "$log" | cut -c1-300 | sed 's/```/` ` `/g'
  echo '```'
  echo
  echo "</details>"
} > "$body"
gh pr comment "$pr" --body-file "$body" >/dev/null && echo "ci-local: output attached to #$pr for $sha"
