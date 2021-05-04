/**
 * Created by Ivo Meißner on 28.07.17.
 */

import { buildSchema } from 'graphql';

export default buildSchema(`
"""Define a relation between the field and other nodes"""
directive @cost(
  """The complexity value for the field"""
  value: Int!,
  multipliers: [String!]
) on FIELD_DEFINITION

"""Define a relation between the field and other nodes"""
directive @complexity(
  """The complexity value for the field"""
  value: Int!,
  multipliers: [String!]
) on FIELD_DEFINITION

type Query {
  scalar: String @complexity(value: 5)
  negativeCostScalar: String @complexity(value: -20)
  multiDirective: String @cost(value: 1) @complexity(value: 2)
  
  noDirective: Boolean
  
  childList(
    limit: Int, 
    ids: [ID],
    first: Int,
    filter: Filter
  ): [ChildType] @complexity(
    value: 3, 
    multipliers: ["first", "limit", "ids", "filter.limit", "filter.filters.0.limit"]
  )
}

input Filter {
  limit: Int
  ids: [ID]
  filters: [Filter]
}

type ChildType {
  scalar: String @complexity(value: 2)
}
`);
