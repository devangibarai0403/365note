import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadDocumentToBlob, deleteDocumentFromBlob } from '@/lib/blob';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const schoolId = formData.get('school_id') as string | null;
    const documentTitle = formData.get('document_title') as string | null;
    const documentType = formData.get('document_type') as string | 'Offer Letter' | 'Joining Letter' | 'Other Document';

    if (!file || !schoolId || !documentTitle) {
      return NextResponse.json(
        { error: 'File, school ID, and document title are required' },
        { status: 400 }
      );
    }

    // Verify school exists
    const schoolCheck = await query('SELECT id FROM public.schools WHERE id = $1', [schoolId]);
    if (schoolCheck.rows.length === 0) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Upload to Vercel Blob
    const blobResult = await uploadDocumentToBlob(file, 'school-docs');

    // Save metadata in database
    const insertRes = await query(
      `INSERT INTO public.school_documents 
        (school_id, document_title, document_type, file_url, file_name, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        schoolId,
        documentTitle.trim(),
        documentType || 'Other Document',
        blobResult.url,
        file.name,
        file.size,
      ]
    );

    return NextResponse.json({
      success: true,
      document: insertRes.rows[0],
      message: 'Document uploaded successfully to Vercel Blob',
    }, { status: 201 });
  } catch (error: any) {
    console.error('School document upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    const docRes = await query<{ file_url: string }>(
      'SELECT file_url FROM public.school_documents WHERE id = $1',
      [id]
    );

    if (docRes.rows.length > 0) {
      // Delete from Vercel Blob
      await deleteDocumentFromBlob(docRes.rows[0].file_url);
    }

    await query('DELETE FROM public.school_documents WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Delete school document error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
