import {ComplexityEstimator, ComplexityEstimatorArgs} from '../../QueryComplexity';

/**
 * @deprecated Use fieldExtensionsEstimator instead
 */
export default function (): ComplexityEstimator {
  console.warn(
    'DEPRECATION WARNING: fieldConfigEstimator is deprecated. Use fieldExtensionsEstimator instead'
  );

  return (args: ComplexityEstimatorArgs) => {
    // Calculate complexity score
    if (typeof args.field.complexity === 'number') {
      return args.childComplexity + args.field.complexity;
    } else if (typeof args.field.complexity === 'function') {
      return args.field.complexity(args);
    }
  };
}
