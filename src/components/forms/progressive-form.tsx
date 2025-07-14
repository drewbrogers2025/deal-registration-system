'use client'

import * as React from "react"
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Save,
  Clock,
} from 'lucide-react'
import { useAutoSave } from '@/hooks/use-auto-save'

export interface FormStep {
  id: string
  title: string
  description?: string
  schema: z.ZodSchema
  component: React.ComponentType<{
    form: UseFormReturn<any>
    onNext?: () => void
    onPrevious?: () => void
    isFirst: boolean
    isLast: boolean
  }>
  optional?: boolean
  condition?: (data: any) => boolean
}

interface ProgressiveFormProps {
  steps: FormStep[]
  onSubmit: (data: any) => Promise<void> | void
  onSave?: (data: any) => Promise<void> | void
  defaultValues?: Record<string, any>
  autoSaveKey?: string
  className?: string
  showProgress?: boolean
  allowSkip?: boolean
}

export function ProgressiveForm({
  steps,
  onSubmit,
  onSave,
  defaultValues = {},
  autoSaveKey,
  className,
  showProgress = true,
  allowSkip = false,
}: ProgressiveFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Create combined schema for all steps
  const combinedSchema = React.useMemo(() => {
    const schemaObject: Record<string, z.ZodSchema> = {}
    steps.forEach(step => {
      const stepSchema = step.schema
      if (stepSchema instanceof z.ZodObject) {
        Object.assign(schemaObject, stepSchema.shape)
      }
    })
    return z.object(schemaObject)
  }, [steps])

  const form = useForm({
    resolver: zodResolver(combinedSchema),
    defaultValues,
    mode: 'onChange',
  })

  // Auto-save functionality
  const autoSave = useAutoSave(form, {
    key: autoSaveKey || 'progressive-form',
    enabled: !!autoSaveKey,
    onSave,
  })

  // Filter steps based on conditions
  const visibleSteps = React.useMemo(() => {
    const formData = form.getValues()
    return steps.filter(step => !step.condition || step.condition(formData))
  }, [steps, form])

  const currentStepData = visibleSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === visibleSteps.length - 1

  // Validate current step
  const validateCurrentStep = async () => {
    const stepSchema = currentStepData.schema
    const formData = form.getValues()
    
    try {
      await stepSchema.parseAsync(formData)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          const fieldName = err.path.join('.')
          form.setError(fieldName as any, {
            type: 'manual',
            message: err.message,
          })
        })
      }
      return false
    }
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    
    if (isValid || (allowSkip && currentStepData.optional)) {
      if (isValid) {
        setCompletedSteps(prev => new Set([...prev, currentStep]))
      }
      
      if (isLastStep) {
        await handleSubmit()
      } else {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or the next step
    if (completedSteps.has(stepIndex) || stepIndex <= currentStep + 1) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const formData = form.getValues()
      await onSubmit(formData)
      
      // Clear auto-saved data on successful submission
      if (autoSaveKey) {
        autoSave.clearSavedData()
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) return 'completed'
    if (stepIndex === currentStep) return 'current'
    if (stepIndex < currentStep) return 'skipped'
    return 'pending'
  }

  const StepComponent = currentStepData?.component

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Indicator */}
      {showProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Progress</h3>
              <Badge variant="secondary">
                Step {currentStep + 1} of {visibleSteps.length}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {visibleSteps.map((step, index) => {
                const status = getStepStatus(index)
                
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => handleStepClick(index)}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                        status === 'completed' && "bg-green-600 text-white",
                        status === 'current' && "bg-blue-600 text-white",
                        status === 'skipped' && "bg-yellow-500 text-white",
                        status === 'pending' && "bg-gray-200 text-gray-600",
                        (completedSteps.has(index) || index <= currentStep + 1) && "cursor-pointer hover:opacity-80"
                      )}
                      disabled={!completedSteps.has(index) && index > currentStep + 1}
                    >
                      {status === 'completed' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </button>
                    
                    {index < visibleSteps.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5",
                        completedSteps.has(index) ? "bg-green-600" : "bg-gray-200"
                      )} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {currentStepData?.title}
              </p>
              {currentStepData?.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {currentStepData.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-save Status */}
      {autoSaveKey && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            {autoSave.isSaving ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : autoSave.lastSaved ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Last saved: {autoSave.lastSaved.toLocaleTimeString()}</span>
              </>
            ) : (
              <span>Auto-save enabled</span>
            )}
          </div>
          
          {autoSave.error && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Save failed</span>
            </div>
          )}
        </div>
      )}

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentStepData?.title}</span>
            {currentStepData?.optional && (
              <Badge variant="secondary">Optional</Badge>
            )}
          </CardTitle>
          {currentStepData?.description && (
            <p className="text-sm text-gray-600">{currentStepData.description}</p>
          )}
        </CardHeader>
        
        <CardContent>
          {StepComponent && (
            <StepComponent
              form={form}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstStep}
              isLast={isLastStep}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center space-x-2">
          {onSave && (
            <Button
              type="button"
              variant="outline"
              onClick={autoSave.saveNow}
              disabled={autoSave.isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isLastStep ? (
              <>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
