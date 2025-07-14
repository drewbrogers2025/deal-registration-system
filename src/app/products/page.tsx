'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ProductCatalog } from '@/components/products/product-catalog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings, BarChart3, Package, DollarSign, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function ProductsPage() {
  const [selectedView, setSelectedView] = useState<'catalog' | 'management'>('catalog')

  // Mock stats - in real app, these would come from API
  const stats = [
    {
      title: 'Total Products',
      value: '156',
      change: '+12%',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Active Categories',
      value: '24',
      change: '+2',
      icon: BarChart3,
      color: 'text-green-600'
    },
    {
      title: 'Avg. Deal Size',
      value: '£45,200',
      change: '+8.2%',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Active Resellers',
      value: '89',
      change: '+5',
      icon: Users,
      color: 'text-orange-600'
    }
  ]

  return (
    <MainLayout title="Products" subtitle="Advanced product catalog with dynamic pricing">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={selectedView === 'catalog' ? 'default' : 'outline'}
                onClick={() => setSelectedView('catalog')}
              >
                <Package className="w-4 h-4 mr-2" />
                Catalog
              </Button>
              <Button
                variant={selectedView === 'management' ? 'default' : 'outline'}
                onClick={() => setSelectedView('management')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Management
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/products/categories">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Categories
              </Button>
            </Link>
            <Link href="/products/pricing">
              <Button variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing
              </Button>
            </Link>
            <Link href="/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                  {stat.change} from last month
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        {selectedView === 'catalog' ? (
          <ProductCatalog
            // These would typically come from user context
            resellerTier="gold"
            territory="UK"
            className="mt-6"
          />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/products/categories">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <h3 className="font-semibold">Categories</h3>
                        <p className="text-sm text-gray-500">Manage product categories</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/products/pricing">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <h3 className="font-semibold">Pricing Tiers</h3>
                        <p className="text-sm text-gray-500">Configure pricing rules</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/products/availability">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <h3 className="font-semibold">Availability</h3>
                        <p className="text-sm text-gray-500">Territory & reseller access</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
