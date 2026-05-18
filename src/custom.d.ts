declare module '*.jpg'
declare module '*.jpeg'
declare module '*.png'
declare module '*.svg'

type CustomThreeElement = any

declare namespace JSX {
  interface IntrinsicElements {
    points: CustomThreeElement
    bufferGeometry: CustomThreeElement
    bufferAttribute: CustomThreeElement
    pointsMaterial: CustomThreeElement
    ambientLight: CustomThreeElement
    directionalLight: CustomThreeElement
    hemisphereLight: CustomThreeElement
    pointLight: CustomThreeElement
    primitive: CustomThreeElement
    group: CustomThreeElement
    mesh: CustomThreeElement
    boxGeometry: CustomThreeElement
    meshBasicMaterial: CustomThreeElement
    color: CustomThreeElement
  }
}

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      points: CustomThreeElement
      bufferGeometry: CustomThreeElement
      bufferAttribute: CustomThreeElement
      pointsMaterial: CustomThreeElement
      ambientLight: CustomThreeElement
      directionalLight: CustomThreeElement
      hemisphereLight: CustomThreeElement
      pointLight: CustomThreeElement
      primitive: CustomThreeElement
      group: CustomThreeElement
      mesh: CustomThreeElement
      boxGeometry: CustomThreeElement
      meshBasicMaterial: CustomThreeElement
      color: CustomThreeElement
    }
  }
}
