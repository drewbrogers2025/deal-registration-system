'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { RegistrationStep1 } from '@/components/registration/step1-company-info'
import { RegistrationStep2 } from '@/components/registration/step2-address'
import { RegistrationStep3 } from '@/components/registration/step3-business-details'
import { RegistrationStep4 } from '@/components/registration/step4-territories'
import { RegistrationStep5 } from '@/components/registration/step5-contacts'
import { RegistrationStep6 } from '@/components/registration/step6-terms'
import { RegistrationReview } from '@/components/registration/review'
import { RegistrationSuccess } from '@/components/registration/success'
import type { RegistrationFormData } from '@/lib/types'

const STEPS = [
  { id: 1, title: 'Company Information', description: 'Basic company details' },
  { id: 2, title: 'Address', description: 'Company address information' },
  { id: 3, title: 'Business Details', description: 'Business size and revenue' },
  { id: 4, title: 'Territories', description: 'Service territories' },
  { id: 5, title: 'Contacts', description: 'Contact information' },
  { id: 6, title: 'Terms & Conditions', description: 'Accept terms' },
  { id: 7, title: 'Review', description: 'Review and submit' },
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({
    terms_accepted: false,
    terms_version: '1.0'
  })

  const updateFormData = (stepData: any) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/resellers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        const error = await response.json()
        console.error('Registration failed:', error)
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Registration error:', error)
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <RegistrationSuccess />
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reseller Registration
          </h1>
          <p className="text-gray-600">
            Join our partner network and start selling our products
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          <div className="flex items-center space-x-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-medium text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="w-12 h-px bg-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <RegistrationStep1
                data={formData.step1}
                onUpdate={(data) => updateFormData({ step1: data })}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <RegistrationStep2
                data={formData.step2}
                onUpdate={(data) => updateFormData({ step2: data })}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 3 && (
              <RegistrationStep3
                data={formData.step3}
                onUpdate={(data) => updateFormData({ step3: data })}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 4 && (
              <RegistrationStep4
                data={formData.step4}
                onUpdate={(data) => updateFormData({ step4: data })}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 5 && (
              <RegistrationStep5
                data={formData.step5}
                onUpdate={(data) => updateFormData({ step5: data })}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 6 && (
              <RegistrationStep6
                data={{ terms_accepted: formData.terms_accepted || false }}
                onUpdate={(data) => updateFormData(data)}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 7 && (
              <RegistrationReview
                data={formData as RegistrationFormData}
                onSubmit={handleSubmit}
                onPrev={prevStep}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        {currentStep < 7 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={nextStep}
              disabled={currentStep === STEPS.length}
              className="flex items-center"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
