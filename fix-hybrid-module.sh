cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

sed -i '' 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "dist/cjs/QueryComplexity.js"

cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

sed -i '' 's/from '\''graphql\/execution\/values'\'';/from '\''graphql\/execution\/values.mjs'\'';/' "dist/esm/QueryComplexity.js"

# We need to update from 'graphql' to 'graphql/index.mjs' in all files in dist/esm to ensure the GraphQL module is loaded from the same realm
find dist/esm -type f -name "*.js" -exec sed -i '' 's/from '\''graphql'\'';/from '\''graphql\/index.mjs'\'';/' {} +
