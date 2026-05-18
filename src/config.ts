/** Application configuration constants */

export const config = {
  /** Default model to load */
  defaultModelUrl: '/assets/01F4JV8X_lower.obj',

  /** Scene / camera */
  scene: {
    cameraInitialZ: -150,
    cameraMinZ: 0.1,
    zoomSpeed: 0.1,
    zoomMin: -10,
    zoomMax: -500,
    cameraDistanceMultiplier: 1.5,
  },

  /** Lighting */
  lighting: {
    hemisphericIntensity: 0.5,
    hemisphericGroundColor: [0.2, 0.2, 0.2] as const,
    directionalIntensity: 0.7,
  },

  /** Material */
  material: {
    diffuseColor: [0.95, 0.92, 0.88] as const,
    specularColor: [0.2, 0.2, 0.2] as const,
  },

  /** Trackball rotation */
  trackball: {
    rotationSpeed: 0.005,
  },

  /** Density filter */
  densityFilter: {
    defaultThreshold: 0.018,
    defaultRadius: 2.5,
    thresholdMin: 0,
    thresholdMax: 0.05,
    radiusMin: 0.5,
    radiusMax: 5.0,
    /** Slider steps (internal multipliers for HTML range input) */
    thresholdSliderMax: 50,
    radiusSliderMin: 5,
    radiusSliderMax: 50,
  },

  /** Boundary smoothing after density filter */
  smoothing: {
    iterations: 15,
    factor: 0.8,
  },

  /** Undo/Redo history */
  history: {
    maxSize: 50,
  },

  /** UI theme colors */
  theme: {
    mode: 'light' as const,
    primary: '#c2c3c5',
    background: '#e0e0e0',
    paper: '#eeeeee',
    sceneBg: '#bfbfbf',
    textPrimary: '#1a1a1a',
    textSecondary: '#555555',
    iconColor: '#666666',
  },
} as const
