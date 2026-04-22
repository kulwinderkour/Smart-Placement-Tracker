export default function SmartPlacementLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="spl-grad" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E88E5" />
          <stop offset="100%" stopColor="#7B1FA2" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="48" fill="#F5F7FA" />
      <path d="M70 60 A90 90 0 0 1 190 150" stroke="url(#spl-grad)" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M175 140 L200 150 L185 175" fill="none" stroke="url(#spl-grad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="85" y="130" width="18" height="40" rx="4" fill="url(#spl-grad)" />
      <rect x="110" y="110" width="18" height="60" rx="4" fill="url(#spl-grad)" />
      <rect x="135" y="90" width="18" height="80" rx="4" fill="url(#spl-grad)" />
      <circle cx="175" cy="185" r="8" fill="url(#spl-grad)" />
      <path d="M160 200 L175 215 L200 195" stroke="url(#spl-grad)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
