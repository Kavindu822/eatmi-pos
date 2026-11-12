# EATmi POS - Background Launcher & Health Checker
$root = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $root

# Check if port 8787 is already active
$isListening = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue

if (-not $isListening) {
    # Start dev server in hidden background process
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $root -WindowStyle Hidden

    # Wait up to 25 seconds for server to be responsive
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Milliseconds 1000
        $active = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue
        if ($active) {
            # Give 1 extra second for HTTP router initialization
            Start-Sleep -Milliseconds 1000
            break
        }
    }
}

# Open Chrome in Dedicated App Mode (Clean borderless window without URL bar)
$chrome1 = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$chrome2 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
$edge    = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $chrome1) {
    Start-Process -FilePath $chrome1 -ArgumentList "--app=http://localhost:8787"
} elseif (Test-Path $chrome2) {
    Start-Process -FilePath $chrome2 -ArgumentList "--app=http://localhost:8787"
} elseif (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=http://localhost:8787"
} else {
    Start-Process "http://localhost:8787"
}
