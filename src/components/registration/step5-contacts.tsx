'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { RegistrationStep5 } from '@/lib/types'

interface RegistrationStep5Props {
  data?: RegistrationStep5
  onUpdate: (data: RegistrationStep5) => void
  onNext: () => void
  onPrev: () => void
}

const CONTACT_ROLES = [
  { value: 'primary', label: 'Primary Contact' },
  { value: 'sales', label: 'Sales Contact' },
  { value: 'technical', label: 'Technical Contact' },
  { value: 'billing', label: 'Billing Contact' },
  { value: 'executive', label: 'Executive Contact' },
]

export function RegistrationStep5({ data, onUpdate, onNext, onPrev }: RegistrationStep5Props) {
  const [contacts, setContacts] = useState(
    data?.contacts || [{
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'primary' as const,
      title: '',
      department: '',
      is_primary: true,
      can_register_deals: true,
      can_view_reports: true,
      can_manage_contacts: true,
    }]
  )

  useEffect(() => {
    onUpdate({ contacts })
  }, [contacts, onUpdate])

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'sales' as const,
        title: '',
        department: '',
        is_primary: false,
        can_register_deals: false,
        can_view_reports: false,
        can_manage_contacts: false,
      }
    ])
  }

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      const newContacts = contacts.filter((_, i) => i !== index)
      // Ensure at least one primary contact
      if (!newContacts.some(c => c.is_primary)) {
        newContacts[0].is_primary = true
      }
      setContacts(newContacts)
    }
  }

  const updateContact = (index: number, field: string, value: unknown) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    
    // If setting as primary, unset others
    if (field === 'is_primary' && value) {
      newContacts.forEach((c, i) => {
        if (i !== index) c.is_primary = false
      })
    }
    
    setContacts(newContacts)
  }

  const isValid = contacts.length > 0 && contacts.every(c => 
    c.first_name.trim() !== '' && 
    c.last_name.trim() !== '' && 
    c.email.trim() !== ''
  )

  const handleSubmit = () => {
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Contact Information</h3>
        <p className="text-gray-600 mb-4">
          Provide contact information for key personnel who will be involved in the partnership.
        </p>
      </div>

      <div className="space-y-6">
        {contacts.map((contact, index) => (
          <Card key={index} className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Contact {index + 1}</h4>
              {contacts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`first_name_${index}`}>First Name *</Label>
                <Input
                  id={`first_name_${index}`}
                  value={contact.first_name}
                  onChange={(e) => updateContact(index, 'first_name', e.target.value)}
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor={`last_name_${index}`}>Last Name *</Label>
                <Input
                  id={`last_name_${index}`}
                  value={contact.last_name}
                  onChange={(e) => updateContact(index, 'last_name', e.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div>
                <Label htmlFor={`email_${index}`}>Email *</Label>
                <Input
                  id={`email_${index}`}
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <Label htmlFor={`phone_${index}`}>Phone</Label>
                <Input
                  id={`phone_${index}`}
                  value={contact.phone || ''}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor={`role_${index}`}>Role</Label>
                <Select
                  value={contact.role}
                  onValueChange={(value) => updateContact(index, 'role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`title_${index}`}>Job Title</Label>
                <Input
                  id={`title_${index}`}
                  value={contact.title || ''}
                  onChange={(e) => updateContact(index, 'title', e.target.value)}
                  placeholder="Sales Manager"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="primary_contact"
                  checked={contact.is_primary}
                  onChange={() => updateContact(index, 'is_primary', true)}
                />
                <span className="text-sm">Primary Contact</span>
              </label>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addContact}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Contact
      </Button>

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
          Continue to Terms
        </Button>
      </div>
    </div>
  )
}
