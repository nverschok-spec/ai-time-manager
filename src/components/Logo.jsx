export default function Logo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <circle cx="15.5" cy="16.5" r="9" fill="#f8fafc" />
      <path
        d="M11.5 17 L14.5 20 L20.5 13.5"
        stroke="#0f172a"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M24 4.5 L25 7.5 L28 8.5 L25 9.5 L24 12.5 L23 9.5 L20 8.5 L23 7.5 Z" fill="#ffffff" />
    </svg>
  )
}
