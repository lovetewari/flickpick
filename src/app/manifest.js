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
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
