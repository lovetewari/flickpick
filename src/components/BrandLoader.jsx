'use client';
import { useEffect, useState } from 'react';

import BrandOrbit from '@/components/BrandOrbit';
import CinematicBG from '@/components/CinematicBG';
import { getTrending } from '@/lib/trending';

export default function BrandLoader({ label = 'Loading FlickPick…', className = '', backdrop = true }) {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    if (!backdrop) return;
    getTrending().then(d => { if (d.posters.length) setPosters(d.posters); }).catch(() => {});
  }, [backdrop]);

  return (
    <div className={`brand-loader ${className}`} role="status" aria-live="polite" aria-label={label}>
      {backdrop && <CinematicBG variant="hero" posters={posters} />}
      <div className="brand-loader-content">
        <BrandOrbit className="brand-loader-orbit" />
        {label && <p className="brand-loader-label">{label}</p>}
      </div>
    </div>
  );
}
