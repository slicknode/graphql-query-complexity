/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  parse,
  TypeInfo,
  ValidationContext,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import {expect} from 'chai';

import schema from './fixtures/schema';

import ComplexityVisitor, {getComplexity} from '../QueryComplexity';
import {
  simpleEstimator,
  directiveEstimator,
  fieldConfigEstimator,
} from '../index';

describe('QueryComplexity analysis', () => {
  const typeInfo = new TypeInfo(schema);

  it('should calculate complexity', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10)
      }
    `);

    const complexity = getComplexity({
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
    });
    expect(complexity).to.equal(1);
  });

  it('should respect @include(if: false)', () => {
    const ast = parse(`
      query {
        variableScalar(count: 10) @include(if: false)
      }
    `);

    const complexity = getComplexity({
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
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
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
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
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
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
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
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
      estimators: [
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast
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
        fieldConfigEstimator(),
        simpleEstimator({defaultComplexity: 1})
      ],
      schema,
      query: ast,
      variables: {
        count: 5,
      },
    });
    expect(complexity).to.equal(50);
  });

  it('should not allow negative cost', () => {
    const ast = parse(`
      query {
        variableScalar(count: -100)
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        simpleEstimator({defaultComplexity: -100})
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
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
    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator(),
        simpleEstimator({
          defaultComplexity: 1
        })
      ]
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal('Argument "count" of required type "Int!" was not provided.');
  });

  it('should report error when no estimator is configured', () => {
    const ast = parse(`
        query {
            scalar
        }
      `);
    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: []
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
    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        fieldConfigEstimator()
      ]
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal(
      'No complexity could be calculated for field Query.scalar. ' +
      'At least one complexity estimator has to return a complexity score.'
    );
  });

  it('should return NaN when no astNode available on field when use directiveEstimator', () => {
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
      ],
      schema,
      query: ast
    });
    expect(Number.isNaN(complexity)).to.equal(true);
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
          defaultComplexity: 1
        })
      ],
      schema,
      query: ast
    });
    expect(complexity).to.equal(2);
  });
});
