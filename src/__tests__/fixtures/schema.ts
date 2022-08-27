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

import { ComplexityEstimatorArgs } from '../../QueryComplexity.js';
import { compatResolveType } from '../utils/compatResolveType.js';

const Item: GraphQLObjectType = new GraphQLObjectType({
  name: 'Item',
  fields: () => ({
    variableList: {
      type: Item,
      extensions: {
        complexity: (args: ComplexityEstimatorArgs) =>
          args.childComplexity * (args.args.count || 10),
      },
      args: {
        count: {
          type: GraphQLInt,
        },
      },
    },
    scalar: { type: GraphQLString },
    complexScalar: { type: GraphQLString, extensions: { complexity: 20 } },
    variableScalar: {
      type: Item,
      extensions: {
        complexity: (args: ComplexityEstimatorArgs) =>
          10 * (args.args.count || 10),
      },
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

const UnionInterface = new GraphQLInterfaceType({
  name: 'UnionInterface',
  fields: () => ({
    union: { type: Union },
  }),
  resolveType: compatResolveType(Item),
});

const SDLInterface = new GraphQLInterfaceType({
  name: 'SDLInterface',
  fields: {
    sdl: { type: GraphQLString },
  },
  resolveType: () => 'SDL',
});

const SDL = new GraphQLObjectType({
  name: 'SDL',
  fields: {
    sdl: { type: GraphQLString },
  },
  interfaces: () => [SDLInterface],
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    name: { type: GraphQLString },
    variableList: {
      type: Item,
      extensions: {
        complexity: (args: ComplexityEstimatorArgs) =>
          args.childComplexity * (args.args.count || 10),
      },
      args: {
        count: {
          type: GraphQLInt,
        },
      },
    },
    interface: { type: NameInterface },
    enum: { type: EnumType },
    scalar: { type: GraphQLString },
    complexScalar: { type: GraphQLString, extensions: { complexity: 20 } },
    union: { type: Union },
    variableScalar: {
      type: Item,
      extensions: {
        complexity: (args: ComplexityEstimatorArgs) =>
          10 * (args.args.count || 10),
      },
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
    enumInputArg: {
      type: GraphQLString,
      args: {
        enum: {
          type: EnumType,
        },
      },
    },
    _service: { type: SDLInterface },
  }),
  interfaces: () => [NameInterface, UnionInterface],
});

export default new GraphQLSchema({
  query: Query,
  types: [SDL],
});
