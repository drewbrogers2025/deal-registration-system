import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { ResellerContactSchema } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params

    const { data: contacts, error } = await supabase
      .from('reseller_contacts')
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .eq('reseller_id', resellerId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching reseller contacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contacts', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: contacts, success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params
    const body = await request.json()

    // Add reseller_id to the body
    const contactData = { ...body, reseller_id: resellerId }

    // Validate request body
    const validation = ResellerContactSchema.safeParse(contactData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // If this is being set as primary, unset other primary contacts
    if (validatedData.is_primary) {
      await supabase
        .from('reseller_contacts')
        .update({ is_primary: false })
        .eq('reseller_id', resellerId)
        .eq('is_primary', true)
    }

    const { data: insertedContact, error } = await supabase
      .from('reseller_contacts')
      .insert(validatedData)
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating reseller contact:', error)
      return NextResponse.json(
        { error: 'Failed to create contact', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: insertedContact, 
      success: true 
    }, { status: 201 })
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
    const { contactId, ...updateData } = body

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = ResellerContactSchema.partial().safeParse(updateData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // If this is being set as primary, unset other primary contacts
    if (validatedData.is_primary) {
      await supabase
        .from('reseller_contacts')
        .update({ is_primary: false })
        .eq('reseller_id', resellerId)
        .eq('is_primary', true)
        .neq('id', contactId)
    }

    const { data: updatedContact, error } = await supabase
      .from('reseller_contacts')
      .update(validatedData)
      .eq('id', contactId)
      .eq('reseller_id', resellerId)
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating reseller contact:', error)
      return NextResponse.json(
        { error: 'Failed to update contact', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: updatedContact, 
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
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Check if this is the primary contact
    const { data: contact } = await supabase
      .from('reseller_contacts')
      .select('is_primary')
      .eq('id', contactId)
      .eq('reseller_id', resellerId)
      .single()

    if (contact?.is_primary) {
      // Check if there are other contacts
      const { count } = await supabase
        .from('reseller_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('reseller_id', resellerId)

      if (count && count > 1) {
        return NextResponse.json(
          { error: 'Cannot delete primary contact when other contacts exist. Please designate a new primary contact first.' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('reseller_contacts')
      .delete()
      .eq('id', contactId)
      .eq('reseller_id', resellerId)

    if (error) {
      console.error('Error deleting reseller contact:', error)
      return NextResponse.json(
        { error: 'Failed to delete contact', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
