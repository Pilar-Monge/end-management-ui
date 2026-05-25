import * as THREE from 'three'
import { LIGHT_CONFIG } from '../../constants/sceneConfigs'

export function createAmbientLight(): THREE.AmbientLight {
  return new THREE.AmbientLight(LIGHT_CONFIG.ambient.color, LIGHT_CONFIG.ambient.intensity)
}

export function createSunGlow(): THREE.PointLight {
  const light = new THREE.PointLight(
    LIGHT_CONFIG.sun.color,
    LIGHT_CONFIG.sun.intensity,
    LIGHT_CONFIG.sun.distance,
  )
  light.position.set(LIGHT_CONFIG.sun.position.x, LIGHT_CONFIG.sun.position.y, LIGHT_CONFIG.sun.position.z)
  return light
}

export function createSunDirectionalLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(LIGHT_CONFIG.sunDirectional.color, LIGHT_CONFIG.sunDirectional.intensity)
  light.position.copy(
    new THREE.Vector3(LIGHT_CONFIG.sun.position.x, LIGHT_CONFIG.sun.position.y, LIGHT_CONFIG.sun.position.z),
  )
  light.castShadow = true
  light.shadow.mapSize.width = LIGHT_CONFIG.sunDirectional.shadowMapSize
  light.shadow.mapSize.height = LIGHT_CONFIG.sunDirectional.shadowMapSize
  light.shadow.camera.left = -500
  light.shadow.camera.right = 500
  light.shadow.camera.top = 500
  light.shadow.camera.bottom = -500
  return light
}

export function createMoonGlow(): THREE.PointLight {
  const light = new THREE.PointLight(LIGHT_CONFIG.moon.color, LIGHT_CONFIG.moon.intensity, LIGHT_CONFIG.moon.distance)
  light.position.set(LIGHT_CONFIG.moon.position.x, LIGHT_CONFIG.moon.position.y, LIGHT_CONFIG.moon.position.z)
  light.intensity = 0
  return light
}

export function createStars(count: number): THREE.Points {
  const starPos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 100
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPos[i * 3 + 2] = r * Math.cos(phi)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    }),
  )
  stars.visible = false
  return stars
}

export function createTextureFromCanvas(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  drawFn(ctx)
  return new THREE.CanvasTexture(canvas)
}

export function createSunSprite(texture: THREE.CanvasTexture): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      fog: false,
    }),
  )
  sprite.scale.set(400, 400, 1)
  sprite.position.set(0, 150, -950)
  return sprite
}

export function createMoonSprite(texture: THREE.CanvasTexture): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      fog: false,
    }),
  )
  sprite.scale.set(150, 150, 1)
  sprite.position.set(200, 300, -800)
  sprite.visible = false
  return sprite
}

export function createGodRays(): THREE.Group {
  const godRays = new THREE.Group()
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0xffcc88,
    transparent: true,
    opacity: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })

  for (let i = 0; i < 15; i++) {
    const rayGeo = new THREE.CylinderGeometry(0, 50 + Math.random() * 100, 2000, 8, 1, true)
    const ray = new THREE.Mesh(rayGeo, rayMat.clone())
    ray.position.set(0, 150, -950)
    ray.lookAt(
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 400,
    )
    ray.rotateX(Math.PI / 2)
    godRays.add(ray)
  }
  return godRays
}

export function createMist(count: number, fogColor: string): THREE.Points {
  const mistGeo = new THREE.BufferGeometry()
  const mistPos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 1200
    mistPos[i * 3 + 1] = Math.random() * 60
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 1200
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3))

  const particleCanvas = document.createElement('canvas')
  particleCanvas.width = 64
  particleCanvas.height = 64
  const pCtx = particleCanvas.getContext('2d')!
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
  pGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)')
  pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  pCtx.fillStyle = pGrad
  pCtx.fillRect(0, 0, 64, 64)
  const particleTexture = new THREE.CanvasTexture(particleCanvas)

  const mistMat = new THREE.PointsMaterial({
    color: fogColor,
    size: 25,
    map: particleTexture,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(mistGeo, mistMat)
}

export function createRain(count: number): THREE.LineSegments {
  const rainPos = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 800
    const y = Math.random() * 250
    const z = (Math.random() - 0.5) * 800
    rainPos[i * 6] = x
    rainPos[i * 6 + 1] = y
    rainPos[i * 6 + 2] = z
    rainPos[i * 6 + 3] = x
    rainPos[i * 6 + 4] = y - 3
    rainPos[i * 6 + 5] = z
  }
  const rainGeo = new THREE.BufferGeometry()
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
    }),
  )
  rain.visible = false
  return rain
}

export function getTerrainY(x: number, z: number): number {
  return Math.sin(x / 15) * Math.cos(z / 15) * 15 + Math.sin(x / 40) * Math.cos(z / 40) * 20
}
