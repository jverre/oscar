interface SectionSeparatorProps {
  /** Unique ID for the pattern to avoid conflicts */
  id?: string
}

export function SectionSeparator({ id = "separator" }: SectionSeparatorProps) {
  return (
    <section 
      className="relative h-4 w-full before:absolute before:top-0 before:-left-[100vw] before:-z-10 before:h-px before:w-[200vw] before:bg-sage-green-200/50 after:absolute after:bottom-0 after:-left-[100vw] after:-z-10 after:h-px after:w-[200vw] after:bg-sage-green-200/50"
    >
      {/* Corner diamonds */}
      <div 
        className="absolute z-10 size-2 rotate-45 rounded-[1px] border border-sage-green-200 bg-cream-50"
        style={{ top: '-3.5px', left: '-4.5px' }}
      ></div>
      <div 
        className="absolute z-10 size-2 rotate-45 rounded-[1px] border border-sage-green-200 bg-cream-50"
        style={{ top: '-3.5px', right: '-4.5px' }}
      ></div>
      <div 
        className="absolute z-10 size-2 rotate-45 rounded-[1px] border border-sage-green-200 bg-cream-50"
        style={{ bottom: '-3.5px', left: '-4.5px' }}
      ></div>
      <div 
        className="absolute z-10 size-2 rotate-45 rounded-[1px] border border-sage-green-200 bg-cream-50"
        style={{ bottom: '-3.5px', right: '-4.5px' }}
      ></div>
      
      {/* Diagonal pattern SVG */}
      <svg className="pointer-events-none absolute inset-0 -z-10 size-full select-none text-sage-green-300 py-[1px] opacity-30">
        <defs>
          <pattern 
            id={`diagonal-${id}`} 
            width="4" 
            height="4" 
            patternUnits="userSpaceOnUse" 
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5"></line>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diagonal-${id})`}></rect>
      </svg>
    </section>
  )
}