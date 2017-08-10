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
const rule = queryComplexity({
  // The maximum allowed query complexity, queries above this threshold will be rejected
  maximumComplexity: 1000,
  
  // The query variables. This is needed because the variables are not available
  // in the visitor of the graphql-js library
  variables: {},
  
  // Optional callback function to retrieve the determined query complexity
  // Will be invoked weather the query is rejected or not
  // This can be used for logging or to implement rate limiting
  onComplete: (complexity: number) => {console.log('Determined query complexity: ', complexity)},
  
  // Optional function to create a custom error
  createError: (max: number, actual: number) => {
    return new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
  }
});
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

## Credits

This project is heavily inspired by the query complexity analysis in the 
[Sangria GraphQL](http://sangria-graphql.org/) implementation.
