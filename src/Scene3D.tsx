import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import {
  Engine, Scene, FreeCamera, HemisphericLight, DirectionalLight,
  Vector3, VertexData, Color3, Color4, StandardMaterial, Mesh,
  TransformNode, Quaternion, PointerEventTypes
} from '@babylonjs/core'
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/OBJ'
import '@babylonjs/loaders/STL'
import { removeDenseRegions } from './mesh'
import { createHistory, captureMeshSnapshot, type HistoryActions, type MeshSnapshot } from './history'
import { config } from './config'

export interface Scene3DHandle {
  undo(): void
  redo(): void
  removeBase(): void
  loadFile(file: File): void
  canUndo: boolean
  canRedo: boolean
}

interface Scene3DProps {
  modelUrl?: string
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D(
  { modelUrl = config.defaultModelUrl, onHistoryChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  const pivotRef = useRef<TransformNode | null>(null)
  const matRef = useRef<StandardMaterial | null>(null)
  const cameraRef = useRef<FreeCamera | null>(null)
  const meshRef = useRef<Mesh | null>(null)
  const historyRef = useRef<HistoryActions<MeshSnapshot> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true)
    engineRef.current = engine

    const scene = new Scene(engine)
    const { scene: sceneCfg, lighting, material: matCfg, trackball, theme } = config
    scene.clearColor = Color4.FromHexString(theme.sceneBg + 'ff')

    // Fixed camera looking at origin
    const camera = new FreeCamera('camera', new Vector3(0, 0, sceneCfg.cameraInitialZ), scene)
    camera.setTarget(Vector3.Zero())
    camera.minZ = sceneCfg.cameraMinZ
    // Disable default camera controls - we handle interaction manually
    camera.inputs.clear()

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
    light.intensity = lighting.hemisphericIntensity
    light.groundColor = new Color3(...lighting.hemisphericGroundColor)

    // Directional light from camera
    const camLight = new DirectionalLight('camLight', new Vector3(0, 0, 1), scene)
    camLight.intensity = lighting.directionalIntensity

    // Root node for all model meshes - we rotate this
    const pivot = new TransformNode('pivot', scene)
    pivot.rotationQuaternion = Quaternion.Identity()
    pivotRef.current = pivot

    // Tooth material
    const mat = new StandardMaterial('toothMat', scene)
    mat.diffuseColor = new Color3(...matCfg.diffuseColor)
    mat.specularColor = new Color3(...matCfg.specularColor)
    mat.backFaceCulling = false
    matRef.current = mat

    sceneRef.current = scene
    cameraRef.current = camera

    // Trackball interaction state
    let isDragging = false
    let lastX = 0
    let lastY = 0
    const rotationSpeed = trackball.rotationSpeed

    scene.onPointerObservable.add((pointerInfo) => {
      const evt = pointerInfo.event as PointerEvent

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          if (evt.button === 0) { // LMB - rotate
            isDragging = true
            lastX = evt.clientX
            lastY = evt.clientY
            canvas.setPointerCapture(evt.pointerId)
          }
          break

        case PointerEventTypes.POINTERUP:
          if (evt.button === 0) {
            isDragging = false
            canvas.releasePointerCapture(evt.pointerId)
          }
          break

        case PointerEventTypes.POINTERMOVE:
          if (isDragging) {
            const dx = evt.clientX - lastX
            const dy = evt.clientY - lastY
            lastX = evt.clientX
            lastY = evt.clientY

            if (dx === 0 && dy === 0) return

            // Get camera's right and up vectors in world space
            const view = camera.getViewMatrix()
            const right = new Vector3(view.m[0], view.m[4], view.m[8])
            const up = new Vector3(view.m[1], view.m[5], view.m[9])

            // Rotate around screen-space axes
            const angleX = -dx * rotationSpeed
            const angleY = -dy * rotationSpeed

            const qX = Quaternion.RotationAxis(up, angleX)
            const qY = Quaternion.RotationAxis(right, angleY)
            const deltaQ = qX.multiply(qY)

            pivot.rotationQuaternion = deltaQ.multiply(pivot.rotationQuaternion!)
          }
          break

        case PointerEventTypes.POINTERWHEEL:
          // Zoom by moving camera
          const wheelEvt = evt as unknown as WheelEvent
          const zoomDelta = wheelEvt.deltaY * -sceneCfg.zoomSpeed
          camera.position.z += zoomDelta
          // Clamp
          if (camera.position.z > sceneCfg.zoomMin) camera.position.z = sceneCfg.zoomMin
          if (camera.position.z < sceneCfg.zoomMax) camera.position.z = sceneCfg.zoomMax
          break
      }
    })

