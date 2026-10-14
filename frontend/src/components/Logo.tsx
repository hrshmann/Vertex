export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 26L16 6L28 26H21.5L16 16.5L10.5 26H4Z" fill="url(#vx-logo-grad)" />
      <defs>
        <linearGradient id="vx-logo-grad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3D7FFF" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
