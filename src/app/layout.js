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
