cat >dist/test/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

sed -i '' 's/require("graphql\/execution\/values")/require("graphql\/execution\/values.js")/' "dist/test/cjs/QueryComplexity.js"
