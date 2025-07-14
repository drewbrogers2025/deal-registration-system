import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { ResellerSchema } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params
    const { searchParams } = new URL(request.url)
    const includeRelations = searchParams.get('include_relations') === 'true'

    // Build select clause
    let selectClause = '*'
    if (includeRelations) {
      selectClause = `
        *,
        contacts:reseller_contacts(*),
        territories:reseller_territories(*),
        documents:company_documents(
          id, 
          name, 
          document_type, 
          is_current, 
          expires_at,
          created_at,
          uploader:reseller_contacts(first_name, last_name, email)
        ),
        metrics:company_metrics(*),
        approved_by_staff:staff_users(name, email, role)
      `
    }

    const { data: reseller, error } = await supabase
      .from('resellers')
      .select(selectClause)
      .eq('id', resellerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Reseller not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching reseller:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reseller', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: reseller, success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params
    const body = await request.json()

    // Validate request body
    const validation = ResellerSchema.partial().safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Remove fields that shouldn't be updated via this endpoint
    const { id, created_at, updated_at, approved_at, approved_by, ...allowedUpdates } = updateData

    const { data: updatedReseller, error } = await supabase
      .from('resellers')
      .update(allowedUpdates)
      .eq('id', resellerId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Reseller not found' },
          { status: 404 }
        )
      }
      console.error('Error updating reseller:', error)
      return NextResponse.json(
        { error: 'Failed to update reseller', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: updatedReseller, 
      success: true 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params

    // Check if reseller exists
    const { data: reseller, error: fetchError } = await supabase
      .from('resellers')
      .select('id, name, registration_status')
      .eq('id', resellerId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Reseller not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching reseller:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch reseller', details: fetchError.message },
        { status: 500 }
      )
    }

    // Prevent deletion of approved resellers (optional business rule)
    if (reseller.registration_status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved resellers. Please deactivate instead.' },
        { status: 400 }
      )
    }

    // Delete the reseller (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('resellers')
      .delete()
      .eq('id', resellerId)

    if (deleteError) {
      console.error('Error deleting reseller:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete reseller', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Reseller "${reseller.name}" deleted successfully`
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
