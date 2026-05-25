import { useEffect } from 'react'
import * as THREE from 'three'
import type { Mode } from '../constants/sceneConfigs'
import { MODES } from '../constants/sceneConfigs'
import { getTerrainY } from '../utils/three/lightingHelpers'

interface UseMainSceneAnimationProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>
  controlsRef: React.MutableRefObject<any>
  keys: React.MutableRefObject<Record<string, boolean>>
  mouse: React.MutableRefObject<{
    x: number
    y: number
    lastX: number
    lastY: number
    deltaX: number
    deltaY: number
  }>
  isMouseDown: React.MutableRefObject<boolean>
  isPaused: boolean
  appState: string
  currentMode: Mode
  isAnyMenuOpen: boolean
  treeGroupRef: React.MutableRefObject<THREE.Group | null>
  starsRef: React.MutableRefObject<THREE.Points | null>
  moonRef: React.MutableRefObject<THREE.Object3D | null>
  cloudGroupRef: React.MutableRefObject<THREE.Group | null>
  mistRef: React.MutableRefObject<THREE.Points | null>
  godRaysRef: React.MutableRefObject<THREE.Group | null>
  birdsRef: React.MutableRefObject<THREE.Group | null>
  threatsRef: React.MutableRefObject<THREE.Group | null>
  rainRef: React.MutableRefObject<THREE.LineSegments | null>
  coordsRef: React.MutableRefObject<{ lat: number; lng: number }>
}

