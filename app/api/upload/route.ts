import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getTursoClient } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

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

      try {
        await writeFile(uploadPath, buffer);
      } catch (err) {
        // Read-only filesystem on serverless Vercel - handled gracefully
      }

      // Sync to Turso Cloud Media Table
      try {
        const mime = ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
        const turso = getTursoClient();
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO media(filename, data, mime_type, updated_at) VALUES(?, ?, ?, ?)',
          args: [filename, matches[2], mime, new Date().toISOString()]
        });
      } catch (cloudErr) {
        console.error('Failed to sync media to Turso:', cloudErr);
      }

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

    try {
      await writeFile(uploadPath, buffer);
    } catch (err) {
      // Read-only filesystem on serverless Vercel
    }

    // Sync to Turso Cloud Media Table
    try {
      const mime =
        safeExt === 'jpg' || safeExt === 'jpeg'
          ? 'image/jpeg'
          : safeExt === 'webp'
          ? 'image/webp'
          : safeExt === 'svg'
          ? 'image/svg+xml'
          : 'image/png';
      const turso = getTursoClient();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO media(filename, data, mime_type, updated_at) VALUES(?, ?, ?, ?)',
        args: [filename, buffer.toString('base64'), mime, new Date().toISOString()]
      });
    } catch (cloudErr) {
      console.error('Failed to sync media to Turso:', cloudErr);
    }

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      name: file.name
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process file' }, { status: 500 });
  }
}
