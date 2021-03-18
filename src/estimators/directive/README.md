# Directive Estimator

The `directiveEstimator` lets you define the complexity of each field via GraphQL directives. 
That way you can define your schema and the complexity via GraphQL SDL and you don't have to 
change the field config manually.

## Usage

Add estimator to rule:

```typescript
import queryComplexity, {directiveEstimator} from 'graphql-query-complexity';

const rule = queryComplexity({
  estimators: [
    directiveEstimator({
      // Optionally change the name of the directive here... Default value is `complexity`
      name: 'complexity'
    })
  ]
  // ... other config
});
```

Define your schema and add the complexity directive: 

```graphql
directive @complexity(
  # The complexity value for the field
  value: Int!,
  
  # Optional multipliers
  multipliers: [String!]
) on FIELD_DEFINITION


type Query {
  # Fixed complexity of 5
  someField: String @complexity(value: 5)
  
  # Multiply the complexity of the field with a numeric input value
  # If limit=2 this would result in a complexity of 4
  listScalar(limit: Int): String @complexity(value: 2, multipliers: ["limit"])
  
  # Use a multiplier that is nested in a by defining the multiplier with path notation (see library lodash.get)
  multiLevelMultiplier(filter: Filter): String @complexity(value: 1, multipliers: ["filter.limit"])
  
  # If the multiplier is an array, it uses the array length as multiplier
  arrayLength(ids: [ID]): String @complexity(value: 1, multipliers: ["ids"])
  
  # Using multipliers on fields with composite types calculates the complexity as follows: 
  # (value + childComplexity) * multiplier1 [... * multiplier2]
  compositeTypes(ids: [ID]): ChildType @complexity(value: 2, multipliers: ["ids"])
}

type ChildType {
  a: String @complexity(value: 1)
}

input Filter {
  limit: Int
}
```

The multipliers can be combined. Configured multipliers that don't have a value or `NULL` are ignored. 

If you are using the code first approach you can use the `createComplexityDirective` function to create 
the complexity directive:

```typescript
import {createComplexityDirective} from 'graphql-query-complexity';

const schema = new GraphQLSchema({
  directives: [
    createComplexityDirective({
      // Optionally change the name of the directive here... Default value is `complexity`
      name: 'complexity'
    })
  ]
  // ... other config
});
```
