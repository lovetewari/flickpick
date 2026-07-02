'use client';
// Dim wall of slow-drifting movie posters behind the landing hero.
// Columns alternate direction, run at different speeds, and start mid-cycle
// (negative delays) so the drift is visibly alive from the first frame.
// Renders styled placeholder frames until (or if) real posters load.
const COLS = 8;
const PER_COL = 6;

export default function PosterWall({ posters = [] }) {
  const has = posters.length > 0;
  return (
    <div className="pwall" aria-hidden="true">
      {Array.from({ length: COLS }, (_, c) => {
        const items = Array.from({ length: PER_COL }, (_, r) =>
          has ? posters[(c * PER_COL + r) % posters.length] : null
        );
        return (
          <div
            key={c}
            className="pcol"
            style={{
              animation: `${c % 2 ? 'scrollDown' : 'scrollUp'} ${36 + (c % 4) * 6}s linear infinite`,
              animationDelay: `${-(c * 5.3)}s`, // desync columns — motion visible immediately
            }}
          >
            {[...items, ...items].map((src, i) =>
              src
                ? <img key={i} src={src} alt="" loading="lazy" decoding="async" fetchPriority="low" draggable={false} className="pframe" />
                : <div key={i} className="pframe" style={{ opacity: 0.55 + ((c + i) % 3) * 0.22 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
