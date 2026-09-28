import { put, del } from '@vercel/blob';

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  'vercel_blob_rw_q2nsQNvaMzEl2NL9_ljrRYZYlXbJcv83kJs1GkfidkWtom6';

export async function uploadDocumentToBlob(
  file: File,
  folder = 'school-documents'
): Promise<{ url: string; pathname: string; contentType: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${folder}/${Date.now()}-${sanitizedName}`;

  const blob = await put(filename, file, {
    access: 'public',
    token: BLOB_TOKEN,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  };
}

export async function deleteDocumentFromBlob(url: string): Promise<void> {
  try {
    await del(url, {
      token: BLOB_TOKEN,
    });
  } catch (error) {
    console.warn('Vercel Blob deletion error:', error);
  }
}
