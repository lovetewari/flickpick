import { IconFilm, IconTv, IconTicket, IconPlay, IconStar, IconHeart, IconSparkles } from '@/components/Icons';

const SATS = [
  { a: '-48deg',  rf: 0.29, sf: 0.215, z: 3, d: 1.95, fdur: 5.6, glyph: '#ff6a75', Ic: IconFilm },
  { a: '112deg',  rf: 0.28, sf: 0.19,  z: 4, d: 2.06, fdur: 6.2, glyph: '#ffd66b', Ic: IconStar, filled: true },
  { a: '-118deg', rf: 0.26, sf: 0.2,   z: 4, d: 2.17, fdur: 5.1, glyph: '#ff8fbf', Ic: IconHeart, filled: true },
  { a: '12deg',   rf: 0.31, sf: 0.145, z: 2, d: 2.28, fdur: 4.7, glyph: '#5de0e6', Ic: IconSparkles },
  { a: '58deg',   rf: 0.27, sf: 0.155, z: 2, d: 2.39, fdur: 5.9, glyph: '#4aa3ff', Ic: IconTv },
  { a: '-84deg',  rf: 0.33, sf: 0.125, z: 2, d: 2.5,  fdur: 4.4, glyph: '#4be08b', Ic: IconPlay, filled: true },
  { a: '171deg',  rf: 0.25, sf: 0.165, z: 6, d: 2.61, fdur: 5.3, glyph: '#c98bff', Ic: IconTicket },
];

export default function BrandOrbit({ className = '' }) {
  return (
    <div className={`hero-cluster ${className}`}>
      {SATS.map((s, i) => (
        <div
          key={i}
          className="sat"
          style={{ '--a': s.a, '--rf': s.rf, '--ts': `calc(var(--w) * ${s.sf})`, '--z': s.z, '--d': `${s.d}s`, '--fdur': `${s.fdur}s`, '--fd': `${s.d + 0.64}s` }}
        >
          <div className="sat-pop">
            <div className="sat-float">
              <div className="app-tile" style={{ '--glyph': s.glyph }}><s.Ic filled={s.filled} /></div>
            </div>
          </div>
        </div>
      ))}
      <div className="hero-center"><IconPlay filled /></div>
    </div>
  );
}
