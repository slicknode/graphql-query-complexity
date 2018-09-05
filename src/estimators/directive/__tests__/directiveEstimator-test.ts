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

    const context = new ValidationContext(schema, ast, typeInfo);
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

    const context = new ValidationContext(schema, ast, typeInfo);
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

    const context = new ValidationContext(schema, ast, typeInfo);
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

    const context = new ValidationContext(schema, ast, typeInfo);
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
});
