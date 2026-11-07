@echo off
rem Launches the Wavestitch development build. All app data stays in "app\.dev-data" on this drive.
cd /d "%~dp0"
set "TEMP=%~dp0..\.cache\tmp"
set "TMP=%TEMP%"
if not exist "out\main\index.js" (
  echo Building Wavestitch for the first time...
  call npx electron-vite build
)
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
