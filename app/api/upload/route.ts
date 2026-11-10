import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file format. Allowed: JPG, PNG, WEBP, SVG.' }, { status: 400 });
    }

    const filename = `item-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const uploadPath = join(process.cwd(), 'public', 'uploads', filename);

    await writeFile(uploadPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      name: file.name
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

