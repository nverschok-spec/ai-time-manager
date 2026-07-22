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
        <linearGradient id="logo-gradient" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00C2A8" />
          <stop offset="1" stopColor="#3DDC97" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
      <path
        d="M24.21 15.3 A8.5 8.5 0 1 1 15.26 9.03"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 18 L15 21 L21 12"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M25 4 L26.2 7.8 L30 9 L26.2 10.2 L25 14 L23.8 10.2 L20 9 L23.8 7.8 Z" fill="#ffffff" />
    </svg>
  )
}
