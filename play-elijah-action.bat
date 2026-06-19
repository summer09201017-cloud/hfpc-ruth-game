@echo off
REM Hope - Elijah Restored - ACTION version (collect bread/water, 1 Kings 19) playtest. English-only, CRLF.
REM (The card version is play-elijah.bat. This is the new real-time action level.)
cd /d "%~dp0"
echo Starting Hope - Elijah Restored (ACTION version) ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=elijah-action
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=elijah-action"
echo.
echo Server stopped.
pause
