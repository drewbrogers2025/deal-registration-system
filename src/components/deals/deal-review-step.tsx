'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { DealStep1, DealStep2, DealStep3, DealStep4, Reseller, Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, AlertTriangle, Calendar, Building, Package, DollarSign } from 'lucide-react'

interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

interface ValidationWarning {
  field: string
  code: string
  message: string
  suggestion?: string
}

interface DealReviewStepProps {
  step1Data: Partial<DealStep1>
  step2Data: Partial<DealStep2>
  step3Data: Partial<DealStep3>
  step4Data: Partial<DealStep4>
  resellers: Reseller[]
  products: Product[]
  validationErrors: ValidationError[]
  validationWarnings: ValidationWarning[]
  onSubmit: () => void
  isSubmitting: boolean
}

export function DealReviewStep({
  step1Data,
  step2Data,
  step3Data,
  step4Data,
  resellers,
  products,
  validationErrors,
  validationWarnings,
  onSubmit,
  isSubmitting
}: DealReviewStepProps) {
  const selectedReseller = resellers.find(r => r.id === step1Data.reseller_id)
  const dealProducts = step3Data.products || []
  
  const calculateTotalValue = () => {
    return dealProducts.reduce((sum, product) => {
      return sum + (product.quantity || 0) * (product.price || 0)
    }, 0)
  }

  const calculateListValue = () => {
    return dealProducts.reduce((sum, productItem) => {
      const product = products.find(p => p.id === productItem.product_id)
      return sum + (product ? product.list_price * (productItem.quantity || 0) : 0)
    }, 0)
  }

  const totalDiscount = calculateListValue() - calculateTotalValue()
  const discountPercentage = calculateListValue() > 0 ? (totalDiscount / calculateListValue()) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Deal Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Deal Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateTotalValue())}
              </div>
              <div className="text-sm text-gray-600">Deal Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dealProducts.length}
              </div>
              <div className="text-sm text-gray-600">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {step1Data.priority || 1}
              </div>
              <div className="text-sm text-gray-600">Priority Level</div>
            </div>
          </div>
          
          {discountPercentage > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Discount:</span>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    {formatCurrency(totalDiscount)} ({discountPercentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-600">
                    List Value: {formatCurrency(calculateListValue())}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Submitting Reseller</label>
              <div className="mt-1">
                {selectedReseller ? (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{selectedReseller.name}</span>
                    <Badge variant={
                      selectedReseller.tier === 'gold' ? 'default' :
                      selectedReseller.tier === 'silver' ? 'secondary' : 'outline'
                    }>
                      {selectedReseller.tier.toUpperCase()}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-gray-500">Not selected</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Territory</label>
              <div className="mt-1 font-medium">
                {selectedReseller?.territory || 'N/A'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Priority</label>
              <div className="mt-1">
                <Badge variant={
                  (step1Data.priority || 1) >= 4 ? 'destructive' :
                  (step1Data.priority || 1) >= 3 ? 'warning' : 'secondary'
                }>
                  Level {step1Data.priority || 1}
                </Badge>
              </div>
            </div>
            
            {step1Data.expected_close_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Close Date</label>
                <div className="mt-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {new Date(step1Data.expected_close_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
          
          {step1Data.deal_description && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-600">Description</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                {step1Data.deal_description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* End User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            End User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Company Name</label>
              <div className="mt-1 font-medium">
                {step2Data.end_user?.company_name || 'Not provided'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Contact Name</label>
              <div className="mt-1 font-medium">
                {step2Data.end_user?.contact_name || 'Not provided'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Contact Email</label>
              <div className="mt-1 font-medium">
                {step2Data.end_user?.contact_email || 'Not provided'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Territory</label>
              <div className="mt-1 font-medium">
                {step2Data.end_user?.territory || 'Not provided'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Products ({dealProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dealProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No products added</p>
          ) : (
            <div className="space-y-3">
              {dealProducts.map((productItem, index) => {
                const product = products.find(p => p.id === productItem.product_id)
                const lineTotal = (productItem.quantity || 0) * (productItem.price || 0)
                const discount = product ? 
                  ((product.list_price - (productItem.price || 0)) / product.list_price) * 100 : 0
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{product?.name || 'Unknown Product'}</div>
                      <div className="text-sm text-gray-600">
                        {product?.category} • Qty: {productItem.quantity} • Unit: {formatCurrency(productItem.price || 0)}
                      </div>
                      {discount > 0 && (
                        <Badge variant={discount > 30 ? "destructive" : discount > 20 ? "warning" : "secondary"} className="mt-1">
                          {discount.toFixed(1)}% discount
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(lineTotal)}</div>
                      {product && (
                        <div className="text-xs text-gray-500">
                          List: {formatCurrency(product.list_price * (productItem.quantity || 0))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              <Separator />
              
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Deal Value:</span>
                <span className="text-blue-600">{formatCurrency(calculateTotalValue())}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationErrors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="font-medium text-red-800">{error.code}</div>
                      <div className="text-sm text-red-700">{error.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {validationWarnings.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                <div className="space-y-2">
                  {validationWarnings.map((warning, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="font-medium text-yellow-800">{warning.code}</div>
                      <div className="text-sm text-yellow-700">{warning.message}</div>
                      {warning.suggestion && (
                        <div className="text-xs text-yellow-600 mt-1 italic">
                          Suggestion: {warning.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || validationErrors.length > 0}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Submitting Deal...' : 'Submit Deal Registration'}
            </Button>
            
            {validationErrors.length > 0 && (
              <p className="text-sm text-red-600 mt-2">
                Please resolve validation errors before submitting
              </p>
            )}
            
            <div className="mt-4 text-sm text-gray-600">
              <p>By submitting this deal registration, you confirm that:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• All information provided is accurate and complete</li>
                <li>• You have authorization to register this deal</li>
                <li>• You understand the approval process and timeline</li>
                <li>• You agree to the terms and conditions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Step 4: Review & Submit</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Review all information for accuracy before submitting</li>
          <li>• Address any validation errors or warnings</li>
          <li>• Once submitted, the deal will enter the approval workflow</li>
          <li>• You will receive notifications about approval status changes</li>
        </ul>
      </div>
    </div>
  )
}
