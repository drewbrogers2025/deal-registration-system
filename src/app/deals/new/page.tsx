'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateDealSchema, type CreateDeal, type Reseller, type Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

interface ConflictAlert {
  type: string
  severity: 'high' | 'medium' | 'low'
  message: string
}

export default function NewDealPage() {
  const router = useRouter()
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([])
  const [showConflicts, setShowConflicts] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateDeal>({
    resolver: zodResolver(CreateDealSchema),
    defaultValues: {
      products: [{ product_id: '', quantity: 1, price: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products'
  })

  const watchedProducts = watch('products')

  // Load resellers and products
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resellersRes, productsRes] = await Promise.all([
          fetch('/api/resellers'),
          fetch('/api/products')
        ])

        if (resellersRes.ok) {
          const resellersData = await resellersRes.json()
          setResellers(resellersData.data.items)
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData.data.items)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  // Calculate total value
  const totalValue = watchedProducts?.reduce((sum, product) => {
    return sum + (product.quantity * product.price)
  }, 0) || 0

  // Auto-fill product price when product is selected
  const handleProductChange = (index: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId)
    if (selectedProduct) {
      setValue(`products.${index}.price`, selectedProduct.list_price)
    }
  }

  const onSubmit = async (data: CreateDeal) => {
    setIsSubmitting(true)
    setConflicts([])

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        // Check for conflicts
        if (result.data.conflicts?.hasConflicts) {
          const conflictAlerts: ConflictAlert[] = result.data.conflicts.conflicts.map((conflict: any) => ({
            type: conflict.type,
            severity: conflict.severity,
            message: conflict.reason
          }))
          
          setConflicts(conflictAlerts)
          setShowConflicts(true)
        } else {
          // No conflicts, redirect to deal details
          router.push(`/deals/${result.data.deal.id}`)
        }
      } else {
        console.error('Error creating deal:', result.error)
        // Handle error (show toast, etc.)
      }
    } catch (error) {
      console.error('Error submitting deal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConflictAcknowledge = () => {
    setShowConflicts(false)
    router.push('/deals')
  }

  return (
    <MainLayout 
      title="Register New Deal" 
      subtitle="Submit a new deal registration for review and assignment"
    >
      <div className="max-w-4xl mx-auto">
        {showConflicts && conflicts.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Conflicts Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Badge 
                      variant={conflict.severity === 'high' ? 'error' : 'warning'}
                      className="mt-0.5"
                    >
                      {conflict.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        {conflict.type.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-orange-700">{conflict.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex space-x-3">
                <Button onClick={handleConflictAcknowledge} variant="outline">
                  Continue to Deals List
                </Button>
                <Button onClick={() => setShowConflicts(false)}>
                  Edit Deal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Reseller Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Reseller Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Submitting Reseller *
                  </label>
                  <select
                    {...register('reseller_id')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a reseller...</option>
                    {resellers.map((reseller) => (
                      <option key={reseller.id} value={reseller.id}>
                        {reseller.name} ({reseller.territory})
                      </option>
                    ))}
                  </select>
                  {errors.reseller_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.reseller_id.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* End User Information */}
          <Card>
            <CardHeader>
              <CardTitle>End User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name *
                  </label>
                  <Input
                    {...register('end_user.company_name')}
                    placeholder="Enter company name"
                  />
                  {errors.end_user?.company_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.end_user.company_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Name *
                  </label>
                  <Input
                    {...register('end_user.contact_name')}
                    placeholder="Enter contact name"
                  />
                  {errors.end_user?.contact_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.end_user.contact_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Email *
                  </label>
                  <Input
                    {...register('end_user.contact_email')}
                    type="email"
                    placeholder="Enter contact email"
                  />
                  {errors.end_user?.contact_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.end_user.contact_email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Territory *
                  </label>
                  <Input
                    {...register('end_user.territory')}
                    placeholder="Enter territory"
                  />
                  {errors.end_user?.territory && (
                    <p className="text-red-500 text-sm mt-1">{errors.end_user.territory.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Products & Pricing
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ product_id: '', quantity: 1, price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Product *
                      </label>
                      <select
                        {...register(`products.${index}.product_id`)}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select product...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quantity *
                      </label>
                      <Input
                        {...register(`products.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Price *
                      </label>
                      <Input
                        {...register(`products.${index}.price`, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="flex items-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Value:</span>
                    <span className="text-xl font-bold">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Deal Registration'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
