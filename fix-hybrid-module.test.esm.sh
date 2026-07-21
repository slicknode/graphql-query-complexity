cat >dist/test/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

# No import specifiers need rewriting: every graphql import resolves through
# the bare "graphql" package root (see fix-hybrid-module.sh for details).
