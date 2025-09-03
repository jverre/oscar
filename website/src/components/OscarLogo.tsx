interface OscarLogoProps {
  className?: string
  width?: number
  height?: number
}

export function OscarLogo({ className, width = 200, height = 36 }: OscarLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 180 36"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: "'Martian Mono', monospace" }}
    >
      <g>
        <text x="0" y="0" fontSize="9" fill="var(--dark-brown)" fontFamily="'Martian Mono', monospace" xmlSpace="preserve">   ___  ___  ___ __ _ _ __ </text>
        <text x="0" y="9" fontSize="9" fill="var(--dark-brown)" fontFamily="'Martian Mono', monospace" xmlSpace="preserve">  / _ \/ __|/ __/ _` | '__|</text>
        <text x="0" y="18" fontSize="9" fill="var(--dark-brown)" fontFamily="'Martian Mono', monospace" xmlSpace="preserve"> | (_) \__ \ (_| (_| | |   </text>
        <text x="0" y="27" fontSize="9" fill="var(--dark-brown)" fontFamily="'Martian Mono', monospace" xmlSpace="preserve">  \___/|___/\___\__,_|_|   </text>
      </g>
    </svg>
  )
}