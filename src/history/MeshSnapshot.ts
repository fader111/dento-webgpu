export interface MeshSnapshot {
  positions: Float32Array
  indices: Uint32Array
  normals: Float32Array
}

export function captureMeshSnapshot(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  normals: ArrayLike<number>
): MeshSnapshot {
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
  }
}
