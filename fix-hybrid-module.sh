#!/bin/bash

# Create package.json for CommonJS
cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

# Create package.json for ES modules
cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

# No import specifiers need rewriting: every graphql import resolves through
# the bare "graphql" package root. Using a single specifier for both builds
# guarantees a single graphql instance per realm in every environment
# (bundler, native ESM, CommonJS) across all supported graphql versions.
# The deep "graphql/execution/values" import is no longer used because
# getVariableValues/getArgumentValues are root exports since graphql 16.6.
