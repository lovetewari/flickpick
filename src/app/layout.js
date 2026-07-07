import './globals.css';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata = {
  title: 'FlickPick — Movie Night, Decided',
  description: 'Swipe together, match instantly, watch tonight. Movies & series, powered by TMDB.',
  applicationName: 'FlickPick',
  // NOTE: icons are intentionally NOT declared here. Letting the app/icon.svg
  // and app/apple-icon.svg file conventions drive them makes Next emit a
  // content-hashed URL (…/icon.svg?<hash>) that busts the browser's very
  // aggressive favicon cache automatically on every redesign. A manual
  // `/icon.svg` (no hash) freezes the tab icon on the first version forever.
  appleWebApp: {
    capable: true,
    title: 'FlickPick',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  colorScheme: 'dark',
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  // Cinematic, Apple-TV-style dark theme app-wide.
  return (
    <html lang="en" data-theme="dark" className={display.variable}>
      <body>
        {/* Warm up the poster CDNs before the first image request (saves a
            DNS+TLS round-trip; browsers honor preconnect hints in body) */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://is1-ssl.mzstatic.com" crossOrigin="anonymous" />
        {children}
      </body>
    </html>
  );
}
