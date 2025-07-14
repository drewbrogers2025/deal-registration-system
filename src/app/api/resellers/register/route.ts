import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { 
  ResellerSchema, 
  ResellerContactSchema, 
  ResellerTerritorySchema,
  type RegistrationFormData 
} from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json() as RegistrationFormData

    // Validate the complete registration data
    if (!body.terms_accepted) {
      return NextResponse.json(
        { error: 'Terms and conditions must be accepted' },
        { status: 400 }
      )
    }

    // Start a transaction by creating the reseller first
    const resellerData = {
      name: body.step1.legal_name,
      email: body.step5.contacts.find(c => c.is_primary)?.email || body.step5.contacts[0].email,
      territory: body.step4.territories.find(t => t.is_primary)?.territory_name || body.step4.territories[0].territory_name,
      tier: 'bronze' as const,
      status: 'active' as const,
      legal_name: body.step1.legal_name,
      dba: body.step1.dba,
      tax_id: body.step1.tax_id,
      website: body.step1.website,
      phone: body.step1.phone,
      address_line1: body.step2.address_line1,
      address_line2: body.step2.address_line2,
      city: body.step2.city,
      state_province: body.step2.state_province,
      postal_code: body.step2.postal_code,
      country: body.step2.country,
      years_in_business: body.step3.years_in_business,
      employee_count: body.step3.employee_count,
      revenue_range: body.step3.revenue_range,
      registration_status: 'submitted' as const,
      terms_accepted_at: new Date().toISOString(),
      terms_version: body.terms_version,
    }

    // Validate reseller data
    const resellerValidation = ResellerSchema.safeParse(resellerData)
    if (!resellerValidation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid reseller data', 
          details: resellerValidation.error.issues 
        },
        { status: 400 }
      )
    }

    // Create the reseller
    const { data: insertedReseller, error: resellerError } = await supabase
      .from('resellers')
      .insert(resellerValidation.data)
      .select()
      .single()

    if (resellerError) {
      console.error('Error creating reseller:', resellerError)
      return NextResponse.json(
        { error: 'Failed to create reseller', details: resellerError.message },
        { status: 500 }
      )
    }

    const resellerId = insertedReseller.id

    // Create contacts
    const contactsData = body.step5.contacts.map(contact => ({
      ...contact,
      reseller_id: resellerId,
    }))

    // Validate contacts
    const contactValidations = contactsData.map(contact => 
      ResellerContactSchema.safeParse(contact)
    )

    const invalidContacts = contactValidations.filter(v => !v.success)
    if (invalidContacts.length > 0) {
      // Rollback: delete the created reseller
      await supabase.from('resellers').delete().eq('id', resellerId)
      
      return NextResponse.json(
        { 
          error: 'Invalid contact data', 
          details: invalidContacts.map(v => v.error?.issues).flat()
        },
        { status: 400 }
      )
    }

    const validatedContacts = contactValidations.map(v => v.data!)

    const { error: contactsError } = await supabase
      .from('reseller_contacts')
      .insert(validatedContacts)

    if (contactsError) {
      console.error('Error creating contacts:', contactsError)
      // Rollback: delete the created reseller
      await supabase.from('resellers').delete().eq('id', resellerId)
      
      return NextResponse.json(
        { error: 'Failed to create contacts', details: contactsError.message },
        { status: 500 }
      )
    }

    // Create territories
    const territoriesData = body.step4.territories.map(territory => ({
      ...territory,
      reseller_id: resellerId,
    }))

    // Validate territories
    const territoryValidations = territoriesData.map(territory => 
      ResellerTerritorySchema.safeParse(territory)
    )

    const invalidTerritories = territoryValidations.filter(v => !v.success)
    if (invalidTerritories.length > 0) {
      // Rollback: delete the created reseller and contacts
      await supabase.from('reseller_contacts').delete().eq('reseller_id', resellerId)
      await supabase.from('resellers').delete().eq('id', resellerId)
      
      return NextResponse.json(
        { 
          error: 'Invalid territory data', 
          details: invalidTerritories.map(v => v.error?.issues).flat()
        },
        { status: 400 }
      )
    }

    const validatedTerritories = territoryValidations.map(v => v.data!)

    const { error: territoriesError } = await supabase
      .from('reseller_territories')
      .insert(validatedTerritories)

    if (territoriesError) {
      console.error('Error creating territories:', territoriesError)
      // Rollback: delete the created reseller and contacts
      await supabase.from('reseller_contacts').delete().eq('reseller_id', resellerId)
      await supabase.from('resellers').delete().eq('id', resellerId)
      
      return NextResponse.json(
        { error: 'Failed to create territories', details: territoriesError.message },
        { status: 500 }
      )
    }

    // Fetch the complete reseller data with relationships
    const { data: completeReseller, error: fetchError } = await supabase
      .from('resellers')
      .select(`
        *,
        contacts:reseller_contacts(*),
        territories:reseller_territories(*)
      `)
      .eq('id', resellerId)
      .single()

    if (fetchError) {
      console.error('Error fetching complete reseller:', fetchError)
      return NextResponse.json(
        { error: 'Registration completed but failed to fetch data', details: fetchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: completeReseller, 
      success: true,
      message: 'Registration submitted successfully. Your application is under review.'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error during registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get registration status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const { data: reseller, error } = await supabase
      .from('resellers')
      .select(`
        id,
        name,
        email,
        registration_status,
        created_at,
        approved_at,
        rejection_reason
      `)
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching registration status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch registration status', details: error.message },
        { status: 500 }
      )
    }

    if (!reseller) {
      return NextResponse.json(
        { data: null, success: true, message: 'No registration found' }
      )
    }

    return NextResponse.json({ 
      data: reseller, 
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
