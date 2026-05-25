export interface Camp {
  id: string
  name: string
  lat: number
  lng: number
  description: string
  color: string
}

export const CAMPS: Camp[] = [
  {
    id: 'alpha',
    name: 'Camp Alpha',
    lat: 40.7128,
    lng: -74.006,
    description: 'Estructura de mando central. Blindaje nivel 5.',
    color: '#ff4444',
  },
  {
    id: 'bravo',
    name: 'Camp Bravo',
    lat: 34.0522,
    lng: -118.2437,
    description: 'Refugio de suministros médicos y biológicos.',
    color: '#44ff44',
  },
  {
    id: 'charlie',
    name: 'Camp Charlie',
    lat: 51.5074,
    lng: -0.1278,
    description: 'Unidad de investigación de energía solar.',
    color: '#4444ff',
  },
  {
    id: 'delta',
    name: 'Camp Delta',
    lat: -33.8688,
    lng: 151.2093,
    description: 'Centro de comunicaciones transoceánicas.',
    color: '#ffff44',
  },
]
