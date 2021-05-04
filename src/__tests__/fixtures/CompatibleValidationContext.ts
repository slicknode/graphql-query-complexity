import { GraphQLError, TypeInfo, ValidationContext } from 'graphql';
import { GraphQLSchema } from 'graphql/type/schema';
import { DocumentNode } from 'graphql/language/ast';

/**
 * This class is used to test that validation errors are raised correctly
 *
 * A compatibility layer is necessary to support graphql versions since 15.0.0
 * *as well as* versions prior to 14.5.0 with the same test, because older
 * versions of `ValidationContext` only expose a `getErrors` API and newer
 * versions only expose the `onError` API via a fourth constructor argument.
 *
 * Once we drop support for versions older than 14.5.0 this layer will no
 * longer be necessary and tests may use `ValidationContext` directly using the
 * `onError` API.
 */
export class CompatibleValidationContext extends ValidationContext {
  private errors: GraphQLError[] = [];

  constructor(schema: GraphQLSchema, ast: DocumentNode, typeInfo: TypeInfo) {
    super(schema, ast, typeInfo, (err) => this.errors.push(err));
  }

  getErrors(): ReadonlyArray<GraphQLError> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return super.getErrors ? super.getErrors() : this.errors;
  }
}
