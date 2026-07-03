// Lightweight SF-Symbols-style line icons. Stroke uses currentColor so they
// adapt to light/dark and inherit the parent's text color.
const base = (size) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
});

// Compact FlickPick mark from the brand draft: warm-gradient play flag with a
// white play triangle. Self-colored — works on dark and light backgrounds.
export function IconBrand({ size = 22, framed = false }) {
  if (framed) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="fp-brand-tile-g" x1="7" y1="5" x2="57" y2="59" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFB020" />
            <stop offset="0.5" stopColor="#FF375F" />
            <stop offset="1" stopColor="#BF5AF2" />
          </linearGradient>
          <radialGradient id="fp-brand-tile-hi" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18 12) rotate(53) scale(54)">
            <stop stopColor="#FFFFFF" stopOpacity="0.36" />
            <stop offset="0.48" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="url(#fp-brand-tile-g)" />
        <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="url(#fp-brand-tile-hi)" />
        <rect x="1.5" y="1.5" width="61" height="61" rx="16" stroke="rgba(255,255,255,.42)" />
        <path d="M21 14.8 48.1 28.9c2.4 1.25 2.4 4.95 0 6.2L21 49.2c-2.3 1.2-5-.45-5-3.08V17.88c0-2.63 2.7-4.28 5-3.08Z" fill="rgba(255,255,255,.96)" />
        <path d="M29 25.2 41.7 32 29 38.8Z" fill="#1A1022" opacity="0.92" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fp-brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9F0A" />
          <stop offset="0.55" stopColor="#FF375F" />
          <stop offset="1" stopColor="#BF5AF2" />
        </linearGradient>
      </defs>
      <path d="M5.6 2.6 20 10.2c1.5.8 1.5 2.8 0 3.6L5.6 21.4C4.3 22.1 3 21.2 3 19.8V4.2c0-1.4 1.3-2.3 2.6-1.6Z" fill="url(#fp-brand-g)" />
      <path d="M9.5 8.8l6.2 3.2-6.2 3.2Z" fill="#fff" />
    </svg>
  );
}

// Full brand lockup from the shared draft: gradient play flag + friends on a
// couch watching a screen. For hero/marketing moments (≥ 60px tall).
export function BrandLogo({ height = 84 }) {
  return (
    <svg height={height} viewBox="0 0 126 86" fill="none" role="img" aria-label="FlickPick — watch together, pick together">
      <defs>
        <linearGradient id="fp-flag-g" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FF9F0A" />
          <stop offset="0.5" stopColor="#FF375F" />
          <stop offset="1" stopColor="#D944C8" />
        </linearGradient>
      </defs>
      <path d="M9.5 4.5 40 12v62L9.5 81.5C6.5 82.2 4 80 4 77V9c0-3 2.5-5.2 5.5-4.5Z" fill="url(#fp-flag-g)" />
      <path d="M19 33l15 9-15 9Z" fill="#fff" />
      <rect x="38" y="12" width="84" height="56" rx="11" fill="#151329" stroke="#fff" strokeWidth="3.2" />
      <circle cx="64" cy="44" r="7" fill="#FF4E6A" />
      <path d="M53.5 60c0-5.6 4.7-8.6 10.5-8.6S74.5 54.4 74.5 60Z" fill="#FF4E6A" />
      <circle cx="80" cy="40" r="8" fill="#FF9F0A" />
      <path d="M68.5 60c0-6.4 5.2-9.6 11.5-9.6S91.5 53.6 91.5 60Z" fill="#FF9F0A" />
      <circle cx="96" cy="44" r="7" fill="#A855F7" />
      <path d="M85.5 60c0-5.6 4.7-8.6 10.5-8.6s10.5 3 10.5 8.6Z" fill="#A855F7" />
      <path d="M42 58h76c4.4 0 7 2.8 7 7v5c0 5-3.4 8.5-8.5 8.5h-73C38.4 78.5 35 75 35 70v-5c0-4.2 2.6-7 7-7Z" fill="#151329" stroke="#fff" strokeWidth="3.2" />
    </svg>
  );
}

export function IconFilm({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3.2" />
      <path d="M7.5 4.5v15M16.5 4.5v15" />
      <path d="M2.5 9.3h5M2.5 14.7h5M16.5 9.3h5M16.5 14.7h5" />
    </svg>
  );
}

