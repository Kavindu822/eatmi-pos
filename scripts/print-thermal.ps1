param(
    [string]$FilePath = '',
    [string]$Base64Bytes = '',
    [string]$PrinterName = ''
)

$code = @'
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendRaw(string szPrinterName, byte[] bytes) {
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA { pDocName = "Thermal Direct Print", pDataType = "RAW" };
        bool bSuccess = false;

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
    Add-Type -TypeDefinition $code
}

$rawBytes = $null

if ($FilePath -and (Test-Path $FilePath)) {
    $rawBytes = [System.IO.File]::ReadAllBytes($FilePath)
} elseif ($Base64Bytes) {
    $rawBytes = [Convert]::FromBase64String($Base64Bytes)
}

if (-not $rawBytes -or $rawBytes.Length -eq 0) {
    Write-Error "FAILED: No raw byte payload provided."
    exit 1
}

# List of candidate printer queues in order of priority
$candidates = @()
if ($PrinterName) {
    $candidates += $PrinterName
}

# Add POS-80C queues first
$candidates += 'POS-80C (copy 1)'
$candidates += 'POS-80C'
$candidates += 'POS-80'
$candidates += 'POS80'

try {
    $allPrinters = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue
    $defaultPrn = ($allPrinters | Where-Object Default -eq $True).Name
    if ($defaultPrn) { $candidates += $defaultPrn }
    foreach ($p in $allPrinters) {
        if ($p.Name -match 'POS|80|Receipt|Thermal|Xprinter|Epson|XP-') {
            $candidates += $p.Name
        }
    }
} catch {}

$success = $false
$usedPrinter = ''

foreach ($cand in ($candidates | Select-Object -Unique)) {
    if ($cand) {
        $ok = [RawPrinterHelper]::SendRaw($cand, $rawBytes)
        if ($ok) {
            $success = $true
            $usedPrinter = $cand
            break
        }
    }
}

if ($success) {
    Write-Output "SUCCESS: Printed to $usedPrinter"
    exit 0
} else {
    Write-Error "FAILED: Could not send raw print to any printer."
    exit 1
}
