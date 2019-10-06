# Field Extensions Estimator

The `fieldExtensionsEstimator` lets you define a numeric value or a custom estimator
in the field config extensions of your GraphQL schema. If no complexity is set in the field config,
the estimator does not return any value and the next estimator in the chain is executed. 

## Usage

```typescript
import queryComplexity, {
  fieldExtensionsEstimator,
  simpleEstimator
} from 'graphql-query-complexity';

const rule = queryComplexity({
  estimators: [
    fieldExtensionsEstimator(),
    
    // We use the simpleEstimator as fallback so we only need to 
    // define the complexity for non 1 values (this is not required...)
    simpleEstimator({defaultComplexity: 1})
  ]
  // ... other config
});
```

You can set a custom complexity as a numeric value in the field config:

```javascript
const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    title: { type: GraphQLString },
    text: {
      type: GraphQLString,
      extensions: {
        complexity: 5
      },
    },
  }),
});
```

**Example Query:**

```graphql
query {
  posts(count: 10) {
    title
    text
  }
}
```

This query would result in a complexity of 7. 
5 for the `text` field and 1 for each of the other fields. 

You can also pass an estimator in the field config to determine a custom complexity. 
This function will provide the complexity of the child nodes as well as the field input arguments.

The function signature is the same as for the main estimator which lets you reuse estimators:

```typescript
type ComplexityEstimatorArgs = {
  type: GraphQLCompositeType,
  field: GraphQLField<any, any>,
  args: {[key: string]: any},
  childComplexity: number
}

type ComplexityEstimator = (options: ComplexityEstimatorArgs) => number | void;
```

That way you can make a more realistic estimation of individual field complexity values:

```javascript
const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    posts: {
      type: new GraphQLList(Post),
      args: {
        count: {
          type: GraphQLInt,
          defaultValue: 10
        }
      },
      extensions: {
        complexity: ({args, childComplexity}) => childComplexity * args.count,
      },
    },
  }),
});
```

This would result in a complexity of 60 since the `childComplexity` of posts (`text` 5, `title` 1) is multiplied by the
number of posts (`args.count`).
