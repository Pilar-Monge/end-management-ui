export const GLTF_URLS = {
  hangar: 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/polygon.glb',
  monitoringStation:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/monitoring_station.glb',
  beerBrewery:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/beer_brewery_set.glb',
  ford: 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/ford_f100_1967.glb',
  meat: 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/vietnamese_meat_market_stall.glb',
  shelf:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/metal_storage_cabinet.glb',
  forklift:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/forklifter_-_game_ready.glb',
  ceilingLamp:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/fluorescent_lamplight_-_4096px2.glb',
  fruit:
    'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/fruit_veg_market%20(1).glb',
  chair: 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/dock-01_chair.glb',
}

export const INITIAL_CAMERA = [-66.4, 11.2, -40.9] as [number, number, number]
export const INITIAL_TARGET = [-60, 9, -33] as [number, number, number]

export type ResourceZoomTarget = 'station' | 'meat' | 'beer' | null

export const ZOOM_VIEWS: Record<
  Exclude<ResourceZoomTarget, null>,
  {
    camera: [number, number, number]
    look: [number, number, number]
  }
> = {
  station: {
    camera: [-60, 10, -50],
    look: [-60, 8, -60],
  },
  meat: {
    camera: [-70, 15, -28],
    look: [-70, 4, 1],
  },
  beer: {
    camera: [-40, 15, -25],
    look: [-40, 4, 0],
  },
}

export const RESOURCE_MODELS_CONFIG = [
  {
    key: 'hangar',
    url: GLTF_URLS.hangar,
    position: [0, 0, 0] as [number, number, number],
  },
  {
    key: 'monitoringStation',
    url: GLTF_URLS.monitoringStation,
    position: [-60, 1, -60] as [number, number, number],
    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
    scale: 7,
  },
  {
    key: 'beerBrewery',
    url: GLTF_URLS.beerBrewery,
    position: [-40, 0.5, 0] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
  },
  {
    key: 'ford',
    url: GLTF_URLS.ford,
    position: [50, 0.7, -56] as [number, number, number],
    targetSize: 25,
  },
  {
    key: 'meat',
    url: GLTF_URLS.meat,
    position: [-70, 0.5, 1] as [number, number, number],
    scale: 2,
  },
  {
    key: 'shelf',
    url: GLTF_URLS.shelf,
    position: [-74, 1, -60] as [number, number, number],
    scale: 0.2,
  },
  {
    key: 'forklift',
    url: GLTF_URLS.forklift,
    position: [0, 0.9, -15] as [number, number, number],
    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
    scale: 0.05,
    shadows: false,
  },
  {
    key: 'ceilingLampLeft',
    url: GLTF_URLS.ceilingLamp,
    position: [-72, 20, -50] as [number, number, number],
    rotation: [0, Math.PI * 1.5, 0] as [number, number, number],
    targetSize: 8,
    emissive: true,
  },
  {
    key: 'ceilingLampRight',
    url: GLTF_URLS.ceilingLamp,
    position: [-72, 20, -20] as [number, number, number],
    rotation: [0, Math.PI * 1.5, 0] as [number, number, number],
    targetSize: 8,
    emissive: true,
  },
  {
    key: 'fruit',
    url: GLTF_URLS.fruit,
    position: [-95, 1, -16] as [number, number, number],
    scale: 0.04,
  },
  {
    key: 'chair',
    url: GLTF_URLS.chair,
    position: [-55, 1, -50] as [number, number, number],
    rotation: [0, 0.523599, 0] as [number, number, number],
    targetSize: 7,
  },
]

export const INTERACTION_TARGETS = [
  {
    type: 'station' as const,
    name: 'Estación de Monitoreo',
    position: [-60, 14, -60] as [number, number, number],
    boxPosition: [-60, 6, -60] as [number, number, number],
    boxSize: [12, 10, 8] as [number, number, number],
  },
  {
    type: 'meat' as const,
    name: 'Puesto de Carne',
    position: [-70, 11, 1] as [number, number, number],
    boxPosition: [-70, 3, 1] as [number, number, number],
    boxSize: [8, 6, 6] as [number, number, number],
  },
  {
    type: 'beer' as const,
    name: 'Cervecería',
    position: [-40, 11, 0] as [number, number, number],
    boxPosition: [-40, 3, 0] as [number, number, number],
    boxSize: [10, 6, 8] as [number, number, number],
  },
]
