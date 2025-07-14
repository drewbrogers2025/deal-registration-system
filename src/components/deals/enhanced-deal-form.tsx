'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Building, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Target, 
  Users, 
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { EnhancedDealSchema, type EnhancedDeal, type Reseller, type EndUser, type Product } from '@/lib/types'

interface EnhancedDealFormProps {
  initialData?: Partial<EnhancedDeal>
  resellers: Reseller[]
  products: Product[]
  onSubmit: (data: EnhancedDeal) => void
  onCancel: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
}

const DEAL_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
]

const DEAL_SOURCES = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'partner', label: 'Partner' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'event', label: 'Event' },
]

const OPPORTUNITY_STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
]

const DEAL_COMPLEXITIES = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'complex', label: 'Complex' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function EnhancedDealForm({
  initialData,
  resellers,
  products,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}: EnhancedDealFormProps) {
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null)
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date>()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset
  } = useForm<EnhancedDeal>({
    resolver: zodResolver(EnhancedDealSchema),
    defaultValues: initialData,
    mode: 'onChange'
  })

  const watchedValues = watch()

  useEffect(() => {
    if (initialData) {
      reset(initialData)
      if (initialData.expected_close_date) {
        setExpectedCloseDate(new Date(initialData.expected_close_date))
      }
    }
  }, [initialData, reset])

  useEffect(() => {
    if (watchedValues.reseller_id) {
      const reseller = resellers.find(r => r.id === watchedValues.reseller_id)
      setSelectedReseller(reseller || null)
    }
  }, [watchedValues.reseller_id, resellers])

  const handleFormSubmit = (data: EnhancedDeal) => {
    const submitData = {
      ...data,
      expected_close_date: expectedCloseDate?.toISOString(),
    }
    onSubmit(submitData)
  }

  const getPriorityColor = (priority: string) => {
    return DEAL_PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800'
  }

  const getStageColor = (stage: string) => {
    return OPPORTUNITY_STAGES.find(s => s.value === stage)?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Register New Deal' : 'Edit Deal'}
          </h2>
          <p className="text-gray-600">
            {mode === 'create' 
              ? 'Create a comprehensive deal registration with all relevant details'
              : 'Update deal information and track progress'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {watchedValues.deal_priority && (
            <Badge className={getPriorityColor(watchedValues.deal_priority)}>
              {DEAL_PRIORITIES.find(p => p.value === watchedValues.deal_priority)?.label}
            </Badge>
          )}
          {watchedValues.opportunity_stage && (
            <Badge className={getStageColor(watchedValues.opportunity_stage)}>
              {OPPORTUNITY_STAGES.find(s => s.value === watchedValues.opportunity_stage)?.label}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Deal Details</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Basic Deal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deal_name">Deal Name *</Label>
                  <Input
                    id="deal_name"
                    {...register('deal_name')}
                    placeholder="Enter deal name"
                    className={errors.deal_name ? 'border-red-500' : ''}
                  />
                  {errors.deal_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.deal_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reseller_id">Reseller *</Label>
                  <Select
                    value={watchedValues.reseller_id || ''}
                    onValueChange={(value) => setValue('reseller_id', value)}
                  >
                    <SelectTrigger className={errors.reseller_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select reseller" />
                    </SelectTrigger>
                    <SelectContent>
                      {resellers.map((reseller) => (
                        <SelectItem key={reseller.id} value={reseller.id!}>
                          {reseller.name} - {reseller.territory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.reseller_id && (
                    <p className="text-sm text-red-500 mt-1">{errors.reseller_id.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="deal_priority">Priority</Label>
                  <Select
                    value={watchedValues.deal_priority || 'medium'}
                    onValueChange={(value) => setValue('deal_priority', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_PRIORITIES.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deal_source">Deal Source</Label>
                  <Select
                    value={watchedValues.deal_source || 'inbound'}
                    onValueChange={(value) => setValue('deal_source', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opportunity_stage">Opportunity Stage</Label>
                  <Select
                    value={watchedValues.opportunity_stage || 'lead'}
                    onValueChange={(value) => setValue('opportunity_stage', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPPORTUNITY_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deal_complexity">Deal Complexity</Label>
                  <Select
                    value={watchedValues.deal_complexity || 'simple'}
                    onValueChange={(value) => setValue('deal_complexity', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_COMPLEXITIES.map((complexity) => (
                        <SelectItem key={complexity.value} value={complexity.value}>
                          {complexity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="deal_description">Deal Description</Label>
                <Textarea
                  id="deal_description"
                  {...register('deal_description')}
                  placeholder="Describe the deal opportunity..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deal Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Deal Details & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Expected Close Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expectedCloseDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expectedCloseDate ? format(expectedCloseDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expectedCloseDate}
                        onSelect={setExpectedCloseDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="probability">Win Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    {...register('probability', { valueAsNumber: true })}
                    placeholder="50"
                  />
                </div>

                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Input
                    id="lead_source"
                    {...register('lead_source')}
                    placeholder="Website, referral, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="campaign_id">Campaign ID</Label>
                  <Input
                    id="campaign_id"
                    {...register('campaign_id')}
                    placeholder="Marketing campaign identifier"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special_requirements">Special Requirements</Label>
                <Textarea
                  id="special_requirements"
                  {...register('special_requirements')}
                  placeholder="Any special requirements or considerations..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="competitor_info">Competitor Information</Label>
                <Textarea
                  id="competitor_info"
                  {...register('competitor_info')}
                  placeholder="Information about competing vendors or solutions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Continue with other tabs... */}
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Register Deal' : 'Update Deal'}
        </Button>
      </div>
    </form>
  )
}
