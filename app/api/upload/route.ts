// ─────────────────────────────────────────────
// API: POST Image Upload (Supabase Storage)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = 'uploads';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    // Fallback: validate by file extension if MIME type is unreliable
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .jpg and .png images are allowed' },
        { status: 400 },
      );
    }
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 5MB' },
      { status: 400 },
    );
  }

  // Generate unique filename: timestamp-random.ext
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${session.user.email}/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 year
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  // Get public URL
  const { data: urlData } = supabaseServer.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return NextResponse.json({
    success: true,
    url: urlData.publicUrl,
    path: data.path,
  });
}
