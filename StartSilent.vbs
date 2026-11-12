' ========================================================
'  EATmi Bakery & Cafe - Silent POS Launcher
'  Runs POS in the background without any black CMD window
' ========================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get pos folder from this script's directory
posDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = posDir

' Check if server is already running on port 8787
Set execNet = WshShell.Exec("cmd /c netstat -ano | findstr :8787")
output = execNet.StdOut.ReadAll()

If InStr(output, "LISTENING") = 0 Then
    ' Start server in background (0 = hidden window, False = do not block script)
    If fso.FolderExists(posDir & "\.next") Then
        WshShell.Run "cmd /c npm run start", 0, False
    Else
        WshShell.Run "cmd /c npm run dev", 0, False
    End If
    ' Wait 4 seconds for Next.js server to initialize
    WScript.Sleep 4000
End If

' Open Chrome in dedicated POS App Mode (clean window, no browser tabs/URL bar)
chromePath1 = "C:\Program Files\Google\Chrome\Application\chrome.exe"
chromePath2 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
edgePath    = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(chromePath1) Then
    WshShell.Run """" & chromePath1 & """ --app=http://localhost:8787", 1, False
ElseIf fso.FileExists(chromePath2) Then
    WshShell.Run """" & chromePath2 & """ --app=http://localhost:8787", 1, False
ElseIf fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:8787", 1, False
Else
    WshShell.Run "cmd /c start http://localhost:8787", 0, False
End If
