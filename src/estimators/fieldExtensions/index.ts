import {ComplexityEstimator, ComplexityEstimatorArgs} from '../../QueryComplexity';

export default function (): ComplexityEstimator {
  return (args: ComplexityEstimatorArgs): number | void => {
    if (args.field.extensions) {
      // Calculate complexity score
      if (typeof args.field.extensions.complexity === 'number') {
        return args.childComplexity + args.field.extensions.complexity;
      } else if (typeof args.field.extensions.complexity === 'function') {
        return args.field.extensions.complexity(args);
      }
    }
  };
}
