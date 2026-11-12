Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
posDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = posDir & "\scripts\start-pos.ps1"
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """", 0, False
