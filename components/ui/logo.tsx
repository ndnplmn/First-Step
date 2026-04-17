'use client';

/**
 * Tend — Logo system
 *
 * Mark: A lowercase "t" where the crossbar is a gentle concave arc
 * opening upward — simultaneously a letter, a cradle, and an open gesture.
 *
 * TendMark  — just the SVG mark (icon-only usage)
 * TendLogo  — horizontal lockup: mark + wordmark
 */

interface TendMarkProps {
  size?: number;
  className?: string;
}

export function TendMark({ size = 40, className }: TendMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Vertical stroke */}
      <line
        x1="20" y1="5"
        x2="20" y2="36"
        stroke="var(--color-sage)"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Curved crossbar — concave upward (open cradle) */}
      <path
        d="M 7 17 Q 20 10 33 17"
        stroke="var(--color-sage)"
        strokeWidth="2.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TendLogoProps {
  size?: number;
  className?: string;
}

export function TendLogo({ size = 28, className }: TendLogoProps) {
  return (
    <div
      className={`flex items-center ${className ?? ''}`}
      style={{ gap: size * 0.25 }}
      aria-label="Tend"
    >
      <TendMark size={size} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: size * 0.71,
          color: 'var(--color-deep)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        tend
      </span>
    </div>
  );
}
