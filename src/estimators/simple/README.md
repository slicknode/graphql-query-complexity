# Simple Estimator

The simple estimator just adds a fixed complexity to every field that is queried.
This can be used as the last estimator in the chain to return the default value.

## Usage

```typescript
import {
  simpleEstimator,
  createComplexityRule,
} from 'graphql-query-complexity';

const rule = createComplexityRule({
  estimators: [
    simpleEstimator({
      // Add a default complexity of 1 for each queried field
      defaultComplexity: 1,
    }),
  ],
  // ... other config
});
```
