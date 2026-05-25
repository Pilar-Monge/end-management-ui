import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { motion } from 'framer-motion'

interface Camp {
  name: string
  description: string
}

interface CampStructureProps {
  camp: Camp
  onBack: () => void
}

export const CampStructure: React.FC<CampStructureProps> = ({ camp, onBack }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [seeThrough, setSeeThrough] = useState(0.5)

  useEffect(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0805)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(25, 25, 25)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current.appendChild(renderer.domElement)

    const group = new THREE.Group()

    const outerGeom = new THREE.IcosahedronGeometry(8, 1)
    const outerMat = new THREE.MeshPhongMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 1 - seeThrough,
      flatShading: true,
      shininess: 50,
    })
    const outer = new THREE.Mesh(outerGeom, outerMat)
    group.add(outer)

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xd2a679,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    })
    const wire = new THREE.Mesh(outerGeom, wireMat)
    group.add(wire)

    const innerGeom = new THREE.BoxGeometry(4, 4, 4)
    const innerMat = new THREE.MeshPhongMaterial({
      color: 0xd2a679,
      emissive: 0xd2a679,
      emissiveIntensity: 0.5,
    })
    const inner = new THREE.Mesh(innerGeom, innerMat)
    group.add(inner)

    for (let i = 0; i < 8; i++) {
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: seeThrough }),
      )
      const angle = (i / 8) * Math.PI * 2
      room.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, 0)
      group.add(room)
    }

    scene.add(group)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xd2a679, 2, 100)
    pointLight.position.set(20, 20, 20)
    scene.add(pointLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()

      outerMat.opacity = 1 - seeThrough
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child !== outer && child !== wire && child !== inner) {
          ;(child.material as THREE.MeshPhongMaterial).opacity = seeThrough
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current) return
      const w = mountRef.current.clientWidth
      const h = mountRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      controls.dispose()
      renderer.dispose()
      mountRef.current?.removeChild(renderer.domElement)
    }
  }, [seeThrough])

  return (
    <div className="w-full h-full relative bg-[#0a0805]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(210,166,121,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute top-12 left-12 z-10 max-w-md pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="text-[10px] uppercase tracking-[0.4em] font-mono text-[#d2a679] mb-2 underline decoration-[#d2a679]/40">
            Estructura Detectada
          </div>
          <h2
            className="text-6xl font-black text-white uppercase italic tracking-tighter leading-none"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {camp.name}
          </h2>
          <p className="text-sm text-white font-medium leading-relaxed">{camp.description}</p>

          <div className="pt-8 space-y-2">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#d2a679] font-bold">
              <span>Transparencia Estructural</span>
              <span>{Math.round(seeThrough * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={seeThrough}
              onChange={(e) => setSeeThrough(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#d2a679] pointer-events-auto"
            />
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-12 z-10 flex gap-4 pointer-events-auto">
        <button
          onClick={onBack}
          className="px-10 py-4 transition-all menu-brush text-white uppercase tracking-[0.2em] font-bold text-[11px]"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          <span className="relative z-10">Volver al Mapa</span>
        </button>
        <button
          className="px-10 py-4 transition-all menu-brush text-white uppercase tracking-[0.2em] font-black text-[11px]"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          <span className="relative z-10">Desplegar Unidad</span>
        </button>
      </div>

      <div className="absolute bottom-12 right-12 z-10 text-right pointer-events-none text-white">
        <div className="text-[10px] font-mono text-white">TEMP: 24.5°C</div>
        <div className="text-[10px] font-mono text-white">PRES: 1013 hPa</div>
        <div className="text-[10px] font-mono text-white">RAD: 0.12 mSv/h</div>
      </div>
    </div>
  )
}
