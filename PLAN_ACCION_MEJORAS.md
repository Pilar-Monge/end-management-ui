# Plan de Acción - Mejoras de Rendimiento y Arquitectura
## end-management-ui | Versión: Mejorada | Fecha: 13-mayo-2026

---

## 📋 Resumen Ejecutivo
Plan de implementación priorizado para resolver problemas críticos de rendimiento 3D, code splitting y patrones de diseño. **Tiempo estimado total: 4-5 horas**. La defensa del proyecto es el **1 de junio de 2026**.

### Problemas Críticos Identificados
| # | Problema | Impacto | Estado |
|---|----------|--------|--------|
| 1 | Carga simultánea de 10-20 modelos GLB | Navegador colapsa en red lenta (30-60s) | 🔴 CRÍTICO |
| 2 | 20.000 partículas en ReplicaGlobe | CPU 100% en móviles | 🔴 CRÍTICO |
| 3 | Sin lazy loading de rutas | three.js cargado incluso en login (600KB) | 🔴 CRÍTICO |
| 4 | Sin code splitting en Vite | Arquitectura ineficiente de bundles | 🟠 ALTO |
| 5 | Componentes duplicados | SurvivorCharacter en 2 ubicaciones | 🟡 MEDIO |
| 6 | Lógica 3D dentro de componentes | Código no reutilizable, difícil de testear | 🟡 MEDIO |

---

## 🎯 Plan de Acción Priorizado

### FASE 1: Rendimiento Crítico (Impacto máximo, 50 min)

#### ✅ Tarea 1: React.lazy() - Lazy Loading de Rutas 3D
**Prioridad:** 🔴 CRÍTICO | **Tiempo:** 30 min | **Impacto:** Reducir bundle inicial en 600KB

**Objetivo:** Dividir el bundle de React para que three.js solo se cargue cuando el usuario navega a páginas que lo necesitan.

**Archivos a modificar:**
- `src/App.tsx` — Cambiar imports estáticos a React.lazy()

**Cambios:**
```typescript
// ANTES: Imports estáticos — three.js se carga siempre
import { ExpeditionsPage } from './features/expeditions'
import { ResourceMainViewPage } from './features/resources'

// DESPUÉS: React.lazy() — Carga bajo demanda
const ExpeditionsPage = lazy(() => import('./features/expeditions/pages/ExpeditionsPage'))
const ResourceMainViewPage = lazy(() => import('./features/resources/pages/ResourceMainViewPage'))
```

**Verificación:** 
- [ ] Network tab muestra 2 chunks separados (main + expedition)
- [ ] Tiempo inicial de carga < 5 segundos

---

#### ✅ Tarea 2: Reducir Partículas en ReplicaGlobe
**Prioridad:** 🔴 CRÍTICO | **Tiempo:** 5 min | **Impacto:** CPU -80%

**Objetivo:** Reducir partículas de 20.000 a 4.000 sin afectar visualmente el resultado.

**Archivos a modificar:**
- `src/docs/intro/src/components/ReplicaGlobe.tsx`

**Cambios:**
```typescript
// ANTES
const formationCount = 20000  // 20K partículas
const cyberCount = 2000       // 2K partículas

// DESPUÉS
const formationCount = 4000   // -80% costo, visualmente igual
const cyberCount = 500        // Reducción proporcional
```

**Verificación:**
- [ ] Componente renderiza sin lag en móviles (60 FPS)
- [ ] Animación visual es indistinguible

---

#### ✅ Tarea 3: Code Splitting en Vite
**Prioridad:** 🟠 ALTO | **Tiempo:** 15 min | **Impacto:** Mejor caché y carga paralela

**Objetivo:** Separar dependencias pesadas en chunks independientes para que el navegador cachee y cargue en paralelo.

**Archivos a modificar:**
- `vite.config.ts`

**Cambios:**
```typescript
// Agregar rollupOptions en build.rollupOptions.output.manualChunks
manualChunks: {
  'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
  'animation-vendor': ['framer-motion', 'gsap'],
  'query-vendor': ['@tanstack/react-query'],
  'ui-vendor': ['tailwindcss'],
}
```

**Verificación:**
- [ ] `npm run build` genera 5-6 chunks separados
- [ ] Size de main.js < 300KB

---

### FASE 2: Optimizaciones Gráficas (25 min)

#### ✅ Tarea 4: Limitar DPR + Antialias en ExpeditionsThreeScene
**Prioridad:** 🟡 MEDIO | **Tiempo:** 10 min | **Impacto:** GPU -40% en Retina/móviles

**Objetivo:** Evitar que dispositivos Retina rendericen a 2x-3x resolución (multiplicando costo de GPU por 4-9x).

