/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  getArgumentValues,
  getDirectiveValues,
} from 'graphql/execution/values';

import {
  ValidationContext,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  DirectiveNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  assertCompositeType,
  GraphQLField, isCompositeType, GraphQLCompositeType, GraphQLFieldMap,
  GraphQLSchema, DocumentNode, TypeInfo,
  visit, visitWithTypeInfo,
  GraphQLDirective,
} from 'graphql';
import {
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  Kind,
  getNamedType,
  GraphQLError
} from 'graphql';

declare module 'graphql/type/definition' {
  export interface GraphQLField<TSource, TContext, TArgs = { [argName: string]: any }> {
    complexity?: Complexity;
  }
}

export type ComplexityEstimatorArgs = {
  type: GraphQLCompositeType,
  field: GraphQLField<any, any>,
  args: {[key: string]: any},
  childComplexity: number
}

export type ComplexityEstimator = (options: ComplexityEstimatorArgs) => number | void;

// Complexity can be anything that is supported by the configured estimators
export type Complexity = any;

export interface QueryComplexityOptions {
  // The maximum allowed query complexity, queries above this threshold will be rejected
  maximumComplexity: number,

  // The query variables. This is needed because the variables are not available
  // in the visitor of the graphql-js library
  variables?: Object,

  // specify operation name only when pass multi-operation documents
  operationName?: string,

  // Optional callback function to retrieve the determined query complexity
  // Will be invoked whether the query is rejected or not
  // This can be used for logging or to implement rate limiting
  onComplete?: (complexity: number) => void,

  // Optional function to create a custom error
  createError?: (max: number, actual: number) => GraphQLError,

  // An array of complexity estimators to use for estimating the complexity
  estimators: Array<ComplexityEstimator>;
}

function queryComplexityMessage(max: number, actual: number): string {
  return (
    `The query exceeds the maximum complexity of ${max}. ` +
    `Actual complexity is ${actual}`
  );
}

export function getComplexity(options: {
  estimators: ComplexityEstimator[],
  schema: GraphQLSchema,
  query: DocumentNode,
  variables?: Object,
  operationName?: string
}): number {
  const typeInfo = new TypeInfo(options.schema);

  const context = new ValidationContext(options.schema, options.query, typeInfo, () => null);
  const visitor = new QueryComplexity(context, {
    // Maximum complexity does not matter since we're only interested in the calculated complexity.
    maximumComplexity: Infinity,
    estimators: options.estimators,
    variables: options.variables,
    operationName: options.operationName
  });

  visit(options.query, visitWithTypeInfo(typeInfo, visitor));
  return visitor.complexity;
}

export default class QueryComplexity {
  context: ValidationContext;
  complexity: number;
  options: QueryComplexityOptions;
  OperationDefinition: Object;
  estimators: Array<ComplexityEstimator>;
  includeDirectiveDef: GraphQLDirective;
  skipDirectiveDef: GraphQLDirective;

  constructor(
    context: ValidationContext,
    options: QueryComplexityOptions
  ) {
    if (!(typeof options.maximumComplexity === 'number' && options.maximumComplexity > 0)) {
      throw new Error('Maximum query complexity must be a positive number');
    }

    this.context = context;
    this.complexity = 0;
    this.options = options;

    this.includeDirectiveDef = this.context.getSchema().getDirective('include');
    this.skipDirectiveDef = this.context.getSchema().getDirective('skip');
    this.estimators = options.estimators

    this.OperationDefinition = {
      enter: this.onOperationDefinitionEnter,
      leave: this.onOperationDefinitionLeave
    };
  }

  onOperationDefinitionEnter(operation: OperationDefinitionNode) {
    if (typeof this.options.operationName === 'string' && this.options.operationName !== operation.name.value) {
      return;
    }

    switch (operation.operation) {
      case 'query':
        this.complexity += this.nodeComplexity(
          operation,
          this.context.getSchema().getQueryType()
        );
        break;
      case 'mutation':
        this.complexity += this.nodeComplexity(
          operation,
          this.context.getSchema().getMutationType()
        );
        break;
      case 'subscription':
        this.complexity += this.nodeComplexity(
          operation,
          this.context.getSchema().getSubscriptionType()
        );
        break;
      default:
        throw new Error(`Query complexity could not be calculated for operation of type ${operation.operation}`);
    }
  }

