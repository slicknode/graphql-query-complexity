cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

sed -i '' "s/require(\"graphql\/execution\/values\")/require(\"graphql\/execution\/values.js\")/" "dist/cjs/QueryComplexity.js"

cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

sed -i '' "s/from 'graphql\/execution\/values';/from 'graphql\/execution\/values.mjs';/" "dist/esm/QueryComplexity.js"
