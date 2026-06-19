@echo off
REM Reversal Heroes - Hope Hero (Elijah, 1 Kings 19) - card level playtest (Paul repo). English-only, CRLF.
cd /d "%~dp0"
echo Starting Hope Hero (Elijah) ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=elijah
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=elijah"
echo.
echo Server stopped.
pause
