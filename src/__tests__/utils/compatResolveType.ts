import { GraphQLType } from 'graphql';

import graphqlPackage from 'graphql/package.json';
import semver from 'semver';

/**
 * GraphQL v16 changed how types are resolved, so we need to return a string
 * for the type name for newer version, and the type itself to be compatible with older versions.
 *
 * @param type
 * @returns
 */
export function compatResolveType(type: GraphQLType): any {
  if (semver.gte(graphqlPackage.version, '16.0.0')) {
    return () => type.toString();
  } else {
    return () => type;
  }
}
