/**
 * Created by Ivo Meißner on 28.07.17.
 */

import {
  GraphQLSchema,
  parse,
  print,
  printSchema,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  buildSchema,
} from 'graphql';

import { expect } from 'chai';

import schema from './fixtures/schema';

import ComplexityVisitor from '../../../QueryComplexity';
import directiveEstimator, { createComplexityDirective } from '../index';
import { CompatibleValidationContext } from '../../../__tests__/fixtures/CompatibleValidationContext';

describe('directiveEstimator analysis', () => {
  const typeInfo = new TypeInfo(schema);

  it('should read complexity from directive', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [
        directiveEstimator({
          name: 'cost',
        }),
      ],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
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

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(10);
  });

  it('ignores fields without complexity directive', () => {
    const ast = parse(`
      query {
        noDirective
      }
    `);

    const context = new CompatibleValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
      estimators: [directiveEstimator()],
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.include(
      'No complexity could be calculated for field Query.noDirective'
    );
  });

  it('should create complexity directive that can be used to generate directive definition', () => {
    const complexityDirective = createComplexityDirective();
    const codeFirstSchema = new GraphQLSchema({
      directives: [complexityDirective],
    });

    // rebuilding code first schema
    // graphql-js <= 14 prints descriptions in different ways printSchema(schema) vs print(astNode)
    // and directive from code first schema has no astNode
    const builtCodeFirstSchema = buildSchema(printSchema(codeFirstSchema));

    const printedSchemaFirstDirective = print(
      schema.getDirective('complexity').astNode
    );
    const printedCodeFirstDirective = print(
      builtCodeFirstSchema.getDirective('complexity').astNode
    );

    expect(printedSchemaFirstDirective).to.equal(printedCodeFirstDirective);
  });

  it('should create complexity directive with configured name', () => {
    const complexityDirective = createComplexityDirective({ name: 'cost' });
    const codeFirstSchema = new GraphQLSchema({
      directives: [complexityDirective],
    });

    // rebuilding code first schema
    // graphql-js <= 14 prints descriptions in different ways printSchema(schema) vs print(astNode)
    // and directive from code first schema has no astNode
    const builtCodeFirstSchema = buildSchema(printSchema(codeFirstSchema));

    const printedSchemaFirstDirective = print(
      schema.getDirective('cost').astNode
    );
    const printedCodeFirstDirective = print(
      builtCodeFirstSchema.getDirective('cost').astNode
    );

    expect(printedSchemaFirstDirective).to.equal(printedCodeFirstDirective);
  });
});
