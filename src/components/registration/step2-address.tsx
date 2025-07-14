'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RegistrationStep2Schema, type RegistrationStep2 } from '@/lib/types'

interface RegistrationStep2Props {
  data?: RegistrationStep2
  onUpdate: (data: RegistrationStep2) => void
  onNext: () => void
  onPrev: () => void
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  // Add more countries as needed
]

export function RegistrationStep2({ data, onUpdate, onNext, onPrev }: RegistrationStep2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<RegistrationStep2>({
    resolver: zodResolver(RegistrationStep2Schema),
    defaultValues: data,
    mode: 'onChange'
  })

  const watchedValues = watch()

  useEffect(() => {
    if (isValid) {
      onUpdate(watchedValues)
    }
  }, [watchedValues, isValid, onUpdate])

  const onSubmit = (formData: RegistrationStep2) => {
    onUpdate(formData)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Line 1 */}
        <div className="md:col-span-2">
          <Label htmlFor="address_line1">Street Address *</Label>
          <Input
            id="address_line1"
            {...register('address_line1')}
            placeholder="123 Main Street"
            className={errors.address_line1 ? 'border-red-500' : ''}
          />
          {errors.address_line1 && (
            <p className="text-sm text-red-500 mt-1">{errors.address_line1.message}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="md:col-span-2">
          <Label htmlFor="address_line2">Address Line 2</Label>
          <Input
            id="address_line2"
            {...register('address_line2')}
            placeholder="Suite, apartment, floor, etc. (optional)"
          />
        </div>

        {/* City */}
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...register('city')}
            placeholder="Enter city"
            className={errors.city ? 'border-red-500' : ''}
          />
          {errors.city && (
            <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
          )}
        </div>

        {/* State/Province */}
        <div>
          <Label htmlFor="state_province">State/Province *</Label>
          <Input
            id="state_province"
            {...register('state_province')}
            placeholder="Enter state or province"
            className={errors.state_province ? 'border-red-500' : ''}
          />
          {errors.state_province && (
            <p className="text-sm text-red-500 mt-1">{errors.state_province.message}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <Label htmlFor="postal_code">Postal Code *</Label>
          <Input
            id="postal_code"
            {...register('postal_code')}
            placeholder="12345"
            className={errors.postal_code ? 'border-red-500' : ''}
          />
          {errors.postal_code && (
            <p className="text-sm text-red-500 mt-1">{errors.postal_code.message}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <Label htmlFor="country">Country *</Label>
          <Select
            value={watchedValues.country || ''}
            onValueChange={(value) => setValue('country', value)}
          >
            <SelectTrigger className={errors.country ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>
          )}
        </div>
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
          Continue to Business Details
        </Button>
      </div>
    </form>
  )
}
