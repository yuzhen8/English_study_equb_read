@echo off
echo Installing dependencies (this might take a while)...
call npm install
call npm install epubjs electron-squirrel-startup
if %errorlevel% neq 0 (
    echo npm install failed!
    pause
    exit /b %errorlevel%
)

echo Starting development server...
call npm run dev
