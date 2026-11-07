// Soundloom logo (same artwork as resources/logo.svg): a waveform thread through the eye of a needle.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="logo-svg">
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2c31" />
          <stop offset="1" stopColor="#17171a" />
        </linearGradient>
        <linearGradient id="sl-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d8d96" />
          <stop offset="0.45" stopColor="#f4f4f7" />
          <stop offset="1" stopColor="#a3a3ac" />
        </linearGradient>
        <linearGradient id="sl-thread" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2b33d" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="14" fill="url(#sl-bg)" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
      <path
        d="M6 37 C9 37 10 29 12.5 29 S15.5 45 18 45 S21.5 22 24.5 22 S28 51 31 51 S34.5 26 37.5 26 S41 41 43 39 S48 24 54.6 17.4"
        fill="none"
        stroke="url(#sl-thread)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(45 35) rotate(28)">
        <path d="M-2.4 -25.5 Q0 -29 2.4 -25.5 L2.3 17 L0 27.5 L-2.3 17 Z" fill="url(#sl-steel)" stroke="#55555c" strokeWidth="0.6" />
        <ellipse cx="0" cy="-20.2" rx="0.95" ry="3.4" fill="#1d1d21" />
      </g>
      <path d="M54.6 17.4 C57.5 14.6 60 15.5 59.4 19.5" fill="none" stroke="url(#sl-thread)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
