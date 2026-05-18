/**
 * Smooths boundary vertices of a mesh using Laplacian smoothing.
 * Boundary vertices are those on edges shared by only one triangle.
 */
export function smoothBoundary(
  positions: Float32Array,
  indices: Uint32Array,
  iterations = 3,
  factor = 0.5
): Float32Array {
  const vertexCount = positions.length / 3
  const faceCount = indices.length / 3

  // Build edge map to find boundary edges (edges with only 1 adjacent triangle)
  const edgeCount = new Map<string, number>()
  const edgeKey = (a: number, b: number) => a < b ? `${a}_${b}` : `${b}_${a}`

  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3]
    const i1 = indices[f * 3 + 1]
    const i2 = indices[f * 3 + 2]
    for (const [a, b] of [[i0, i1], [i1, i2], [i2, i0]]) {
      const key = edgeKey(a, b)
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1)
    }
  }

  // Find boundary vertices (vertices on edges with count === 1)
  const isBoundary = new Uint8Array(vertexCount)
  const boundaryNeighbors = new Map<number, Set<number>>()

  for (const [key, count] of edgeCount) {
    if (count === 1) {
      const [aStr, bStr] = key.split('_')
      const a = parseInt(aStr)
      const b = parseInt(bStr)
      isBoundary[a] = 1
      isBoundary[b] = 1

      if (!boundaryNeighbors.has(a)) boundaryNeighbors.set(a, new Set())
      if (!boundaryNeighbors.has(b)) boundaryNeighbors.set(b, new Set())
      boundaryNeighbors.get(a)!.add(b)
      boundaryNeighbors.get(b)!.add(a)
    }
  }

  // Laplacian smoothing on boundary vertices only
  const smoothed = new Float32Array(positions)

  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Float32Array(smoothed)

    for (const [vi, neighbors] of boundaryNeighbors) {
      if (neighbors.size === 0) continue

      let avgX = 0, avgY = 0, avgZ = 0
      for (const ni of neighbors) {
        avgX += temp[ni * 3]
        avgY += temp[ni * 3 + 1]
        avgZ += temp[ni * 3 + 2]
      }
      avgX /= neighbors.size
      avgY /= neighbors.size
      avgZ /= neighbors.size

      // Blend toward neighbor average
      smoothed[vi * 3] = temp[vi * 3] + factor * (avgX - temp[vi * 3])
      smoothed[vi * 3 + 1] = temp[vi * 3 + 1] + factor * (avgY - temp[vi * 3 + 1])
      smoothed[vi * 3 + 2] = temp[vi * 3 + 2] + factor * (avgZ - temp[vi * 3 + 2])
    }
  }

  return smoothed
}
