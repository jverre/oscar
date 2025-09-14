import { CircleGauge, Brain, UsersRound } from 'lucide-react'
import { CursorAnimation } from './CursorAnimation'
import { GridCircles } from './GridCircles'

const features = [
  {
    icon: CircleGauge,
    title: 'Fast',
    description: 'Instantly capture any LLM conversation with a single command, no setup required.'
  },
  {
    icon: Brain,
    title: 'Intelligent',
    description: 'Smart detection of conversation context and automatic formatting for easy sharing.',
    fontSize: 'text-[.8125rem]'
  },
  {
    icon: UsersRound,
    title: 'Collaborative',
    description: 'Share your AI discoveries and insights with teammates through simple, readable links.'
  }
]

function FeatureItem({ feature, className = '' }: { feature: typeof features[0], className?: string }) {
  const Icon = feature.icon
  const descriptionSize = feature.fontSize || 'text-sm'
  
  return (
    <div className={`flex flex-col w-full p-4 ${className}`}>
      <p className="flex gap-2 text-sm text-black dark:text-white mb-1 items-center">
        <span className="shrink-0">
          <Icon className="lucide lucide-circle-gauge icons-base" width="14" height="14" />
        </span>
        {feature.title}
      </p>
      <p className={`text-left text-balance ${descriptionSize} text-gray-600 dark:text-gray-300`}>
        {feature.description}
      </p>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <div className="mx-3 md:mx-8 lg:mx-12 relative border-b border-sage-green-200">
      <GridCircles />
      <section className="-mt-[8rem] origin-top px-4 pb-8 sm:px-6 sm:pb-20 md:-mt-[6.5rem] lg:-mt-[5rem]" style={{ opacity: 1, transform: 'none', transformOrigin: '50% 0% 0px' }}>
      <div className="mx-auto w-full group sh-default relative overflow-hidden rounded-sm bg-gray-50/80 dark:bg-[hsl(218,_13%,_6%,_.95)] border border-gray-300/90 dark:border-gray-600/60" style={{ boxShadow: '6px 6px 0 #6b7a6b0f, -6px -6px 0 #6b7a6b0f' }}>
        <div 
          style={{ backgroundImage: 'url(/_next/static/media/noise.0e24d0e5.png)' }} 
          className="pointer-events-none [z-index:-1] absolute inset-0 bg-[size:180px] bg-repeat opacity-[0.035] dark:opacity-[0.012] [z-index:0] opacity-[.03]!"
        />
        
        <div className="relative hidden grid-cols-1 content-end sm:grid sm:grid-cols-3 grid-border-color border-b divide-x-0 divide-y divide-sage-green-200/50 sm:divide-x sm:divide-y-0 dark:divide-sage-green-300/8">
          {features.map((feature, index) => (
            <FeatureItem key={index} feature={feature} />
          ))}
        </div>
        
        <div className="relative size-full p-2.5 bg-gray-50/20 dark:bg-[hsl(218,_13%,_6%,_.90)]">
            <CursorAnimation />
        </div>
        
        <div className="border-t border-gray-300/90 dark:border-gray-600/60" />
        
      </div>
      
      <div className="mt-6 flex flex-col gap-8 sm:hidden">
        {features.map((feature, index) => (
          <FeatureItem key={index} feature={feature} className="p-0" />
        ))}
      </div>
      </section>
    </div>
  )
}
