@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0.."

set "LOG_DIR=%LOCALAPPDATA%\NotificationAI"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
set "LOG_FILE=%LOG_DIR%\dev-at-login.log"

call :log "=== start ==="
call :log "cwd=%CD%"

REM プロファイル読み込みの余裕（タスク側のログオン遅延に加える）
timeout /t 5 /nobreak >nul

netstat -ano | findstr ":3000" | findstr /I "LISTENING" >nul 2>&1
if not errorlevel 1 (
  call :log "port 3000 already listening; skip"
  echo 開発サーバーは既にポート 3000 で待ち受けています。
  exit /b 0
)

if defined NVM_HOME set "PATH=%NVM_HOME%;%PATH%"
if defined NVM_SYMLINK set "PATH=%NVM_SYMLINK%;%PATH%"
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LOCALAPPDATA%\Programs\Microsoft VS Code\bin;%PATH%"

set "NPM_CMD="
if exist "%ProgramFiles%\nodejs\npm.cmd" (
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
) else if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
  set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
) else (
  for /f "delims=" %%A in ('where npm 2^>nul') do (
    set "NPM_CMD=%%A"
    goto :npm_resolved
  )
)
:npm_resolved

if not defined NPM_CMD (
  call :log "ERROR: npm not found"
  echo npm が見つかりません。Node.js をインストールするか PATH を設定してください。
  pause
  exit /b 1
)

call :log "NPM_CMD=!NPM_CMD!"

"!NPM_CMD!" run dev
set "EXIT_CODE=!ERRORLEVEL!"
call :log "npm run dev exit code=!EXIT_CODE!"
if !EXIT_CODE! neq 0 (
  echo npm run dev が失敗しました。
  pause
  exit /b !EXIT_CODE!
)
exit /b 0

:log
>>"%LOG_FILE%" echo [%date% %time%] %~1
echo %~1
exit /b 0
