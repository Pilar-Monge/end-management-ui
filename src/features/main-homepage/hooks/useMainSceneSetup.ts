import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import type { Mode } from '../constants/sceneConfigs'
import { MODES } from '../constants/sceneConfigs'

interface SceneRefs {
  sceneRef: React.MutableRefObject<THREE.Scene | null>
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>
  controlsRef: React.MutableRefObject<OrbitControls | null>
  fpControlsRef: React.MutableRefObject<PointerLockControls | null>
}

interface UseMainSceneSetupReturn extends SceneRefs {
  containerRef: React.MutableRefObject<HTMLDivElement | null>
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
}

export function useMainSceneSetup(
  initialMode: Mode,
  onIsLocked?: (locked: boolean) => void,
): UseMainSceneSetupReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const fpControlsRef = useRef<PointerLockControls | null>(null)

  const keys = useRef<Record<string, boolean>>({})
  const mouse = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, deltaX: 0, deltaY: 0 })
  const isMouseDown = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(MODES[initialMode].skyColor)
    scene.fog = new THREE.FogExp2(MODES[initialMode].fogColor, MODES[initialMode].fogDensity)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    )
    camera.position.set(0, 10, 250)
    camera.rotation.order = 'YXZ'
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x000000, 1)

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
      renderer.domElement.style.display = 'block'
      containerRef.current.appendChild(renderer.domElement)
    }
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, MODES[initialMode].ambientIntensity)
    scene.add(ambientLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enabled = false
    controlsRef.current = controls

    const fpControls = new PointerLockControls(camera, document.body)
    fpControlsRef.current = fpControls
    fpControls.addEventListener('lock', () => onIsLocked?.(true))
    fpControls.addEventListener('unlock', () => onIsLocked?.(false))

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const onMouseMove = (e: MouseEvent) => {
      const currentX = (e.clientX / window.innerWidth) * 2 - 1
      const currentY = -(e.clientY / window.innerHeight) * 2 + 1

      mouse.current.deltaX = currentX - mouse.current.x
      mouse.current.deltaY = currentY - mouse.current.y

      mouse.current.x = currentX
      mouse.current.y = currentY
    }

    const updateTouchPosition = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        const currentX = (touch.clientX / window.innerWidth) * 2 - 1
        const currentY = -(touch.clientY / window.innerHeight) * 2 + 1

        mouse.current.deltaX = currentX - mouse.current.x
        mouse.current.deltaY = currentY - mouse.current.y

        mouse.current.x = currentX
        mouse.current.y = currentY
      }
    }

    const onMouseDown = () => {
      isMouseDown.current = true
    }
    const onMouseUp = () => {
      isMouseDown.current = false
    }
    const onTouchStart = (e: TouchEvent) => {
      isMouseDown.current = true
      updateTouchPosition(e)
    }
    const onTouchMove = (e: TouchEvent) => {
      updateTouchPosition(e)
    }
    const onTouchEnd = () => {
      isMouseDown.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    const onResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    const resizeObserver = new ResizeObserver(() => {
      onResize()
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', onResize)
    onResize()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      controls.dispose()
      fpControls.dispose()
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [initialMode, onIsLocked])

  return {
    containerRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    fpControlsRef,
    keys,
    mouse,
    isMouseDown,
  }
}