export function useMainSceneAnimation({
  sceneRef,
  cameraRef,
  rendererRef,
  controlsRef,
  keys,
  mouse,
  isMouseDown,
  isPaused,
  appState,
  currentMode,
  isAnyMenuOpen,
  treeGroupRef,
  starsRef,
  moonRef,
  cloudGroupRef,
  mistRef,
  godRaysRef,
  birdsRef,
  threatsRef,
  rainRef,
  coordsRef,
}: UseMainSceneAnimationProps): void {
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

    let frame = 0
    const animate = () => {
      requestAnimationFrame(animate)

      const scene = sceneRef.current!
      const camera = cameraRef.current!
      const renderer = rendererRef.current!

      if (!isPaused && appState !== 'video' && appState !== 'bridge') {
        frame += 0.01
        const speed = 0.6

        if (!isAnyMenuOpen) {
          const dir = new THREE.Vector3()
          const side = new THREE.Vector3()
          camera.getWorldDirection(dir)
          side.crossVectors(camera.up, dir).normalize()

          if (keys.current['KeyW']) camera.position.addScaledVector(dir, speed)
          if (keys.current['KeyS']) camera.position.addScaledVector(dir, -speed)
          if (keys.current['KeyA']) camera.position.addScaledVector(side, speed)
          if (keys.current['KeyD']) camera.position.addScaledVector(side, -speed)

          if (keys.current['Space']) camera.position.y += speed
          if (keys.current['ShiftLeft']) camera.position.y -= speed

          if (isMouseDown.current && appState === 'explore') {
            camera.position.addScaledVector(dir, speed)
          }

          if (appState !== 'explore' && appState !== 'global-map') {
            if (!keys.current['KeyW'] && !keys.current['KeyS']) camera.position.z -= 0.25

            const targetX = mouse.current.x * 8
            camera.position.x += (targetX - camera.position.x) * 0.02
            camera.position.y += (10 - camera.position.y) * 0.02
            camera.lookAt(0, 8, camera.position.z - 50)
          } else {
            if (isMouseDown.current) {
              camera.rotation.y -= mouse.current.x * 0.05
              camera.rotation.x = Math.max(
                -Math.PI / 2.5,
                Math.min(Math.PI / 2.5, camera.rotation.x + mouse.current.y * 0.05),
              )
            }
          }
        }

        const LIMIT = 500
        if (Math.abs(camera.position.x) > LIMIT || Math.abs(camera.position.z) > LIMIT) {
          camera.position.set(0, 10, 450)
          camera.lookAt(0, 0, 0)
        }

        const terrainY = getTerrainY(camera.position.x, camera.position.z)
        if (camera.position.y < terrainY + 6) {
          camera.position.y = terrainY + 6
        }

        mouse.current.deltaX = 0
        mouse.current.deltaY = 0

        if (treeGroupRef.current) {
          treeGroupRef.current.children.forEach((tree) => {
            const treeSway =
              Math.sin(frame * tree.userData.swaySpeed + tree.userData.swayOffset) * 0.01
            tree.rotation.z = treeSway
            tree.rotation.x = treeSway * 0.5
          })
        }

        if (starsRef.current && starsRef.current.visible) {
          starsRef.current.rotation.y += 0.00005
          ;(starsRef.current.material as THREE.PointsMaterial).opacity =
            0.6 + Math.sin(frame * 0.8) * 0.2
        }

        if (moonRef.current && moonRef.current.visible) {
          moonRef.current.position.y = 300 + Math.sin(frame * 0.2) * 2
        }

        if (cloudGroupRef.current) {
          cloudGroupRef.current.children.forEach((cloud, idx) => {
            cloud.position.x += 0.05 + (idx % 5) * 0.01
            cloud.position.z += Math.sin(Date.now() * 0.001 + idx) * 0.02
            if (cloud.position.x > 600) cloud.position.x = -600
          })
        }

        if (mistRef.current) {
          const positions = mistRef.current.geometry.attributes.position.array as Float32Array
          const count = positions.length / 3
          for (let i = 0; i < count; i++) {
            positions[i * 3] += 0.15
            if (positions[i * 3] > 600) positions[i * 3] = -600
            positions[i * 3 + 1] += Math.sin(frame * 0.3 + i) * 0.03
            if (positions[i * 3 + 1] > 80) positions[i * 3 + 1] = 0
          }
          mistRef.current.geometry.attributes.position.needsUpdate = true
        }

        if (godRaysRef.current && godRaysRef.current.visible) {
          godRaysRef.current.children.forEach((ray, i) => {
            const m = (ray as THREE.Mesh).material as THREE.MeshBasicMaterial
            m.opacity = 0.02 + Math.sin(frame * 2 + i) * 0.01
            ray.rotation.z += Math.sin(frame * 0.5 + i) * 0.0005
          })
        }

        birdsRef.current?.children.forEach((bird) => {
          const d = bird.userData
          d.angle += d.speed
          bird.position.x = Math.cos(d.angle) * d.radius
          bird.position.z = Math.sin(d.angle) * d.radius
          bird.position.y = 60 + Math.sin(d.angle * 0.5) * 20
          bird.rotation.z = Math.sin(d.angle * 2) * 0.5
        })

        threatsRef.current?.children.forEach((threat) => {
          const d = threat.userData
          d.angle += d.speed
          threat.position.x += Math.cos(d.angle) * 0.1
          threat.position.z += Math.sin(d.angle) * 0.1
          threat.position.y = getTerrainY(threat.position.x, threat.position.z) + 1

          if (Math.random() > 0.98) {
            threat.scale.setScalar(Math.random() * 2)
            threat.visible = Math.random() > 0.1
          } else {
            threat.scale.setScalar(1)
            threat.visible = true
          }
        })

        if (rainRef.current?.visible) {
          const pos = rainRef.current.geometry.attributes.position.array as Float32Array
          for (let i = 0; i < pos.length; i += 6) {
            const fall = 4.0
            pos[i + 1] -= fall
            pos[i + 4] -= fall
            if (pos[i + 1] < 0) {
              pos[i + 1] = 250
              pos[i + 4] = 247
            }
          }
          rainRef.current.geometry.attributes.position.needsUpdate = true

          if (Math.random() > 0.997 && sceneRef.current) {
            const originalFogColor = new THREE.Color(MODES[currentMode].fogColor)
            const originalBg = new THREE.Color(MODES[currentMode].skyColor)

            scene.background = new THREE.Color(0xffffff)
            if (scene.fog instanceof THREE.FogExp2) scene.fog.color.set(0xffffff)

            setTimeout(() => {
              scene.background = originalBg
              if (scene.fog instanceof THREE.FogExp2) {
                scene.fog.color.copy(originalFogColor)
              }
            }, 50)
          }
        }

        if (appState === 'explore') {
          coordsRef.current = {
            lat: 9.9281 + camera.position.z / 5000,
            lng: 84.0907 + camera.position.x / 5000,
          }
        } else if (appState === 'menu') {
          coordsRef.current = {
            lat: 9.9281 + (Math.random() - 0.5) * 0.0005,
            lng: 84.0907 + (Math.random() - 0.5) * 0.0005,
          }
        }
      }

      renderer.render(scene, camera)
    }

    animate()
  }, [
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    keys,
    mouse,
    isMouseDown,
    isPaused,
    appState,
    currentMode,
    isAnyMenuOpen,
    treeGroupRef,
    starsRef,
    moonRef,
    cloudGroupRef,
    mistRef,
    godRaysRef,
    birdsRef,
    threatsRef,
    rainRef,
    coordsRef,
  ])
}
