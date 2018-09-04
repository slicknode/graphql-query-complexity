# GraphQL Query Complexity Analysis for graphql-js

This library provides GraphQL query analysis to reject complex queries to your GraphQL server.
This can be used to protect your GraphQL servers against resource exhaustion and DoS attacks.

Works with [graphql-js](https://github.com/graphql/graphql-js) reference implementation. 


## Installation

Install the package via npm 

```bash
npm install -S graphql-query-complexity
```

## Usage

Create the rule with a maximum query complexity:

```javascript
import queryComplexity, {
  simpleEstimator
} from 'graphql-query-complexity';

const rule = queryComplexity({
  // The maximum allowed query complexity, queries above this threshold will be rejected
  maximumComplexity: 1000,
  
  // The query variables. This is needed because the variables are not available
  // in the visitor of the graphql-js library
  variables: {},
  
  // Optional callback function to retrieve the determined query complexity
  // Will be invoked whether the query is rejected or not
  // This can be used for logging or to implement rate limiting
  onComplete: (complexity: number) => {console.log('Determined query complexity: ', complexity)},
  
  // Optional function to create a custom error
  createError: (max: number, actual: number) => {
    return new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
  },
  
  // Add any number of estimators. The estimators are invoked in order, the first
  // numeric value that is being returned by an estimator is used as the field complexity.
  // If no estimator returns a value, an exception is raised. 
  estimators: [
    // Add more estimators here...
    
    // This will assign each field a complexity of 1 if no other estimator
    // returned a value. 
    simpleEstimator({
      defaultComplexity: 1
    })
  ]
});
```

## Configuration / Complexity Estimators

The complexity calculation of a GraphQL query can be customized with so called complexity estimators.
A complexity estimator is a simple function that calculates the complexity for a field. You can add
any number of complexity estimators to the rule, which are then executed one after another. 
The first estimator that returns a numeric complexity value determines the complexity for that field. 

At least one estimator has to return a complexity value, otherwise an exception is raised. You can
for example use the [simpleEstimator](./src/estimators/simple/README.md) as the last estimator
in your chain to define a default value. 

You can use any of the available estimators to calculate the complexity of a field
or write your own:

*   **[`simpleEstimator`](src/estimators/simple/README.md):** The simple estimator returns a fixed complexity for each field. Can be used as
    last estimator in the chain for a default value.
*   **[`fieldConfigEstimator`](src/estimators/simple/README.md):** The field config estimator lets you set a numeric value or a custom estimator
    function in the field config of your schema. 
*   **[`legacyEstimator`](src/estimators/legacy/README.md):** The legacy estimator implements the logic of previous versions. Can be used
    to gradually migrate your codebase to new estimators. 
*   PR welcome...


## Creating Custom Estimators

An estimator has the following function signature: 

```typescript
type ComplexityEstimatorArgs = {
  // The composite type (interface, object, union) that the evaluated field belongs to
  type: GraphQLCompositeType,
  
  // The GraphQLField that is being evaluated
  field: GraphQLField<any, any>,
  
  // The input arguments of the field
  args: {[key: string]: any},
  
  // The complexity of all child selections for that field
  childComplexity: number
}

type ComplexityEstimator = (options: ComplexityEstimatorArgs) => number | void;
```


## Customizing complexity calculation

By default, every field gets a complexity of 1. Let's look at the following example query: 

```graphql
query {
  posts(count: 10) {
    title
    text
  }
}
```

This would result in a complexity of 3. The fields `posts`, `title` and `text` each add a complexity of 1.
If we assume that the posts field returns a list of 10 posts, the complexity estimation is pretty inaccurate. 

When defining your fields, you have a two options to customize the calculation.

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

## Usage with express-graphql

To use the query complexity analysis validation rule with express-graphql, use something like the
following: 

```javascript
import queryComplexity from 'graphql-query-complexity';
import express from 'express';
import graphqlHTTP from 'express-graphql';
import schema from './schema';

const app = express();
app.use('/api', graphqlHTTP(async (request, response, {variables}) => ({
  schema,
  validationRules: [ queryComplexity({
    maximumComplexity: 1000,
    variables,
    onComplete: (complexity: number) => {console.log('Query Complexity:', complexity);},
  }) ]
})));
```

## Prior Art

This project is inspired by the following prior projects: 

-   Query complexity analysis in the [Sangria GraphQL](http://sangria-graphql.org/) implementation.