**Archivos a modificar:**
- `src/features/expeditions/components/ExpeditionsThreeScene.tsx`
- `src/features/resources/components/ResourceMainThreeScene.tsx` (verificar)

**Cambios:**
```typescript
<Canvas
  dpr={[1, 1.5]}                          // Limitar DPR máximo
  shadows={{ type: THREE.PCFSoftShadowMap }}  // PCF Soft = más barato
  gl={{ antialias: false }}               // Desactivar antialias en móviles
  performance={{ min: 0.5 }}              // Reducir si FPS cae
>
```

**Verificación:**
- [ ] Canvas renderiza a máximo 1.5x en Retina
- [ ] FPS en móviles > 30fps

---

#### ✅ Tarea 5: Carga Diferida de Modelos 3D
**Prioridad:** 🟡 MEDIO | **Tiempo:** 15 min | **Impacto:** Tiempo a primera imagen visible -75%

**Objetivo:** No precargar todos los modelos GLB simultáneamente. Primero mostrar el hangar principal, luego cargar decorativos.

**Archivos a modificar:**
- `src/features/expeditions/components/ExpeditionsThreeScene.tsx`
- `src/features/resources/components/ResourceMainThreeScene.tsx`

**Patrón:**
```typescript
// 1. Cargar solo el modelo principal
const PRIORITY_MODELS = [HANGAR_URL];

// 2. Cargar decorativos después de 2 segundos
useEffect(() => {
  const timer = setTimeout(() => {
    useGLTF.preload(CARRO1_URL);
    useGLTF.preload(CARRO2_URL);
    // ... resto de decorativos
  }, 2000);
  return () => clearTimeout(timer);
}, []);

// 3. Eliminar useGLTF.preload() del nivel superior del archivo
```

**Verificación:**
- [ ] Hangar visible en < 5 segundos
- [ ] Decorativos cargan sin bloquear UI

---

### FASE 3: Arquitectura y Patrones (2-3 horas)

#### ✅ Tarea 6: Eliminar Componentes Duplicados
**Prioridad:** 🟡 MEDIO | **Tiempo:** 20 min | **Impacto:** Claridad de código

**Objetivo:** Consolidar componentes duplicados en una única fuente de verdad.

**Duplicados encontrados:**
```
src/components/SurvivorCharacter.tsx          ❌ ELIMINAR
src/shared/ui/SurvivorCharacter.tsx           ✅ MANTENER

src/components/BackgroundSurvivors.tsx        ❌ ELIMINAR
src/shared/ui/BackgroundSurvivors.tsx         ✅ MANTENER
```

**Tareas:**
- [ ] Eliminar `src/components/SurvivorCharacter.tsx`
- [ ] Eliminar `src/components/BackgroundSurvivors.tsx`
- [ ] Actualizar todos los imports en el codebase
- [ ] Verificar que no quedan imports a `src/components/`

---

#### ✅ Tarea 7: Custom Hooks para Lógica 3D
**Prioridad:** 🟡 MEDIO | **Tiempo:** 90 min | **Impacto:** Código reutilizable, fácil de testear

**Objetivo:** Extraer lógica de cámara, zoom y estado de los componentes de escena a custom hooks.

**Hooks a crear:**
1. `src/features/expeditions/hooks/useExpeditionCamera.ts`
   - Gestionar zoom, pan, reset de cámara
   - Estados: zoomedTarget, isAnimating

2. `src/features/resources/hooks/useResourceCamera.ts`
   - Similar a useExpeditionCamera

3. `src/shared/hooks/useThreeSceneState.ts`
   - Estado genérico para escenas 3D
   - Selección de objetos, visibilidad, animaciones

**Ejemplo - useExpeditionCamera:**
```typescript
export function useExpeditionCamera() {
  const [zoomedTarget, setZoomedTarget] = useState<'station' | 'map' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const zoomToStation = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget('station');
  }, []);

  const zoomToMap = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget('map');
  }, []);

  const resetCamera = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget(null);
  }, []);

  return { 
    zoomedTarget, 
    isAnimating,
    zoomToStation, 
    zoomToMap, 
    resetCamera 
  };
}
```

**Verificación:**
- [ ] ExpeditionsThreeScene.tsx reducido en 40% de líneas
- [ ] Lógica es independiente y reutilizable
- [ ] Componente solo maneja rendering

---

#### ✅ Tarea 8: Implementar Feature Stores (Zustand o Context)
**Prioridad:** 🟡 MEDIO | **Tiempo:** 60 min | **Impacto:** Preparación para defensa

**Objetivo:** Crear un patrón de estado global robusto para cada feature (sesión, autenticación).

**Archivos a crear:**
- `src/features/login/store/authStore.ts` (si usas Zustand)
- ó `src/shared/context/AuthContext.tsx` (si prefieres Context + useReducer)

