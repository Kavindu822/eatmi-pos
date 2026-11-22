import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildEscposReceipt } from '@/lib/escpos';

const execFileAsync = promisify(execFile);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.VERCEL === '1') {
      return NextResponse.json({
        ok: false,
        error: 'Physical printer is connected to the shop cashier PC.'
      }, { headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const { sale, slipType = 'customer', settings = {}, customerPointsBalance } = body;

    if (!sale || !sale.id) {
      return NextResponse.json({ ok: false, error: 'Sale data is required' }, { status: 400, headers: corsHeaders });
    }

    // Build the ESC/POS binary buffer
    const escposBuffer = buildEscposReceipt({
      sale,
      slipType,
      settings,
      customerPointsBalance
    });

    // Write to a temporary binary file
    const tempFilePath = join(tmpdir(), `pos-print-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.bin`);
    writeFileSync(tempFilePath, escposBuffer);

    const scriptPath = join(process.cwd(), 'scripts', 'print-thermal.ps1');

    try {
      const { stdout, stderr } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          scriptPath,
          '-FilePath',
          tempFilePath
        ],
        { timeout: 5000 }
      );

      const isSuccess = stdout.includes('SUCCESS');

      return NextResponse.json({
        ok: isSuccess,
        message: stdout.trim() || 'Receipt printed.',
        error: !isSuccess ? (stderr.trim() || 'Could not print receipt') : undefined
      }, { headers: corsHeaders });
    } finally {
      try {
        unlinkSync(tempFilePath);
      } catch {}
    }
  } catch (error: any) {
    console.error('Print thermal API error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to print receipt'
    }, { status: 500, headers: corsHeaders });
  }
}
