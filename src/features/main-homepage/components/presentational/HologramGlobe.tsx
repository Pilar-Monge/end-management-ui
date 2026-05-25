import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { motion } from 'framer-motion'
import { MEDIA_URLS } from '../../config/mediaUrls'
import { CAMPS } from '../../constants/campData'

interface HologramGlobeProps {
  onSelectCamp: (camp: any) => void
  isPaused: boolean
}

export const HologramGlobe: React.FC<HologramGlobeProps> = ({ onSelectCamp, isPaused }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isPaused
      controlsRef.current.enabled = !isPaused
    }
  }, [isPaused])

  useEffect(() => {
    if (!mountRef.current) return

    import('three-globe').then(({ default: ThreeGlobe }) => {
      if (!mountRef.current) return
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight

      setIsLoaded(true)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000)
      camera.position.z = 220

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      mountRef.current!.appendChild(renderer.domElement)

      const camps = CAMPS.map((c) => ({ ...c, size: 1.5 }))

      const globe = new ThreeGlobe()
        .globeImageUrl(MEDIA_URLS.images.earthDark)
        .bumpImageUrl(MEDIA_URLS.images.earthTopology)
        .showAtmosphere(true)
        .atmosphereColor('#00d4ff')
        .atmosphereAltitude(0.25)
        .pointsData(camps)
        .pointAltitude(0.05)
        .pointColor(() => '#00d4ff')
        .pointRadius(0.8)
        .ringsData(camps)
        .ringColor(() => '#00d4ff')
        .ringMaxRadius(5)
        .ringPropagationSpeed(2)
        .ringRepeatPeriod(1000)
        .labelsData(camps)
        .labelColor(() => '#00d4ff')
        .labelText('name')
        .labelSize(1.5)
        .labelDotRadius(0.5)
        .labelAltitude(0.06)

      const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial
      globeMaterial.color = new THREE.Color('#000511')
      globeMaterial.emissive = new THREE.Color('#003344')
      globeMaterial.emissiveIntensity = 0.4
      globeMaterial.transparent = true
      globeMaterial.opacity = 0.95

      globeMaterial.onBeforeCompile = (shader: any) => {
        shader.uniforms.time = { value: 0 }
        shader.fragmentShader = `uniform float time;\n${shader.fragmentShader}`.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
           float scanline = sin(gl_FragCoord.y * 0.2 + time * 5.0) * 0.05 + 0.95;
           float fresnel = pow(1.0 - dot(vec3(0,0,1), normalize(vNormal)), 2.0);
           gl_FragColor.rgb *= scanline;
           gl_FragColor.rgb += vec3(0.0, 0.5, 0.8) * fresnel * 0.5;`,
        )
        globeMaterial.userData.shader = shader
      }

      scene.add(globe)
      scene.add(new THREE.AmbientLight(0xffffff, 2.5))
      const pLight = new THREE.PointLight('#00d4ff', 6)
      pLight.position.set(300, 300, 300)
      scene.add(pLight)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enablePan = false
      controls.enableZoom = false
      controls.autoRotate = !isPaused
      controls.autoRotateSpeed = 0.4
      controlsRef.current = controls

      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      const onClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children, true)
        if (intersects.length > 0) {
          const point = intersects[0].point.clone().normalize()
          const lat = 90 - (Math.acos(point.y) * 180) / Math.PI
          const lng = (((Math.atan2(point.x, point.z) * 180) / Math.PI + 180) % 360) - 180
          const closest = CAMPS.reduce((prev, curr) => {
            const d1 = Math.hypot(curr.lat - lat, curr.lng - lng)
            const d2 = Math.hypot(prev.lat - lat, prev.lng - lng)
            return d1 < d2 ? curr : prev
          })
          if (Math.hypot(closest.lat - lat, closest.lng - lng) < 25) {
            onSelectCamp(closest)
          }
        }
      }
      renderer.domElement.addEventListener('click', onClick)

      let animId: number
      const animate = () => {
        animId = requestAnimationFrame(animate)
        const t = performance.now() * 0.001
        const mat = globe.globeMaterial() as any
        if (mat.userData.shader) mat.userData.shader.uniforms.time.value = t
        ;(mat as any).emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.1
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        if (!mountRef.current) return
        const w = mountRef.current.clientWidth
        const h = mountRef.current.clientHeight
        camera.aspect = w / h
        camera.position.z = w < 768 ? 350 : 220
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', handleResize)
      handleResize()

      return () => {
        cancelAnimationFrame(animId)
        window.removeEventListener('resize', handleResize)
        renderer.domElement.removeEventListener('click', onClick)
        renderer.dispose()
        if (mountRef.current) mountRef.current.innerHTML = ''
      }
    })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 1 }}
      ref={mountRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
