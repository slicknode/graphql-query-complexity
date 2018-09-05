/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  buildSchema
} from 'graphql';

export default buildSchema(`
type Query {
  scalar: String @complexity(value: 5)
  negativeCostScalar: String @complexity(value: -20)
  multiDirective: String @cost(value: 1) @complexity(value: 2)
}
`);
