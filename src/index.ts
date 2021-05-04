/**
 * Created by Ivo Meißner on 28.07.17.
 *
 * @flow
 */
import { ValidationContext } from 'graphql';
import QueryComplexity from './QueryComplexity';
import { QueryComplexityOptions } from './QueryComplexity';

export * from './estimators';
export * from './QueryComplexity';

export default function createQueryComplexityValidator(
  options: QueryComplexityOptions
): (context: ValidationContext) => QueryComplexity {
  return (context: ValidationContext): QueryComplexity => {
    return new QueryComplexity(context, options);
  };
}
