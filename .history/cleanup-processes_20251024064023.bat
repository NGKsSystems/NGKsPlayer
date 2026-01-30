@echo off
echo Cleaning up NGKsPlayer processes...

echo Killing Electron processes...
taskkill /f /im electron.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Electron processes killed
) else (
    echo ℹ️ No Electron processes found
)

echo Killing Node processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Node processes killed
) else (
    echo ℹ️ No Node processes found
)

echo Checking for processes using port 5176...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5176') do (
    echo Killing process using port 5176: %%a
    taskkill /f /pid %%a 2>nul
)

echo.
echo ✅ Cleanup complete! You can now run 'npm run dev' safely.
echo.
pause