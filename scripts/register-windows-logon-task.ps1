#Requires -Version 5.1
<#
  Registers a scheduled task that runs scripts\dev-at-login.bat at user logon
  (interactive cmd window). Run from PowerShell: .\scripts\register-windows-logon-task.ps1
#>
$ErrorActionPreference = 'Stop'

$taskName = 'NotificationAI npm run dev'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$batPath = Join-Path $PSScriptRoot 'dev-at-login.bat'

if (-not (Test-Path -LiteralPath $batPath)) {
  throw "Not found: $batPath"
}

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$argument = "/k `"$batPath`""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $argument -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal | Out-Null

Write-Host "Registered scheduled task: $taskName"
