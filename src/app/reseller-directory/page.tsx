'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Phone, Mail, Globe, Users, Calendar } from 'lucide-react'
import type { ResellerWithRelations } from '@/lib/types'

export default function ResellerDirectoryPage() {
  const [resellers, setResellers] = useState<ResellerWithRelations[]>([])
  const [filteredResellers, setFilteredResellers] = useState<ResellerWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')

  useEffect(() => {
    fetchResellers()
  }, [])

  useEffect(() => {
    filterResellers()
  }, [resellers, searchTerm, selectedTier, selectedCountry])

  const fetchResellers = async () => {
    try {
      const response = await fetch('/api/resellers?status=approved&include_relations=true')
      if (response.ok) {
        const data = await response.json()
        setResellers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching resellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterResellers = () => {
    let filtered = resellers.filter(reseller => 
      reseller.registration_status === 'approved'
    )

    if (searchTerm) {
      filtered = filtered.filter(reseller =>
        reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reseller.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reseller.territories?.some(t => 
          t.territory_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (selectedTier !== 'all') {
      filtered = filtered.filter(reseller => reseller.tier === selectedTier)
    }

    if (selectedCountry !== 'all') {
      filtered = filtered.filter(reseller => reseller.country === selectedCountry)
    }

    setFilteredResellers(filtered)
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const uniqueCountries = Array.from(new Set(resellers.map(r => r.country).filter(Boolean)))

  if (loading) {
    return (
      <MainLayout title="Reseller Directory" subtitle="Find authorized reseller partners">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading resellers...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Reseller Directory" subtitle="Find authorized reseller partners">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name, territory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {uniqueCountries.map(country => (
                      <SelectItem key={country} value={country!}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredResellers.length} of {resellers.length} authorized resellers
          </p>
        </div>

        {/* Reseller Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResellers.map((reseller) => {
            const primaryContact = reseller.contacts?.find(c => c.is_primary)
            const primaryTerritory = reseller.territories?.find(t => t.is_primary)
            
            return (
              <Card key={reseller.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{reseller.name}</CardTitle>
                      {reseller.legal_name && reseller.legal_name !== reseller.name && (
                        <p className="text-sm text-gray-600 mt-1">{reseller.legal_name}</p>
                      )}
                    </div>
                    <Badge className={getTierColor(reseller.tier)}>
                      {reseller.tier.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Primary Territory */}
                  {primaryTerritory && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{primaryTerritory.territory_name}</span>
                    </div>
                  )}

                  {/* Location */}
                  {reseller.city && reseller.country && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{reseller.city}, {reseller.country}</span>
                    </div>
                  )}

                  {/* Contact Information */}
                  {primaryContact && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{primaryContact.first_name} {primaryContact.last_name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{primaryContact.email}</span>
                      </div>
                      {primaryContact.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{primaryContact.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Website */}
                  {reseller.website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                      <a 
                        href={reseller.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  {/* Business Details */}
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      {reseller.years_in_business && (
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{reseller.years_in_business}+ years</span>
                        </div>
                      )}
                      {reseller.employee_count && (
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          <span>{reseller.employee_count} employees</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All Territories */}
                  {reseller.territories && reseller.territories.length > 1 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">All Territories:</p>
                      <div className="flex flex-wrap gap-1">
                        {reseller.territories.map((territory, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {territory.territory_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact Button */}
                  <div className="pt-3">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => {
                        if (primaryContact?.email) {
                          window.location.href = `mailto:${primaryContact.email}?subject=Partnership Inquiry`
                        }
                      }}
                    >
                      Contact Partner
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* No Results */}
        {filteredResellers.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resellers found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or filters to find resellers.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
