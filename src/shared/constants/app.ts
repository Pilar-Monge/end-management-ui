interface ModuleItem {
  id: string
  label: string
  icon: string
  description: string
  roles: string[]
  path: string
  color: string
}

export const MODULES: ModuleItem[] = [
  {
    id: 'catalogs',
    label: 'Catálogos',
    icon: '◊',
    description: 'Recursos, ocupaciones y logros',
    roles: ['SYSTEM_ADMIN'],
    path: '/catalogs',
    color: '#5a9a20',
  },
  {
    id: 'camps',
    label: 'Campamentos',
    icon: '◍',
    description: 'Ubicaciones, defensa y población',
    roles: ['SYSTEM_ADMIN'],
    path: '/camps',
    color: '#2a8a20',
  },
  {
    id: 'persons',
    label: 'Personas',
    icon: '◈',
    description: 'Gestión de supervivientes',
    roles: ['SYSTEM_ADMIN'],
    path: '/persons',
    color: '#4a8a28',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: '◉',
    description: 'Bodega y recursos',
    roles: ['SYSTEM_ADMIN', 'RESOURCE_MANAGEMENT', 'WORKER'],
    path: '/inventory',
    color: '#2a7a48',
  },
  {
    id: 'expeditions',
    label: 'Expediciones',
    icon: '◎',
    description: 'Misiones al exterior',
    roles: ['SYSTEM_ADMIN', 'TRAVEL_MANAGER'],
    path: '/expeditions',
    color: '#3a6a58',
  },
  {
    id: 'transfers',
    label: 'Traslados',
    icon: '◐',
    description: 'Inter-campamento',
    roles: ['SYSTEM_ADMIN', 'TRAVEL_MANAGER', 'RESOURCE_MANAGEMENT'],
    path: '/transfers',
    color: '#1a6a38',
  },
  {
    id: 'admissions',
    label: 'Admisiones',
    icon: '◑',
    description: 'Nuevos ingresos + IA',
    roles: ['SYSTEM_ADMIN'],
    path: '/admissions',
    color: '#4a7a18',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '◆',
    description: 'Métricas y alertas',
    roles: ['SYSTEM_ADMIN', 'RESOURCE_MANAGEMENT'],
    path: '/admin-dashboard',
    color: '#5a9a10',
  },
  {
    id: 'dashboard-tactical',
    label: 'Dashboard Táctico',
    icon: '◈',
    description: 'Panel admin estilo expediciones',
    roles: ['SYSTEM_ADMIN', 'RESOURCE_MANAGEMENT'],
    path: '/admin-dashboard-ui-v2',
    color: '#67aca9',
  },
  {
    id: 'profile',
    label: 'Mi Perfil',
    icon: '◇',
    description: 'Estado y configuración',
    roles: ['VISITOR', 'WORKER', 'RESOURCE_MANAGEMENT', 'TRAVEL_MANAGER', 'SYSTEM_ADMIN'],
    path: '/profile',
    color: '#3a7a30',
  },
]

export const GHOST_CHARACTERS = [
  { x: '8%', size: 120, delay: 0, opacity: 0.12 },
  { x: '20%', size: 148, delay: 1.2, opacity: 0.08 },
  { x: '38%', size: 136, delay: 0.6, opacity: 0.1 },
  { x: '50%', size: 160, delay: 1.8, opacity: 0.07 },
  { x: '62%', size: 132, delay: 0.3, opacity: 0.09 },
  { x: '74%', size: 120, delay: 2.1, opacity: 0.06 },
  { x: '88%', size: 144, delay: 1.5, opacity: 0.08 },
] as const
