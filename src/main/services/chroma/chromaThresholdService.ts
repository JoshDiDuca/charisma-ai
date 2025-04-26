interface ThresholdParams {
  queryLength: number
  scoreMean: number
  scoreStdDev: number
  uniqueTerms: number
}

export const calculateDynamicThreshold = (params: ThresholdParams): number => {
  // Base threshold adjusted by query complexity
  let baseThreshold = Math.min(
    0.2,
    1 / (1 + Math.exp(-params.queryLength / 50))
  )

  // Score distribution analysis
  const zScoreAdjustment = Math.max(
    0,
    (params.scoreMean - params.scoreStdDev) / 2
  )

  // Diversity factor (using coefficient of variation)
  const diversityFactor = params.scoreStdDev / (params.scoreMean + 1e-6)

  // Final threshold calculation
  return baseThreshold * (1 + zScoreAdjustment) * (1 - diversityFactor)
}
