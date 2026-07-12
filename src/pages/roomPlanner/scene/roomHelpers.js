export function visibleWalls(walls) {
  return {
    back: walls?.back ?? true,
    left: walls?.left ?? true,
    right: walls?.right ?? true,
  }
}

export function snapHalf(value) {
  return Math.round(value * 2) / 2
}
