/**
 * Created by Ivo Meißner on 28.07.17.
 *
 * @flow
 */
import { ValidationContext } from 'graphql';
import QueryComplexity from './QueryComplexity';
import { QueryComplexityOptions } from './QueryComplexity';

export * from './estimators';

export default function createQueryComplexityValidator(options: QueryComplexityOptions): Function {
  return (context: ValidationContext): QueryComplexity => {
    return new QueryComplexity(context, options);
  };
}
