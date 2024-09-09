cat >dist/test/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

file_path="dist/test/esm/QueryComplexity.js"
find_path="dist/test/esm"

# Detect the operating system and use the appropriate sed command
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed)
  sed -i '' 's/from '\''graphql\/execution\/values'\'';/from '\''graphql\/execution\/values.mjs'\'';/' "$file_path"
  find "$find_path" -type f -name "*.js" -exec sed -i '' 's/from '\''graphql'\'';/from '\''graphql\/index.mjs'\'';/' {} +
else
  # Linux (GNU sed)
  sed -i 's/from '\''graphql\/execution\/values'\'';/from '\''graphql\/execution\/values.mjs'\'';/' "$file_path"
  find "$find_path" -type f -name "*.js" -exec sed -i 's/from '\''graphql'\'';/from '\''graphql\/index.mjs'\'';/' {} +
fi
