import {ComplexityEstimator, ComplexityEstimatorArgs} from '../../QueryComplexity';

export default function (): ComplexityEstimator {
  return (args: ComplexityEstimatorArgs) => {
    // Calculate complexity score
    if (typeof args.field.complexity === 'number') {
      return args.childComplexity + args.field.complexity;
    } else if (typeof args.field.complexity === 'function') {
      return args.field.complexity(args);
    }
  };
}
