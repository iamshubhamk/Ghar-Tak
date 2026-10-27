#!/bin/sh
# SessionStart hook: print OPEN / IN PROGRESS / breaking counts for every inbox.
# POSIX sh + awk only, so it runs in Git Bash on Windows and on macOS/Linux.

dir="${CLAUDE_PROJECT_DIR:-.}/.coordination/inbox"

echo "GharTak inboxes (run /sync to see your items):"
for ws in backend mobile web release qa-monitoring; do
  file="$dir/$ws.md"
  if [ ! -f "$file" ]; then
    printf '  %-14s (missing inbox file)\n' "$ws"
    continue
  fi
  awk -v ws="$ws" '
    /^## \[/ { cur = ""; if ($0 ~ /^## \[OPEN\]/) { open++; cur = "open" } else if ($0 ~ /^## \[IN PROGRESS\]/) { prog++ } }
    cur == "open" && /Priority:[ ]*breaking/ { breaking++; cur = "" }
    END {
      line = sprintf("  %-14s %d open, %d in progress", ws, open, prog)
      if (breaking > 0) line = line sprintf("  <-- %d BREAKING", breaking)
      print line
    }
  ' "$file"
done
exit 0
