declare module '*.jpg'
declare module '*.jpeg'
declare module '*.png'
declare module '*.svg'

declare namespace JSX {
  interface IntrinsicElements {
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
}
