'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { RegistrationStep4 } from '@/lib/types'

interface RegistrationStep4Props {
  data?: RegistrationStep4
  onUpdate: (data: RegistrationStep4) => void
  onNext: () => void
  onPrev: () => void
}

export function RegistrationStep4({ data, onUpdate, onNext, onPrev }: RegistrationStep4Props) {
  const [territories, setTerritories] = useState(
    data?.territories || [{ territory_name: '', territory_type: 'geographic', is_primary: true }]
  )

  useEffect(() => {
    onUpdate({ territories })
  }, [territories, onUpdate])

  const addTerritory = () => {
    setTerritories([
      ...territories,
      { territory_name: '', territory_type: 'geographic', is_primary: false }
    ])
  }

  const removeTerritory = (index: number) => {
    if (territories.length > 1) {
      const newTerritories = territories.filter((_, i) => i !== index)
      // Ensure at least one primary territory
      if (!newTerritories.some(t => t.is_primary)) {
        newTerritories[0].is_primary = true
      }
      setTerritories(newTerritories)
    }
  }

  const updateTerritory = (index: number, field: string, value: any) => {
    const newTerritories = [...territories]
    newTerritories[index] = { ...newTerritories[index], [field]: value }
    
    // If setting as primary, unset others
    if (field === 'is_primary' && value) {
      newTerritories.forEach((t, i) => {
        if (i !== index) t.is_primary = false
      })
    }
    
    setTerritories(newTerritories)
  }

  const isValid = territories.length > 0 && territories.every(t => t.territory_name.trim() !== '')

  const handleSubmit = () => {
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Service Territories</h3>
        <p className="text-gray-600 mb-4">
          Define the geographic or market territories where you provide services.
        </p>
      </div>

      <div className="space-y-4">
        {territories.map((territory, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <Label htmlFor={`territory_${index}`}>Territory Name *</Label>
                <Input
                  id={`territory_${index}`}
                  value={territory.territory_name}
                  onChange={(e) => updateTerritory(index, 'territory_name', e.target.value)}
                  placeholder="e.g., Northeast US, California, EMEA"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="primary_territory"
                    checked={territory.is_primary}
                    onChange={() => updateTerritory(index, 'is_primary', true)}
                  />
                  <span className="text-sm">Primary</span>
                </label>
                
                {territories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTerritory(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addTerritory}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Territory
      </Button>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-900 mb-1">
                Territory Guidelines
              </h4>
              <p className="text-sm text-yellow-700">
                Please be specific about your service territories. This helps us route leads 
                appropriately and avoid conflicts with other partners.
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
        >
          Previous
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="px-8"
        >
          Continue to Contacts
        </Button>
      </div>
    </div>
  )
}
