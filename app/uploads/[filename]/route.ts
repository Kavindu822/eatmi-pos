import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTursoClient } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    if (!filename || filename.includes('..')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // 1. Try local disk first (for Cashier PC running offline)
    const localPath = join(process.cwd(), 'public', 'uploads', filename);
    if (existsSync(localPath)) {
      const buffer = readFileSync(localPath);
      const ext = filename.split('.').pop()?.toLowerCase() || 'png';
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
          ? 'image/webp'
          : ext === 'svg'
          ? 'image/svg+xml'
          : ext === 'gif'
          ? 'image/gif'
          : 'image/png';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        }
      });
    }

    // 2. Query Turso Cloud Database (for Vercel serverless)
    const turso = getTursoClient();
    const result = await turso.execute({
      sql: 'SELECT data, mime_type FROM media WHERE filename = ? LIMIT 1',
      args: [filename]
    });

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const base64Data = String(row.data);
      const mimeType = String(row.mime_type || 'image/png');
      const buffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    return new NextResponse('Image not found', { status: 404 });
  } catch (error: any) {
    console.error('Image serve error:', error);
    return new NextResponse('Error serving image', { status: 500 });
  }
}

