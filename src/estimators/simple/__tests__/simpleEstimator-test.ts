/**
 * Created by Ivo Meißner on 28.07.17.
 */

import { parse, TypeInfo, visit, visitWithTypeInfo } from 'graphql';

import { expect } from 'chai';

import schema from './fixtures/schema';
import simpleEstimator from '../index';

import ComplexityVisitor from '../../../QueryComplexity';
import { CompatibleValidationContext } from '../../../__tests__/fixtures/CompatibleValidationContext';

describe('simple estimator', () => {
  const typeInfo = new TypeInfo(schema);

  it('should consider default scalar cost', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('should consider default scalar cost + defaultComplexity', () => {
    const ast = parse(`
      query {
        scalar
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

  it('should not allow negative cost', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: -10 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('should report error above threshold', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 1000 })],
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
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(3);
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
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(2);
  });

  it('should add complexity for union types', () => {
    const ast = parse(`
      query {
        union {
          ...on Item {
            scalar
          }
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(2);
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
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
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
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
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
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('should fall back on default complexity when child complexity cannot be computed', () => {
    const ast = parse(`
      query {
        errorThrower {
          errorScalar(throws: "an error") {
            irrelevant
          }
        }
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });
});
