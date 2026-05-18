import { Mesh, VertexData } from '@babylonjs/core'
import { smoothBoundary } from './smoothBoundary'
import { config } from '../config'

/**
 * Removes triangles from the mesh where vertices have local density above the threshold.
 * High density areas typically correspond to flat scan bases.
 *
 * @param mesh - source mesh
 * @param radius - search radius for counting neighbors
 * @param densityThreshold - percentile (0-1) above which vertices are removed.
 *   E.g. 0.8 means top 20% densest vertices get removed.
 * @returns new mesh with base removed, or null if failed
 */
export function removeDenseRegions(
  mesh: Mesh,
  radius: number,
  densityThreshold: number
): { positions: Float32Array; indices: Uint32Array; normals: Float32Array } | null {
  const positions = mesh.getVerticesData('position')
  const indices = mesh.getIndices()
  if (!positions || !indices) return null

  const vertexCount = positions.length / 3

  // Build simple spatial grid for neighbor counting
  const cellSize = radius
  const grid = new Map<string, number[]>()

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    const cx = Math.floor(x / cellSize)
    const cy = Math.floor(y / cellSize)
    const cz = Math.floor(z / cellSize)
    const key = `${cx},${cy},${cz}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key)!.push(i)
  }

  // Count neighbors for each vertex
  const density = new Float32Array(vertexCount)
  const r2 = radius * radius

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    const cx = Math.floor(x / cellSize)
    const cy = Math.floor(y / cellSize)
    const cz = Math.floor(z / cellSize)

    let count = 0
    // Check neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`
          const cell = grid.get(key)
          if (!cell) continue
          for (const j of cell) {
            if (j === i) continue
            const ddx = positions[j * 3] - x
            const ddy = positions[j * 3 + 1] - y
            const ddz = positions[j * 3 + 2] - z
            if (ddx * ddx + ddy * ddy + ddz * ddz < r2) {
              count++
            }
          }
        }
      }
    }
    density[i] = count
  }

  // Find threshold value from percentile
  const sorted = Array.from(density).sort((a, b) => a - b)
  const thresholdIndex = Math.floor(vertexCount * densityThreshold)
  const thresholdValue = sorted[thresholdIndex]

  // Mark vertices to keep: keep high-density (teeth), remove low-density (base)
  const keepVertex = new Uint8Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    keepVertex[i] = density[i] >= thresholdValue ? 1 : 0
  }

  // Filter triangles - keep only if at least 2 vertices are kept
  const newIndices: number[] = []
  const faceCount = indices.length / 3
  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3]
    const i1 = indices[f * 3 + 1]
    const i2 = indices[f * 3 + 2]
    const kept = keepVertex[i0] + keepVertex[i1] + keepVertex[i2]
    if (kept >= 2) {
      newIndices.push(i0, i1, i2)
    }
  }

  // Smooth boundary vertices on the cut edge
  const newIndicesArr = new Uint32Array(newIndices)
  const smoothedPositions = smoothBoundary(
    new Float32Array(positions), newIndicesArr,
    config.smoothing.iterations, config.smoothing.factor
  )

  // Recompute normals
  const normals = new Float32Array(smoothedPositions.length)
  VertexData.ComputeNormals(smoothedPositions, newIndices, normals)

  return {
    positions: smoothedPositions,
    indices: newIndicesArr,
    normals,
  }
}
