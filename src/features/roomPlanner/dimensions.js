const DEFAULT_FOOTPRINT = Object.freeze({ x: 1, y: 1, z: 1 })

const positiveNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

export function initialFootprint(variant) {
  const width = positiveNumber(variant?.width_cm)
  const height = positiveNumber(variant?.height_cm)
  const depth = positiveNumber(variant?.depth_cm)
  const confirmed = variant?.model_scale_confirmed === true && width !== null && height !== null && depth !== null
  const modelX = positiveNumber(variant?.model_size?.x)
  const modelY = positiveNumber(variant?.model_size?.y)
  const modelZ = positiveNumber(variant?.model_size?.z)
  const hasModelSize = confirmed && modelX !== null && modelY !== null && modelZ !== null

  return {
    footprint: confirmed
      ? (hasModelSize
          ? { x: modelX, y: modelY, z: modelZ }
          : { x: width / 100, y: height / 100, z: depth / 100 })
      : { ...DEFAULT_FOOTPRINT },
    footprintConfirmed: confirmed,
  }
}
