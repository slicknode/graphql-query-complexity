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

describe('legacy estimator', () => {
  const typeInfo = new TypeInfo(schema);

  it('should consider default scalar cost', () => {
    const ast = parse(`
      query {
        scalar
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100,
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('should consider custom scalar cost', () => {
    const ast = parse(`
      query {
        complexScalar
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(20);
  });

  it('should consider variable scalar cost', () => {
    const ast = parse(`
      query {
        variableScalar(count: 100)
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1000);
  });

  it('should not allow negative cost', () => {
    const ast = parse(`
      query {
        variableScalar(count: -100)
      }
    `);

    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
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
      maximumComplexity: 100
    });

    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(visitor.complexity).to.equal(1);
  });

  it('should error on a missing non-null argument', () => {
    const ast = parse(`
        query {
            requiredArgs
        }
      `);
    const context = new ValidationContext(schema, ast, typeInfo);
    const visitor = new ComplexityVisitor(context, {
      maximumComplexity: 100
    });
    visit(ast, visitWithTypeInfo(typeInfo, visitor));
    expect(context.getErrors().length).to.equal(1);
    expect(context.getErrors()[0].message).to.equal('Argument "count" of required type "Int!" was not provided.');
  });
});
