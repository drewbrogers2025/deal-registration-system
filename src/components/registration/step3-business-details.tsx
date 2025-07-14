'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { RegistrationStep3Schema, type RegistrationStep3 } from '@/lib/types'

interface RegistrationStep3Props {
  data?: RegistrationStep3
  onUpdate: (data: RegistrationStep3) => void
  onNext: () => void
  onPrev: () => void
}

const REVENUE_RANGES = [
  { value: 'under_1m', label: 'Under $1M' },
  { value: '1m_5m', label: '$1M - $5M' },
  { value: '5m_25m', label: '$5M - $25M' },
  { value: '25m_100m', label: '$25M - $100M' },
  { value: 'over_100m', label: 'Over $100M' },
]

export function RegistrationStep3({ data, onUpdate, onNext, onPrev }: RegistrationStep3Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<RegistrationStep3>({
    resolver: zodResolver(RegistrationStep3Schema),
    defaultValues: data,
    mode: 'onChange'
  })

  const watchedValues = watch()

  useEffect(() => {
    if (isValid) {
      onUpdate(watchedValues)
    }
  }, [watchedValues, isValid, onUpdate])

  const onSubmit = (formData: RegistrationStep3) => {
    onUpdate(formData)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Years in Business */}
        <div>
          <Label htmlFor="years_in_business">Years in Business *</Label>
          <Input
            id="years_in_business"
            type="number"
            min="0"
            {...register('years_in_business', { valueAsNumber: true })}
            placeholder="5"
            className={errors.years_in_business ? 'border-red-500' : ''}
          />
          {errors.years_in_business && (
            <p className="text-sm text-red-500 mt-1">{errors.years_in_business.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            How many years has your company been in business?
          </p>
        </div>

        {/* Employee Count */}
        <div>
          <Label htmlFor="employee_count">Number of Employees *</Label>
          <Input
            id="employee_count"
            type="number"
            min="1"
            {...register('employee_count', { valueAsNumber: true })}
            placeholder="25"
            className={errors.employee_count ? 'border-red-500' : ''}
          />
          {errors.employee_count && (
            <p className="text-sm text-red-500 mt-1">{errors.employee_count.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Total number of employees in your company
          </p>
        </div>

        {/* Revenue Range */}
        <div className="md:col-span-2">
          <Label htmlFor="revenue_range">Annual Revenue Range *</Label>
          <Select
            value={watchedValues.revenue_range || ''}
            onValueChange={(value) => setValue('revenue_range', value)}
          >
            <SelectTrigger className={errors.revenue_range ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select annual revenue range" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.revenue_range && (
            <p className="text-sm text-red-500 mt-1">{errors.revenue_range.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            This helps us understand your business size and assign appropriate tier benefits
          </p>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-900 mb-1">
                  Partner Benefits
                </h4>
                <p className="text-sm text-green-700">
                  Based on your business size, you&apos;ll be assigned to an appropriate partner tier
                  with corresponding benefits and support levels.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  Confidential Information
                </h4>
                <p className="text-sm text-blue-700">
                  All business information is kept strictly confidential and is only used 
                  for partner qualification and support purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
          type="submit" 
          disabled={!isValid}
          className="px-8"
        >
          Continue to Territories
        </Button>
      </div>
    </form>
  )
}
