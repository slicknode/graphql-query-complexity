/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  GraphQLList,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLInterfaceType,
} from 'graphql';
import { compatResolveType } from '../../../../__tests__/utils/compatResolveType.js';

const Item: GraphQLObjectType = new GraphQLObjectType({
  name: 'Item',
  fields: () => ({
    variableList: {
      type: Item,
      args: {
        count: {
          type: GraphQLInt,
        },
      },
    },
    scalar: { type: GraphQLString },
    list: { type: new GraphQLList(Item) },
    nonNullItem: {
      type: new GraphQLNonNull(Item),
      resolve: () => ({}),
    },
    nonNullList: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Item))),
      resolve: () => [],
    },
  }),
});

const NameInterface = new GraphQLInterfaceType({
  name: 'NameInterface',
  fields: {
    name: { type: GraphQLString },
  },
  resolveType: compatResolveType(Item),
});

const SecondItem = new GraphQLObjectType({
  name: 'SecondItem',
  fields: () => ({
    name: { type: GraphQLString },
    scalar: { type: GraphQLString },
  }),
  interfaces: [NameInterface],
});

const EnumType = new GraphQLEnumType({
  name: 'RGB',
  values: {
    RED: { value: 0 },
    GREEN: { value: 1 },
    BLUE: { value: 2 },
  },
});

const Union = new GraphQLUnionType({
  name: 'Union',
  types: [Item, SecondItem],
  resolveType: compatResolveType(Item),
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    name: { type: GraphQLString },
    variableList: {
      type: Item,
      args: {
        count: {
          type: GraphQLInt,
        },
      },
    },
    interface: { type: NameInterface },
    enum: { type: EnumType },
    scalar: { type: GraphQLString },
    union: { type: Union },
    variableScalar: {
      type: Item,
      args: {
        count: {
          type: GraphQLInt,
        },
      },
    },
    list: { type: new GraphQLList(Item) },
    nonNullItem: {
      type: new GraphQLNonNull(Item),
      resolve: () => ({}),
    },
    nonNullList: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Item))),
      resolve: () => [],
    },
    requiredArgs: {
      type: Item,
      args: {
        count: {
          type: new GraphQLNonNull(GraphQLInt),
        },
      },
    },
  }),
});

export default new GraphQLSchema({ query: Query });
