@echo off
echo Killing all Electron and Node processes...
taskkill /f /im electron.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting NGKsPlayer...
pnpm dev
