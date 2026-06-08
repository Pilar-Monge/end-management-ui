/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Compass,
  Volume2,
  VolumeX,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Wind,
  HelpCircle,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MEDIA_URLS } from '../config/mediaUrls'
import {
  loginRequest,
  requestPasswordReset,
  resetPasswordWithCode,
} from '../../login/services/authApi'
import { SESSION_TOKEN_CHANGED_EVENT } from '../../../shared/services/sessionService'
import { getPostLoginRoute, normalizeUserRole } from '../../../shared/services/postLoginRouting'
import { getErrorMessage } from '../../../shared/services/errorMessages'
import type { LoginErrors, LoginForm, PasswordResetErrors } from '../../login/types'
import { useAuthDispatch } from '../../../shared/context/AuthContext'
import { PopupMessage } from '../../../shared/components/PopupMessage'

import LandingPage from '../components/LandingPage'
import ReplicaGlobe from '../components/ReplicaGlobe'
import type { Mode } from '../constants/sceneConfigs'
import { MODES } from '../constants/sceneConfigs'
import { CAMPS } from '../constants/campData'
import { STORY_STEPS } from '../constants/storyData'
import { getTerrainY } from '../utils/three/lightingHelpers'
import '../mainHomepage.css'

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>
      openSelectKey: () => Promise<void>
    }
  }
}

type appState =
  | 'landing'
  | 'intro'
  | 'bridge'
  | 'video'
  | 'menu'
  | 'explore'
  | 'login'
  | 'register'
  | 'global-map'
  | 'camp-detail'

const LAST_SELECTED_CAMP_ID_KEY = 'last_selected_camp_id'
const PASSWORD_RESET_REQUEST_SUCCESS =
  'Si el correo pertenece a un usuario registrado, recibiras instrucciones para restablecer la contrasena.'
const PASSWORD_RESET_SUCCESS =
  'Tu contrasena fue actualizada correctamente. Inicia sesion con tu nueva contrasena.'
const PASSWORD_RESET_GENERIC_ERROR = 'El codigo es invalido, expiro o ya fue utilizado.'

type PopupVariant = 'info' | 'success' | 'warning' | 'error'

