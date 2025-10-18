import { DownloadDropdown } from '../shared/DownloadDropdown'
import { Button } from '@/components/ui/button'
import { PageContent } from '@/components/FullWidth'

export function HeroSection() {
  return (
    <div className="relative bg-gradient-to-t from-sage-green-100/5 border-b border-sage-green-200">
      <PageContent>
        <section className="relative px-4 pt-20 pb-[12rem] sm:px-6 sm:pt-28 md:pb-[10.2rem]">
        {/* Grid circles at bottom border aligned with margin boundaries */}
        <div
          className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
          style={{ bottom: '-4.5px', left: '-4.5px' }}
        ></div>
        <div
          className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
          style={{ bottom: '-4.5px', right: '-4.5px' }}
        ></div>

        <section className="mx-auto w-full max-w-sm md:max-w-[1100px] flex flex-col items-center gap-8" style={{ opacity: 1, transform: 'none' }}>
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <h1 className="font-mono text-pretty scroll-mt-24 h0 text-sage-green-800 font-normal text-center text-balance">
              Record your AI chats
            </h1>
            <p className="tracking-tight text-center max-w-lg text-pretty text-foreground/80">
              Share any LLM conversation with others.
            </p>
          </div>
          
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row">
              <DownloadDropdown />
              
              <Button
                variant="secondary"
                className="w-full sm:w-fit sm:shrink-0 pl-2.5 pr-3"
                asChild
              >
                <a
                  target="_blank"
                  href="https://github.com/jverre/oscar"
                >
                  <svg className="lucide lucide-github" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                  </svg>
                  Clone source
                </a>
              </Button>
            </div>
            
            <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[.8125rem] text-foreground/70">
              <span>Available for ChatGPT, Claude Code, and Cursor.</span>
            </p>
          </div>
        </section>
        
        {/* Grid pattern background */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full fill-sage-green-500/50 stroke-sage-green-500/50 [mask-image:linear-gradient(to_top,_#ffffffad,_transparent)] opacity-30">
          <defs>
            <pattern id="grid-pattern" width="14" height="14" patternUnits="userSpaceOnUse" x="-1" y="-1">
              <path d="M.5 14V.5H14" fill="none" strokeDasharray="0"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#grid-pattern)"></rect>
        </svg>
        </section>
      </PageContent>
    </div>
  )
}