@echo off
setlocal
set "MEMORIZE_PORT=4173"
set "MEMORIZE_URL=http://127.0.0.1:%MEMORIZE_PORT%/"
set "MEMORIZE_SERVER=%~dp0scripts\start-local-server.ps1"
set "CHROME_USER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
set "CHROME_64=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_32=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%MEMORIZE_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%MEMORIZE_SERVER%"" -Port %MEMORIZE_PORT%' -WindowStyle Hidden"
  timeout /t 2 /nobreak >nul
)

if exist "%CHROME_USER%" (
  start "" "%CHROME_USER%" "%MEMORIZE_URL%"
  exit /b 0
)
if exist "%CHROME_64%" (
  start "" "%CHROME_64%" "%MEMORIZE_URL%"
  exit /b 0
)
if exist "%CHROME_32%" (
  start "" "%CHROME_32%" "%MEMORIZE_URL%"
  exit /b 0
)

echo Chrome을 찾지 못했습니다. 기본 브라우저로 실행합니다.
start "" "%MEMORIZE_URL%"
endlocal
