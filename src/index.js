/**
 * Created by Ivo Meißner on 28.07.17.
 *
 * @flow
 */

import type {
  ValidationContext
} from 'graphql';
import QueryComplexity from './QueryComplexity';
import type {
  QueryComplexityOptions
} from './QueryComplexity';

export default function createQueryComplexityValidator(
  options: QueryComplexityOptions
): Function {
  return (context: ValidationContext): QueryComplexity => {
    return new QueryComplexity(context, options);
  };
}
