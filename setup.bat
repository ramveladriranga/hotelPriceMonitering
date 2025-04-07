@echo off
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo Node.js not found. Downloading and installing...
  powershell -Command "Start-Process 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -Wait"
)

echo Installing dependencies...
npm install
echo ✅ Setup complete!
pause
