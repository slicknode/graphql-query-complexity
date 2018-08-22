/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  getArgumentValues,
} from 'graphql/execution/values';

import {
  ValidationContext,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  assertCompositeType,
  GraphQLField,
} from 'graphql';
import {
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  Kind,
  getNamedType,
  GraphQLError
} from 'graphql';

type ComplexityResolver = (args: any, complexity: number) => number;

type ComplexityGraphQLField<TSource, TContext> = GraphQLField<TSource, TContext> & {
  complexity?: ComplexityResolver | number | undefined
}

type ComplexityGraphQLFieldMap<TSource, TContext> = {
  [key: string]: ComplexityGraphQLField<TSource, TContext>
}

export interface QueryComplexityOptions {
  maximumComplexity: number,
  variables?: Object,
  onComplete?: (complexity: number) => void,
  createError?: (max: number, actual: number) => GraphQLError
}

function queryComplexityMessage(max: number, actual: number): string {
  return (
    `The query exceeds the maximum complexity of ${max}. ` +
    `Actual complexity is ${actual}`
  );
}

export default class QueryComplexity {
  context: ValidationContext;
  complexity: number;
  options: QueryComplexityOptions;
  fragments: {[name: string]: FragmentDefinitionNode};
  OperationDefinition: Object;

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

    this.OperationDefinition = {
      enter: this.onOperationDefinitionEnter,
      leave: this.onOperationDefinitionLeave
    };
  }

  onOperationDefinitionEnter(operation: OperationDefinitionNode) {
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

  onOperationDefinitionLeave(): GraphQLError | undefined {
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
      let fields:ComplexityGraphQLFieldMap<any, any> = {};
      if (typeDef instanceof GraphQLObjectType || typeDef instanceof GraphQLInterfaceType) {
        fields = typeDef.getFields();
      }
      return complexity + node.selectionSet.selections.reduce(
        (total: number, childNode: FieldNode | FragmentSpreadNode | InlineFragmentNode) => {
          let nodeComplexity = 0;

          switch (childNode.kind) {
            case Kind.FIELD: {
              const field = fields[childNode.name.value];
              // Invalid field, should be caught by other validation rules
              if (!field) {
                break;
              }
              const fieldType = getNamedType(field.type);

              // Get arguments
              let args;
              try {
                args = getArgumentValues(field, childNode, this.options.variables || {});
              } catch (e) {
                return this.context.reportError(e);
              }

              // Check if we have child complexity
              let childComplexity = 0;
              if (
                fieldType instanceof GraphQLObjectType ||
                fieldType instanceof GraphQLInterfaceType ||
                fieldType instanceof GraphQLUnionType
              ) {
                childComplexity = this.nodeComplexity(childNode, fieldType);
              }

              // Calculate complexity score
              if (typeof field.complexity === 'number') {
                nodeComplexity = childComplexity + field.complexity;
              } else if (typeof field.complexity === 'function') {
                nodeComplexity = field.complexity(args, childComplexity);
              } else {
                nodeComplexity = this.getDefaultComplexity(args, childComplexity);
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

  getDefaultComplexity(args: Object, childScore: number): number {
    return 1 + childScore;
  }
}
