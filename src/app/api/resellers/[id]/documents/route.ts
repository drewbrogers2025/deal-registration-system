import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { CompanyDocumentSchema } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id

    const { data: documents, error } = await supabase
      .from('company_documents')
      .select(`
        *,
        uploader:reseller_contacts(first_name, last_name, email),
        reseller:resellers(name, email)
      `)
      .eq('reseller_id', resellerId)
      .order('is_current', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching company documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: documents, success: true })
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const body = await request.json()

    // Add reseller_id to the body
    const documentData = { ...body, reseller_id: resellerId }

    // Validate request body
    const validation = CompanyDocumentSchema.safeParse(documentData)
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

    // If this is being set as current, mark other versions as not current
    if (validatedData.is_current) {
      await supabase
        .from('company_documents')
        .update({ is_current: false })
        .eq('reseller_id', resellerId)
        .eq('name', validatedData.name)
        .eq('document_type', validatedData.document_type)
        .eq('is_current', true)
    }

    const { data: insertedDocument, error } = await supabase
      .from('company_documents')
      .insert(validatedData)
      .select(`
        *,
        uploader:reseller_contacts(first_name, last_name, email),
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating company document:', error)
      return NextResponse.json(
        { error: 'Failed to create document', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: insertedDocument, 
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const body = await request.json()
    const { documentId, ...updateData } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = CompanyDocumentSchema.partial().safeParse(updateData)
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

    // If this is being set as current, mark other versions as not current
    if (validatedData.is_current) {
      // Get the document to find its name and type
      const { data: currentDoc } = await supabase
        .from('company_documents')
        .select('name, document_type')
        .eq('id', documentId)
        .single()

      if (currentDoc) {
        await supabase
          .from('company_documents')
          .update({ is_current: false })
          .eq('reseller_id', resellerId)
          .eq('name', currentDoc.name)
          .eq('document_type', currentDoc.document_type)
          .eq('is_current', true)
          .neq('id', documentId)
      }
    }

    const { data: updatedDocument, error } = await supabase
      .from('company_documents')
      .update(validatedData)
      .eq('id', documentId)
      .eq('reseller_id', resellerId)
      .select(`
        *,
        uploader:reseller_contacts(first_name, last_name, email),
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating company document:', error)
      return NextResponse.json(
        { error: 'Failed to update document', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: updatedDocument, 
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get document info before deletion for cleanup
    const { data: document } = await supabase
      .from('company_documents')
      .select('file_path, name, document_type, is_current')
      .eq('id', documentId)
      .eq('reseller_id', resellerId)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('company_documents')
      .delete()
      .eq('id', documentId)
      .eq('reseller_id', resellerId)

    if (error) {
      console.error('Error deleting company document:', error)
      return NextResponse.json(
        { error: 'Failed to delete document', details: error.message },
        { status: 500 }
      )
    }

    // If this was the current version, mark the latest remaining version as current
    if (document.is_current) {
      const { data: latestVersion } = await supabase
        .from('company_documents')
        .select('id')
        .eq('reseller_id', resellerId)
        .eq('name', document.name)
        .eq('document_type', document.document_type)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (latestVersion) {
        await supabase
          .from('company_documents')
          .update({ is_current: true })
          .eq('id', latestVersion.id)
      }
    }

    // TODO: Delete the actual file from storage
    // This would typically involve deleting from Supabase Storage or another file service
    // await supabase.storage.from('documents').remove([document.file_path])

    return NextResponse.json({ 
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
