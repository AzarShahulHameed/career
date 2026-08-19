// Catapult Careers wordmark. Background-removed PNG lives in /public/logo.png.
// Rendered at a fixed aspect ratio (437x169 source) so it never stretches.
const LOGO_ASPECT = 437 / 169;

export function AppLogo({ size = 26, className = '' }: { size?: number; className?: string }) {
  const height = size;
  const width = Math.round(size * LOGO_ASPECT);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Catapult Careers"
      width={width}
      height={height}
      className={`block object-contain ${className}`}
      style={{ height, width }}
    />
  );
}
