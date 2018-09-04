# Legacy Estimator

WARNING: The legacy estimator is only part of the library to provide the functionality of previous versions. 
You should use the fieldConfig estimator for new projects and migrate old implementations.

## Usage

````typescript
import queryComplexity, {legacyEstimator} from 'graphql-query-complexity';

const rule = queryComplexity({
  estimators: [
    legacyEstimator()
  ]
  // ... other config
});
````

You can set a custom complexity in the field config:

```javascript
const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    title: { type: GraphQLString },
    text: { type: GraphQLString, complexity: 5 },
  }),
});
```
The same query would now result in a complexity of 7. 
5 for the `text` field and 1 for each of the other fields. 

You can also pass a calculation function in the field config to determine a custom complexity. 
This function will provide the complexity of the child nodes as well as the field input arguments.

That way you can make a more realistic estimation of individual field complexity values:

```javascript
const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    posts: {
      type: new GraphQLList(Post),
      complexity: (args, childComplexity) => childComplexity * args.count,
      args: {
        count: {
          type: GraphQLInt,
          defaultValue: 10
        }
      }
    },
  }),
});
```

This would result in a complexity of 60 since the `childComplexity` of posts (`text` 5, `title` 1) is multiplied by the
number of posts (`args.count`).