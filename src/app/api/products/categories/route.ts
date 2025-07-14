import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ProductCategorySchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    const includeHierarchy = searchParams.get('include_hierarchy') === 'true'
    const includeProductCount = searchParams.get('include_product_count') === 'true'
    const parentId = searchParams.get('parent_id')
    const activeOnly = searchParams.get('active_only') !== 'false' // Default to true

    let query = supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else if (!includeHierarchy) {
      query = query.is('parent_id', null) // Only root categories
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      )
    }

    let processedCategories = categories || []

    // Build hierarchy if requested
    if (includeHierarchy && !parentId) {
      const categoryMap = new Map<string, { id: string; name: string; children: unknown[] }>()
      const rootCategories: string[] = []

      // First pass: create map and identify roots
      processedCategories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] })
        if (!category.parent_id) {
          rootCategories.push(category.id)
        }
      })

      // Second pass: build hierarchy
      processedCategories.forEach(category => {
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id)
          if (parent) {
            parent.children.push(categoryMap.get(category.id))
          }
        }
      })

      processedCategories = rootCategories.map(id => categoryMap.get(id))
    }

    // Add product counts if requested
    if (includeProductCount) {
      processedCategories = await Promise.all(
        processedCategories.map(async (category) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('status', 'active')

          return {
            ...category,
            product_count: count || 0
          }
        })
      )
    }

    return NextResponse.json({
      data: {
        items: processedCategories,
        total: processedCategories.length
      },
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    
    // Validate request body
    const validation = ProductCategorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const categoryData = validation.data

    // Check if parent exists (if specified)
    if (categoryData.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', categoryData.parent_id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        )
      }
    }

    const { data: insertedCategory, error } = await supabase
      .from('product_categories')
      .insert(categoryData)
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json(
        { error: 'Failed to create category', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: insertedCategory,
      success: true,
      error: null
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
