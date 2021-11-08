import { ValidationContext } from 'graphql';
import QueryComplexity from './QueryComplexity.js';
import { QueryComplexityOptions } from './QueryComplexity.js';

export function createComplexityRule(
  options: QueryComplexityOptions
): (context: ValidationContext) => QueryComplexity {
  return (context: ValidationContext): QueryComplexity => {
    return new QueryComplexity(context, options);
  };
}
