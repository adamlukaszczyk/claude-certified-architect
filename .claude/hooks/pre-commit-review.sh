#!/bin/sh
# pre-commit-review.sh - Run the git-diff-reviewer agent before committing

if git diff --cached --quiet; then
    echo "No staged changes to review. Skipping Claude Code Review."
    exit 0
fi

if ! command -v claude >/dev/null 2>&1; then
    echo "WARNING: claude CLI not found. Skipping code review."
    exit 0
fi

echo "Running Claude Code Review (git-diff-reviewer)..."
echo ""

echo "Review the staged changes before this commit." | claude \
    --agent git-diff-reviewer \
    --print \
    --allowedTools "Bash(git diff*),Bash(git log*),Bash(git status*),Read"

# Exit 0 — review is advisory; change to exit 1 to block on critical findings
exit 0
