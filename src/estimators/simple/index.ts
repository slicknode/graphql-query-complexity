import {
  ComplexityEstimator,
  ComplexityEstimatorArgs,
} from '../../QueryComplexity';

export default function (options?: {
  defaultComplexity?: number;
}): ComplexityEstimator {
  const defaultComplexity =
    options && typeof options.defaultComplexity === 'number'
      ? options.defaultComplexity
      : 1;
  return (args: ComplexityEstimatorArgs): number | void => {
    const { childComplexity } = args;
    return (
      defaultComplexity + (Number.isNaN(childComplexity) ? 0 : childComplexity)
    );
  };
}
