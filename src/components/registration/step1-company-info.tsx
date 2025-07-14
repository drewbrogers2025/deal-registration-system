'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { RegistrationStep1Schema, type RegistrationStep1 } from '@/lib/types'

interface RegistrationStep1Props {
  data?: RegistrationStep1
  onUpdate: (data: RegistrationStep1) => void
  onNext: () => void
}

export function RegistrationStep1({ data, onUpdate, onNext }: RegistrationStep1Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<RegistrationStep1>({
    resolver: zodResolver(RegistrationStep1Schema),
    defaultValues: data,
    mode: 'onChange'
  })

  const watchedValues = watch()

  useEffect(() => {
    if (isValid) {
      onUpdate(watchedValues)
    }
  }, [watchedValues, isValid, onUpdate])

  const onSubmit = (formData: RegistrationStep1) => {
    onUpdate(formData)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Legal Company Name */}
        <div className="md:col-span-2">
          <Label htmlFor="legal_name">Legal Company Name *</Label>
          <Input
            id="legal_name"
            {...register('legal_name')}
            placeholder="Enter your legal company name"
            className={errors.legal_name ? 'border-red-500' : ''}
          />
          {errors.legal_name && (
            <p className="text-sm text-red-500 mt-1">{errors.legal_name.message}</p>
          )}
        </div>

        {/* DBA (Doing Business As) */}
        <div className="md:col-span-2">
          <Label htmlFor="dba">DBA (Doing Business As)</Label>
          <Input
            id="dba"
            {...register('dba')}
            placeholder="Enter DBA if different from legal name"
          />
          <p className="text-sm text-gray-500 mt-1">
            Optional: Only if you operate under a different name
          </p>
        </div>

        {/* Tax ID */}
        <div>
          <Label htmlFor="tax_id">Tax ID / EIN *</Label>
          <Input
            id="tax_id"
            {...register('tax_id')}
            placeholder="XX-XXXXXXX"
            className={errors.tax_id ? 'border-red-500' : ''}
          />
          {errors.tax_id && (
            <p className="text-sm text-red-500 mt-1">{errors.tax_id.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">Company Phone *</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+1 (555) 123-4567"
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Website */}
        <div className="md:col-span-2">
          <Label htmlFor="website">Company Website</Label>
          <Input
            id="website"
            {...register('website')}
            placeholder="https://www.yourcompany.com"
            className={errors.website ? 'border-red-500' : ''}
          />
          {errors.website && (
            <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Optional: Your company website URL
          </p>
        </div>
      </div>

      {/* Information Card */}
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
                Important Information
              </h4>
              <p className="text-sm text-blue-700">
                Please ensure all information is accurate as it will be used for legal documentation 
                and verification purposes. You can update this information later through your profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!isValid}
          className="px-8"
        >
          Continue to Address
        </Button>
      </div>
    </form>
  )
}
