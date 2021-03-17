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
  GraphQLDirective, isAbstractType, GraphQLNamedType,
} from 'graphql';
import {
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  Kind,
  getNamedType,
  GraphQLError
} from 'graphql';

export type ComplexityEstimatorArgs = {
  type: GraphQLCompositeType,
  field: GraphQLField<any, any>,
  node: FieldNode,
  args: {[key: string]: any},
  childComplexity: number
}

export type ComplexityEstimator = (options: ComplexityEstimatorArgs) => number | void;

// Complexity can be anything that is supported by the configured estimators
export type Complexity = any;

// Map of complexities for possible types (of Union, Interface types)
type ComplexityMap = {
  [typeName: string]: number,
}

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
  ): number {
    if (node.selectionSet) {
      let fields:GraphQLFieldMap<any, any> = {};
      if (typeDef instanceof GraphQLObjectType || typeDef instanceof GraphQLInterfaceType) {
        fields = typeDef.getFields();
      }

      // Determine all possible types of the current node
      let possibleTypeNames: string[];
      if (isAbstractType(typeDef)) {
        possibleTypeNames = this.context.getSchema().getPossibleTypes(typeDef).map(t => t.name);
      } else {
        possibleTypeNames = [typeDef.name];
      }

      // Collect complexities for all possible types individually
      const selectionSetComplexities: ComplexityMap = node.selectionSet.selections.reduce(
        (complexities: ComplexityMap, childNode: FieldNode | FragmentSpreadNode | InlineFragmentNode) => {
          // let nodeComplexity = 0;

          let includeNode = true;
          let skipNode = false;

          childNode.directives?.forEach((directive: DirectiveNode) => {
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
            return complexities;
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
                node: childNode,
                type: typeDef
              };
              const validScore = this.estimators.find(estimator => {
                const tmpComplexity = estimator(estimatorArgs);

                if (typeof tmpComplexity === 'number' && !isNaN(tmpComplexity)) {
                  complexities = addComplexities(
                    tmpComplexity,
                    complexities,
                    possibleTypeNames,
                  );
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
              // Unknown fragment, should be caught by other validation rules
              if (!fragment) {
                break;
              }
              const fragmentType = this.context.getSchema().getType(fragment.typeCondition.name.value);
              // Invalid fragment type, ignore. Should be caught by other validation rules
              if (!isCompositeType(fragmentType)) {
                break;
              }
              const nodeComplexity = this.nodeComplexity(fragment, fragmentType);
              if (isAbstractType(fragmentType)) {
                // Add fragment complexity for all possible types
                complexities = addComplexities(
                  nodeComplexity,
                  complexities,
                  this.context.getSchema().getPossibleTypes(fragmentType).map(t => t.name),
                );
              } else {
                // Add complexity for object type
                complexities = addComplexities(
                  nodeComplexity,
                  complexities,
                  [fragmentType.name],
                );
              }
              break;
            }
            case Kind.INLINE_FRAGMENT: {
              let inlineFragmentType: GraphQLNamedType = typeDef;
              if (childNode.typeCondition && childNode.typeCondition.name) {
                inlineFragmentType = this.context.getSchema().getType(childNode.typeCondition.name.value);
                if (!isCompositeType(inlineFragmentType)) {
                  break;
                }
              }

              const nodeComplexity = this.nodeComplexity(childNode, inlineFragmentType);
              if (isAbstractType(inlineFragmentType)) {
                // Add fragment complexity for all possible types
                complexities = addComplexities(
                  nodeComplexity,
                  complexities,
                  this.context.getSchema().getPossibleTypes(inlineFragmentType).map(t => t.name),
                );
              } else {
                // Add complexity for object type
                complexities = addComplexities(
                  nodeComplexity,
                  complexities,
                  [inlineFragmentType.name],
                );
              }
              break;
            }
            default: {
              complexities = addComplexities(
                this.nodeComplexity(childNode, typeDef),
                complexities,
                possibleTypeNames,
              );
              break;
            }
          }

          return complexities;
        }, {});
      // Only return max complexity of all possible types
      if (!selectionSetComplexities) {
        return NaN;
      }
      return Math.max(...Object.values(selectionSetComplexities), 0);
    }
    return 0;
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

/**
 * Adds a complexity to the complexity map for all possible types
 * @param complexity
 * @param complexityMap
 * @param possibleTypes
 */
function addComplexities(
  complexity: number,
  complexityMap: ComplexityMap,
  possibleTypes: string[],
): ComplexityMap {
  for (const type of possibleTypes) {
    if (complexityMap.hasOwnProperty(type)) {
      complexityMap[type] = complexityMap[type] + complexity;
    } else {
      complexityMap[type] = complexity;
    }
  }
  return complexityMap;
}
