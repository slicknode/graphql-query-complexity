import {ComplexityEstimator, ComplexityEstimatorArgs} from '../../QueryComplexity';
import {getDirectiveValues, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString} from 'graphql';
import { GraphQLDirective } from 'graphql/type/directives';
import { DirectiveLocation } from 'graphql/language/directiveLocation';

export default function (options?: {}): ComplexityEstimator {
  const mergedOptions = {
    name: 'complexity',
    ...(options || {})
  };

  const directive = new GraphQLDirective({
    name: mergedOptions.name,
    description: 'Define a relation between the field and other nodes',
    locations: [
      DirectiveLocation.FIELD,
    ],
    args: {
      value: {
        type: new GraphQLNonNull(GraphQLInt),
        description: 'The complexity value for the field'
      },
      multipliers: {
        type: new GraphQLList(new GraphQLNonNull(GraphQLString))
      }
    },
  });

  return (args: ComplexityEstimatorArgs) => {
    const values = getDirectiveValues(directive, args.field.astNode);
    return values.value + args.childComplexity;
  };
}