export function IconTicket({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a2.2 2.2 0 0 0 0 5.6V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.2a2.2 2.2 0 0 0 0-5.6Z" />
      <path d="M14 6.5v11" strokeDasharray="1.6 2.4" />
    </svg>
  );
}

export function IconPlay({ size = 22 }) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <path d="M8 5.6c0-.8.86-1.3 1.55-.9l9 6.4c.66.42.66 1.38 0 1.8l-9 6.4c-.7.4-1.55-.1-1.55-.9Z" />
    </svg>
  );
}

export function IconSparkles({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5Z" />
      <path d="M18.5 13.5c.2 1.4.7 1.9 2 2-1.3.1-1.8.6-2 2-.2-1.4-.7-1.9-2-2 1.3-.1 1.8-.6 2-2Z" />
    </svg>
  );
}

export function IconCheck({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M4.5 12.5 9 17l10.5-10.5" />
    </svg>
  );
}

export function IconArrowRight({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />
    </svg>
  );
}

export function IconUsers({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  );
}

export function IconShare({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 15V3.5M8.5 7 12 3.5 15.5 7" />
      <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export function IconCopy({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function IconPlus({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronLeft({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  );
}

export function IconStar({ size = 16, filled = true }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} strokeWidth={filled ? 0 : 1.7}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.2 9.7l5.9-.9Z" />
    </svg>
  );
}

export function IconClock({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconHeart({ size = 22, filled = false }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} strokeWidth={filled ? 0 : 1.7}>
      <path d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5Z" />
    </svg>
  );
}

export function IconHome({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconClose({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconTv({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <rect x="2.5" y="7" width="19" height="12" rx="2.5" />
      <path d="M8.5 7 12 3.5 15.5 7" />
      <path d="M9.5 22l1.2-3M14.5 22l-1.2-3" />
    </svg>
  );
}

export function IconTrophy({ size = 22 }) {
  return (
    <svg {...base(size)}>
      <path d="M7 4.5h10v4a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10M17 6h2.5v1.5A3 3 0 0 1 16.5 10" />
      <path d="M12 13.5V17M8.5 20.5h7M9.5 20.5c0-1.5 1-3.5 2.5-3.5s2.5 2 2.5 3.5" />
    </svg>
  );
}

const tileIconBase = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.45,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

// Dashboard app glyphs. These share a 32px optical grid and line weight, so the
// tray reads like one coherent product surface instead of mixed stock icons.
export function IconHostRoom({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <rect x="7" y="8" width="18" height="16" rx="4.2" />
      <path d="M16 12.4v7.2M12.4 16h7.2" strokeWidth="2.8" />
    </svg>
  );
}

export function IconJoinRoom({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <path d="M7.5 8.2h8.2a3 3 0 0 1 3 3v9.6a3 3 0 0 1-3 3H7.5" />
      <path d="M14 16h11M21.2 12.2 25 16l-3.8 3.8" strokeWidth="2.8" />
    </svg>
  );
}

export function IconWatchHistory({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <path d="M9.2 8.8A10.2 10.2 0 1 1 6 16.2" />
      <path d="M6.1 8.1h3.7v3.7" />
      <path d="M16 10.4v6l4.1 2.5" strokeWidth="2.55" />
    </svg>
  );
}

export function IconMatchTile({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <path d="M16 25.2S7 20 7 13.7A5.35 5.35 0 0 1 16 10a5.35 5.35 0 0 1 9 3.7c0 6.3-9 11.5-9 11.5Z" />
    </svg>
  );
}

export function IconRoomsTile({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <path d="M6.5 15.4 16 7.8l9.5 7.6" />
      <path d="M9.4 13.4v10a1.8 1.8 0 0 0 1.8 1.8h9.6a1.8 1.8 0 0 0 1.8-1.8v-10" />
      <path d="M13.1 25.2v-5.4a1.7 1.7 0 0 1 1.7-1.7h2.4a1.7 1.7 0 0 1 1.7 1.7v5.4" />
    </svg>
  );
}

export function IconProfileTile({ size = 32 }) {
  return (
    <svg {...tileIconBase(size)}>
      <circle cx="16" cy="11.6" r="4.5" />
      <path d="M7.8 25.1c.75-4.8 4.05-7.3 8.2-7.3s7.45 2.5 8.2 7.3" />
    </svg>
  );
}

export function IconLock({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3Z" />
    </svg>
  );
}

export function IconGoogle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
