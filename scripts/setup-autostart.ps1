param(
    [ValidateSet('enable', 'disable', 'status')]
    [string]$Action = 'enable'
)

$startupFolder = [Environment]::GetFolderPath('Startup')
$startupShortcut = Join-Path $startupFolder 'EATmi-POS.lnk'
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktopFolder 'EATmi POS.lnk'

$rootPath = (Get-Item $PSScriptRoot).Parent.FullName
$targetVbs = Join-Path $rootPath 'StartSilent.vbs'
$iconPath = Join-Path $rootPath 'public\favicon.ico'

if ($Action -eq 'enable') {
    $WshShell = New-Object -ComObject WScript.Shell

    # 1. Windows Startup Shortcut (starts automatically on computer power-on)
    $sc = $WshShell.CreateShortcut($startupShortcut)
    $sc.TargetPath = 'wscript.exe'
    $sc.Arguments = "`"$targetVbs`""
    $sc.WorkingDirectory = $rootPath
    $sc.Description = 'EATmi Cloud POS Auto-Start'
    if (Test-Path $iconPath) { $sc.IconLocation = $iconPath }
    $sc.Save()

    # 2. Desktop Shortcut (for quick 1-click launch anytime)
    $dsc = $WshShell.CreateShortcut($desktopShortcut)
    $dsc.TargetPath = 'wscript.exe'
    $dsc.Arguments = "`"$targetVbs`""
    $dsc.WorkingDirectory = $rootPath
    $dsc.Description = 'EATmi Cloud POS Cashier Terminal'
    if (Test-Path $iconPath) { $dsc.IconLocation = $iconPath }
    $dsc.Save()

    Write-Host "SUCCESS: Windows Auto-Start is now ENABLED!" -ForegroundColor Green
    Write-Host "Created startup shortcut: $startupShortcut"
    Write-Host "Created desktop shortcut: $desktopShortcut"
}
elseif ($Action -eq 'disable') {
    if (Test-Path $startupShortcut) {
        Remove-Item $startupShortcut -Force
        Write-Host "SUCCESS: Auto-start has been DISABLED (removed from Windows Startup)." -ForegroundColor Yellow
    } else {
        Write-Host "Auto-start is already disabled." -ForegroundColor Yellow
    }
}
elseif ($Action -eq 'status') {
    $isEnabled = Test-Path $startupShortcut
    Write-Host "Auto-Start Enabled: $isEnabled"
}

