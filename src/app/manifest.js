export default function manifest() {
  return {
    name: 'FlickPick',
    short_name: 'FlickPick',
    description: 'Swipe together, match instantly, watch tonight.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#111114',
    theme_color: '#111114',
    icons: [
      // Rounded squircle for the browser tab / home-screen "any" slot…
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      // …full-bleed version so Android's circle/squircle mask never clips a corner.
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
