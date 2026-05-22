#Requires -Version 5.1
<#
  Registers a scheduled task that runs scripts\dev-at-login.bat at user logon
  (interactive cmd window). Run from PowerShell: .\scripts\register-windows-logon-task.ps1
#>
$ErrorActionPreference = 'Stop'

$LogonDelaySeconds = 45
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

$argument = "/k call `"$batPath`""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $argument -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT${LogonDelaySeconds}S"
# StopExisting はこの環境の ScheduledTask モジュールで未対応のため Queue を使用
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -StartWhenAvailable `
  -MultipleInstances Queue
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

$task = Get-ScheduledTask -TaskName $taskName
$task.Settings.IdleSettings.StopOnIdleEnd = $false
Set-ScheduledTask -InputObject $task | Out-Null

Write-Host "Registered scheduled task: $taskName"
Write-Host "  Logon delay: ${LogonDelaySeconds}s (cmd opens after logon + delay)"
Write-Host "  Command: cmd.exe $argument"
Write-Host "  Log file: $env:LOCALAPPDATA\NotificationAI\dev-at-login.log"
Write-Host ""
Write-Host "Re-run this script after updating scripts in the repo."
