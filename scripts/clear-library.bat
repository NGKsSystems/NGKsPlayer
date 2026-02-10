@echo off
echo ================================
echo  NGKsPlayer Library Reset Tool
echo ================================
echo.
echo This will CLEAR your entire music library database.
echo You will need to re-scan your music folders afterward.
echo.
pause
echo.
echo Clearing library database...

REM Stop any running NGKsPlayer processes
taskkill /F /IM "NGKsPlayer.exe" 2>nul
taskkill /F /IM "electron.exe" 2>nul

REM Remove the database file (assuming it's in a standard location)
if exist "%APPDATA%\NGKsPlayer\*.db" (
    echo Deleting database files...
    del /Q "%APPDATA%\NGKsPlayer\*.db"
    echo Database files deleted.
) else (
    echo No database files found in %APPDATA%\NGKsPlayer\
)

REM Also check local app data
if exist "%LOCALAPPDATA%\NGKsPlayer\*.db" (
    echo Deleting local database files...
    del /Q "%LOCALAPPDATA%\NGKsPlayer\*.db"
    echo Local database files deleted.
) else (
    echo No database files found in %LOCALAPPDATA%\NGKsPlayer\
)

REM Check for database in the project directory
if exist "*.db" (
    echo Deleting project database files...
    del /Q "*.db"
    echo Project database files deleted.
) else (
    echo No database files found in project directory.
)

echo.
echo ================================
echo Library database cleared!
echo ================================
echo.
echo Next steps:
echo 1. Start NGKsPlayer
echo 2. Go to Library
echo 3. Click "Add Folder" or "Auto Scan" to rebuild your library
echo 4. Your library will be rebuilt WITHOUT the test files
echo.
pause
