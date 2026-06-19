@echo off
REM ============================================================
REM  start-game.bat - launch "Paul's Missionary Journey" locally
REM
REM  Just double-click this file. It delegates to the cross-project
REM  "web-launch" skill, which:
REM    - finds a FREE port (skips any port already in use),
REM    - runs "npm install" on first run if needed,
REM    - starts "npm run dev", and
REM    - opens your browser once the server is ready.
REM
REM  Optional: pass a starting port, e.g.  start-game.bat 3000
REM ============================================================

cd /d "%~dp0"

set "LAUNCHER=%USERPROFILE%\.claude\skills\web-launch\web-launch.bat"

if exist "%LAUNCHER%" (
  call "%LAUNCHER%" %*
) else (
  echo [start-game] web-launch skill not found at:
  echo   %LAUNCHER%
  echo [start-game] Falling back to a plain "npm run dev".
  echo.
  if not exist "node_modules" call npm install
  call npm run dev
  pause
)
