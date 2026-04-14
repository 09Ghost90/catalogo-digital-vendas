/**
 * Armarinhos Pereira — Brand Logo Component
 * 
 * Colours:
 *   Navy:      #1B3A5C
 *   Orange:    #E8752A
 *   Yellow:    #F5A623
 *   LightBlue: #5B9BD5
 *   White:     #FFFFFF
 */

import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  /** 'horizontal' = icon + text side-by-side, 'stacked' = icon on top, text below */
  variant?: 'horizontal' | 'stacked' | 'icon';
  /** Tailwind className override for the wrapper */
  className?: string;
  /** Force dark (white) variant. If omitted, auto-detects from theme context. */
  dark?: boolean;
  /** Icon size in px (default 48 horizontal, 80 stacked) */
  size?: number;
}

function LogoIcon({ size = 48, dark = false }: { size?: number; dark?: boolean }) {
  const basket = dark ? '#FFFFFF' : '#1B3A5C';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Basket body */}
      <path
        d="M25 50 C25 50, 18 100, 30 105 C42 110, 78 110, 90 105 C102 100, 95 50, 95 50 Z"
        fill={basket}
      />
      {/* Basket rim */}
      <rect x="20" y="44" width="80" height="12" rx="6" fill={basket} />
      {/* Handle left */}
      <rect x="40" y="38" width="5" height="12" rx="2.5" fill={basket} />
      {/* Handle right */}
      <rect x="75" y="38" width="5" height="12" rx="2.5" fill={basket} />

      {/* Button (sewing) — orange circle with 4 holes */}
      <circle cx="38" cy="30" r="14" fill="#E8752A" />
      <circle cx="34" cy="26" r="2.5" fill={dark ? '#1B3A5C' : '#FFFFFF'} />
      <circle cx="42" cy="26" r="2.5" fill={dark ? '#1B3A5C' : '#FFFFFF'} />
      <circle cx="34" cy="34" r="2.5" fill={dark ? '#1B3A5C' : '#FFFFFF'} />
      <circle cx="42" cy="34" r="2.5" fill={dark ? '#1B3A5C' : '#FFFFFF'} />

      {/* House (home/utilities) — orange */}
      <g transform="translate(52, 8)">
        <polygon points="12,0 24,12 24,26 0,26 0,12" fill="#E8752A" />
        <rect x="8" y="16" width="8" height="10" fill={dark ? '#1B3A5C' : '#FFFFFF'} />
      </g>

      {/* Sparkle/Star (electrical) — light blue */}
      <g transform="translate(80, 14)">
        <polygon
          points="8,0 10,6 16,8 10,10 8,16 6,10 0,8 6,6"
          fill="#5B9BD5"
        />
      </g>
    </svg>
  );
}

/**
 * Full brand logo with icon + typography.
 * Uses Montserrat (loaded via Google Fonts in index.html).
 * Auto-detects dark mode from ThemeContext; `dark` prop overrides if set.
 */
export default function Logo({ variant = 'horizontal', className = '', dark, size }: LogoProps) {
  const { theme } = useTheme();
  const isDark = dark !== undefined ? dark : theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#1B3A5C';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.7)' : '#4A6A8A';
  const accentDot = '#E8752A';

  if (variant === 'icon') {
    return <LogoIcon size={size || 48} dark={isDark} />;
  }

  if (variant === 'stacked') {
    const iconSize = size || 80;
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <LogoIcon size={iconSize} dark={isDark} />
        <div className="text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <p
            className="text-[10px] sm:text-xs tracking-[0.25em] uppercase font-medium"
            style={{ color: subtitleColor }}
          >
            Armarinhos
          </p>
          <p
            className="text-2xl sm:text-3xl font-extrabold tracking-tight -mt-0.5"
            style={{ color: textColor }}
          >
            PEREIRA
            <span style={{ color: accentDot }} className="inline-block ml-0.5 text-base align-middle">●</span>
          </p>
        </div>
      </div>
    );
  }

  // horizontal (default)
  const iconSize = size || 44;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon size={iconSize} dark={isDark} />
      <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <p
          className="text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-medium leading-none"
          style={{ color: subtitleColor }}
        >
          Armarinhos
        </p>
        <p
          className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight"
          style={{ color: textColor }}
        >
          PEREIRA
          <span style={{ color: accentDot }} className="inline-block ml-0.5 text-xs align-middle">●</span>
        </p>
      </div>
    </div>
  );
}
