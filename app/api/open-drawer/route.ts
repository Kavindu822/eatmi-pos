import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    if (process.env.VERCEL === '1') {
      return NextResponse.json({
        ok: false,
        error: 'Physical cash drawer can only be opened from the shop cashier PC.'
      });
    }

    const scriptPath = join(process.cwd(), 'scripts', 'open-drawer.ps1');

    const { stdout, stderr } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { timeout: 4000 }
    );

    const isSuccess = stdout.includes('SUCCESS');

    return NextResponse.json({
      ok: isSuccess,
      message: stdout.trim() || 'Cash drawer kick signal sent.',
      error: !isSuccess ? (stderr.trim() || 'Could not kick drawer') : undefined
    });
  } catch (error: any) {
    console.error('Open drawer API error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to trigger drawer'
    }, { status: 500 });
  }
}
