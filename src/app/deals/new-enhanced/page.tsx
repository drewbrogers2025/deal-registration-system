'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  DealStep1Schema, 
  DealStep2Schema, 
  DealStep3Schema, 
  DealStep4Schema,
  type DealStep1,
  type DealStep2,
  type DealStep3,
  type DealStep4,
  type Reseller,
  type Product,
  type DealDraft
} from '@/lib/types'
import { ChevronLeft, ChevronRight, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { DealBasicInfoStep } from '@/components/deals/deal-basic-info-step'
import { DealEndUserStep } from '@/components/deals/deal-end-user-step'
import { DealProductsStep } from '@/components/deals/deal-products-step'
import { DealReviewStep } from '@/components/deals/deal-review-step'

interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

interface ValidationWarning {
  field: string
  code: string
  message: string
  suggestion?: string
}

export default function EnhancedNewDealPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([])
  const [existingDraft, setExistingDraft] = useState<DealDraft | null>(null)

  // Form data for each step
  const [step1Data, setStep1Data] = useState<Partial<DealStep1>>({})
  const [step2Data, setStep2Data] = useState<Partial<DealStep2>>({})
  const [step3Data, setStep3Data] = useState<Partial<DealStep3>>({})
  const [step4Data, setStep4Data] = useState<Partial<DealStep4>>({})

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Deal details and priority' },
    { number: 2, title: 'End User', description: 'Customer information' },
    { number: 3, title: 'Products', description: 'Product selection and pricing' },
    { number: 4, title: 'Review & Submit', description: 'Final review and submission' }
  ]

  // Form instances for each step
  const step1Form = useForm<DealStep1>({
    resolver: zodResolver(DealStep1Schema),
    defaultValues: step1Data
  })

  const step2Form = useForm<DealStep2>({
    resolver: zodResolver(DealStep2Schema),
    defaultValues: step2Data
  })

  const step3Form = useForm<DealStep3>({
    resolver: zodResolver(DealStep3Schema),
    defaultValues: step3Data
  })

  const step4Form = useForm<DealStep4>({
    resolver: zodResolver(DealStep4Schema),
    defaultValues: step4Data
  })

  useEffect(() => {
    loadInitialData()
    loadExistingDraft()
  }, [])

  const loadInitialData = async () => {
    try {
      // Load resellers
      const resellersResponse = await fetch('/api/resellers')
      if (resellersResponse.ok) {
        const resellersData = await resellersResponse.json()
        setResellers(resellersData.data || [])
      }

      // Load products
      const productsResponse = await fetch('/api/products')
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData.data || [])
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadExistingDraft = async () => {
    try {
      // For demo purposes, using first reseller
      // In real app, get from auth context
      if (resellers.length > 0) {
        const response = await fetch(`/api/deals/drafts?reseller_id=${resellers[0].id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.data && data.data.length > 0) {
            const draft = data.data[0]
            setExistingDraft(draft)
            
            // Restore form data from draft
            const draftData = draft.draft_data
            if (draftData.step1) {
              setStep1Data(draftData.step1)
              step1Form.reset(draftData.step1)
            }
            if (draftData.step2) {
              setStep2Data(draftData.step2)
              step2Form.reset(draftData.step2)
            }
            if (draftData.step3) {
              setStep3Data(draftData.step3)
              step3Form.reset(draftData.step3)
            }
            if (draftData.step4) {
              setStep4Data(draftData.step4)
              step4Form.reset(draftData.step4)
            }
            
            setCurrentStep(draft.step_completed + 1)
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const saveDraft = async () => {
    if (!step1Data.reseller_id) return

    setIsSavingDraft(true)
    try {
      const draftData = {
        step1: step1Data,
        step2: step2Data,
        step3: step3Data,
        step4: step4Data
      }

      const response = await fetch('/api/deals/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reseller_id: step1Data.reseller_id,
          step_completed: currentStep,
          draft_data: draftData
        })
      })

      if (response.ok) {
        // Show success message
        console.log('Draft saved successfully')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const validateCurrentStep = async () => {
    let isValid = false
    
    switch (currentStep) {
      case 1:
        isValid = await step1Form.trigger()
        if (isValid) {
          setStep1Data(step1Form.getValues())
        }
        break
      case 2:
        isValid = await step2Form.trigger()
        if (isValid) {
          setStep2Data(step2Form.getValues())
        }
        break
      case 3:
        isValid = await step3Form.trigger()
        if (isValid) {
          setStep3Data(step3Form.getValues())
        }
        break
      case 4:
        isValid = await step4Form.trigger()
        if (isValid) {
          setStep4Data(step4Form.getValues())
        }
        break
    }

    return isValid
  }

  const nextStep = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1)
      await saveDraft()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const submitDeal = async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      // Combine all step data
      const dealData = {
        ...step1Data,
        ...step2Data,
        ...step3Data,
        ...step4Data
      }

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData)
      })

      const result = await response.json()

      if (response.ok) {
        // Handle validation warnings
        if (result.data.validation?.warnings?.length > 0) {
          setValidationWarnings(result.data.validation.warnings)
        }

        // Check for conflicts
        if (result.data.conflicts?.hasConflicts) {
          setValidationErrors(result.data.conflicts.conflicts.map((conflict: any) => ({
            field: 'general',
            code: conflict.type,
            message: conflict.reason,
            severity: conflict.severity
          })))
        } else {
          // Success - redirect to deal details
          router.push(`/deals/${result.data.deal.id}`)
        }
      } else {
        if (result.details) {
          setValidationErrors(result.details)
        }
      }
    } catch (error) {
      console.error('Error submitting deal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DealBasicInfoStep
            form={step1Form}
            resellers={resellers}
            onDataChange={setStep1Data}
          />
        )
      case 2:
        return (
          <DealEndUserStep
            form={step2Form}
            onDataChange={setStep2Data}
          />
        )
      case 3:
        return (
          <DealProductsStep
            form={step3Form}
            products={products}
            onDataChange={setStep3Data}
          />
        )
      case 4:
        return (
          <DealReviewStep
            step1Data={step1Data}
            step2Data={step2Data}
            step3Data={step3Data}
            step4Data={step4Data}
            resellers={resellers}
            products={products}
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
            onSubmit={submitDeal}
            isSubmitting={isSubmitting}
          />
        )
      default:
        return null
    }
  }

  const progressPercentage = (currentStep / steps.length) * 100

  return (
    <MainLayout 
      title="Register New Deal" 
      subtitle="Enhanced multi-step deal registration with validation and draft saving"
    >
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Step {currentStep} of {steps.length}</h3>
              <div className="flex items-center space-x-2">
                {existingDraft && (
                  <Badge variant="secondary">
                    Draft Available
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  disabled={isSavingDraft || !step1Data.reseller_id}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </div>
            
            <Progress value={progressPercentage} className="mb-4" />
            
            <div className="flex justify-between">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`flex flex-col items-center ${
                    step.number <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.number < currentStep
                        ? 'bg-blue-600 text-white'
                        : step.number === currentStep
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step.number < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Validation alerts */}
        {validationErrors.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Validation Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    <strong>{error.code}:</strong> {error.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {validationWarnings.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {validationWarnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    <strong>{warning.code}:</strong> {warning.message}
                    {warning.suggestion && (
                      <div className="text-xs mt-1 italic">
                        Suggestion: {warning.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={submitDeal}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Deal'}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
