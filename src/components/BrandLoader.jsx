import BrandOrbit from '@/components/BrandOrbit';

export default function BrandLoader({ label = 'Loading FlickPick…', className = '' }) {
  return (
    <div className={`brand-loader ${className}`} role="status" aria-live="polite" aria-label={label}>
      <BrandOrbit className="loader-orbit" />
      {label && <p className="brand-loader-label">{label}</p>}
    </div>
  );
}
