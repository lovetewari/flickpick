'use client';
import PosterWall from '@/components/PosterWall';

// Fixed full-screen background for interior screens.
//  variant="charcoal" (default) -> iCloud landing charcoal
//  variant="dash"                -> iCloud dashboard blue gradient
//  variant="hero"                -> landing/login poster wall
export default function CinematicBG({ variant = 'charcoal', posters = [] }) {
  if (variant === 'hero') {
    return (
      <div className="app-bg app-bg-hero" aria-hidden="true">
        <PosterWall posters={posters} />
        <div className="landing-scrim" />
      </div>
    );
  }

  return <div className={`app-bg ${variant === 'dash' ? 'app-bg-dash' : 'app-bg-charcoal'}`} aria-hidden="true" />;
}
