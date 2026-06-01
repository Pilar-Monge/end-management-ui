declare module '*.jpg'
declare module '*.jpeg'
declare module '*.png'
declare module '*.svg'

type ThreeJsxIntrinsicElements = {
  points: any
  bufferGeometry: any
  bufferAttribute: any
  pointsMaterial: any
  ambientLight: any
  directionalLight: any
  primitive: any
  color: any
  group: any
  mesh: any
  boxGeometry: any
  meshBasicMaterial: any
  meshStandardMaterial: any
  hemisphereLight: any
  pointLight: any
  spotLight: any
  gridHelper: any
  planeGeometry: any
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeJsxIntrinsicElements {}
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJsxIntrinsicElements {}
  }
}

export {}