export function MainHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const authDispatch = useAuthDispatch()
  const containerRef = useRef<HTMLDivElement>(null)
  const initialAppState = (location.state as { initialAppState?: appState } | null)?.initialAppState
  const sessionMessage = (location.state as { sessionMessage?: string } | null)?.sessionMessage

  const readPersistedCampId = useCallback((): number | null => {
    const fromLocation = (location.state as { campId?: number } | null)?.campId
    if (typeof fromLocation === 'number' && fromLocation > 0) return fromLocation

    const fromStorage = localStorage.getItem(LAST_SELECTED_CAMP_ID_KEY)
    if (!fromStorage) return null
    const parsed = Number(fromStorage)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [location.state])

  const [appState, setAppState] = useState<appState>(initialAppState ?? 'landing')
  const [selectedCamp, setSelectedCamp] = useState<any>(null)
  const [currentMode, setCurrentMode] = useState<Mode>('Storm')
  const [storyIndex, setStoryIndex] = useState(-1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (sessionMessage) {
      setAppState('login')
      setAuthErrors((prev) => ({ ...prev, general: sessionMessage }))
      setPopupVariant('error')
      setPopupMessage(sessionMessage)
    }
  }, [sessionMessage])

  useEffect(() => {
    const campId = readPersistedCampId()
    if (!campId) return
    setAuthForm((prev) => (prev.campId === campId ? prev : { ...prev, campId }))
  }, [readPersistedCampId])

  useEffect(() => {
    if (appState === 'intro') {
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 10, 260)
        cameraRef.current.lookAt(0, 5, 200)
      }
    }

    if (appState !== 'video' && appState !== 'bridge' && appState !== 'landing') {
      setIsTransitioning(true)
      const timer = setTimeout(() => setIsTransitioning(false), 250)
      return () => clearTimeout(timer)
    }
  }, [appState])
  const [isPaused, setIsPaused] = useState(false)
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isSceneReady, setIsSceneReady] = useState(false)
  const [isModePanelOpen, setIsModePanelOpen] = useState(false)
  const [volume, setVolume] = useState(70)
  const [isExiting, setIsExiting] = useState(false)
  const [coords, setCoords] = useState({ lat: 9.9281, lng: 84.0907 })
  const coordsRef = useRef({ lat: 9.9281, lng: 84.0907 })
  const [bridgeVideoDuration, setBridgeVideoDuration] = useState(0)
  const [mapTextIndex, setMapTextIndex] = useState(6)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false)
  const [hasGlobeIntroPlayed, setHasGlobeIntroPlayed] = useState(false)
  const [popupMessage, setPopupMessage] = useState<string | null>(null)
  const [popupVariant, setPopupVariant] = useState<PopupVariant>('error')
  void selectedCamp
  void setSelectedCamp
  void isLocked
  void setShowCredits

  const isAnyMenuOpen =
    isSettingsModalOpen ||
    isModePanelOpen ||
    showCredits ||
    isUserGuideOpen ||
    appState === 'menu' ||
    appState === 'landing' ||
    appState === 'login' ||
    appState === 'register' ||
    appState === 'global-map'
  const shouldMountScene = appState !== 'landing'
  const shouldShowSceneNav =
    shouldMountScene &&
    appState !== 'login' &&
    appState !== 'register' &&
    appState !== 'global-map'

  useEffect(() => {
    if (appState === 'global-map') {
      setIsGlobeLoaded(false)
      setMapTextIndex(6)
      const timer = setTimeout(() => {
        setMapTextIndex(7)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [appState])

  const [loginVideoIndex, setLoginVideoIndex] = useState(0)
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null)
  const [showCharError, setShowCharError] = useState(false)
  const [authForm, setAuthForm] = useState<LoginForm>({
    username: '',
    password: '',
    campId: null,
  })
  const [authErrors, setAuthErrors] = useState<LoginErrors>({})
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false)
  const [passwordResetUsername, setPasswordResetUsername] = useState('')
  const [passwordResetEmail, setPasswordResetEmail] = useState('')
  const [passwordResetCode, setPasswordResetCode] = useState('')
  const [passwordResetNewPassword, setPasswordResetNewPassword] = useState('')
  const [passwordResetConfirmPassword, setPasswordResetConfirmPassword] = useState('')
  const [passwordResetErrors, setPasswordResetErrors] = useState<PasswordResetErrors>({})
  const [isResetCodeSent, setIsResetCodeSent] = useState(false)
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const loginVideos = [
    MEDIA_URLS.images.characters.principal,
    MEDIA_URLS.images.characters.mecanico,
    MEDIA_URLS.images.characters.expedicionista,
  ]

  const loginCharacterData = [
    { name: 'RICK "THE SENTINEL"', quote: '"El silencio es mi único compañero."' },
    { name: 'MAX "THE WRENCH"', quote: '"Todo se puede arreglar, excepto el fin."' },
    { name: 'SARA "THE SCOUT"', quote: '"Veo lo que otros prefieren ignorar."' },
  ]

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (appState === 'login') {
      interval = setInterval(() => {
        setLoginVideoIndex((prev) => (prev + 1) % loginVideos.length)
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [appState, loginVideos.length])

  useEffect(() => {
    if (
      appState === 'login' ||
      appState === 'register' ||
      appState === 'video' ||
      appState === 'bridge' ||
      appState === 'menu' ||
      appState === 'intro' ||
      appState === 'landing'
    ) {
      setCurrentMode('Storm')
    }
  }, [appState])

  useEffect(() => {
    if (appState !== 'login') {
      setAuthErrors({})
      setIsAuthenticating(false)
      resetPasswordResetState()
    }
  }, [appState])

  useEffect(() => {
    document.body.classList.toggle(
      'main-homepage-auth-active',
      appState === 'login' || appState === 'register',
    )

    return () => {
      document.body.classList.remove('main-homepage-auth-active')
    }
  }, [appState])

  function validateLoginForm(): boolean {
    const nextErrors: LoginErrors = {}

    if (!authForm.username.trim()) nextErrors.username = 'Campo requerido'
    if (authForm.username.length > 0 && authForm.username.length < 3)
      nextErrors.username = 'Minimo 3 caracteres'

    if (!authForm.password) nextErrors.password = 'Campo requerido'
    if (authForm.password.length > 0 && authForm.password.length < 6)
      nextErrors.password = 'Minimo 6 caracteres'

    if (!authForm.campId || authForm.campId <= 0) {
      nextErrors.campId = 'Debes seleccionar un campamento en el globo'
    }

    if (!authForm.campId || authForm.campId <= 0) {
      ;(nextErrors as LoginErrors & { campId?: string }).campId =
        'Debes seleccionar un campamento antes de iniciar sesion.'
    }

    setAuthErrors(nextErrors)
    if (nextErrors.campId) {
      setPopupVariant('error')
      setPopupMessage(nextErrors.campId)
    }
    return Object.keys(nextErrors).length === 0
  }

  function handleAuthFieldChange(field: 'username' | 'password', value: string) {
    setAuthForm((prev) => ({ ...prev, [field]: value }))
    if (authErrors[field]) setAuthErrors((prev) => ({ ...prev, [field]: undefined }))
    if (authErrors.general) setAuthErrors((prev) => ({ ...prev, general: undefined }))
    if (popupMessage) setPopupMessage(null)
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (appState === 'register') {
      if (selectedCharacter === null) {
        setShowCharError(true)
        return
      }
      setAppState('explore')
      return
    }

    if (!validateLoginForm()) return

    setIsAuthenticating(true)
    setAuthErrors({})

    try {
      const response = await loginRequest(authForm)
      const normalizedUser = {
        ...response.user,
        role: normalizeUserRole(response.user.rol),
      }
      const token = response.token ?? response.accessToken
      const savedPath = localStorage.getItem('last_secure_path')

      if (token) {
        localStorage.setItem('token', token)
        localStorage.setItem('accessToken', token)
      }
      window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      localStorage.removeItem('admin_settings_v2')
      localStorage.setItem(LAST_SELECTED_CAMP_ID_KEY, String(response.user.campId))

      const redirectPath = getPostLoginRoute(normalizedUser.role, {
        savedPath,
        restoreSavedAdminDashboard: Boolean(sessionMessage),
      })
      localStorage.removeItem('last_secure_path')
      navigate(redirectPath, { replace: true })
    } catch (error) {
      const message = getErrorMessage(error, 'login')
      setAuthErrors({
        general: message,
      })
      setPopupVariant('error')
      setPopupMessage(message)
    } finally {
      setIsAuthenticating(false)
    }
  }

  function getPasswordResetCampId(): number | null {
    if (authForm.campId && authForm.campId > 0) return authForm.campId
    return readPersistedCampId()
  }

  function resetPasswordResetState() {
    setIsPasswordResetOpen(false)
    setPasswordResetUsername('')
    setPasswordResetEmail('')
    setPasswordResetCode('')
    setPasswordResetNewPassword('')
    setPasswordResetConfirmPassword('')
    setPasswordResetErrors({})
    setIsResetCodeSent(false)
    setIsRequestingPasswordReset(false)
    setIsResettingPassword(false)
  }

  function handleOpenPasswordReset() {
    const campId = getPasswordResetCampId()
    if (!campId) {
      const message = 'Debes seleccionar un campamento antes de restablecer la contrasena.'
      setPopupVariant('error')
      setPopupMessage(message)
      return
    }

    setAuthForm((prev) => (prev.campId === campId ? prev : { ...prev, campId }))
    setPasswordResetUsername(authForm.username.trim())
    setPasswordResetErrors({})
    setIsPasswordResetOpen(true)
  }

  function validatePasswordResetRequest(): { username: string; email: string; campId: number } | null {
    const username = passwordResetUsername.trim()
    const email = passwordResetEmail.trim()
    const campId = getPasswordResetCampId()
    const nextErrors: PasswordResetErrors = {}

    if (!username) {
      nextErrors.username = 'Usuario requerido'
    } else if (username.length < 3) {
      nextErrors.username = 'Minimo 3 caracteres'
    }

    if (!email) {
      nextErrors.email = 'Correo requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Correo invalido'
    }

    if (!campId) {
      nextErrors.general = 'Debes seleccionar un campamento antes de restablecer la contrasena.'
    }

    setPasswordResetErrors(nextErrors)
    if (nextErrors.general) {
      setPopupVariant('error')
      setPopupMessage(nextErrors.general)
    }

    return username && email && campId && Object.keys(nextErrors).length === 0
      ? { username, email, campId }
      : null
  }

  function validatePasswordResetConfirm() {
    const requestPayload = validatePasswordResetRequest()
    const nextErrors: PasswordResetErrors = {}

    if (!requestPayload) return null

    if (!/^\d{8}$/.test(passwordResetCode)) {
      nextErrors.code = 'El codigo debe tener 8 digitos'
    }

    if (!passwordResetNewPassword) {
      nextErrors.newPassword = 'Nueva contrasena requerida'
    } else if (passwordResetNewPassword.length < 8) {
      nextErrors.newPassword = 'Minimo 8 caracteres'
    }

    if (!passwordResetConfirmPassword) {
      nextErrors.confirmPassword = 'Confirma la nueva contrasena'
    } else if (passwordResetConfirmPassword !== passwordResetNewPassword) {
      nextErrors.confirmPassword = 'Las contrasenas no coinciden'
    }

    setPasswordResetErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
      ? {
          ...requestPayload,
          code: passwordResetCode,
          newPassword: passwordResetNewPassword,
        }
      : null
  }

  async function submitPasswordResetRequest() {
    const payload = validatePasswordResetRequest()
    if (!payload) return

    setIsRequestingPasswordReset(true)
    setPasswordResetErrors({})

    try {
      await requestPasswordReset(payload)
      setIsResetCodeSent(true)
      setPopupVariant('success')
      setPopupMessage(PASSWORD_RESET_REQUEST_SUCCESS)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo solicitar el codigo.'
      setPasswordResetErrors({ general: message })
      setPopupVariant('error')
      setPopupMessage(message)
    } finally {
      setIsRequestingPasswordReset(false)
    }
  }

  async function handlePasswordResetRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitPasswordResetRequest()
  }

  async function handlePasswordResetConfirmSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = validatePasswordResetConfirm()
    if (!payload) return

    setIsResettingPassword(true)
    setPasswordResetErrors({})

    try {
      await resetPasswordWithCode(payload)
      resetPasswordResetState()
      setPopupVariant('success')
      setPopupMessage(PASSWORD_RESET_SUCCESS)
    } catch {
      setPasswordResetErrors({ general: PASSWORD_RESET_GENERIC_ERROR })
      setPopupVariant('error')
      setPopupMessage(PASSWORD_RESET_GENERIC_ERROR)
    } finally {
      setIsResettingPassword(false)
    }
  }

  useEffect(() => {
    if (appState !== 'explore' || isAnyMenuOpen) return

    const interval = setInterval(() => {
      const nextCoords = coordsRef.current
      setCoords((prev) => {
        if (prev.lat === nextCoords.lat && prev.lng === nextCoords.lng) return prev
        return { ...nextCoords }
      })
    }, 300)

    return () => clearInterval(interval)
  }, [appState, isAnyMenuOpen])

  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const appStateRef = useRef(appState)
  const isPausedRef = useRef(isPaused)
  const currentModeRef = useRef(currentMode)
  const isAnyMenuOpenRef = useRef(false)

  useEffect(() => {
    appStateRef.current = appState
  }, [appState])
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])
  useEffect(() => {
    currentModeRef.current = currentMode
  }, [currentMode])
  useEffect(() => {
    isAnyMenuOpenRef.current = isAnyMenuOpen
  }, [isAnyMenuOpen])

  const mouse = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, deltaX: 0, deltaY: 0 })
  const isMouseDown = useRef(false)

  const keys = useRef<Record<string, boolean>>({})

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const fpControlsRef = useRef<PointerLockControls | null>(null)
  const treeGroupRef = useRef<THREE.Group | null>(null)
  const birdsRef = useRef<THREE.Group | null>(null)
  const threatsRef = useRef<THREE.Group | null>(null)
  const starsRef = useRef<THREE.Points | null>(null)
  const rainRef = useRef<THREE.LineSegments | null>(null)
  const sunRef = useRef<THREE.Object3D | null>(null)
  const sunGlowRef = useRef<THREE.PointLight | null>(null)
  const moonRef = useRef<THREE.Object3D | null>(null)
  const moonGlowRef = useRef<THREE.PointLight | null>(null)
  const cloudGroupRef = useRef<THREE.Group | null>(null)
  const godRaysRef = useRef<THREE.Group | null>(null)
  const mistRef = useRef<THREE.Points | null>(null)
  const bridgeVideoRef = useRef<HTMLVideoElement>(null)
  const mainVideoRef = useRef<HTMLVideoElement>(null)
  const isTransitionImage = /\.(webp|png|jpe?g|gif|avif)(?:[?#]|$)/i.test(
    MEDIA_URLS.videos.transition,
  )

  const goToGlobalMap = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 10, 450)
      cameraRef.current.lookAt(0, 0, 0)
    }
    setAppState('global-map')
  }, [])

  const returnToLoadedGlobalMap = useCallback(() => {
    setHasGlobeIntroPlayed(true)
    setIsGlobeLoaded(true)
    setAppState('global-map')
  }, [])

  useEffect(() => {
    if (bridgeVideoRef.current) {
      if (isPaused || appState !== 'bridge') bridgeVideoRef.current.pause()
      else if (appState === 'bridge') bridgeVideoRef.current.play().catch(() => {})
    }
  }, [isPaused, appState])

  useEffect(() => {
    if (mainVideoRef.current) {
      if (isPaused || appState !== 'video') mainVideoRef.current.pause()
      else if (appState === 'video') mainVideoRef.current.play().catch(() => {})
    }
  }, [isPaused, appState])

  useEffect(() => {
    if (appState !== 'video' || !isTransitionImage || isPaused) return
    const timer = setTimeout(goToGlobalMap, 6000)
    return () => clearTimeout(timer)
  }, [appState, goToGlobalMap, isPaused, isTransitionImage])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    if (appState !== 'intro' || isPaused) return
    if (storyIndex === -1) {
      setStoryIndex(0)
      return
    }

    const duration = 4000

    const timer = setTimeout(() => {
      if (storyIndex === 4) {
        setAppState('bridge')
      } else if (storyIndex < 4) {
        setStoryIndex((prev) => prev + 1)
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [appState, storyIndex, isPaused])

  useEffect(() => {
    if (!sceneRef.current) return
    const config = MODES[currentMode]
    const scene = sceneRef.current

    scene.background = new THREE.Color(config.skyColor)
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(config.fogColor)
      scene.fog.density = config.fogDensity
    }

    if (starsRef.current) starsRef.current.visible = !!config.showStars
    if (rainRef.current) rainRef.current.visible = !!config.isRaining

    if (sunRef.current) {
      ;((sunRef.current as THREE.Sprite).material as THREE.SpriteMaterial).color.set(
        config.lightColor,
      )
      sunRef.current.visible = currentMode !== 'Noche' && currentMode !== 'Storm'
    }

    if (moonRef.current) {
      moonRef.current.visible = currentMode === 'Noche'
    }

    if (sunGlowRef.current) {
      sunGlowRef.current.color.set(config.lightColor)
      sunGlowRef.current.intensity =
        currentMode === 'Noche' || currentMode === 'Storm' ? 0 : config.lightIntensity * 10
    }

    if (moonGlowRef.current) {
      moonGlowRef.current.intensity = currentMode === 'Noche' ? config.lightIntensity * 15 : 0
    }

    if (cloudGroupRef.current) {
      cloudGroupRef.current.children.forEach((cloud) => {
        const sprite = cloud as THREE.Sprite
        sprite.material.color.set(config.fogColor)
        sprite.material.opacity = config.fogDensity * 15
      })
    }

    if (godRaysRef.current) {
      godRaysRef.current.visible = currentMode !== 'Noche' && currentMode !== 'Storm'
      const rayIntensity = currentMode === 'Summer' ? 0.08 : 0.04
      godRaysRef.current.children.forEach((ray) => {
        const m = (ray as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.color.set(config.lightColor)
        m.opacity = rayIntensity + Math.random() * 0.02
      })
    }

    if (mistRef.current) {
      const mat = mistRef.current.material as THREE.PointsMaterial
      mat.color.set(config.fogColor)
      mat.opacity = config.fogDensity * 4
    }

    scene.traverse((child) => {
      if (child instanceof THREE.DirectionalLight) {
        child.intensity = config.lightIntensity
        child.color.set(config.lightColor)
      }
      if (child instanceof THREE.AmbientLight) {
        child.intensity = config.ambientIntensity
        child.color.set(config.fogColor)
      }

      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (currentMode === 'Storm') {
          mat.roughness = 0.2
          mat.metalness = 0.5
        } else {
          mat.roughness = 0.9
          mat.metalness = 0.1
        }
      }
    })
  }, [currentMode, isSceneReady])

  useEffect(() => {
    if (!shouldMountScene || !containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(MODES[currentModeRef.current].skyColor)
    scene.fog = new THREE.FogExp2(
      MODES[currentModeRef.current].fogColor,
      MODES[currentModeRef.current].fogDensity,
    )
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
    const renderPixelRatioLimit = window.innerWidth < 900 || window.innerHeight < 600 ? 1.25 : 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderPixelRatioLimit))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearColor(0x000000, 1)

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
      renderer.domElement.style.display = 'block'
      containerRef.current.appendChild(renderer.domElement)
    }
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      MODES[currentModeRef.current].ambientIntensity,
    )
    scene.add(ambientLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enabled = false
    controlsRef.current = controls

    const fpControls = new PointerLockControls(camera, document.body)
    fpControlsRef.current = fpControls
    fpControls.addEventListener('lock', () => setIsLocked(true))
    fpControls.addEventListener('unlock', () => setIsLocked(false))

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

    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 100, 100)
    terrainGeo.rotateX(-Math.PI / 2)
    const verts = terrainGeo.attributes.position.array as Float32Array
    for (let i = 0; i < verts.length; i += 3) {
      verts[i + 1] = getTerrainY(verts[i], verts[i + 2])
    }
    terrainGeo.computeVertexNormals()
    const terrainMesh = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 }),
    )
    terrainMesh.receiveShadow = true
    scene.add(terrainMesh)

    const treeGroup = new THREE.Group()

    const barkCanvas = document.createElement('canvas')
    barkCanvas.width = 64
    barkCanvas.height = 128
    const barkCtx = barkCanvas.getContext('2d')!
    barkCtx.fillStyle = '#1a1a1a'
    barkCtx.fillRect(0, 0, 64, 128)
    for (let i = 0; i < 200; i++) {
      barkCtx.fillStyle = Math.random() > 0.5 ? '#0a0a0a' : '#222222'
      barkCtx.fillRect(Math.random() * 64, Math.random() * 128, 2, 10)
    }
    const barkTexture = new THREE.CanvasTexture(barkCanvas)
    barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping
    barkTexture.repeat.set(1, 4)

    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTexture, roughness: 0.9 })
    const leavesMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    })
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x111111 })

    for (let i = 0; i < 150; i++) {
      const x = (Math.random() - 0.5) * 800
      const z = (Math.random() - 0.5) * 800
      const tree = new THREE.Group()

      const isDead = Math.random() > 0.85
      const height = 15 + Math.random() * 15

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, height, 6), trunkMat)
      trunk.position.y = height / 2
      trunk.castShadow = true
      trunk.receiveShadow = true
      tree.add(trunk)

      if (!isDead) {
        const simplifiedLayers = 8
        for (let j = 0; j < simplifiedLayers; j++) {
          const ratio = j / simplifiedLayers
          const layerWidth = 4 * (1 - ratio)
          const layerHeight = 3
          const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(layerWidth, layerHeight, 6, 1, true),
            leavesMat,
          )
          leaf.position.y = height * 0.2 + j * ((height * 0.75) / simplifiedLayers)
          leaf.rotation.y = Math.random() * Math.PI
          leaf.rotation.x = 0.1 + Math.random() * 0.2
          leaf.castShadow = true
          tree.add(leaf)
        }
      } else {
        const branchCount = 8 + Math.floor(Math.random() * 5)
        for (let j = 0; j < branchCount; j++) {
          const branchHeight = 2 + Math.random() * 3
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.05, branchHeight, 4),
            deadMat,
          )

          branch.position.y = height * 0.3 + Math.random() * (height * 0.6)
          branch.rotation.x = Math.random() * Math.PI
          branch.rotation.z = Math.random() * Math.PI

          branch.position.x = (Math.random() - 0.5) * 0.2
          branch.position.z = (Math.random() - 0.5) * 0.2
          tree.add(branch)
        }

        tree.rotation.x = (Math.random() - 0.5) * 0.15
        tree.rotation.z = (Math.random() - 0.5) * 0.15
      }

      tree.position.set(x, getTerrainY(x, z) - 1.2, z)
      tree.scale.setScalar(0.8 + Math.random() * 1.2)

      tree.userData = {
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.4,
      }

      treeGroup.add(tree)
    }
    scene.add(treeGroup)
    treeGroupRef.current = treeGroup

    const gltfLoader = new GLTFLoader()
    const signUrl =
      'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/quarantine_sign%20(1).glb'
    const lightPoleUrl =
      'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/ligthpole%20(1).glb'
    const areaSignUrl =
      'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/3d-models-intro/areasing%20(1).glb'

    const signPositions = [
      { x: 120, z: -150 },
      { x: -180, z: 200 },
      { x: 8, z: 180 },
      { x: -8, z: 85 },
    ]

    const polePositions = [
      { x: 45, z: 45 },
      { x: -60, z: -80 },
    ]

    const areaPositions = [
      { x: 115, z: 115 },
      { x: -120, z: -50 },
      { x: 200, z: -200 },
      { x: -50, z: 300 },
      { x: 300, z: 50 },
      { x: -250, z: -250 },
    ]

    gltfLoader.load(
      signUrl,
      (gltf) => {
        signPositions.forEach((pos) => {
          const sign = gltf.scene.clone()
          const y = getTerrainY(pos.x, pos.z)
          sign.position.set(pos.x, y - 1.5, pos.z)
          sign.scale.set(4, 4, 4)

          if (pos.z > 0 && Math.abs(pos.x) < 50) {
            sign.lookAt(0, y, 300)

            const light = new THREE.PointLight(0xffffff, 10, 15)

            light.position.set(pos.x, y + 2, pos.z + 4)
            scene.add(light)
          } else {
            sign.lookAt(0, y, 0)
          }

          sign.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material.emissive = new THREE.Color(0x000000)
              child.material.emissiveIntensity = 0
              child.material.needsUpdate = true
            }
          })

          scene.add(sign)
        })
      },
      undefined,
      (e) => console.error('Sign Load Error:', e),
    )

    gltfLoader.load(
      lightPoleUrl,
      (gltf) => {
        polePositions.forEach((pos) => {
          const pole = gltf.scene.clone()
          const y = getTerrainY(pos.x, pos.z)
          pole.position.set(pos.x, y - 5.0, pos.z)
          pole.scale.set(8, 6, 8)
          scene.add(pole)
        })
      },
      undefined,
      (e) => console.error('LightPole Load Error:', e),
    )

    areaPositions.forEach((pos) => {
      const y = getTerrainY(pos.x, pos.z)

      const light = new THREE.PointLight(0xffffff, 12, 20)
      light.position.set(pos.x, y + 4, pos.z + 4)
      scene.add(light)
    })

    gltfLoader.load(
      areaSignUrl,
      (gltf) => {
        areaPositions.forEach((pos) => {
          const area = gltf.scene.clone()
          const y = getTerrainY(pos.x, pos.z)
          area.position.set(pos.x, y - 0.5, pos.z)
          area.scale.set(0.5, 0.5, 0.5)
          area.lookAt(0, y, 250)
          scene.add(area)
        })
      },
      undefined,
      (e) => console.error('AreaSign Load Error:', e),
    )

    const sunCanvas = document.createElement('canvas')
    sunCanvas.width = 128
    sunCanvas.height = 128
    const sunCtx = sunCanvas.getContext('2d')!
    const sunGrad = sunCtx.createRadialGradient(64, 64, 0, 64, 64, 64)
    sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    sunGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)')
    sunGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)')
    sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    sunCtx.fillStyle = sunGrad
    sunCtx.fillRect(0, 0, 128, 128)
    const sunTexture = new THREE.CanvasTexture(sunCanvas)

    const sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTexture,
        transparent: true,
        opacity: 0.9,
        fog: false,
      }),
    )
    sunSprite.scale.set(400, 400, 1)
    sunSprite.position.set(0, 150, -950)
    scene.add(sunSprite)
    sunRef.current = sunSprite

    const sunGlow = new THREE.PointLight(0xffcc88, 20, 4000)
    sunGlow.position.copy(sunSprite.position)
    scene.add(sunGlow)
    sunGlowRef.current = sunGlow

    const sunLight = new THREE.DirectionalLight(0xffcc88, 1.5)
    sunLight.position.copy(sunSprite.position)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 1024
    sunLight.shadow.mapSize.height = 1024
    sunLight.shadow.camera.left = -500
    sunLight.shadow.camera.right = 500
    sunLight.shadow.camera.top = 500
    sunLight.shadow.camera.bottom = -500
    scene.add(sunLight)

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
      ;(ray.material as THREE.MeshBasicMaterial).opacity = 0.01 + Math.random() * 0.04

      godRays.add(ray)
    }
    scene.add(godRays)
    godRaysRef.current = godRays

    const mistCount = 1200
    const mistGeo = new THREE.BufferGeometry()
    const mistPos = new Float32Array(mistCount * 3)
    for (let i = 0; i < mistCount; i++) {
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
      color: MODES['Hazy'].fogColor,
      size: 25,
      map: particleTexture,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const mist = new THREE.Points(mistGeo, mistMat)
    scene.add(mist)
    mistRef.current = mist

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 600
      const z = (Math.random() - 0.5) * 600
      const cabin = new THREE.Group()

      const foundationMat = new THREE.MeshStandardMaterial({ color: 0x050505 })
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(6.2, 8, 6.2), foundationMat)
      foundation.position.y = -2
      cabin.add(foundation)

      const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), cabinMat)
      body.position.y = 2
      body.castShadow = true
      body.receiveShadow = true
      cabin.add(body)

      const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 3, 4), roofMat)
      roof.position.y = 5.5
      roof.rotation.y = Math.PI / 4
      roof.castShadow = true
      roof.receiveShadow = true
      cabin.add(roof)

      cabin.position.set(x, getTerrainY(x, z) - 1.8, z)
      cabin.rotation.y = Math.random() * Math.PI
      scene.add(cabin)
    }

    const birds = new THREE.Group()
    const birdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(0, 0.8, 0),
        new THREE.Vector3(2, 0, 0),
      ])
      const bird = new THREE.Mesh(geo, birdMat)
      bird.position.set(
        (Math.random() - 0.5) * 600,
        30 + Math.random() * 40,
        (Math.random() - 0.5) * 600,
      )
      bird.userData = {
        speed: 0.02 + Math.random() * 0.05,
        radius: 50 + Math.random() * 100,
        angle: Math.random() * Math.PI * 2,
      }
      birds.add(bird)
    }
    scene.add(birds)
    birdsRef.current = birds

    const threatGroup = new THREE.Group()
    const threatMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.05,
    })
    const threatGeo = new THREE.SphereGeometry(0.3, 8, 8)
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 800
      const z = (Math.random() - 0.5) * 800
      const t = new THREE.Mesh(threatGeo, threatMat)
      t.position.set(x, getTerrainY(x, z) + 0.1, z)
      t.userData = { speed: 0.01 + Math.random() * 0.03, angle: Math.random() * Math.PI * 2 }
      threatGroup.add(t)
    }
    scene.add(threatGroup)
    threatsRef.current = threatGroup

    const cloudGroup = new THREE.Group()
    const cloudCanvas = document.createElement('canvas')
    cloudCanvas.width = 256
    cloudCanvas.height = 256
    const cloudCtx = cloudCanvas.getContext('2d')!
    const cloudGrad = cloudCtx.createRadialGradient(128, 128, 0, 128, 128, 128)
    cloudGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    cloudGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)')
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    cloudCtx.fillStyle = cloudGrad
    cloudCtx.fillRect(0, 0, 256, 256)
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas)

    for (let i = 0; i < 80; i++) {
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTexture,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          color: new THREE.Color(MODES['Hazy'].fogColor),
          blending: THREE.AdditiveBlending,
        }),
      )
      cloud.position.set(
        (Math.random() - 0.5) * 1500,
        Math.random() * 100,
        (Math.random() - 0.5) * 1500,
      )
      cloud.scale.set(400 + Math.random() * 600, 150 + Math.random() * 250, 1)
      cloudGroup.add(cloud)
    }
    scene.add(cloudGroup)
    cloudGroupRef.current = cloudGroup

    const starCount = 6000
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
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
    scene.add(stars)
    starsRef.current = stars

    const moonCanvas = document.createElement('canvas')
    moonCanvas.width = 128
    moonCanvas.height = 128
    const moonCtx = moonCanvas.getContext('2d')!
    const moonGrad = moonCtx.createRadialGradient(64, 64, 0, 64, 64, 64)
    moonGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    moonGrad.addColorStop(0.2, 'rgba(230, 230, 255, 0.8)')
    moonGrad.addColorStop(0.5, 'rgba(100, 100, 255, 0.2)')
    moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    moonCtx.fillStyle = moonGrad
    moonCtx.fillRect(0, 0, 128, 128)
    const moonTexture = new THREE.CanvasTexture(moonCanvas)

    const moonSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: moonTexture,
        transparent: true,
        opacity: 0.9,
        fog: false,
      }),
    )
    moonSprite.scale.set(150, 150, 1)
    moonSprite.position.set(200, 300, -800)
    moonSprite.visible = false
    scene.add(moonSprite)
    moonRef.current = moonSprite

    const moonGlow = new THREE.PointLight(0xe0e0ff, 15, 2000)
    moonGlow.position.copy(moonSprite.position)
    moonGlow.intensity = 0
    scene.add(moonGlow)
    moonGlowRef.current = moonGlow

    const rainCount = 15000
    const rainPos = new Float32Array(rainCount * 6)
    for (let i = 0; i < rainCount; i++) {
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
    scene.add(rain)
    rainRef.current = rain

    setIsSceneReady(true)

    let frame = 0
    let animationFrameId = 0
    let isDisposed = false
    const animate = () => {
      if (isDisposed) return
      animationFrameId = requestAnimationFrame(animate)

      const paused = isPausedRef.current
      const appSt = appStateRef.current
      const menuOpen = isAnyMenuOpenRef.current

      if (!paused && appSt !== 'video' && appSt !== 'bridge') {
        frame += 0.01
        const speed = 0.6

        if (!menuOpen) {
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

          if (isMouseDown.current && appSt === 'explore') {
            camera.position.addScaledVector(dir, speed)
          }

          if (appSt !== 'explore' && appSt !== 'global-map') {
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
            positions[i * 3] += 0.2 // Drift speed
            if (positions[i * 3] > 500) positions[i * 3] = -500

            positions[i * 3 + 1] += Math.sin(frame * 0.01 + i) * 0.05
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
            const scene = sceneRef.current
            const originalFogColor = new THREE.Color(MODES[currentModeRef.current].fogColor)
            const originalBg = new THREE.Color(MODES[currentModeRef.current].skyColor)

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

        if (appSt === 'explore') {
          coordsRef.current = {
            lat: 9.9281 + camera.position.z / 5000,
            lng: 84.0907 + camera.position.x / 5000,
          }
        } else if (appSt === 'menu') {
          coordsRef.current = {
            lat: 9.9281 + (Math.random() - 0.5) * 0.0005,
            lng: 84.0907 + (Math.random() - 0.5) * 0.0005,
          }
        }
      }

      if (!isDisposed) {
        renderer.render(scene, camera)
      }
    }
    animate()

    const onResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderPixelRatioLimit))
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
      isDisposed = true
      cancelAnimationFrame(animationFrameId)
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
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry?.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            if (!material) return
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose()
            })
            material.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.domElement.parentElement?.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      fpControlsRef.current = null
      treeGroupRef.current = null
      birdsRef.current = null
      threatsRef.current = null
      starsRef.current = null
      rainRef.current = null
      sunRef.current = null
      sunGlowRef.current = null
      moonRef.current = null
      moonGlowRef.current = null
      cloudGroupRef.current = null
      godRaysRef.current = null
      mistRef.current = null
    }
  }, [shouldMountScene])

  const handleFPClick = useCallback(() => {
    fpControlsRef.current?.lock()
  }, [])
  void handleFPClick

  return (
    <div className="fixed inset-0 overflow-hidden bg-black font-sans text-white">
      <div className="crt-overlay" />
      <div className="scanline" />
      <div className="vignette" />

      {shouldMountScene && (
        <div ref={containerRef} className="absolute inset-0 z-0" data-menu-open={isAnyMenuOpen} />
      )}

      <audio ref={audioRef} />

      {}
      <div
        className="absolute inset-0 z-[1500] pointer-events-none opacity-20"
        style={{ backgroundImage: `url(${MEDIA_URLS.textures.noise})` }}
      />

      {}
      <AnimatePresence>
        {shouldShowSceneNav && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-8 py-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
          >
            <div className="flex items-center gap-4 pointer-events-auto">
              <button
                onClick={() => {
                  setIsSettingsModalOpen(true)
                  setIsPaused(true)
                }}
                className="relative group pointer-events-auto p-2 flex items-center justify-center transition-all text-white hover:text-blue-400"
                title="Centro de Operaciones"
              >
                {}
                <div className="absolute inset-0 rounded-full bg-blue-400/0 group-hover:bg-blue-400/10 blur-md transition-all duration-300" />

                <Menu
                  size={24}
                  className="relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90"
                />
              </button>
              <div
                className="text-xl font-bold tracking-tighter uppercase text-white drop-shadow-lg"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                End Management
              </div>
            </div>

            {(appState === 'explore' || appState === 'menu') && (
              <div className="flex items-center gap-3 pointer-events-auto">
                <button
                  onClick={() => setIsModePanelOpen(!isModePanelOpen)}
                  className="transition-all text-white hover:text-blue-400 group p-2"
                  title="Viento"
                >
                  <Wind
                    size={28}
                    className="transition-all group-hover:scale-110 anim-atmosphere-pulse"
                  />
                </button>
              </div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          {appState === 'intro' && storyIndex >= 0 && storyIndex < STORY_STEPS.length - 1 && (
            <motion.div
              key={storyIndex}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="text-2xl md:text-4xl font-bold text-center max-w-2xl px-4 drop-shadow-2xl tracking-widest uppercase text-white"
            >
              {STORY_STEPS[storyIndex]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(appState === 'bridge' || appState === 'video') && (
          <motion.div
            key="story-video-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-[500] bg-black"
          >
            <AnimatePresence>
              {appState === 'bridge' && (
                <motion.div
                  key="bridge"
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: 1, scale: 1.15 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{
                    opacity: { duration: 1.2 },
                    scale: { duration: bridgeVideoDuration || 8, ease: 'linear' },
                  }}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                >
                  <video
                    ref={bridgeVideoRef}
                    autoPlay
                    playsInline
                    preload="metadata"
                    poster={MEDIA_URLS.branding.background}
                    onLoadedMetadata={(e) => setBridgeVideoDuration(e.currentTarget.duration)}
                    onTimeUpdate={(e) => {
                      if (
                        bridgeVideoDuration &&
                        e.currentTarget.currentTime >= bridgeVideoDuration - 1.0
                      ) {
                        setAppState('video')
                      }
                    }}
                    onCanPlay={(e) => (e.currentTarget.volume = 0.3)}
                    onEnded={() => setAppState('video')}
                    onError={() => setTimeout(() => setAppState('video'), 3000)}
                    className="w-full h-full object-cover"
                    src={MEDIA_URLS.videos.run}
                  />
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [20, 0, 0, -20],
                        filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'],
                      }}
                      transition={{
                        times: [0, 0.2, 0.7, 0.9],
                        duration: bridgeVideoDuration || 5,
                        ease: 'easeInOut',
                      }}
                      className="text-2xl md:text-4xl font-bold text-center max-w-2xl px-4 drop-shadow-2xl tracking-widest uppercase text-white"
                    >
                      {STORY_STEPS[5]}
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {appState === 'video' && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1.45 }}
                  exit={{ opacity: 0, scale: 1.6 }}
                  transition={{
                    opacity: { duration: 1.2 },
                    scale: { duration: 7, ease: 'linear' },
                  }}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                >
                  {isTransitionImage ? (
                    <img
                      src={MEDIA_URLS.videos.transition}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setTimeout(goToGlobalMap, 3000)}
                    />
                  ) : (
                    <video
                      ref={mainVideoRef}
                      autoPlay
                      playsInline
                      preload="metadata"
                      poster={MEDIA_URLS.branding.background}
                      onCanPlay={(e) => (e.currentTarget.volume = 0.3)}
                      onTimeUpdate={(e) => {
                        if (e.currentTarget.currentTime >= 6.0) {
                          goToGlobalMap()
                        }
                      }}
                      onEnded={goToGlobalMap}
                      onError={() => setTimeout(goToGlobalMap, 3000)}
                      className="w-full h-full object-cover"
                      src={MEDIA_URLS.videos.transition}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {}

      {}
      {(appState === 'explore' || appState === 'menu') && (
        <div className="absolute top-24 right-8 z-[400] flex flex-col items-end gap-2">
          <AnimatePresence>
            {isModePanelOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="p-8 min-w-[280px] flex flex-col gap-6 panel-brush relative"
              >
                {}
                <button
                  onClick={() => setIsModePanelOpen(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95"
                >
                  <X size={18} />
                </button>

                {}
                <div className="space-y-4">
                  <div className="mb-6">
                    <h2
                      className="relative z-10 text-xl font-black italic uppercase tracking-tighter text-white mb-2"
                      style={{ fontFamily: "'Oswald', sans-serif", color: '#ffffff' }}
                    >
                      ATMÓSFERA
                    </h2>
                    <div className="h-1 w-12 bg-blue-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(MODES) as Mode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCurrentMode(mode)}
                        className={`flex items-center gap-4 text-[12px] transition-all group menu-brush px-4 py-2 w-full ${currentMode === mode ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        <div className="relative z-10 w-full flex items-center gap-4">
                          <div
                            className={`w-3 h-3 rounded-full border border-white/20 flex items-center justify-center transition-all ${currentMode === mode ? 'bg-white/10' : ''}`}
                          >
                            {currentMode === mode && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            )}
                          </div>
                          <span className="tracking-[0.15em] uppercase">{mode}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {}
      <AnimatePresence>
        {appState === 'explore' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-12 left-12 z-[300] flex flex-col gap-6 items-start"
          >
            {}
            <div
              className="relative group cursor-pointer pointer-events-auto anim-radio-shiver"
              onClick={() => setAppState('global-map')}
            >
              <motion.div
                className="relative w-[50px] h-[90px] transition-all duration-500 group-hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]"
                whileHover={{ scale: 1.1, rotate: -2 }}
              >
                <svg
                  width="50"
                  height="90"
                  viewBox="0 0 50 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="walkieBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="antennaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#111" />
                      <stop offset="50%" stopColor="#333" />
                      <stop offset="100%" stopColor="#111" />
                    </linearGradient>
                  </defs>

                  {}
                  <path
                    d="M32 22L46 2"
                    stroke="url(#antennaGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M32.5 21.5L45.5 3.5"
                    stroke="white"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />

                  {}
                  <rect x="7" y="23" width="38" height="66" rx="6" fill="#050505" />

                  {}
                  <rect
                    x="6"
                    y="21"
                    width="36"
                    height="65"
                    rx="5"
                    fill="url(#walkieBody)"
                    stroke="#334155"
                    strokeWidth="0.5"
                  />

                  {}
                  <path
                    d="M11 21.5H37C39 21.5 41 23.5 41 25.5"
                    stroke="white"
                    strokeOpacity="0.15"
                    strokeWidth="0.5"
                    fill="none"
                  />

                  {}
                  <rect x="11" y="27" width="26" height="14" rx="2" fill="#020617" />
                  <g opacity="0.4">
                    {[30, 33, 36, 39].map((y) => (
                      <line
                        key={y}
                        x1="14"
                        y1={y}
                        x2="34"
                        y2={y}
                        stroke="#334155"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    ))}
                  </g>

                  {}
                  <rect
                    x="10"
                    y="44"
                    width="28"
                    height="18"
                    rx="2"
                    fill="#080808"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />

                  {}
                  <motion.rect
                    x="11.5"
                    y="45.5"
                    width="25"
                    height="15"
                    rx="1"
                    fill="#60a5fa"
                    fillOpacity="0.1"
                    animate={{ fillOpacity: [0.1, 0.35, 0.1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {}
                  <g opacity="0.6">
                    <rect x="14" y="48" width="8" height="1" fill="#3b82f6" />
                    <rect x="14" y="51" width="12" height="1" fill="#3b82f6" />
                    <rect x="14" y="54" width="4" height="1" fill="#3b82f6" />
                    <circle cx="32" cy="55" r="1.5" fill="#3b82f6" />
                  </g>

                  {}
                  <path d="M11.5 45.5L36.5 45.5L11.5 60.5Z" fill="white" fillOpacity="0.05" />

                  {}
                  <rect
                    x="2"
                    y="34"
                    width="4"
                    height="18"
                    rx="2"
                    fill="#111"
                    stroke="#000"
                    strokeWidth="0.5"
                  />
                  <rect x="3" y="36" width="1" height="14" fill="white" fillOpacity="0.05" />

                  {}
                  <rect x="42" y="40" width="3" height="10" rx="1" fill="#111" />
                  <rect x="42" y="54" width="3" height="10" rx="1" fill="#111" />

                  {}
                  {[
                    { x: 9, y: 24 },
                    { x: 39, y: 24 },
                    { x: 9, y: 83 },
                    { x: 39, y: 83 },
                  ].map((pos, i) => (
                    <g key={i}>
                      <circle cx={pos.x} cy={pos.y} r="1.5" fill="#0a0a0a" />
                      <line
                        x1={pos.x - 0.8}
                        y1={pos.y - 0.8}
                        x2={pos.x + 0.8}
                        y2={pos.y + 0.8}
                        stroke="#222"
                        strokeWidth="0.5"
                      />
                    </g>
                  ))}

                  {}
                  <g opacity="0.15">
                    {[68, 71, 74, 77, 80].map((y) => (
                      <rect key={y} x="9" y={y} width="30" height="0.5" fill="#000" />
                    ))}
                  </g>
                </svg>
              </motion.div>
              <div className="absolute left-full ml-6 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 backdrop-blur-md border border-blue-500/40 rounded text-[10px] uppercase tracking-widest text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Red de campamentos
              </div>
            </div>

            {}
            <button
              onClick={() => {
                setIsPaused(true)
                setIsUserGuideOpen(true)
              }}
              className="px-8 py-3 transition-all menu-brush text-white uppercase tracking-[0.2em] font-bold text-[11px] pointer-events-auto"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <HelpCircle size={14} className="text-blue-400" />
                GUÍA DE USUARIO
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'explore' && !isAnyMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-12 right-12 z-[100] flex flex-col gap-4 items-end pointer-events-none"
          >
            <div className="relative group backdrop-blur-md bg-black/40 border border-white/10 p-4 min-w-[180px] rounded-lg shadow-xl">
              {}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-400/50" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-400/50" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-400/50" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-400/50" />

              <div className="relative z-10 flex flex-col gap-2">
                <div className="threat-alert">
                  <div className="threat-blink" />
                  <span>Detectando Amenazas</span>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.3em] text-white/40 mb-1 font-mono">
                    Coordenadas
                  </div>
                  <div className="font-mono text-[10px] text-white font-bold flex items-center gap-2">
                    <span>{coords.lat.toFixed(4)}° N</span>
                    <span className="w-px h-2 bg-white/10" />
                    <span>{coords.lng.toFixed(4)}° O</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {(appState === 'login' || appState === 'register') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="login-flow-overlay absolute inset-0 z-[500] flex items-center justify-center bg-transparent"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="login-flow-dialog w-[1000px] max-w-[92vw] h-[580px] max-h-[82vh] flex flex-col-reverse md:flex-row relative panel-brush panel-contrast-accent overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
            >
              {}
              <div className="login-flow-form-panel w-full md:w-[340px] h-full bg-black/60 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-white/5 p-8 md:p-10 flex flex-col justify-center relative z-10 overflow-y-auto">
                {}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

                <div className="relative z-10 w-full max-w-sm mx-auto">
                  <div className="login-flow-header flex items-center gap-6 mb-12">
                    <button
                      onClick={() => setAppState('explore')}
                      className="login-flow-close group/close p-3 transition-all duration-300 text-white hover:text-blue-400 hover:rotate-90 hover:scale-110 active:scale-95 z-20 flex items-center justify-center border border-white/10 hover:border-blue-400/50 rounded-full"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      <X size={24} className="transition-transform" />
                    </button>
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">
                        {appState === 'login' ? 'ACCESO' : 'REGISTRO'}
                      </h2>
                      <div className="h-1 w-12 bg-blue-400 mt-2" />
                    </div>
                  </div>

                  <form className="login-flow-form space-y-6" onSubmit={handleAuthSubmit}>
                    <div className="space-y-3 w-full max-w-[260px]">
                      <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                        Nombre de Usuario
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                        placeholder="ID_USUARIO"
                        value={authForm.username}
                        onChange={(event) => handleAuthFieldChange('username', event.target.value)}
                        required
                      />
                      {appState === 'login' && authErrors.username && (
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                          {authErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 w-full max-w-[260px]">
                      <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                        placeholder="••••••••"
                        value={authForm.password}
                        onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                        required
                      />
                      {appState === 'login' && authErrors.password && (
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                          {authErrors.password}
                        </p>
                      )}
                    </div>

                    {appState === 'login' && (
                      <button
                        type="button"
                        onClick={handleOpenPasswordReset}
                        className="w-full max-w-[260px] text-left text-[10px] uppercase font-black tracking-[0.24em] text-blue-300/80 hover:text-blue-300 transition-colors"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        Restablecer contraseña
                      </button>
                    )}

                    {appState === 'register' && (
                      <div className="space-y-3 w-full max-w-[260px]">
                        <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                          Confirmar Clave
                        </label>
                        <input
                          type="password"
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={appState === 'login' && isAuthenticating}
                      className="group relative w-full max-w-[260px] py-4 font-black uppercase tracking-[0.4em] text-xs transition-all menu-brush text-white mt-4 text-left px-8"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      <span className="relative z-10 transition-colors">
                        {appState === 'login'
                          ? isAuthenticating
                            ? 'Ingresando...'
                            : 'Ingresar'
                          : 'REGISTRAR'}
                      </span>
                    </button>

                    {appState === 'login' && (
                      <button
                        type="button"
                        onClick={returnToLoadedGlobalMap}
                        className="group relative w-full max-w-[260px] py-3 font-black uppercase tracking-[0.3em] text-[11px] transition-all menu-brush text-white/90 mt-2 text-left px-8"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        <span className="relative z-10 transition-colors">Volver</span>
                      </button>
                    )}
                  </form>

                  <div className="login-flow-footer mt-12 pt-10 border-t border-white/5">
                    {appState === 'login' ? (
                      <div className="flex items-center gap-4 text-[11px] uppercase font-bold tracking-widest text-white leading-relaxed">
                        <Compass
                          size={32}
                          className="shrink-0 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                        <span>¿Sos nuevo? Explorá el mapa y solicitá ingreso a un campamento</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAppState('login')
                          setCurrentMode('Storm')
                        }}
                        className="text-[12px] uppercase font-black tracking-[0.3em] transition-all menu-brush px-10 py-3 text-white"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        <span className="relative z-10">Volver al Acceso</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {}
              <div className="login-flow-media w-full md:flex-1 h-[40vh] md:h-full relative overflow-hidden bg-zinc-950">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={loginVideos[loginVideoIndex]}
                    initial={{ opacity: 0, scale: 1.2, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 1.1, x: -50 }}
                    transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                    className="absolute inset-0"
                  >
                    <img
                      src={loginVideos[loginVideoIndex]}
                      className="w-full h-full object-cover object-[center_15%]"
                      style={{ filter: 'contrast(1.15) brightness(1.05)' }}
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </AnimatePresence>

                {}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/90 pointer-events-none" />

                {}
                <div className="login-flow-kicker absolute top-6 left-6 z-20">
                  {appState === 'register' ? (
                    <span className="text-xl font-black uppercase tracking-widest text-amber-400">
                      ESCOGE TU PERSONAJE
                    </span>
                  ) : (
                    <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-white bg-black/60 px-3 py-1 border-l-2 border-blue-400 shadow-lg">
                      ELIGE TU PERSONAJE Y JUEGA
                    </div>
                  )}
                </div>

                {}
                <motion.div
                  key={`info-${loginVideoIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="login-flow-character-info absolute bottom-6 right-6 z-30 text-right flex flex-col items-end"
                >
                  {appState === 'register' && (
                    <div className="mb-4 flex flex-col items-end">
                      <button
                        onClick={() => {
                          setSelectedCharacter(loginVideoIndex)
                          setShowCharError(false)
                        }}
                        className={`group relative px-4 py-1.5 transition-all duration-300 pointer-events-auto overflow-hidden border ${
                          selectedCharacter === loginVideoIndex
                            ? 'bg-amber-500 border-amber-500 text-white font-bold'
                            : 'bg-transparent border-white/40 text-white font-mono text-[10px] hover:text-blue-400'
                        }`}
                      >
                        <span className="relative z-10">
                          {selectedCharacter === loginVideoIndex
                            ? '✓ ELEGIDO'
                            : 'SELECCIONAR PERSONAJE'}
                        </span>
                        {selectedCharacter !== loginVideoIndex && (
                          <div className="absolute inset-0 bg-amber-500/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                        )}
                      </button>
                      {showCharError && selectedCharacter === null && (
                        <span className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                          Debes seleccionar un personaje
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1 [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
                    {loginCharacterData[loginVideoIndex].name}
                  </div>
                  <div className="text-sm text-white italic max-w-xs ml-auto [text-shadow:0_1px_5px_rgba(0,0,0,0.8)]">
                    {loginCharacterData[loginVideoIndex].quote}
                  </div>
                </motion.div>

                {}
                {appState === 'register' && (
                  <div className="absolute bottom-6 left-0 right-0 z-40 flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-8">
                      <button
                        onClick={() =>
                          setLoginVideoIndex(
                            (prev) => (prev - 1 + loginVideos.length) % loginVideos.length,
                          )
                        }
                        className="p-2 text-white hover:text-white transition-colors"
                      >
                        <ChevronLeft size={24} />
                      </button>

                      <div className="flex gap-4">
                        {loginVideos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setLoginVideoIndex(idx)}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${loginVideoIndex === idx ? 'bg-white' : 'bg-white/30'}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setLoginVideoIndex((prev) => (prev + 1) % loginVideos.length)
                        }
                        className="p-2 text-white hover:text-white transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                )}

                {}
                <div className="absolute inset-0 border-[1px] border-white/5 pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPasswordResetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto panel-brush panel-contrast-accent border border-blue-400/20 bg-black/80 p-8 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.85)]"
            >
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

              <button
                type="button"
                onClick={resetPasswordResetState}
                className="absolute top-5 right-5 z-20 p-2 text-white/60 hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 border border-white/10 hover:border-blue-400/50 rounded-full"
                aria-label="Cerrar restablecimiento de contraseña"
              >
                <X size={20} />
              </button>

              <div className="relative z-10 space-y-8">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-[0.4em] text-blue-300/80 mb-3 font-mono">
                    Protocolo de recuperación
                  </p>
                  <h2
                    className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Restablecer contraseña
                  </h2>
                  <div className="h-1 w-16 bg-blue-400 mt-4" />
                  <p className="mt-5 text-xs md:text-sm leading-relaxed text-white/55 font-mono">
                    Ingresá tu usuario y correo registrado. Si coinciden con el campamento
                    seleccionado, recibirás un código de 8 dígitos para crear una nueva contraseña.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handlePasswordResetRequestSubmit} noValidate>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        value={passwordResetUsername}
                        onChange={(event) => setPasswordResetUsername(event.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                        placeholder="ID_USUARIO"
                        autoComplete="username"
                      />
                      {passwordResetErrors.username && (
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                          {passwordResetErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={passwordResetEmail}
                        onChange={(event) => setPasswordResetEmail(event.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                        placeholder="usuario@correo.com"
                        autoComplete="email"
                      />
                      {passwordResetErrors.email && (
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                          {passwordResetErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRequestingPasswordReset}
                    className="group relative w-full py-4 font-black uppercase tracking-[0.32em] text-xs transition-all menu-brush text-white text-left px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <span className="relative z-10">
                      {isRequestingPasswordReset ? 'Enviando código...' : 'Enviar código'}
                    </span>
                  </button>
                </form>

                <AnimatePresence>
                  {isResetCodeSent && (
                    <motion.form
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="space-y-5 border-t border-white/10 pt-7"
                      onSubmit={handlePasswordResetConfirmSubmit}
                      noValidate
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 md:col-span-2">
                          <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                            Código recibido
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={passwordResetCode}
                            onChange={(event) =>
                              setPasswordResetCode(event.target.value.replace(/\D/g, '').slice(0, 8))
                            }
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs tracking-[0.35em] placeholder:tracking-normal placeholder:text-white/10"
                            placeholder="12345678"
                            autoComplete="one-time-code"
                          />
                          {passwordResetErrors.code && (
                            <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                              {passwordResetErrors.code}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                            Nueva contraseña
                          </label>
                          <input
                            type="password"
                            value={passwordResetNewPassword}
                            onChange={(event) => setPasswordResetNewPassword(event.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                          />
                          {passwordResetErrors.newPassword && (
                            <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                              {passwordResetErrors.newPassword}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="text-[11px] uppercase font-bold tracking-[0.2em] text-white block">
                            Confirmar contraseña
                          </label>
                          <input
                            type="password"
                            value={passwordResetConfirmPassword}
                            onChange={(event) => setPasswordResetConfirmPassword(event.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-xs placeholder:text-white/10"
                            placeholder="Repetí la contraseña"
                            autoComplete="new-password"
                          />
                          {passwordResetErrors.confirmPassword && (
                            <p className="text-[10px] text-red-400 uppercase tracking-[0.08em]">
                              {passwordResetErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>

                      {passwordResetErrors.general && (
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.08em] font-mono">
                          {passwordResetErrors.general}
                        </p>
                      )}

                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          type="submit"
                          disabled={isResettingPassword}
                          className="group relative flex-1 py-4 font-black uppercase tracking-[0.24em] text-xs transition-all menu-brush text-white text-left px-7 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: "'Oswald', sans-serif" }}
                        >
                          <span className="relative z-10">
                            {isResettingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void submitPasswordResetRequest()}
                          disabled={isRequestingPasswordReset || isResettingPassword}
                          className="px-5 py-4 border border-white/10 text-[10px] uppercase font-black tracking-[0.2em] text-white/70 hover:text-blue-300 hover:border-blue-400/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: "'Oswald', sans-serif" }}
                        >
                          Nuevo código
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {appState === 'global-map' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="global-map-shell fixed inset-0 z-[1600] flex items-center justify-center pointer-events-none"
          >
            <div className="global-map-panel w-full max-w-3xl h-[75vh] bg-black/20 border border-[#00d4ff]/40 rounded-2xl relative shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto">
              <button
                onClick={() => setAppState('explore')}
                className="global-map-close absolute top-6 right-6 z-[700] w-10 h-10 flex items-center justify-center bg-black/40 text-white hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 rounded-full border border-white/10"
              >
                <X size={20} />
              </button>

              <div className="w-full h-full">
                <ReplicaGlobe
                  skipIntro={hasGlobeIntroPlayed}
                  onLoadingComplete={() => {
                    setIsGlobeLoaded(true)
                    setHasGlobeIntroPlayed(true)
                  }}
                  onLoginClick={() => {
                    setAppState('login')
                    setCurrentMode('Storm')
                  }}
                  onSelectCamp={(campId) => {
                    if (campId > 0) {
                      window.setTimeout(() => {
                        authDispatch({ type: 'SELECT_CAMP', payload: campId })
                        setAuthForm((prev) => ({ ...prev, campId }))
                        localStorage.setItem(LAST_SELECTED_CAMP_ID_KEY, String(campId))
                      }, 0)
                    }
                  }}
                />
              </div>

              {}
              <AnimatePresence>
                {!isGlobeLoaded && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-[100]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={mapTextIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 1 }}
                        className="text-[9px] md:text-[11px] font-bold text-center drop-shadow-lg tracking-[0.3em] uppercase text-white/80 max-w-2xl mx-auto"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        {STORY_STEPS[mapTextIndex]}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {appState === 'landing' && (
          <LandingPage
            activeState={appState}
            onIntro={() => {
              setAppState('intro')
              setStoryIndex(-1)
            }}
            onMenu={() => setAppState('explore')}
            volume={volume}
            setVolume={setVolume}
            isAudioEnabled={isAudioEnabled}
            setIsAudioEnabled={setIsAudioEnabled}
            onExit={() => setIsExiting(true)}
          />
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-4"
            >
              <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white/40">
                Sincronización Terminada
              </h2>
              <p className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">
                Cerrando conexión terminal...
              </p>
              <div className="flex gap-1 justify-center mt-8">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 2, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                    className="w-1 h-8 bg-blue-400"
                  />
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              onClick={() => window.close()}
              className="mt-16 px-10 py-4 transition-all menu-brush text-white uppercase tracking-[0.2em] font-bold text-[11px]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              <span className="relative z-10">Cerrar Aplicación</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUserGuideOpen && !isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="main-user-guide-overlay fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="main-user-guide-dialog w-full max-w-lg p-10 relative shadow-2xl panel-brush"
            >
              <button
                onClick={() => {
                  setIsUserGuideOpen(false)
                  setIsPaused(false)
                }}
                className="main-user-guide-close absolute top-6 right-6 text-white/60 hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 z-20 flex items-center justify-center"
              >
                <X size={24} />
              </button>

              <div className="main-user-guide-scroll space-y-8">
                <div className="main-user-guide-header text-center">
                  <h2
                    className="panel-title-white text-3xl font-black italic uppercase tracking-tighter text-white mb-2"
                    style={{ fontFamily: "'Oswald', sans-serif", color: '#ffffff' }}
                  >
                    GUÍA DEL SOBREVIVIENTE
                  </h2>
                  <div className="h-1 w-20 bg-blue-400 mx-auto" />
                </div>

                <div className="main-user-guide-sections space-y-6">
                  <div className="main-user-guide-card bg-white/5 border border-white/10 p-5 rounded-lg">
                    <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2 font-mono">
                      Controles de Vuelo
                    </h3>
                    <p className="text-sm text-white/80 leading-relaxed font-mono">
                      <span className="text-white font-bold">PC:</span> Mantén el click izquierdo
                      presionado y mueve el ratón para orientar la cámara y explorar el entorno.
                      <br />
                      <span className="text-white font-bold">MÓVIL:</span> Toca la pantalla y
                      desliza el dedo para girar la vista.
                    </p>
                  </div>

                  <div className="main-user-guide-card bg-white/5 border border-white/10 p-5 rounded-lg">
                    <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2 font-mono">
                      Redes del Campamento
                    </h3>
                    <p className="text-sm text-white/80 leading-relaxed font-mono">
                      Localiza el ícono del{' '}
                      <span className="text-blue-400 font-bold">Walkie-Talkie</span> en la interfaz
                      para acceder a las redes de comunicación. Desde allí podrás conectar con otros
                      refugios y visualizar el estado de la resistencia.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm p-12 relative shadow-2xl flex flex-col gap-8 panel-brush"
            >
              {}
              <button
                onClick={() => {
                  setIsSettingsModalOpen(false)
                  setIsPaused(false)
                }}
                className="absolute top-6 right-6 text-white/60 hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 z-20 flex items-center justify-center"
              >
                <X size={24} />
              </button>

              <div className="space-y-6">
                {}
                <div className="text-center mb-8">
                  <h2
                    className="panel-title-white text-3xl font-black italic uppercase tracking-tighter text-white mb-2"
                    style={{ fontFamily: "'Oswald', sans-serif", color: '#ffffff' }}
                  >
                    SISTEMA CENTRAL
                  </h2>
                  <div className="h-1 w-20 bg-blue-400 mx-auto" />
                </div>

                <div className="flex flex-col gap-4">
                  {}
                  <button
                    onClick={() => {
                      setIsSettingsModalOpen(false)
                      setIsPaused(false)
                    }}
                    className="flex items-center gap-4 text-[14px] font-black italic uppercase tracking-[0.2em] transition-all menu-brush px-5 py-3 w-full text-white group/item"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <div className="relative z-10 w-full flex items-center gap-4">
                      <div className="w-5 flex justify-center">
                        <Play
                          size={14}
                          className="fill-white group-hover/item:fill-blue-400 group-hover/item:text-blue-400 transition-colors"
                        />
                      </div>
                      <span className="group-hover/item:text-blue-400 transition-colors">
                        REANUDAR
                      </span>
                    </div>
                  </button>

                  {}
                  <div
                    className="flex items-center gap-4 transition-all menu-brush px-5 py-6 w-full text-white"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <button
                      onClick={() => setVolume(volume === 0 ? 70 : 0)}
                      className="w-10 flex justify-center hover:scale-110 transition-transform active:scale-95 group/volbtn"
                    >
                      {volume === 0 ? (
                        <VolumeX
                          size={24}
                          className="text-white/80 group-hover/volbtn:text-white transition-colors drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]"
                        />
                      ) : (
                        <Volume2
                          size={24}
                          className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                        />
                      )}
                    </button>

                    <div className="flex-1 flex items-center gap-4 group/slider">
                      <div className="relative flex-1 flex items-center h-6">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-white/20 appearance-none cursor-pointer rounded-full accent-white z-10 hover:h-2 transition-all"
                          style={{
                            background: `linear-gradient(to right, #ffffff ${volume}%, rgba(255,255,255,0.2) ${volume}%)`,
                          }}
                        />
                      </div>
                      <span className="text-[14px] font-mono text-white/90 font-bold tabular-nums min-w-[45px] text-right drop-shadow-sm">
                        {volume}%
                      </span>
                    </div>
                  </div>

                  {}
                  <button
                    onClick={() => {
                      setAppState('explore')
                      setIsSettingsModalOpen(false)
                      setIsPaused(false)
                    }}
                    className="flex items-center gap-4 text-[14px] font-black italic uppercase tracking-[0.2em] transition-all menu-brush px-5 py-3 w-full text-white group/item"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <div className="relative z-10 w-full flex items-center gap-4">
                      <div className="w-5 flex justify-center">
                        <Play
                          size={14}
                          className="fill-white group-hover/item:fill-blue-400 group-hover/item:text-blue-400 transition-colors"
                        />
                      </div>
                      <span className="group-hover/item:text-blue-400 transition-colors">
                        LOBBY
                      </span>
                    </div>
                  </button>

                  {}
                  <button
                    onClick={() => {
                      setAppState('landing')
                      setStoryIndex(-1)
                      setIsSettingsModalOpen(false)
                      setIsPaused(false)
                    }}
                    className="flex items-center gap-4 text-[14px] font-black italic uppercase tracking-[0.2em] transition-all menu-brush px-5 py-3 w-full text-white group/item"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <div className="relative z-10 w-full flex items-center gap-4">
                      <div className="w-5 flex justify-center">
                        <Play
                          size={14}
                          className="fill-white group-hover/item:fill-blue-400 group-hover/item:text-blue-400 transition-colors"
                        />
                      </div>
                      <span className="group-hover/item:text-blue-400 transition-colors">
                        VOLVER AL INICIO
                      </span>
                    </div>
                  </button>

                  {}
                  <button
                    onClick={() => setIsExiting(true)}
                    className="flex items-center gap-4 text-[14px] font-black italic uppercase tracking-[0.2em] transition-all menu-brush px-5 py-3 w-full text-white group/item"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <div className="relative z-10 w-full flex items-center gap-4">
                      <div className="w-5 flex justify-center">
                        <Play
                          size={14}
                          className="fill-white group-hover/item:fill-blue-400 group-hover/item:text-blue-400 transition-colors"
                        />
                      </div>
                      <span className="group-hover/item:text-blue-400 transition-colors">
                        SALIR
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center pointer-events-none"
          >
            <div className="text-[10px] font-mono tracking-[0.8em] text-blue-400 uppercase animate-pulse">
              SINCRONIZACIÓN EN CURSO...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <svg className="absolute" style={{ width: 0, height: 0 }}>
        <defs>
          <filter id="grunge" x="-10%" y="-10%" width="120%" height="120%">
            {}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.08"
              numOctaves="3"
              result="edgeNoise"
            />
            <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="3" result="roughEdges" />

            {}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="4"
              seed="1"
              result="holeNoise"
            />
            <feColorMatrix
              in="holeNoise"
              type="matrix"
              values="
              0 0 0 0 0 
              0 0 0 0 0 
              0 0 0 0 0 
              0 0 0 10 -4"
              result="holeMask"
            />
            <feComposite in="roughEdges" in2="holeMask" operator="out" />
          </filter>
        </defs>
      </svg>
      <PopupMessage
        message={popupMessage}
        onClose={() => setPopupMessage(null)}
        variant={popupVariant}
      />
    </div>
  )
}