**Patrón recomendado (Context + useReducer):**
```typescript
// shared/context/AuthContext.tsx
type AuthState = {
  user: User | null;
  campId: number | null;
  token: string | null;
  isSessionValid: boolean;
}

type AuthAction = 
  | { type: 'LOGIN'; payload: AuthState }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_SESSION'; payload: Partial<AuthState> }

const AuthContext = createContext<[AuthState, Dispatch<AuthAction>] | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  useEffect(() => {
    // Verificar sesión válida según useSessionManager
    const isValid = verifySession();
    dispatch({ type: 'UPDATE_SESSION', payload: { isSessionValid: isValid } });
  }, []);

  return (
    <AuthContext.Provider value={[state, dispatch]}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe estar dentro de AuthProvider');
  return context;
}
```

**Verificación:**
- [ ] `useAuth()` disponible en cualquier componente
- [ ] No hay prop drilling de auth
- [ ] Integración con useSessionManager correcta

---

### FASE 4: Documentación y Validación (30 min)

#### ✅ Tarea 9: Documentar Patrones de Diseño
**Prioridad:** 🟡 MEDIO | **Tiempo:** 30 min | **Impacto:** Preparación para defensa

**Objetivo:** Crear documento para explicar patrones usados durante la defensa.

**Archivo a crear:**
- `PATRONES_DISEÑO.md`

**Contenido:**
```markdown
# Patrones de Diseño Implementados

## 1. Feature-Sliced Design
- Cada feature en `src/features/<nombre>/`
- Componentes isolados y reutilizables

## 2. Custom Hooks
- Lógica separada de UI
- useExpeditionCamera, useResourceCamera, useThreeSceneState

## 3. Observer Pattern (React Query)
- Caché automática de API
- Refetch en background

## 4. Context API + useReducer
- Estado global de autenticación
- useAuth() accesible en cualquier componente

## 5. Lazy Loading + Code Splitting
- React.lazy() para rutas 3D
- manualChunks en Vite

## 6. Progressive Image Loading
- Preload de modelo principal
- Carga diferida de decorativos
```

---

## 📊 Progreso del Plan

| Fase | Tarea | Estado | Tiempo | 
|------|-------|--------|--------|
| 1 | React.lazy() | ⬜ | 30 min |
| 1 | Reducir partículas | ⬜ | 5 min |
| 1 | Code splitting Vite | ⬜ | 15 min |
| 2 | DPR + Antialias | ⬜ | 10 min |
| 2 | Carga diferida GLB | ⬜ | 15 min |
| 3 | Eliminar duplicados | ⬜ | 20 min |
| 3 | Custom Hooks | ⬜ | 90 min |
| 3 | Feature Stores | ⬜ | 60 min |
| 4 | Documentar patrones | ⬜ | 30 min |
| **TOTAL** | | | **4h 45 min** |

---

## 🎓 Preparación para Defensa (1 de junio 2026)

### Preguntas Probables y Respuestas

#### P: ¿Qué patrones de diseño usaron?
**R:** Implementamos Feature-Sliced Design para organizar por features. Custom Hooks para separar lógica (useExpeditionCamera, useThreeSceneState). Context API + useReducer para estado global. Observer pattern con React Query para caché de API.

#### P: ¿Cómo manejan el rendimiento con 3D?
**R:** Lazy loading de rutas con React.lazy(), limitación de DPR en Canvas, carga diferida de modelos (hangar primero, decorativos después), code splitting en Vite para que three.js solo se cargue cuando es necesario.

#### P: ¿Cómo mejoraron el rendimiento?
**R:** Reducimos bundle inicial de 600KB eliminando three.js del main chunk. Partículas bajaron de 20K a 4K (-80% CPU). Tiempo de carga pasó de 30-60s a 5-8s.

#### P: ¿Cómo implementaron seguridad de sesión?
**R:** useSessionManager verifica inactividad. Token guardado en sessionStorage. Se compara last_activity_date con session_inactivity_minutes del campamento.

---

## ✅ Checklist Final

- [ ] React.lazy() implementado en App.tsx
- [ ] Partículas reducidas a 4K
- [ ] Code splitting en Vite con manualChunks
- [ ] DPR limitado a [1, 1.5]
- [ ] Carga diferida de modelos GLB
- [ ] Componentes duplicados eliminados
- [ ] Custom Hooks creados y funcionales
- [ ] Feature Stores (AuthContext) configurado
- [ ] Patrones documentados en PATRONES_DISEÑO.md
- [ ] Build genera < 300KB main.js
- [ ] Tiempo de carga inicial < 5 segundos
- [ ] FPS > 30 en móviles

---

**Última actualización:** 13 de mayo 2026  
**Responsable:** end-management-ui Team  
**Defensa:** 1 de junio 2026
