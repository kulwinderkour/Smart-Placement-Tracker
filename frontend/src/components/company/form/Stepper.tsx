import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { FormStep } from '../../../config/companyFormSchema'

interface StepperProps {
  steps: FormStep[]
  currentStep: number
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  return (
    <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.03] px-4 py-5 backdrop-blur-sm sm:px-6">
      <div className="relative mb-4">
        <div className="absolute left-0 right-0 top-5 h-px bg-white/10" />
        <motion.div
          className="absolute left-0 top-5 h-px bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 shadow-[0_0_18px_rgba(139,92,246,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="relative flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep

          return (
            <div key={step.id} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <div
                className={
                  `relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'border-violet-300 bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-[0_0_22px_rgba(168,85,247,0.45)]'
                      : isActive
                      ? 'border-violet-300 bg-gradient-to-br from-violet-500/95 to-indigo-500/95 text-white shadow-[0_0_30px_rgba(139,92,246,0.55)]'
                      : 'border-white/10 bg-[#221d41] text-white/45'
                  }`
                }
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}
              </div>

              <div className="space-y-1 text-center">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-[0.22em] leading-tight transition-colors duration-300 ${
                    isActive ? 'text-violet-200' : isCompleted ? 'text-white/80' : 'text-white/30'
                  }`}
                >
                  {step.label}
                </span>
                <span className="hidden text-[10px] text-white/35 sm:block">{step.description}</span>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
