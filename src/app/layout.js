import './globals.css';
export const metadata = { title: 'FlickPick — Movie Night Made Easy', description: 'Swipe, match, watch together.' };
export default function RootLayout({ children }) {
  return <html lang="en"><body className="min-h-screen">{children}</body></html>;
}
