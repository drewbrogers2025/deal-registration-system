'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RegistrationStep6Props {
  data?: { terms_accepted: boolean }
  onUpdate: (data: { terms_accepted: boolean }) => void
  onNext: () => void
  onPrev: () => void
}

export function RegistrationStep6({ data, onUpdate, onNext, onPrev }: RegistrationStep6Props) {
  const [termsAccepted, setTermsAccepted] = useState(data?.terms_accepted || false)

  const handleAcceptanceChange = (accepted: boolean) => {
    setTermsAccepted(accepted)
    onUpdate({ terms_accepted: accepted })
  }

  const handleSubmit = () => {
    if (termsAccepted) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Terms & Conditions</h3>
        <p className="text-gray-600 mb-4">
          Please review and accept our partner terms and conditions to continue.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ScrollArea className="h-96 w-full border rounded p-4">
            <div className="space-y-4 text-sm">
              <h4 className="font-semibold">RESELLER PARTNER AGREEMENT</h4>
              
              <p>
                This Reseller Partner Agreement ("Agreement") is entered into between [Company Name] 
                ("Company") and the reseller partner ("Partner") applying for partnership status.
              </p>

              <h5 className="font-semibold">1. PARTNERSHIP TERMS</h5>
              <p>
                By accepting this agreement, Partner agrees to promote and resell Company's products 
                and services in accordance with the terms set forth herein.
              </p>

              <h5 className="font-semibold">2. OBLIGATIONS</h5>
              <p>
                Partner shall:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Maintain professional standards in all customer interactions</li>
                <li>Provide accurate information about Company products and services</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Protect confidential information shared by Company</li>
              </ul>

              <h5 className="font-semibold">3. TERRITORY</h5>
              <p>
                Partner's territory is limited to the geographic areas specified during registration. 
                Partner may not sell outside designated territories without prior written approval.
              </p>

              <h5 className="font-semibold">4. PRICING AND PAYMENTS</h5>
              <p>
                Partner pricing and commission structures will be provided separately and may be 
                updated from time to time with appropriate notice.
              </p>

              <h5 className="font-semibold">5. INTELLECTUAL PROPERTY</h5>
              <p>
                All Company trademarks, logos, and intellectual property remain the exclusive 
                property of Company. Partner may use such materials only as authorized.
              </p>

              <h5 className="font-semibold">6. TERMINATION</h5>
              <p>
                Either party may terminate this agreement with 30 days written notice. 
                Certain obligations survive termination.
              </p>

              <h5 className="font-semibold">7. CONFIDENTIALITY</h5>
              <p>
                Partner agrees to maintain the confidentiality of all proprietary information 
                received from Company and its customers.
              </p>

              <p className="text-xs text-gray-500 mt-6">
                Last updated: January 2025 | Version 1.0
              </p>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms_acceptance"
              checked={termsAccepted}
              onChange={(e) => handleAcceptanceChange(e.target.checked)}
              className="mt-1"
            />
            <div>
              <label htmlFor="terms_acceptance" className="text-sm font-medium text-blue-900 cursor-pointer">
                I have read and agree to the Terms & Conditions
              </label>
              <p className="text-sm text-blue-700 mt-1">
                By checking this box, you acknowledge that you have read, understood, and agree 
                to be bound by the terms and conditions of this Reseller Partner Agreement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!termsAccepted}
          className="px-8"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  )
}