    const loadModel = async (url: string) => {
      try {
        // Remove previous meshes from pivot
        pivot.getChildMeshes().forEach(m => m.dispose())
        meshRef.current = null

        const result = await ImportMeshAsync(url, scene, { pluginExtension: '.obj' })
        console.log('Loaded meshes:', result.meshes.length)

        result.meshes.forEach((mesh) => {
          mesh.useVertexColors = false
          mesh.material = mat

          if (mesh instanceof Mesh && mesh.getTotalVertices() > 0) {
            const positions = mesh.getVerticesData('position')
            const indices = mesh.getIndices()
            if (positions && indices) {
              const normals: number[] = []
              VertexData.ComputeNormals(positions, indices, normals)
              mesh.setVerticesData('normal', normals)

              // Initialize history with initial mesh state
              historyRef.current = createHistory(
                captureMeshSnapshot(positions, indices, normals)
              )
            }
            meshRef.current = mesh
          }
        })

        // Center mesh at origin
        const worldExtends = scene.getWorldExtends()
        const center = worldExtends.min.add(worldExtends.max).scale(0.5)
        result.meshes.forEach((mesh) => {
          mesh.position.subtractInPlace(center)
          mesh.parent = pivot
        })

        // Set camera distance
        const size = worldExtends.max.subtract(worldExtends.min).length()
        camera.position.z = -size * sceneCfg.cameraDistanceMultiplier

        // Axes at origin
        // new AxesViewer(scene, size * 0.15)
      } catch (e) {
        console.error('Failed to load model:', e)
      }
    }

    loadModel(modelUrl)

    engine.runRenderLoop(() => scene.render())

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(() => engine.resize())
    resizeObserver.observe(canvas.parentElement!)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      scene.dispose()
      engine.dispose()
      engineRef.current = null
      sceneRef.current = null
      pivotRef.current = null
      matRef.current = null
      cameraRef.current = null
    }
  }, [modelUrl])

  const applySnapshotToMesh = useCallback((snapshot: MeshSnapshot) => {
    const mesh = meshRef.current
    if (!mesh) return
    const vd = new VertexData()
    vd.positions = snapshot.positions
    vd.indices = snapshot.indices
    vd.normals = snapshot.normals
    vd.applyToMesh(mesh)
  }, [])

  const updateHistoryState = useCallback(() => {
    const h = historyRef.current
    if (!h) return
    const u = h.canUndo()
    const r = h.canRedo()
    setCanUndo(u)
    setCanRedo(r)
    onHistoryChange?.(u, r)
  }, [onHistoryChange])

  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h) return
    const state = h.undo()
    if (state) {
      applySnapshotToMesh(state)
      updateHistoryState()
    }
  }, [applySnapshotToMesh, updateHistoryState])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (!h) return
    const state = h.redo()
    if (state) {
      applySnapshotToMesh(state)
      updateHistoryState()
    }
  }, [applySnapshotToMesh, updateHistoryState])

  const removeBase = useCallback(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const { defaultRadius, defaultThreshold } = config.densityFilter
    const result = removeDenseRegions(mesh, defaultRadius, defaultThreshold)
    if (result) {
      const snapshot = captureMeshSnapshot(result.positions, result.indices, result.normals)
      historyRef.current?.push(snapshot)
      applySnapshotToMesh(snapshot)
      updateHistoryState()
      console.log(`Filtered: ${result.indices.length / 3} triangles remaining`)
    }
  }, [applySnapshotToMesh, updateHistoryState])

  const loadFile = useCallback((file: File) => {
    const scene = sceneRef.current
    const pivot = pivotRef.current
    const mat = matRef.current
    const camera = cameraRef.current
    if (!scene || !pivot || !mat || !camera) return

    const url = URL.createObjectURL(file)
    const ext = '.' + file.name.split('.').pop()!.toLowerCase()

    // Remove previous meshes
    pivot.getChildMeshes().forEach(m => m.dispose())
    meshRef.current = null

    ImportMeshAsync(url, scene, { pluginExtension: ext }).then((result) => {
      result.meshes.forEach((mesh) => {
        mesh.useVertexColors = false
        mesh.material = mat

        if (mesh instanceof Mesh && mesh.getTotalVertices() > 0) {
          const positions = mesh.getVerticesData('position')
          const indices = mesh.getIndices()
          if (positions && indices) {
            const normals: number[] = []
            VertexData.ComputeNormals(positions, indices, normals)
            mesh.setVerticesData('normal', normals)
            historyRef.current = createHistory(
              captureMeshSnapshot(positions, indices, normals)
            )
            updateHistoryState()
          }
          meshRef.current = mesh
        }
      })

      const worldExtends = scene.getWorldExtends()
      const center = worldExtends.min.add(worldExtends.max).scale(0.5)
      result.meshes.forEach((mesh) => {
        mesh.position.subtractInPlace(center)
        mesh.parent = pivot
      })

      const size = worldExtends.max.subtract(worldExtends.min).length()
      camera.position.z = -size * config.scene.cameraDistanceMultiplier
      URL.revokeObjectURL(url)
    }).catch((e) => {
      console.error('Failed to load file:', e)
      URL.revokeObjectURL(url)
    })
  }, [updateHistoryState])

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    removeBase,
    loadFile,
    canUndo,
    canRedo,
  }), [undo, redo, removeBase, loadFile, canUndo, canRedo])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />
    </div>
  )
})

export default Scene3D
