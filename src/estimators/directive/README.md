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
type Query {
  # Set the complexity values on the fields via the directive
  someField: String @complexity(value: 5)
}
```
