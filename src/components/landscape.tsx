export function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 420 228"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="landscape-grid"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path d="M28 0H0V28" stroke="currentColor" strokeOpacity=".045" />
        </pattern>
        <linearGradient
          id="mountain-fade"
          x1="210"
          y1="90"
          x2="210"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b2b7a4" />
          <stop offset="1" stopColor="#d8dacb" />
        </linearGradient>
      </defs>
      <path fill="url(#landscape-grid)" d="M0 0h420v228H0z" />
      <circle cx="293" cy="65" r="32" fill="#bb5b47" opacity=".85" />
      <path
        d="M0 184c36-4 51-17 80-19 23-2 32 10 64 5 40-6 44-27 86-21 59 8 92-20 126-14 24 5 42 12 64 10v83H0Z"
        fill="#d6d8c8"
      />
      <path
        d="m52 228 150-148c5-5 11-5 16 0l151 148Z"
        fill="url(#mountain-fade)"
      />
      <path
        d="m172 110 30-30c5-5 11-5 16 0l31 31-20-5-10 9-12-10-15 12-9-11Z"
        fill="#f8f6eb"
      />
      <path
        d="M0 210c49-32 76-20 107-10 51 17 83 15 123 2 54-18 95-9 190-4v30H0Z"
        fill="#8f9b85"
        opacity=".55"
      />
      <path
        d="M0 221c81-13 106 3 186-4 112-11 161-18 234 4v7H0Z"
        fill="#788c74"
        opacity=".45"
      />
      <path
        d="M29 84h45m-8 6h30m222 23h45"
        stroke="#8c9285"
        strokeOpacity=".4"
        strokeLinecap="round"
      />
    </svg>
  );
}
