import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadDocumentToBlob } from '@/lib/blob';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      // Check single file key 'file'
      const single = formData.get('file') as File;
      if (single) {
        files.push(single);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file || typeof file === 'string') continue;

      try {
        const blobResult = await uploadDocumentToBlob(file, 'resin-orders');
        uploadedUrls.push(blobResult.url);
      } catch (blobErr) {
        console.warn('Vercel Blob upload failed, fallback to base64 data URL:', blobErr);
        // Fallback: create base64 data URI
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || 'image/jpeg';
        const base64Url = `data:${mimeType};base64,${buffer.toString('base64')}`;
        uploadedUrls.push(base64Url);
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error: any) {
    console.error('Resin image upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
