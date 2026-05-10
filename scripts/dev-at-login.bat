@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

REM Task Scheduler の環境では PATH が欠けることがあるため、よくある場所を補強する
if defined NVM_HOME set "PATH=%NVM_HOME%;%PATH%"
if defined NVM_SYMLINK set "PATH=%NVM_SYMLINK%;%PATH%"
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LOCALAPPDATA%\Programs\Microsoft VS Code\bin;%PATH%"

where npm >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
  ) else if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
  ) else (
    echo npm が見つかりません。Node.js をインストールするか PATH を設定してください。
    pause
    exit /b 1
  )
) else (
  set "NPM_CMD=npm"
)

"%NPM_CMD%" run dev
if errorlevel 1 (
  echo npm run dev が失敗しました。
  pause
  exit /b 1
)
