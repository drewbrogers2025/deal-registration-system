'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Mail, Clock, FileText, ArrowRight } from 'lucide-react'

export function RegistrationSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Application Submitted Successfully!
          </h1>
          <p className="text-gray-600">
            Thank you for your interest in becoming a reseller partner.
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your Application is Under Review
                </h3>
                <p className="text-gray-600">
                  Our partner team will review your application and get back to you within 3-5 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Email Confirmation</h4>
                  <p className="text-sm text-gray-600">
                    You&apos;ll receive an email confirmation with your application reference number.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Application Review</h4>
                  <p className="text-sm text-gray-600">
                    Our team will review your application and may contact you for additional information.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Decision Notification</h4>
                  <p className="text-sm text-gray-600">
                    You&apos;ll receive an email with the decision and next steps for approved partners.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">4</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Partner Onboarding</h4>
                  <p className="text-sm text-gray-600">
                    Approved partners will receive access to the partner portal and training materials.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Questions?</h4>
                <p className="text-sm text-gray-600 mb-2">
                  If you have any questions about your application or the partner program, 
                  please don&apos;t hesitate to contact us.
                </p>
                <p className="text-sm">
                  <span className="font-medium">Email:</span> partners@company.com<br />
                  <span className="font-medium">Phone:</span> +1 (555) 123-4567
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Download Application Copy
          </Button>
          <Button className="flex items-center">
            Visit Partner Resources
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Application Reference: REG-{Date.now().toString().slice(-8)}
          </p>
        </div>
      </div>
    </div>
  )
}
