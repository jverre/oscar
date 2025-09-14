interface GridCirclesProps {
  /** Position circles at the top instead of bottom */
  top?: boolean
  /** Position circles at specific locations */
  positions?: Array<'left' | 'right' | 'center'>
  /** Custom positioning offset in pixels */
  offset?: number
}

export function GridCircles({ 
  top = false, 
  positions = ['left', 'right'],
  offset = 4.5 
}: GridCirclesProps) {
  
  return (
    <>
      {positions.includes('left') && (
        <div 
          className={`absolute size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50 ${top ? '-top-1' : '-bottom-1'}`}
          style={{ left: `-${offset}px`, [top ? 'top' : 'bottom']: `-${offset}px` }}
        ></div>
      )}
      {positions.includes('right') && (
        <div 
          className={`absolute size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50 ${top ? '-top-1' : '-bottom-1'}`}
          style={{ right: `-${offset}px`, [top ? 'top' : 'bottom']: `-${offset}px` }}
        ></div>
      )}
      {positions.includes('center') && (
        <div 
          className={`absolute left-1/2 -translate-x-1/2 size-2 rounded-full border border-sage-green-200 bg-cream-50 ${top ? '-top-1' : '-bottom-1'}`}
          style={{ [top ? 'top' : 'bottom']: `-${offset}px` }}
        ></div>
      )}
    </>
  )
}
