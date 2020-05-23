/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  GraphQLError,
  parse,
  TypeInfo,
  ValidationContext,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import {expect} from 'chai';

import schema from './fixtures/schema';

import ComplexityVisitor from '../../../QueryComplexity';
import directiveEstimator from '../index';

describe('directiveEstimator analysis', () => {
  const typeInfo = new TypeInfo(schema);

  it('should read complexity from directive', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(5);
  });

  it('should not allow negative cost', () => {
    const ast = parse(`
      query {
        negativeCostScalar
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(0);
  });

  it('uses default directive name', () => {
    const ast = parse(`
      query {
        multiDirective
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(2);
  });

  it('uses configured directive name', () => {
    const ast = parse(`
      query {
        multiDirective
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator({
          name: 'cost'
        })
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('returns value + child complexity for configured multipliers but no values', () => {
    const ast = parse(`
      query {
        childList {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(5);
  });

  it('uses numeric multiplier value', () => {
    const ast = parse(`
      query {
        childList(limit: 2) {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(10);
  });

  it('combines multiple numeric multiplier values', () => {
    const ast = parse(`
      query {
        childList(limit: 2, first: 2) {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(20);
  });

  it('uses multiplier array value length', () => {
    const ast = parse(`
      query {
        childList(ids: ["a", "b"]) {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(10);
  });

  it('uses nested multiplier paths', () => {
    const ast = parse(`
      query {
        childList(filter: {limit: 3}) {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(15);
  });

  it('uses multi level nested multiplier paths with array reference', () => {
    const ast = parse(`
      query {
        childList(filter: {filters: [{limit: 2}]}) {
          scalar
        }
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo, () => null);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(10);
  });

  it('ignores fields without compexity directive', () => {
    const ast = parse(`
      query {
        noDirective
      }
    `);

    const validationErrors: GraphQLError[] = [];
    const context = new ValidationContext(schema, ast, typeInfo, err => validationErrors.push(err));
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator()
      ]
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(validationErrors.length).to.equal(1);
    expect(validationErrors[0].message).to.include(
      'No complexity could be calculated for field Query.noDirective',
    );
  });
});
