const MEDIA_BASE_URL = 'https://tuieldonbxswmopvyryx.supabase.co/storage/v1/object/public/'
const R2_MEDIA_BASE_URL = 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/'

export const MEDIA_URLS = {
  images: {
    earthDark: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
    earthTopology: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    characters: {
      principal: `${R2_MEDIA_BASE_URL}videos-images-intro/1.principal.webp`,
      mecanico: `${R2_MEDIA_BASE_URL}videos-images-intro/2.mecanico%20(1).webp`,
      expedicionista: `${R2_MEDIA_BASE_URL}videos-images-intro/3.expedicionista%20(1).webp`,
    },
  },
  videos: {
    run: `${R2_MEDIA_BASE_URL}videos-images-intro/persona%20corriendo%20(1).mp4`,
    transition: `${R2_MEDIA_BASE_URL}videos-images-intro/transicion.webp`,
  },
  models: {},
  sounds: {},
  textures: {
    noise:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)" opacity="0.9"/%3E%3C/svg%3E',
  },
  branding: {
    logo: `${MEDIA_BASE_URL}1.principal/logo_pentadev.webp`,
    background: `${R2_MEDIA_BASE_URL}videos-images-intro/background-intro.webp`,
  },
}
