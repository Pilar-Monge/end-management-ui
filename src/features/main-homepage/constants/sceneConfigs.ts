export type Mode = 'Hazy' | 'Early' | 'Summer' | 'Noche' | 'Storm' | 'Cotton'

export interface ModeConfig {
  skyColor: string
  fogColor: string
  fogDensity: number
  lightIntensity: number
  lightColor: string
  ambientIntensity: number
  showStars?: boolean
  isRaining?: boolean
}

export const MODES: Record<string, ModeConfig> = {
  Hazy: {
    skyColor: '#f0dcc5',
    fogColor: '#f0dcc5',
    fogDensity: 0.025,
    lightIntensity: 1.5,
    lightColor: '#ffe0b3',
    ambientIntensity: 0.3,
  },
  Early: {
    skyColor: '#ffd8da',
    fogColor: '#ffe0c0',
    fogDensity: 0.015,
    lightIntensity: 1.2,
    lightColor: '#ffecd2',
    ambientIntensity: 0.3,
  },
  Summer: {
    skyColor: '#88bbdd',
    fogColor: '#99ccdd',
    fogDensity: 0.008,
    lightIntensity: 2.0,
    lightColor: '#ffffcc',
    ambientIntensity: 0.4,
  },
  Noche: {
    skyColor: '#1a1a3a',
    fogColor: '#202045',
    fogDensity: 0.01,
    lightIntensity: 0.8,
    lightColor: '#e0e0ff',
    ambientIntensity: 0.25,
    showStars: true,
  },
  Storm: {
    skyColor: '#2c3e50',
    fogColor: '#34495e',
    fogDensity: 0.03,
    lightIntensity: 0.6,
    lightColor: '#aabcc4',
    ambientIntensity: 0.2,
    isRaining: true,
  },
  Cotton: {
    skyColor: '#ffffff',
    fogColor: '#f8f9fa',
    fogDensity: 0.04,
    lightIntensity: 1.2,
    lightColor: '#ffffff',
    ambientIntensity: 0.5,
  },
}

export const DEFAULT_CAMERA_CONFIG = {
  position: { x: 0, y: 10, z: 250 },
  fov: 75,
  near: 0.1,
  far: 1000,
}

export const TERRAIN_CONFIG = {
  width: 1000,
  height: 1000,
  segments: 100,
  limit: 500,
  collisionHeight: 6,
}

export const TREE_CONFIG = {
  count: 150,
  deadProbability: 0.15,
  heightMin: 15,
  heightMax: 30,
  spreadX: 800,
  spreadZ: 800,
}

export const CABIN_CONFIG = {
  count: 40,
  spreadX: 600,
  spreadZ: 600,
  width: 6,
  height: 4,
  depth: 6,
}

export const BIRD_CONFIG = {
  count: 40,
  spreadX: 600,
  spreadZ: 600,
  heightMin: 30,
  heightMax: 70,
  speedMin: 0.02,
  speedMax: 0.07,
  radiusMin: 50,
  radiusMax: 150,
}

export const THREAT_CONFIG = {
  count: 100,
  spreadX: 800,
  spreadZ: 800,
  speedMin: 0.01,
  speedMax: 0.04,
}

export const CLOUD_CONFIG = {
  count: 80,
  spreadX: 1500,
  spreadZ: 1500,
  widthMin: 400,
  widthMax: 1000,
  heightMin: 150,
  heightMax: 400,
  driftSpeed: 0.05,
}

export const STAR_CONFIG = {
  count: 6000,
  radiusMin: 800,
  radiusMax: 900,
}

export const RAIN_CONFIG = {
  count: 15000,
  spreadX: 800,
  spreadZ: 800,
  heightMax: 250,
  fallSpeed: 4.0,
}

export const MIST_CONFIG = {
  count: 1200,
  spreadX: 1200,
  spreadZ: 1200,
  heightMax: 60,
}

export const GOD_RAYS_CONFIG = {
  count: 15,
}

export const LIGHT_CONFIG = {
  ambient: { color: 0xffffff, intensity: 0.5 },
  sun: {
    color: 0xffcc88,
    intensity: 20,
    distance: 4000,
    position: { x: 0, y: 150, z: -950 },
  },
  sunDirectional: {
    color: 0xffcc88,
    intensity: 1.5,
    shadowMapSize: 1024,
  },
  moon: {
    color: 0xe0e0ff,
    intensity: 15,
    distance: 2000,
    position: { x: 200, y: 300, z: -800 },
  },
}

export const GLTF_URLS = {
  sign: 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/quarantine_sign%20(1).glb',
  lightPole: 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/ligthpole%20(1).glb',
  areaSign: 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/areasing%20(1).glb',
}
