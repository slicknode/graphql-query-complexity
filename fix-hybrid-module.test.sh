cat >dist/test/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

cat >dist/test/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF
