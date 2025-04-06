#!/bin/bash

# Create package.json for CommonJS
cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

# Define the file paths
cjs_file_path="dist/cjs/QueryComplexity.js"
esm_file_path="dist/esm/QueryComplexity.js"
find_path="dist/esm"

# Detect the operating system and use the appropriate sed command
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed)
  sed -i '' 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "$cjs_file_path"
else
  # Linux (GNU sed)
  sed -i 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "$cjs_file_path"
fi

# Create package.json for ES modules
cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

# Detect the operating system and use the appropriate sed command
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed)
  sed -i '' 's/from '\''graphql\/execution\/values'\'';/from '\''graphql\/execution\/values.mjs'\'';/' "$esm_file_path"
  find "$find_path" -type f -name "*.js" -exec sed -i '' 's/from '\''graphql'\'';/from '\''graphql\/index.mjs'\'';/' {} +
else
  # Linux (GNU sed)
  sed -i 's/from '\''graphql\/execution\/values'\'';/from '\''graphql\/execution\/values.mjs'\'';/' "$esm_file_path"
  find "$find_path" -type f -name "*.js" -exec sed -i 's/from '\''graphql'\'';/from '\''graphql\/index.mjs'\'';/' {} +
fi