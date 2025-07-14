'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { CheckCircle, Building, MapPin, Users, FileText } from 'lucide-react'
import type { RegistrationFormData } from '@/lib/types'

interface RegistrationReviewProps {
  data: RegistrationFormData
  onSubmit: () => void
  onPrev: () => void
  isSubmitting: boolean
}

export function RegistrationReview({ data, onSubmit, onPrev, isSubmitting }: RegistrationReviewProps) {

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Review Your Application</h3>
        <p className="text-gray-600 mb-4">
          Please review all information before submitting your reseller application.
        </p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Building className="w-5 h-5 mr-2" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Legal Name</p>
              <p className="text-sm">{data.step1?.legal_name}</p>
            </div>
            {data.step1?.dba && (
              <div>
                <p className="text-sm font-medium text-gray-500">DBA</p>
                <p className="text-sm">{data.step1.dba}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Tax ID</p>
              <p className="text-sm">{data.step1?.tax_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-sm">{data.step1?.phone}</p>
            </div>
            {data.step1?.website && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Website</p>
                <p className="text-sm">{data.step1.website}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <MapPin className="w-5 h-5 mr-2" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>{data.step2?.address_line1}</p>
            {data.step2?.address_line2 && <p>{data.step2.address_line2}</p>}
            <p>
              {data.step2?.city}, {data.step2?.state_province} {data.step2?.postal_code}
            </p>
            <p>{data.step2?.country}</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <FileText className="w-5 h-5 mr-2" />
            Business Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Years in Business</p>
              <p className="text-sm">{data.step3?.years_in_business} years</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Employees</p>
              <p className="text-sm">{data.step3?.employee_count}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue Range</p>
              <p className="text-sm">
                {data.step3?.revenue_range === 'under_1m' && 'Under $1M'}
                {data.step3?.revenue_range === '1m_5m' && '$1M - $5M'}
                {data.step3?.revenue_range === '5m_25m' && '$5M - $25M'}
                {data.step3?.revenue_range === '25m_100m' && '$25M - $100M'}
                {data.step3?.revenue_range === 'over_100m' && 'Over $100M'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Territories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <MapPin className="w-5 h-5 mr-2" />
            Service Territories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.step4?.territories.map((territory, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{territory.territory_name}</span>
                {territory.is_primary && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Users className="w-5 h-5 mr-2" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.step5?.contacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {contact.first_name} {contact.last_name}
                    {contact.is_primary && (
                      <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                  <p className="text-sm text-gray-500 capitalize">{contact.role} Contact</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms Acceptance */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Terms & Conditions Accepted
              </p>
              <p className="text-sm text-green-700">
                You have agreed to the Reseller Partner Agreement (Version {data.terms_version})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">i</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                What happens next?
              </h4>
              <p className="text-sm text-blue-700">
                After submission, your application will be reviewed by our partner team. 
                You&apos;ll receive an email confirmation and updates on your application status.
                The review process typically takes 3-5 business days.
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
          disabled={isSubmitting}
        >
          Previous
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </div>
  )
}
