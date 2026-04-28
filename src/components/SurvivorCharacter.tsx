import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

export interface SurvivorCharacterProps {
  width?: number
  height?: number
  autoRotate?: boolean
  opacity?: number
  scale?: number
  rotationOffset?: number
  interactive?: boolean
  className?: string
  onReady?: () => void
}

export interface SurvivorCharacterRef {
  playWelcome: () => void
}

const COLORS = {
  skin: '#c8956c',
  hair: '#1e1008',
  beard: '#1e1008',
  eyebrows: '#1e1008',
  innerVest: '#6b7a3a',
  outerJacket: '#b5a070',
  shirt: '#3d5c2a',
  belt: '#3d2810',
  beltBuckle: '#8a7a60',
  pants: '#6b5030',
  thighPocket: '#5a4228',
  boots: '#1a1008',
  bootSole: '#0e0a04',
  pedestal: '#2a2a2a',
  pedestalSheen: '#3a3a3a',
} as const

const SurvivorCharacter = memo(
  forwardRef<SurvivorCharacterRef, SurvivorCharacterProps>(function SurvivorCharacter(
    {
      width = 220,
      height = 340,
      autoRotate = true,
      opacity = 1,
      scale = 1,
      rotationOffset = 0,
      interactive = false,
      className,
      onReady,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const frameRef = useRef<number | null>(null)
    const rightUpperArmRef = useRef<THREE.Mesh | null>(null)
    const tweensRef = useRef<gsap.core.Tween[]>([])

    useImperativeHandle(ref, () => ({
      playWelcome: () => {
        if (!rightUpperArmRef.current) return

        gsap.killTweensOf(rightUpperArmRef.current.rotation)
        gsap
          .timeline()
          .to(rightUpperArmRef.current.rotation, {
            x: -0.7,
            duration: 0.25,
            ease: 'power2.inOut',
          })
          .to(rightUpperArmRef.current.rotation, {
            x: 0,
            duration: 0.25,
            ease: 'power2.inOut',
          })
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const isMobile = window.innerWidth < 768

      const scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100)
      camera.position.set(0, 2.0, 5.0)
      camera.lookAt(0, 1.5, 0)

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
      renderer.setSize(width, height)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      const shadowMapSize = isMobile ? 512 : 1024

      const ambientLight = new THREE.AmbientLight('#fff8f0', 0.45)
      scene.add(ambientLight)

      const keyLight = new THREE.DirectionalLight('#fffaf0', 1.3)
      keyLight.position.set(-2.5, 4, 3)
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize)
      keyLight.shadow.camera.near = 0.5
      keyLight.shadow.camera.far = 24
      keyLight.shadow.camera.left = -4
      keyLight.shadow.camera.right = 4
      keyLight.shadow.camera.top = 5
      keyLight.shadow.camera.bottom = -5
      scene.add(keyLight)

      const rimLight = new THREE.DirectionalLight('#c8b0ff', 0.55)
      rimLight.position.set(2, 3, -3)
      scene.add(rimLight)

      const fillLight = new THREE.DirectionalLight('#ffcc88', 0.2)
      fillLight.position.set(0, -2, 2)
      scene.add(fillLight)

      const characterGroup = new THREE.Group()
      characterGroup.scale.setScalar(scale)
      characterGroup.rotation.y = rotationOffset
      scene.add(characterGroup)

      const applyShadow = (mesh: THREE.Mesh) => {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }

      const skinMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.skin,
        roughness: 0.75,
        metalness: 0,
      })
      const hairMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.hair,
        roughness: 0.6,
        metalness: 0.05,
      })
      const beardMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.beard,
        roughness: 0.85,
        metalness: 0.02,
      })
      const browMaterial = new THREE.MeshStandardMaterial({
        color: '#b07858',
        roughness: 0.75,
        metalness: 0,
      })
      const eyebrowMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.eyebrows,
        roughness: 0.8,
        metalness: 0,
      })
      const shirtMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.shirt,
        roughness: 0.72,
        metalness: 0.04,
      })
      const vestMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.innerVest,
        roughness: 0.7,
        metalness: 0.03,
      })
      const vestPocketMaterial = new THREE.MeshStandardMaterial({
        color: '#5a6830',
        roughness: 0.75,
        metalness: 0.02,
      })
      const jacketMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.outerJacket,
        roughness: 0.65,
        metalness: 0.06,
      })
      const jacketShellMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.outerJacket,
        roughness: 0.65,
        metalness: 0.06,
        transparent: true,
        opacity: 0.97,
      })
      const pantsMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.pants,
        roughness: 0.8,
        metalness: 0.04,
      })
      const thighPocketMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.thighPocket,
        roughness: 0.82,
        metalness: 0.03,
      })
      const kneeMaterial = new THREE.MeshStandardMaterial({
        color: '#4a3820',
        roughness: 0.86,
        metalness: 0.02,
      })
      const beltMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.belt,
        roughness: 0.82,
        metalness: 0.04,
      })
      const buckleMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.beltBuckle,
        roughness: 0.5,
        metalness: 0.5,
      })
      const bootsMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.boots,
        roughness: 0.85,
        metalness: 0.03,
      })
      const bootSoleMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.bootSole,
        roughness: 0.92,
        metalness: 0.02,
      })
      const pedestalMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.pedestal,
        roughness: 0.55,
        metalness: 0.35,
      })
      const pedestalSheenMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.pedestalSheen,
        roughness: 0.42,
        metalness: 0.48,
      })

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.14, 48),
        pedestalMaterial,
      )
      pedestal.position.y = -0.07
      applyShadow(pedestal)
      characterGroup.add(pedestal)

      const pedestalSheen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.74, 0.02, 48),
        pedestalSheenMaterial,
      )
      pedestalSheen.position.y = 0.01
      applyShadow(pedestalSheen)
      characterGroup.add(pedestalSheen)

      const hips = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.3), pantsMaterial)
      hips.position.set(0, 1.4, 0)
      applyShadow(hips)
      characterGroup.add(hips)

      const leftUpperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.135, 0.58, 14),
        pantsMaterial,
      )
      leftUpperLeg.position.set(-0.18, 1.05, 0)
      leftUpperLeg.rotation.z = 0.04
      applyShadow(leftUpperLeg)
      characterGroup.add(leftUpperLeg)

      const rightUpperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.135, 0.58, 14),
        pantsMaterial,
      )
      rightUpperLeg.position.set(0.18, 1.05, 0)
      rightUpperLeg.rotation.z = -0.04
      applyShadow(rightUpperLeg)
      characterGroup.add(rightUpperLeg)

      const leftThighPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.16, 0.06),
        thighPocketMaterial,
      )
      leftThighPocket.position.set(-0.3, 1.08, 0.04)
      applyShadow(leftThighPocket)
      characterGroup.add(leftThighPocket)

      const rightThighPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.16, 0.06),
        thighPocketMaterial,
      )
      rightThighPocket.position.set(0.3, 1.08, 0.04)
      applyShadow(rightThighPocket)
      characterGroup.add(rightThighPocket)

      const leftPocketStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.025, 0.07),
        thighPocketMaterial,
      )
      leftPocketStrap.position.set(-0.3, 0.98, 0.04)
      applyShadow(leftPocketStrap)
      characterGroup.add(leftPocketStrap)

      const rightPocketStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.025, 0.07),
        thighPocketMaterial,
      )
      rightPocketStrap.position.set(0.3, 0.98, 0.04)
      applyShadow(rightPocketStrap)
      characterGroup.add(rightPocketStrap)

      const leftLowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.14, 0.55, 14),
        pantsMaterial,
      )
      leftLowerLeg.position.set(-0.18, 0.5, 0)
      applyShadow(leftLowerLeg)
      characterGroup.add(leftLowerLeg)

      const rightLowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.14, 0.55, 14),
        pantsMaterial,
      )
      rightLowerLeg.position.set(0.18, 0.5, 0)
      applyShadow(rightLowerLeg)
      characterGroup.add(rightLowerLeg)

      const leftKnee = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.08), kneeMaterial)
      leftKnee.position.set(-0.18, 0.78, 0.1)
      applyShadow(leftKnee)
      characterGroup.add(leftKnee)

      const rightKnee = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.08), kneeMaterial)
      rightKnee.position.set(0.18, 0.78, 0.1)
      applyShadow(rightKnee)
      characterGroup.add(rightKnee)

      const leftBootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.125, 0.36, 14),
        bootsMaterial,
      )
      leftBootShaft.position.set(-0.18, 0.18, 0)
      applyShadow(leftBootShaft)
      characterGroup.add(leftBootShaft)

      const rightBootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.125, 0.36, 14),
        bootsMaterial,
      )
      rightBootShaft.position.set(0.18, 0.18, 0)
      applyShadow(rightBootShaft)
      characterGroup.add(rightBootShaft)

      const leftToe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.36), bootsMaterial)
      leftToe.position.set(-0.18, 0.07, 0.04)
      applyShadow(leftToe)
      characterGroup.add(leftToe)

      const rightToe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.36), bootsMaterial)
      rightToe.position.set(0.18, 0.07, 0.04)
      applyShadow(rightToe)
      characterGroup.add(rightToe)

      const leftSole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.4), bootSoleMaterial)
      leftSole.position.set(-0.18, -0.01, 0.04)
      applyShadow(leftSole)
      characterGroup.add(leftSole)

      const rightSole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.4), bootSoleMaterial)
      rightSole.position.set(0.18, -0.01, 0.04)
      applyShadow(rightSole)
      characterGroup.add(rightSole)

      const torsoGroup = new THREE.Group()
      characterGroup.add(torsoGroup)

      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), shirtMaterial)
      shirt.position.set(0, 1.92, 0)
      applyShadow(shirt)
      torsoGroup.add(shirt)

      const vestFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.06), vestMaterial)
      vestFrontLeft.position.set(-0.1, 1.92, 0.17)
      applyShadow(vestFrontLeft)
      torsoGroup.add(vestFrontLeft)

      const vestFrontRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.06), vestMaterial)
      vestFrontRight.position.set(0.1, 1.92, 0.17)
      applyShadow(vestFrontRight)
      torsoGroup.add(vestFrontRight)

      const vestBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.06), vestMaterial)
      vestBack.position.set(0, 1.92, -0.17)
      applyShadow(vestBack)
      torsoGroup.add(vestBack)

      const vestPocketCoordinates = [
        [-0.14, 2.1, 0.2],
        [0.14, 2.1, 0.2],
        [-0.14, 1.95, 0.2],
        [0.14, 1.95, 0.2],
      ] as const

      vestPocketCoordinates.forEach((coords) => {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), vestPocketMaterial)
        pocket.position.set(coords[0], coords[1], coords[2])
        applyShadow(pocket)
        torsoGroup.add(pocket)
      })

      const jacketShell = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.7, 0.33),
        jacketShellMaterial,
      )
      jacketShell.position.set(0, 1.88, 0)
      applyShadow(jacketShell)
      torsoGroup.add(jacketShell)

      const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.32), jacketMaterial)
      leftShoulder.position.set(-0.36, 2.18, 0)
      applyShadow(leftShoulder)
      torsoGroup.add(leftShoulder)

      const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.32), jacketMaterial)
      rightShoulder.position.set(0.36, 2.18, 0)
      applyShadow(rightShoulder)
      torsoGroup.add(rightShoulder)

      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.08), jacketMaterial)
      collar.position.set(0, 2.28, 0.1)
      applyShadow(collar)
      torsoGroup.add(collar)

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.3), beltMaterial)
      belt.position.set(0, 1.55, 0)
      applyShadow(belt)
      characterGroup.add(belt)

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.04), buckleMaterial)
      buckle.position.set(0, 1.55, 0.17)
      applyShadow(buckle)
      characterGroup.add(buckle)

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 16), skinMaterial)
      neck.position.set(0, 2.38, 0)
      applyShadow(neck)
      characterGroup.add(neck)

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), skinMaterial)
      head.scale.set(1, 1.08, 1)
      head.position.set(0, 2.7, 0)
      applyShadow(head)
      characterGroup.add(head)

      const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.04), browMaterial)
      leftBrow.position.set(-0.09, 2.82, 0.27)
      applyShadow(leftBrow)
      characterGroup.add(leftBrow)

      const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.04), browMaterial)
      rightBrow.position.set(0.09, 2.82, 0.27)
      applyShadow(rightBrow)
      characterGroup.add(rightBrow)

      const leftEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.02), eyebrowMaterial)
      leftEyebrow.position.set(-0.09, 2.85, 0.29)
      leftEyebrow.rotation.z = 0.08
      applyShadow(leftEyebrow)
      characterGroup.add(leftEyebrow)

      const rightEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.02), eyebrowMaterial)
      rightEyebrow.position.set(0.09, 2.85, 0.29)
      rightEyebrow.rotation.z = -0.08
      applyShadow(rightEyebrow)
      characterGroup.add(rightEyebrow)

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.06), skinMaterial)
      nose.position.set(0, 2.7, 0.29)
      applyShadow(nose)
      characterGroup.add(nose)

      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMaterial)
      chin.scale.set(1, 0.55, 1)
      chin.position.set(0, 2.52, 0.26)
      applyShadow(chin)
      characterGroup.add(chin)

      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), beardMaterial)
      mustache.position.set(0, 2.62, 0.28)
      applyShadow(mustache)
      characterGroup.add(mustache)

      const chinBeard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), beardMaterial)
      chinBeard.position.set(0, 2.52, 0.28)
      applyShadow(chinBeard)
      characterGroup.add(chinBeard)

      const leftJawBeard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.03), beardMaterial)
      leftJawBeard.position.set(-0.18, 2.58, 0.2)
      leftJawBeard.rotation.z = 0.2
      applyShadow(leftJawBeard)
      characterGroup.add(leftJawBeard)

      const rightJawBeard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.03), beardMaterial)
      rightJawBeard.position.set(0.18, 2.58, 0.2)
      rightJawBeard.rotation.z = -0.2
      applyShadow(rightJawBeard)
      characterGroup.add(rightJawBeard)

      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), hairMaterial)
      hairTop.scale.set(1.08, 0.55, 1.1)
      hairTop.position.set(0, 2.9, 0)
      applyShadow(hairTop)
      characterGroup.add(hairTop)

      const leftHairFlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.06, 0.7, 8),
        hairMaterial,
      )
      leftHairFlow.position.set(-0.26, 2.55, -0.03)
      leftHairFlow.rotation.z = 0.3
      leftHairFlow.rotation.x = -0.15
      applyShadow(leftHairFlow)
      characterGroup.add(leftHairFlow)

      const rightHairFlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.06, 0.7, 8),
        hairMaterial,
      )
      rightHairFlow.position.set(0.26, 2.55, -0.03)
      rightHairFlow.rotation.z = -0.3
      rightHairFlow.rotation.x = -0.15
      applyShadow(rightHairFlow)
      characterGroup.add(rightHairFlow)

      const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), hairMaterial)
      hairBack.scale.set(1.1, 1.4, 0.8)
      hairBack.position.set(0, 2.55, -0.18)
      applyShadow(hairBack)
      characterGroup.add(hairBack)

      const leftUpperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.115, 0.5, 12),
        jacketMaterial,
      )
      leftUpperArm.position.set(-0.42, 2.0, 0)
      leftUpperArm.rotation.z = 0.2
      applyShadow(leftUpperArm)
      characterGroup.add(leftUpperArm)

      const rightUpperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.115, 0.5, 12),
        jacketMaterial,
      )
      rightUpperArm.position.set(0.42, 2.0, 0)
      rightUpperArm.rotation.z = -0.2
      applyShadow(rightUpperArm)
      characterGroup.add(rightUpperArm)
      rightUpperArmRef.current = rightUpperArm

      const leftCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.108, 0.06, 12),
        jacketMaterial,
      )
      leftCuff.position.set(-0.47, 1.77, 0)
      leftCuff.rotation.z = 0.2
      applyShadow(leftCuff)
      characterGroup.add(leftCuff)

      const rightCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.108, 0.06, 12),
        jacketMaterial,
      )
      rightCuff.position.set(0.47, 1.77, 0)
      rightCuff.rotation.z = -0.2
      applyShadow(rightCuff)
      characterGroup.add(rightCuff)

      const leftForearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.1, 0.44, 12),
        skinMaterial,
      )
      leftForearm.position.set(-0.5, 1.58, 0)
      leftForearm.rotation.z = 0.12
      applyShadow(leftForearm)
      characterGroup.add(leftForearm)

      const rightForearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.1, 0.44, 12),
        skinMaterial,
      )
      rightForearm.position.set(0.5, 1.58, 0)
      rightForearm.rotation.z = -0.12
      applyShadow(rightForearm)
      characterGroup.add(rightForearm)

      const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMaterial)
      leftHand.scale.set(0.9, 1.1, 0.7)
      leftHand.position.set(-0.55, 1.34, 0)
      applyShadow(leftHand)
      characterGroup.add(leftHand)

      const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMaterial)
      rightHand.scale.set(0.9, 1.1, 0.7)
      rightHand.position.set(0.55, 1.34, 0)
      applyShadow(rightHand)
      characterGroup.add(rightHand)

      const breathingTween = gsap.to(torsoGroup.scale, {
        y: 1.025,
        duration: 2.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
      tweensRef.current.push(breathingTween)

      if (autoRotate) {
        const rotateTween = gsap.to(characterGroup.rotation, {
          y: characterGroup.rotation.y + Math.PI * 2,
          duration: 14,
          repeat: -1,
          ease: 'none',
        })
        tweensRef.current.push(rotateTween)
      }

      const onMouseEnter = () => {
        if (!interactive) return
        gsap.to(characterGroup.scale, {
          x: scale * 1.05,
          y: scale * 1.05,
          z: scale * 1.05,
          duration: 0.35,
          ease: 'back.out(1.4)',
        })
      }

      const onMouseLeave = () => {
        if (!interactive) return
        gsap.to(characterGroup.scale, {
          x: scale,
          y: scale,
          z: scale,
          duration: 0.3,
          ease: 'power2.out',
        })
      }

      if (interactive) {
        container.addEventListener('mouseenter', onMouseEnter)
        container.addEventListener('mouseleave', onMouseLeave)
      }

      const renderLoop = () => {
        renderer.render(scene, camera)
        frameRef.current = requestAnimationFrame(renderLoop)
      }

      renderLoop()
      onReady?.()

      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current)
        tweensRef.current.forEach((tween) => tween.kill())
        tweensRef.current = []

        if (interactive) {
          container.removeEventListener('mouseenter', onMouseEnter)
          container.removeEventListener('mouseleave', onMouseLeave)
        }

        scene.traverse((object: THREE.Object3D) => {
          const mesh = object as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()

          const material = mesh.material
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose())
          } else if (material) {
            material.dispose()
          }
        })

        scene.remove(ambientLight)
        scene.remove(keyLight)
        scene.remove(rimLight)
        scene.remove(fillLight)
        scene.remove(characterGroup)

        renderer.dispose()
        renderer.forceContextLoss()
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement)
        }
      }
    }, [autoRotate, height, interactive, onReady, rotationOffset, scale, width])

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width,
          height,
          opacity,
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />
    )
  }),
)

SurvivorCharacter.displayName = 'SurvivorCharacter'

export default SurvivorCharacter
