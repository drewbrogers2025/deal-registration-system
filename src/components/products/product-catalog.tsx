'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PricingDisplay } from './pricing-display'
import { formatCurrency, debounce } from '@/lib/utils'
import { Search, Grid, List, Package, Eye, ShoppingCart } from 'lucide-react'
import type { ProductWithRelations, ProductCategory, ProductCatalogFilter } from '@/lib/types'

interface ProductCatalogProps {
  resellerId?: string
  resellerTier?: string
  territory?: string
  onProductSelect?: (product: ProductWithRelations) => void
  selectionMode?: boolean
  className?: string
}

export function ProductCatalog({
  resellerId,
  resellerTier,
  territory,
  onProductSelect,
  selectionMode = false,
  className = ''
}: ProductCatalogProps) {
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filters
  const [filters, setFilters] = useState<ProductCatalogFilter>({
    page: 1,
    limit: 20,
    sort_by: 'name',
    sort_order: 'asc',
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })

  // Debounced search
  const debouncedSearch = useCallback((term: string) => {
    const debouncedFn = debounce(() => {
      setFilters(prev => ({ ...prev, search: term || undefined, page: 1 }))
    }, 300)
    debouncedFn()
  }, [setFilters])

  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm, debouncedSearch])

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/products/categories?include_product_count=true')
        const data = await response.json()
        if (data.success) {
          setCategories(data.data.items)
        }
      } catch (_err) {
        console.error('Error loading categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        
        // Add filters to params
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              params.set(key, value.join(','))
            } else {
              params.set(key, value.toString())
            }
          }
        })

        // Add context for pricing
        if (resellerId) params.set('reseller_id', resellerId)
        if (resellerTier) params.set('reseller_tier', resellerTier)
        if (territory) params.set('territory', territory)
        params.set('include_pricing', 'true')
        params.set('quantity', '1')

        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()
        
        if (data.success) {
          setProducts(data.data.items)
        } else {
          setError(data.error || 'Failed to load products')
        }
      } catch (_err) {
        setError('Error loading products')
        console.error('Error loading products:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [filters, resellerId, resellerTier, territory])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setFilters(prev => ({ 
      ...prev, 
      category_id: categoryId || undefined, 
      page: 1 
    }))
  }

  const handlePriceRangeChange = () => {
    setFilters(prev => ({
      ...prev,
      min_price: priceRange.min ? parseFloat(priceRange.min) : undefined,
      max_price: priceRange.max ? parseFloat(priceRange.max) : undefined,
      page: 1
    }))
  }

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({ ...prev, sort_by: sortBy, page: 1 }))
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading products...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Product Catalog</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id!}>
                  {category.name} ({category.product_count || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Range */}
          <div className="flex gap-2">
            <Input
              placeholder="Min price"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              onBlur={handlePriceRangeChange}
              type="number"
            />
            <Input
              placeholder="Max price"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              onBlur={handlePriceRangeChange}
              type="number"
            />
          </div>

          {/* Sort */}
          <Select value={filters.sort_by} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="created_at">Date Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
            selectionMode={selectionMode}
            onSelect={() => onProductSelect?.(product)}
          />
        ))}
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  )
}

interface ProductCardProps {
  product: ProductWithRelations
  viewMode: 'grid' | 'list'
  selectionMode: boolean
  onSelect?: () => void
}

function ProductCard({ product, viewMode, selectionMode, onSelect }: ProductCardProps) {
  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.sku && (
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  )}
                  {product.description && (
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  {product.calculated_price ? (
                    <PricingDisplay 
                      pricing={product.calculated_price} 
                      availability={product.availability}
                    />
                  ) : (
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {formatCurrency(product.list_price)}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {selectionMode && (
                      <Button size="sm" onClick={onSelect}>
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            {product.sku && (
              <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
            )}
          </div>
          <Badge variant="secondary">{product.status}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {product.description && (
          <p className="text-sm text-gray-600">{product.description}</p>
        )}
        
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {product.calculated_price ? (
          <PricingDisplay 
            pricing={product.calculated_price} 
            availability={product.availability}
            showDetails={true}
          />
        ) : (
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(product.list_price)}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
          {selectionMode && (
            <Button className="flex-1" onClick={onSelect}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Select
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
