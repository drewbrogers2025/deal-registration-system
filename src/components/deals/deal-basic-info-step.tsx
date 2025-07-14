'use client'

import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DealStep1, Reseller } from '@/lib/types'

interface DealBasicInfoStepProps {
  form: UseFormReturn<DealStep1>
  resellers: Reseller[]
  onDataChange: (data: Partial<DealStep1>) => void
}

export function DealBasicInfoStep({ form, resellers, onDataChange }: DealBasicInfoStepProps) {
  const { register, watch, setValue, formState: { errors } } = form

  const watchedValues = watch()

  useEffect(() => {
    onDataChange(watchedValues)
  }, [watchedValues, onDataChange])

  return (
    <div className="space-y-6">
      {/* Reseller Selection */}
      <div className="space-y-2">
        <Label htmlFor="reseller_id">Submitting Reseller *</Label>
        <Select
          value={watchedValues.reseller_id || ''}
          onValueChange={(value) => setValue('reseller_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a reseller..." />
          </SelectTrigger>
          <SelectContent>
            {resellers.map((reseller) => (
              <SelectItem key={reseller.id} value={reseller.id!}>
                {reseller.name} ({reseller.territory}) - {reseller.tier.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.reseller_id && (
          <p className="text-red-500 text-sm">{errors.reseller_id.message}</p>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Deal Priority</Label>
        <Select
          value={watchedValues.priority?.toString() || '1'}
          onValueChange={(value) => setValue('priority', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Low</SelectItem>
            <SelectItem value="2">2 - Normal</SelectItem>
            <SelectItem value="3">3 - Medium</SelectItem>
            <SelectItem value="4">4 - High</SelectItem>
            <SelectItem value="5">5 - Critical</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-600">
          Higher priority deals may receive expedited approval processing
        </p>
        {errors.priority && (
          <p className="text-red-500 text-sm">{errors.priority.message}</p>
        )}
      </div>

      {/* Expected Close Date */}
      <div className="space-y-2">
        <Label htmlFor="expected_close_date">Expected Close Date</Label>
        <Input
          type="date"
          {...register('expected_close_date')}
          min={new Date().toISOString().split('T')[0]}
        />
        <p className="text-sm text-gray-600">
          When do you expect this deal to close?
        </p>
        {errors.expected_close_date && (
          <p className="text-red-500 text-sm">{errors.expected_close_date.message}</p>
        )}
      </div>

      {/* Deal Description */}
      <div className="space-y-2">
        <Label htmlFor="deal_description">Deal Description</Label>
        <Textarea
          {...register('deal_description')}
          placeholder="Provide a brief description of this deal, including any special circumstances, customer requirements, or competitive situation..."
          rows={4}
        />
        <p className="text-sm text-gray-600">
          Optional: Provide context that will help with approval and assignment decisions
        </p>
        {errors.deal_description && (
          <p className="text-red-500 text-sm">{errors.deal_description.message}</p>
        )}
      </div>

      {/* Reseller Information Display */}
      {watchedValues.reseller_id && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Selected Reseller Information</h4>
          {(() => {
            const selectedReseller = resellers.find(r => r.id === watchedValues.reseller_id)
            if (!selectedReseller) return null
            
            return (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {selectedReseller.name}
                </div>
                <div>
                  <span className="font-medium">Territory:</span> {selectedReseller.territory}
                </div>
                <div>
                  <span className="font-medium">Tier:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    selectedReseller.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                    selectedReseller.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedReseller.tier.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    selectedReseller.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedReseller.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Step 1: Basic Information</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Select the reseller submitting this deal registration</li>
          <li>• Set the priority level based on urgency and strategic importance</li>
          <li>• Provide expected close date to help with approval timeline planning</li>
          <li>• Add any relevant context in the description field</li>
        </ul>
      </div>
    </div>
  )
}
