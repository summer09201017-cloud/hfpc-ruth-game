@echo off
REM Reversal Heroes - Gospel Hero (Cornelius, Acts 10) - card level playtest (Paul repo). English-only, CRLF.
cd /d "%~dp0"
echo Starting Gospel Hero (Cornelius) ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=cornelius
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=cornelius"
echo.
echo Server stopped.
pause
