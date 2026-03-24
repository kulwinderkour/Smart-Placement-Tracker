import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { FormStep } from '../../config/companyFormSchema'

interface StepProgressBarProps {
  steps: FormStep[]
  currentStep: number
}

export default function StepProgressBar({ steps, currentStep }: StepProgressBarProps) {
  const progress = ((currentStep) / (steps.length - 1)) * 100

  return (
    <div className="w-full">
      {/* Thin top progress line */}
      <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Step labels */}
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              {/* Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 shrink-0
                  ${isCompleted
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : isActive
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-white/30'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold uppercase tracking-widest text-center leading-tight transition-colors duration-300 ${
                  isActive ? 'text-indigo-300' : isCompleted ? 'text-white/60' : 'text-white/25'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
