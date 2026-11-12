@echo off
title EATmi POS - Cash Drawer Kick Test
echo ========================================================
echo   EATmi Bakery ^& Cafe - Cash Drawer Kick Test
echo   Sending ESC/POS pulse to POS-80C printer...
echo ========================================================

powershell -NoProfile -Command "$code = @' using System; using System.Runtime.InteropServices; public class P { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)] public class D { public string p; public string o; public string d; } [DllImport(\"winspool.drv\")] public static extern bool OpenPrinter(string s, out IntPtr h, IntPtr p); [DllImport(\"winspool.drv\")] public static extern bool ClosePrinter(IntPtr h); [DllImport(\"winspool.drv\")] public static extern bool StartDocPrinter(IntPtr h, int l, [In] D d); [DllImport(\"winspool.drv\")] public static extern bool EndDocPrinter(IntPtr h); [DllImport(\"winspool.drv\")] public static extern bool StartPagePrinter(IntPtr h); [DllImport(\"winspool.drv\")] public static extern bool EndPagePrinter(IntPtr h); [DllImport(\"winspool.drv\")] public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w); public static bool K(string n, byte[] b) { IntPtr p = Marshal.AllocCoTaskMem(b.Length); Marshal.Copy(b, 0, p, b.Length); IntPtr h; D d = new D { p = \"Kick\", d = \"RAW\" }; bool ok = false; if (OpenPrinter(n, out h, IntPtr.Zero)) { if (StartDocPrinter(h, 1, d)) { if (StartPagePrinter(h)) { int w; ok = WritePrinter(h, p, b.Length, out w); EndPagePrinter(h); } EndDocPrinter(h); } ClosePrinter(h); } Marshal.FreeCoTaskMem(p); return ok; } } '@; Add-Type -TypeDefinition $code; $b = [byte[]]@(0x1B, 0x70, 0x00, 0x19, 0xFA, 0x1B, 0x70, 0x01, 0x19, 0xFA); $res = [P]::K('POS-80C', $b); if (!$res) { $res = [P]::K('POS-80C (copy 1)', $b) }; if ($res) { Write-Host 'SUCCESS: Cash drawer pulse sent to printer!' -ForegroundColor Green } else { Write-Host 'ERROR: Could not communicate with POS-80C printer.' -ForegroundColor Red }"

echo.
echo If drawer did not open, please verify:
echo 1. The key is in the UNLOCKED position (not vertical).
echo 2. The RJ11/RJ12 cable is plugged into the DK port on the back of the POS-80C.
echo.
pause
