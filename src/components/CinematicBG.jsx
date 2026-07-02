'use client';
// Fixed full-screen background for interior screens.
//  variant="charcoal" (default) → iCloud landing charcoal
//  variant="dash"                → iCloud dashboard blue gradient
export default function CinematicBG({ variant = 'charcoal' }) {
  return <div className={`app-bg ${variant === 'dash' ? 'app-bg-dash' : 'app-bg-charcoal'}`} aria-hidden="true" />;
}
