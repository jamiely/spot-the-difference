#!/bin/bash
# Script to remove old JS test files after TypeScript conversion

# Change to the correct directory
cd "$(dirname "$0")/.."

# Remove the old JavaScript test files
rm -f tests/SpriteBounds.test.js
rm -f tests/SpriteCleanup.test.js  
rm -f tests/SpriteObscuration.test.js
rm -f tests/SpritePositioning.test.js
rm -f tests/TemplateManager.test.js
rm -f tests/UnifiedLevelNumbering.test.js

echo "Old JavaScript test files removed successfully"

# Show the remaining test files
echo "Remaining TypeScript test files:"
ls tests/*.ts | wc -l
echo "Remaining JavaScript test files:"
ls tests/*.js 2>/dev/null | wc -l || echo "0"