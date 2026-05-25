import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

export interface User {
  id: number
  email: string
  name: string
  role?: string
}

export interface AuthState {
  user: User | null
  campId: number | null
  token: string | null
  isSessionValid: boolean
  isLoading: boolean
  error: string | null
  selectedCampId: number | null
}

export type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; campId: number; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_SESSION'; payload: Partial<AuthState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INVALIDATE_SESSION' }
  | { type: 'SELECT_CAMP'; payload: number }

const initialState: AuthState = {
  user: null,
  campId: null,
  token: null,
  isSessionValid: true,
  isLoading: false,
  error: null,
  selectedCampId: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        campId: action.payload.campId,
        token: action.payload.token,
        isSessionValid: true,
        isLoading: false,
        error: null,
      }

    case 'LOGOUT':
      return initialState

    case 'UPDATE_SESSION':
      return {
        ...state,
        ...action.payload,
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }

    case 'INVALIDATE_SESSION':
      return {
        ...state,
        isSessionValid: false,
      }

    case 'SELECT_CAMP':
      return {
        ...state,
        selectedCampId: action.payload,
      }

    default:
      return state
  }
}

const AuthContext = createContext<
  | {
      state: AuthState
      dispatch: Dispatch<AuthAction>
    }
  | undefined
>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth debe ser utilizado dentro de un AuthProvider. ' +
        'Asegúrate de envolver tu aplicación con <AuthProvider>.</AuthProvider>',
    )
  }

  return context
}

export function useAuthState() {
  const { state } = useAuth()
  return state
}

export function useAuthDispatch() {
  const { dispatch } = useAuth()
  return dispatch
}
