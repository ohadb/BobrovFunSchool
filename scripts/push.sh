#!/bin/bash
set -e

DASHBOARD="src/app/dashboard/page.tsx"

# Get current build number
CURRENT=$(grep -o 'build #[0-9]*' "$DASHBOARD" | grep -o '[0-9]*')
NEXT=$((CURRENT + 1))

# Update build number
sed -i '' "s/build #$CURRENT/build #$NEXT/" "$DASHBOARD"

echo "Build #$CURRENT → #$NEXT"

git add -A
git commit -m "Release build #$NEXT"
git push origin main
