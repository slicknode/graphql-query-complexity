/**
 * Created by Ivo Meißner on 28.07.17.
 *
 * @flow
 */
import { ValidationContext } from 'graphql';
import QueryComplexity from './QueryComplexity.js';
import { QueryComplexityOptions } from './QueryComplexity.js';

export * from './estimators/index.js';
export * from './QueryComplexity.js';

export function createComplexityRule(
  options: QueryComplexityOptions
): (context: ValidationContext) => QueryComplexity {
  return (context: ValidationContext): QueryComplexity => {
    return new QueryComplexity(context, options);
  };
}

export default createComplexityRule;
