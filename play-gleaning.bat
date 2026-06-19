@echo off
REM Ruth - Gleaning (collect wheat, Ruth 2) - standalone playtest. English-only, CRLF.
cd /d "%~dp0"
echo Starting Gleaning (Ruth picks up wheat) ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=gleaning
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=gleaning"
echo.
echo Server stopped.
pause
