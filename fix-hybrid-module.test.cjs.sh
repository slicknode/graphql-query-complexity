cat >dist/test/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

file_path="dist/test/cjs/QueryComplexity.js"

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed)
  sed -i '' 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "$file_path"
else
  # Linux (GNU sed)
  sed -i 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "$file_path"
fi