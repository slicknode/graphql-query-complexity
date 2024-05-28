/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  parse,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  validate,
  specifiedRules,
} from 'graphql';

import { expect } from 'chai';

import schema from './fixtures/schema.js';

import ComplexityVisitor, {
  getComplexity,
  ComplexityEstimator,
} from '../QueryComplexity.js';
import defaultExport, {
  createComplexityRule,
  simpleEstimator,
  directiveEstimator,
  fieldExtensionsEstimator,
} from '../index.js';
import { CompatibleValidationContext } from './fixtures/CompatibleValidationContext.js';

describe('QueryComplexity analysis', () => {
  const typeInfo = new TypeInfo(schema);

  it('exports createComplexityRule as default and named export in index', () => {
    expect(createComplexityRule).to.equal(defaultExport);
    expect(typeof createComplexityRule).to.equal('function');
  });

  it('should calculate complexity', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(1);
  });

  it('should respect @include(if: false) via default variable value', () => {
    const ast = parse(`
      query Foo ($shouldSkip: Boolean = false) {
        variableScalar(count: 10) @include(if: $shouldSkip)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(0);
  });

  it('should respect @include(if: false)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @include(if: false)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(0);
  });

  it('should respect @include(if: true)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @include(if: true)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(1);
  });

  it('should respect @skip(if: true)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @skip(if: true)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(0);
  });

  it('should respect @skip(if: false)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @skip(if: false)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(1);
  });

  it('should respect @skip(if: false) @include(if: true)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @skip(if: false) @include(if: true)
      }
    `);

    const complexity = getComplexity({
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(1);
  });

  it('should calculate complexity with variables', () => {
    const ast = parse(`
      query Q($count: Int) {
        variableScalar(count: $count)
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query: ast,
      variables: {
        count: 5,
      },
    });
    expect(complexity).to.equal(50);
  });

  it('should calculate complexity with variables and default value', () => {
    const ast = parse(`
      query Q($count: Int = 5) {
        variableScalar(count: $count)
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query: ast,
      variables: {},
    });
    expect(complexity).to.equal(50);
  });

  it('should not allow negative cost', () => {
    const ast = parse(`
      query {
        variableScalar(count: -100)
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: -100 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('should ignore unknown fragments', () => {
    const ast = parse(`
      query {
        ...UnknownFragment
        variableScalar(count: 100)
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 10 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(10);
  });

  it('should ignore inline fragment on unknown type', () => {
    const ast = parse(`
      query {
        ...on UnknownType {
          variableScalar(count: 100)
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 10 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('should ignore fragment on unknown type', () => {
    const ast = parse(`
      query {
        ...F
      }
      fragment F on UnknownType {
        variableScalar(count: 100)
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 10 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('should report errors for unused variables', () => {
    const ast = parse(`
      query ($unusedVar: ID!) {
        variableScalar(count: 100)
      }
    `);

    const errors = validate(schema, ast, [
      createComplexityRule({
        maximumComplexity: 1000,
        estimators: [
          simpleEstimator({
            defaultComplexity: 1,
          }),
        ],
        variables: {
          unusedVar: 'someID',
        },
      }),
    ]);
    expect(errors).to.have.length(1);
    expect(errors[0].message).to.contain('$unusedVar');
  });

  it('should ignore unknown field', () => {
    const ast = parse(`
      query {
        unknownField
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 10 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('should report error above threshold', () => {
    const ast = parse(`
      query {
        variableScalar(count: 100)
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1000);
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal(
      'The query exceeds the maximum complexity of 100. Actual complexity is 1000'
    );
  });

  it('should add inline fragments', () => {
    const ast = parse(`
      query {
        variableScalar(count: 5)
        ...on Query {
          scalar
          alias: scalar
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(52);
  });

  it('should add fragments', () => {
    const ast = parse(`
      query {
        scalar
        ...QueryFragment
      }

      fragment QueryFragment on Query {
        variableScalar(count: 2)
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(21);
  });

  it('should add complexity for union types', () => {
    const ast = parse(`
      query {
        union {
          ...on Item {
            scalar
            complexScalar
          }
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(22);
  });

  it('should add complexity for interface types', () => {
    const ast = parse(`
      query {
        interface {
          name
          ...on NameInterface {
            name
          }
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(3);
  });

  it('should add complexity for inline fragments without type condition', () => {
    const ast = parse(`
      query {
        interface {
          ... {
            name
          }
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(2);
  });

  it('should add complexity for enum types', () => {
    const ast = parse(`
      query {
        enum
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('should report error on a missing non-null argument', () => {
    const ast = parse(`
        query {
            requiredArgs
        }
      `);
    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal(
      'Argument "count" of required type "Int!" was not provided.'
    );
  });

  it('should report error when no estimator is configured', () => {
    const ast = parse(`
        query {
            scalar
        }
      `);
    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [],
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal(
      'No complexity could be calculated for field Query.scalar. ' +
        'At least one complexity estimator has to return a complexity score.'
    );
  });

  it('should report error when no estimator returns value', () => {
    const ast = parse(`
        query {
            scalar
        }
      `);
    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [fieldExtensionsEstimator()],
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal(
      'No complexity could be calculated for field Query.scalar. ' +
        'At least one complexity estimator has to return a complexity score.'
    );
  });

  it('should throw error when no astNode available on field when using directiveEstimator', () => {
    const ast = parse(`
      query {
        _service {
          sdl
        }
      }
    `);

    expect(() => {
      getComplexity({
        estimators: [directiveEstimator()],
        schema,
        query: ast,
      });
    }).to.throw(/No complexity could be calculated for field Query._service/);
  });

  it('should skip complexity calculation by directiveEstimator when no astNode available on field', () => {
    const ast = parse(`
      query {
        _service {
          sdl
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        directiveEstimator(),
        simpleEstimator({
          defaultComplexity: 1,
        }),
      ],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(2);
  });

  it('should calculate complexity for specific operation', () => {
    const ast = parse(`
      query Primary {
        scalar
        complexScalar
      }

      query Secondary {
        complexScalar
      }
    `);

    const complexity1 = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query: ast,
    });
    expect(complexity1).to.equal(41);

    const complexity2 = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query: ast,
      operationName: 'Secondary',
    });
    expect(complexity2).to.equal(20);
  });

  it('should calculate complexity for meta fields', () => {
    const query = parse(`
      query Primary {
        __typename
        __type(name: "Primary") {
          name
        }
        __schema {
          types {
            name
          }
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query,
    });

    expect(complexity).to.equal(6);
  });

  it('should calculate max complexity for fragment on union type', () => {
    const query = parse(`
      query Primary {
        union {
          ...on Item {
            scalar
          }
          ...on SecondItem {
            scalar
          }
          ...on SecondItem {
            scalar
          }
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(3);
  });

  it('should calculate max complexity for nested fragment on union type', () => {
    const query = parse(`
      query Primary {
        union {
          ...on Union {
            ...on Item {
              complexScalar1: complexScalar
            }
          }
          ...on SecondItem {
            scalar
          }
          ...on Item {
            complexScalar2: complexScalar
          }
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 0 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(40);
  });

  it('should calculate max complexity for nested fragment on union type + named fragment', () => {
    const query = parse(`
      query Primary {
        union {
          ...F
          ...on SecondItem {
            scalar
          }
          ...on Item {
            complexScalar2: complexScalar
          }
        }
      }
      fragment F on Union {
        ...on Item {
          complexScalar1: complexScalar
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 0 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(40);
  });

  it('should calculate max complexity for multiple interfaces', () => {
    const query = parse(`
      query Primary {
        interface {
          ...on Query {
            complexScalar
          }
          ...on SecondItem {
            name
            name2: name
          }
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(21);
  });

  it('should calculate max complexity for multiple interfaces with nesting', () => {
    const query = parse(`
      query Primary {
        interface {
          ...on Query {
            complexScalar
            ...on Query {
              a: complexScalar
            }
          }
          ...on SecondItem {
            name
            name2: name
          }
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(41); // 1 for interface, 20 * 2 for complexScalar
  });

  it('should calculate max complexity for multiple interfaces with nesting + named fragment', () => {
    const query = parse(`
      query Primary {
        interface {
          ...F
          ...on SecondItem {
            name
            name2: name
          }
        }
      }

      fragment F on Query {
        complexScalar
        ...on Query {
          a: complexScalar
        }
      }
    `);

    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      schema,
      query,
    });
    expect(complexity).to.equal(41); // 1 for interface, 20 * 2 for complexScalar
  });

  it('should include the current node in the estimator args', () => {
    const ast = parse(`
      query {
        nonNullItem {
          scalar
          complexScalar
          variableScalar(count: 10)
        }
      }
    `);

    const fieldCountEstimator: ComplexityEstimator = ({ node }) => {
      if (node.selectionSet) {
        return 10 * node.selectionSet.selections.length;
      }
      return 0;
    };

    const complexity = getComplexity({
      estimators: [fieldCountEstimator],
      schema,
      query: ast,
    });
    expect(complexity).to.equal(30); // 3 fields on nonNullItem * 10
  });

  it('should handle invalid argument values for multiple query fields', () => {
    const ast = parse(`
      query {
        requiredArgs(count: x) {
          scalar
          complexScalar
        }
        nonNullItem {
          scalar
          complexScalar
          variableScalar(count: 10)
        }
      }
    `);

    validate(schema, ast, [
      ...specifiedRules,
      createComplexityRule({
        maximumComplexity: 1000,
        estimators: [
          simpleEstimator({
            defaultComplexity: 1,
          }),
        ],
      }),
    ]);
  });

  it('passed context to estimators', () => {
    const ast = parse(`
      query {
        scalar
        requiredArgs(count: 10) {
          scalar
        }
      }
    `);

    const contextEstimator: ComplexityEstimator = ({
      context,
      childComplexity,
    }) => {
      return context['complexityMultiplier'] * (childComplexity || 1);
    };

    const complexity = getComplexity({
      estimators: [contextEstimator],
      schema,
      query: ast,
      context: { complexityMultiplier: 5 },
    });

    // query.scalar(5) + query.requiredArgs(5) * requiredArgs.scalar(5)
    expect(complexity).to.equal(30);
  });

  it('reports variable coercion errors', () => {
    const ast = parse(`
      query ($input: RGB!){
        enumInputArg(enum: $input)
      }
    `);

    const errors = validate(schema, ast, [
      createComplexityRule({
        maximumComplexity: 1000,
        estimators: [
          simpleEstimator({
            defaultComplexity: 1,
          }),
        ],
        variables: {
          input: 'INVALIDVALUE',
        },
      }),
    ]);
    expect(errors).to.have.length(1);
    expect(errors[0].message).to.contain('INVALIDVALUE');
  });

  it('falls back to 0 complexity for GraphQL operations not supported by the schema', () => {
    const ast = parse(`
      subscription {
        foo
      }
    `);

    const errors = validate(schema, ast, [
      createComplexityRule({
        maximumComplexity: 1000,
        estimators: [
          simpleEstimator({
            defaultComplexity: 1,
          }),
        ],
      }),
    ]);

    expect(errors).to.have.length(0);
  });
});
