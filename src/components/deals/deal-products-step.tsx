'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { DealStep3, Product } from '@/lib/types'
import { Plus, Trash2, AlertTriangle, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DealProductsStepProps {
  form: UseFormReturn<DealStep3>
  products: Product[]
  onDataChange: (data: Partial<DealStep3>) => void
}

export function DealProductsStep({ form, products, onDataChange }: DealProductsStepProps) {
  const { register, control, watch, setValue, formState: { errors } } = form
  const [pricingWarnings, setPricingWarnings] = useState<string[]>([])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products'
  })

  const watchedValues = watch()
  const watchedProducts = watch('products') || []

  useEffect(() => {
    onDataChange(watchedValues)
  }, [watchedValues, onDataChange])

  useEffect(() => {
    // Check pricing warnings when products change
    checkPricingWarnings()
  }, [watchedProducts])

  const checkPricingWarnings = () => {
    const warnings: string[] = []
    
    watchedProducts.forEach((productItem, index) => {
      if (productItem.product_id && productItem.price) {
        const product = products.find(p => p.id === productItem.product_id)
        if (product) {
          const discountPercentage = ((product.list_price - productItem.price) / product.list_price) * 100
          
          if (discountPercentage > 30) {
            warnings.push(`Product ${index + 1}: ${discountPercentage.toFixed(1)}% discount from list price may require special approval`)
          } else if (discountPercentage > 20) {
            warnings.push(`Product ${index + 1}: ${discountPercentage.toFixed(1)}% discount from list price`)
          }
          
          if (productItem.price > product.list_price) {
            warnings.push(`Product ${index + 1}: Price exceeds list price`)
          }
        }
      }
    })
    
    setPricingWarnings(warnings)
  }

  const addProduct = () => {
    append({ product_id: '', quantity: 1, price: 0 })
  }

  const removeProduct = (index: number) => {
    remove(index)
  }

  const updateProductPrice = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setValue(`products.${index}.price`, product.list_price)
    }
  }

  const calculateTotalValue = () => {
    return watchedProducts.reduce((sum, product) => {
      return sum + (product.quantity || 0) * (product.price || 0)
    }, 0)
  }

  const calculateProductTotal = (quantity: number, price: number) => {
    return quantity * price
  }

  return (
    <div className="space-y-6">
      {/* Products */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Products & Pricing</h3>
          <Button onClick={addProduct} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {fields.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-gray-500 text-center">
                <Calculator className="w-8 h-8 mx-auto mb-2" />
                <p>No products added yet</p>
                <p className="text-sm">Click "Add Product" to get started</p>
              </div>
            </CardContent>
          </Card>
        )}

        {fields.map((field, index) => {
          const selectedProduct = products.find(p => p.id === watchedProducts[index]?.product_id)
          
          return (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Product {index + 1}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Product Selection */}
                  <div className="md:col-span-2 space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={watchedProducts[index]?.product_id || ''}
                      onValueChange={(value) => {
                        setValue(`products.${index}.product_id`, value)
                        updateProductPrice(index, value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id!}>
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <span className="text-sm text-gray-500">
                                {product.category} • List: {formatCurrency(product.list_price)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.products?.[index]?.product_id && (
                      <p className="text-red-500 text-sm">{errors.products[index]?.product_id?.message}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`products.${index}.quantity`, { valueAsNumber: true })}
                      placeholder="1"
                    />
                    {errors.products?.[index]?.quantity && (
                      <p className="text-red-500 text-sm">{errors.products[index]?.quantity?.message}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`products.${index}.price`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.products?.[index]?.price && (
                      <p className="text-red-500 text-sm">{errors.products[index]?.price?.message}</p>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                {selectedProduct && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Category:</span> {selectedProduct.category}
                      </div>
                      <div>
                        <span className="font-medium">List Price:</span> {formatCurrency(selectedProduct.list_price)}
                      </div>
                      <div>
                        <span className="font-medium">Your Price:</span> {formatCurrency(watchedProducts[index]?.price || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Line Total:</span> 
                        <span className="font-bold ml-1">
                          {formatCurrency(calculateProductTotal(
                            watchedProducts[index]?.quantity || 0,
                            watchedProducts[index]?.price || 0
                          ))}
                        </span>
                      </div>
                    </div>
                    
                    {/* Discount indicator */}
                    {watchedProducts[index]?.price && selectedProduct.list_price && (
                      <div className="mt-2">
                        {(() => {
                          const discount = ((selectedProduct.list_price - watchedProducts[index].price) / selectedProduct.list_price) * 100
                          if (discount > 0) {
                            return (
                              <Badge variant={discount > 30 ? "destructive" : discount > 20 ? "warning" : "secondary"}>
                                {discount.toFixed(1)}% discount
                              </Badge>
                            )
                          } else if (discount < 0) {
                            return (
                              <Badge variant="destructive">
                                {Math.abs(discount).toFixed(1)}% above list price
                              </Badge>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pricing Warnings */}
      {pricingWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center text-yellow-800">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Pricing Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pricingWarnings.map((warning, index) => (
                <p key={index} className="text-sm text-yellow-700">{warning}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deal Summary */}
      {watchedProducts.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Deal Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Products:</span> {watchedProducts.length}
              </div>
              <div>
                <span className="font-medium">Total Quantity:</span> {watchedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}
              </div>
              <div>
                <span className="font-medium">List Value:</span> 
                {formatCurrency(watchedProducts.reduce((sum, p) => {
                  const product = products.find(prod => prod.id === p.product_id)
                  return sum + (product ? product.list_price * (p.quantity || 0) : 0)
                }, 0))}
              </div>
              <div>
                <span className="font-medium">Deal Value:</span> 
                <span className="text-lg font-bold ml-1 text-blue-900">
                  {formatCurrency(calculateTotalValue())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Step 3: Products & Pricing</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Add all products included in this deal</li>
          <li>• Pricing should reflect your negotiated rates with the end user</li>
          <li>• Large discounts may require additional approval steps</li>
          <li>• Ensure quantities are accurate for proper commission calculation</li>
        </ul>
      </div>
    </div>
  )
}
