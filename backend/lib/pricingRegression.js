import { MultivariateLinearRegression } from 'ml-regression';

/** Use ridge when the model has nearly as many coefficients as training rows. */
export function shouldUseRidgeRegression(sampleCount, featureCount) {
  if (sampleCount < 3 || featureCount < 2) {
    return false;
  }

  return featureCount >= sampleCount - 2 || featureCount / sampleCount >= 0.5;
}

function averageFeatureDiagonal(rows, featureCount) {
  if (!rows.length || featureCount === 0) {
    return 1;
  }

  let sum = 0;
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
    let diagonal = 0;
    for (const row of rows) {
      diagonal += row[featureIndex] * row[featureIndex];
    }
    sum += diagonal / rows.length;
  }

  return sum / featureCount;
}

function targetVariance(targets) {
  if (targets.length < 2) {
    return 0;
  }

  const mean = targets.reduce((sum, value) => sum + value, 0) / targets.length;
  return targets.reduce((sum, value) => sum + (value - mean) ** 2, 0) / targets.length;
}

export function chooseRidgeLambda(rows, targets, featureCount, sampleCount) {
  const ratio = featureCount / sampleCount;
  const avgFeatureScale = averageFeatureDiagonal(rows, featureCount);
  const variance = targetVariance(targets);

  // Scale lambda to feature magnitudes — the old target-squared penalty collapsed
  // coefficients to zero and produced a flat mean price for every profile.
  return Math.max(
    avgFeatureScale * ratio * 0.5,
    variance * ratio * 1e-8,
    0.01,
  );
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < 1e-12) {
      return null;
    }

    if (maxRow !== pivot) {
      const swap = augmented[pivot];
      augmented[pivot] = augmented[maxRow];
      augmented[maxRow] = swap;
    }

    const pivotValue = augmented[pivot][pivot];
    for (let col = pivot; col <= size; col += 1) {
      augmented[pivot][col] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let col = pivot; col <= size; col += 1) {
        augmented[row][col] -= factor * augmented[pivot][col];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitRidgeWeights(rows, targets, lambda) {
  const sampleCount = rows.length;
  const featureCount = rows[0].length;
  const dim = featureCount + 1;

  const xtx = Array.from({ length: dim }, () => Array(dim).fill(0));
  const xty = Array(dim).fill(0);

  for (let rowIndex = 0; rowIndex < sampleCount; rowIndex += 1) {
    const row = rows[rowIndex];
    const augmented = [...row, 1];
    const target = targets[rowIndex];

    for (let col = 0; col < dim; col += 1) {
      xty[col] += augmented[col] * target;
      for (let inner = 0; inner < dim; inner += 1) {
        xtx[col][inner] += augmented[col] * augmented[inner];
      }
    }
  }

  for (let index = 0; index < featureCount; index += 1) {
    xtx[index][index] += lambda;
  }

  return solveLinearSystem(xtx, xty);
}

export function predictFromRegressionModel(vector, regressionModel) {
  let sum = 0;

  for (let index = 0; index < vector.length; index += 1) {
    sum += vector[index] * regressionModel.weights[index][0];
  }

  sum += regressionModel.weights[vector.length][0];
  return sum;
}

function ridgeToRegressionJson(weights, featureCount) {
  const regressionWeights = weights.slice(0, featureCount).map((value) => [value]);
  regressionWeights.push([weights[featureCount]]);

  return {
    name: 'multivariateLinearRegression',
    weights: regressionWeights,
    inputs: featureCount,
    outputs: 1,
    intercept: true,
  };
}

export function fitPricingRegression(rows, targets) {
  const featureCount = rows[0]?.length ?? 0;
  const sampleCount = rows.length;
  const useRidge = shouldUseRidgeRegression(sampleCount, featureCount);

  if (!useRidge) {
    const targets2d = targets.map((price) => [price]);
    const regression = new MultivariateLinearRegression(rows, targets2d);

    return {
      regressionModel: regression.toJSON(),
      regressionMethod: 'ols',
      regularizationLambda: null,
      predict: (vector) => regression.predict(vector)[0],
    };
  }

  const lambda = chooseRidgeLambda(rows, targets, featureCount, sampleCount);
  const weights = fitRidgeWeights(rows, targets, lambda);

  if (!weights) {
    const targets2d = targets.map((price) => [price]);
    const regression = new MultivariateLinearRegression(rows, targets2d);

    return {
      regressionModel: regression.toJSON(),
      regressionMethod: 'ols',
      regularizationLambda: null,
      predict: (vector) => regression.predict(vector)[0],
    };
  }

  const regressionModel = ridgeToRegressionJson(weights, featureCount);

  return {
    regressionModel,
    regressionMethod: 'ridge',
    regularizationLambda: lambda,
    predict: (vector) => predictFromRegressionModel(vector, regressionModel),
  };
}

export function loadPricingRegression(segment) {
  if (segment.regressionMethod === 'ridge') {
    return {
      predict: (vector) => predictFromRegressionModel(vector, segment.regressionModel),
    };
  }

  const regression = MultivariateLinearRegression.load(segment.regressionModel);
  return {
    predict: (vector) => regression.predict(vector)[0],
  };
}

export function leaveOneOutMae(rows, targets) {
  if (rows.length < 4) {
    return null;
  }

  let sum = 0;

  for (let holdoutIndex = 0; holdoutIndex < rows.length; holdoutIndex += 1) {
    const trainRows = rows.filter((_, index) => index !== holdoutIndex);
    const trainTargets = targets.filter((_, index) => index !== holdoutIndex);
    const { predict } = fitPricingRegression(trainRows, trainTargets);
    const predicted = predict(rows[holdoutIndex]);

    if (!Number.isFinite(predicted)) {
      return null;
    }

    sum += Math.abs(predicted - targets[holdoutIndex]);
  }

  return sum / rows.length;
}
