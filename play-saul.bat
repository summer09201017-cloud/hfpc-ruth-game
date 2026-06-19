@echo off
REM Reversal Heroes - Light Hero (Saul to Paul, Acts 9) - card level playtest (Paul repo). English-only, CRLF.
cd /d "%~dp0"
echo Starting Light Hero (Saul to Paul) ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=saul
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=saul"
echo.
echo Server stopped.
pause