  onOperationDefinitionLeave(operation: OperationDefinitionNode): GraphQLError | undefined {
    if (typeof this.options.operationName === 'string' && this.options.operationName !== operation.name.value) {
      return;
    }

    if (this.options.onComplete) {
      this.options.onComplete(this.complexity);
    }

    if (this.complexity > this.options.maximumComplexity) {
      return this.context.reportError(
        this.createError()
      );
    }
  }

  nodeComplexity(
    node: FieldNode | FragmentDefinitionNode | InlineFragmentNode | OperationDefinitionNode,
    typeDef: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
    complexity: number = 0
  ): number {
    if (node.selectionSet) {
      let fields:GraphQLFieldMap<any, any> = {};
      if (typeDef instanceof GraphQLObjectType || typeDef instanceof GraphQLInterfaceType) {
        fields = typeDef.getFields();
      }
      return complexity + node.selectionSet.selections.reduce(
        (total: number, childNode: FieldNode | FragmentSpreadNode | InlineFragmentNode) => {
          let nodeComplexity = 0;

          let includeNode = true;
          let skipNode = false;

          childNode.directives.forEach((directive: DirectiveNode) => {
            const directiveName = directive.name.value;
            switch (directiveName) {
              case 'include': {
                const values = getDirectiveValues(this.includeDirectiveDef, childNode, this.options.variables || {});
                includeNode = values.if;
                break;
              }
              case 'skip': {
                const values = getDirectiveValues(this.skipDirectiveDef, childNode, this.options.variables || {});
                skipNode = values.if;
                break;
              }
            }
          });

          if (!includeNode || skipNode) {
            return total;
          }

          switch (childNode.kind) {
            case Kind.FIELD: {
              const field = fields[childNode.name.value];
              // Invalid field, should be caught by other validation rules
              if (!field) {
                break;
              }
              const fieldType = getNamedType(field.type);

              // Get arguments
              let args: {[key: string]: any};
              try {
                args = getArgumentValues(field, childNode, this.options.variables || {});
              } catch (e) {
                return this.context.reportError(e);
              }

              // Check if we have child complexity
              let childComplexity = 0;
              if (isCompositeType(fieldType)) {
                childComplexity = this.nodeComplexity(childNode, fieldType);
              }

              // Run estimators one after another and return first valid complexity
              // score
              const estimatorArgs: ComplexityEstimatorArgs = {
                childComplexity,
                args,
                field,
                type: typeDef
              };
              const validScore = this.estimators.find(estimator => {
                const tmpComplexity = estimator(estimatorArgs);

                if (typeof tmpComplexity === 'number' && !isNaN(tmpComplexity)) {
                  nodeComplexity = tmpComplexity;
                  return true;
                }

                return false;
              });
              if (!validScore) {
                return this.context.reportError(
                  new GraphQLError(
                    `No complexity could be calculated for field ${typeDef.name}.${field.name}. ` +
                    'At least one complexity estimator has to return a complexity score.'
                  )
                );
              }
              break;
            }
            case Kind.FRAGMENT_SPREAD: {
              const fragment = this.context.getFragment(childNode.name.value);
              const fragmentType = assertCompositeType(
                this.context.getSchema().getType(fragment.typeCondition.name.value)
              );
              nodeComplexity = this.nodeComplexity(fragment, fragmentType);
              break;
            }
            case Kind.INLINE_FRAGMENT: {
              let inlineFragmentType = typeDef;
              if (childNode.typeCondition && childNode.typeCondition.name) {
                // $FlowFixMe: Not sure why flow thinks this can still be NULL
                inlineFragmentType = assertCompositeType(
                  this.context.getSchema().getType(childNode.typeCondition.name.value)
                );
              }

              nodeComplexity = this.nodeComplexity(childNode, inlineFragmentType);
              break;
            }
            default: {
              nodeComplexity = this.nodeComplexity(childNode, typeDef);
              break;
            }
          }
          return Math.max(nodeComplexity, 0) + total;
        }, complexity);
    }
    return complexity;
  }

  createError(): GraphQLError {
    if (typeof this.options.createError === 'function') {
      return this.options.createError(
        this.options.maximumComplexity,
        this.complexity
      );
    }
    return new GraphQLError(queryComplexityMessage(
      this.options.maximumComplexity,
      this.complexity
    ));
  }
}
