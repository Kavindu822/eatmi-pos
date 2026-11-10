import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const contentType = req.headers.get('content-type') || '';

    // Case 1: JSON payload with base64 data URL
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const base64Data = body.base64 || body.image;
      if (!base64Data || typeof base64Data !== 'string') {
        return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
      }

      const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: 'Invalid base64 image data' }, { status: 400 });
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `img-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      const uploadPath = join(uploadDir, filename);

      await writeFile(uploadPath, buffer);

      return NextResponse.json({
        ok: true,
        url: `/uploads/${filename}`,
        name: filename
      });
    }

    // Case 2: Multipart Form Data file upload
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'jfif', 'avif', 'bmp', 'ico'];
    const safeExt = allowed.includes(ext) ? ext : 'jpg';

    const filename = `item-${Date.now()}-${randomUUID().slice(0, 8)}.${safeExt}`;
    const uploadPath = join(uploadDir, filename);

    await writeFile(uploadPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      name: file.name
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to upload image' }, { status: 500 });
  }
}
