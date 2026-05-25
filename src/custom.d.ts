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
  }
}
