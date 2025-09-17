interface GridSeparatorProps {
  /** Unique ID for the pattern to avoid conflicts */
  id?: string
}

export function GridSeparator({ id = "grid-separator" }: GridSeparatorProps) {
  return (
    <div className="relative">
      <section className="relative h-4 w-full border-b border-sage-green-200 mx-3 md:mx-8 lg:mx-12">
        {/* Bottom grid circles aligned with boundaries */}
        <div
          className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
          style={{ bottom: '-4.5px', left: '-4.5px' }}
        ></div>
        <div
          className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
          style={{ bottom: '-4.5px', right: '-4.5px' }}
        ></div>

        {/* Diagonal lines background pattern */}
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none text-sage-green-400 opacity-60">
          <defs>
            <pattern
              id={`diagonal-lines-${id}`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1"></line>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#diagonal-lines-${id})`}></rect>
        </svg>
      </section>
    </div>
  )
}
