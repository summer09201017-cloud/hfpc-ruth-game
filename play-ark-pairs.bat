@echo off
REM Noah's Ark - Animal Pairs (male and female, Genesis 6-7) - minigame playtest (Paul repo). English-only, CRLF.
cd /d "%~dp0"
echo Starting Noah's Ark - Animal Pairs ...
echo A browser tab opens automatically. If not, open the "Local:" URL shown below and add  /?demo=arkpairs
echo Keep THIS window open while playing. Close it to stop.
echo.
if not exist "node_modules" (
  echo First run: installing packages, about 1-2 minutes, only once...
  call npm install
)
call npm run dev -- --open "/?demo=arkpairs"
echo.
echo Server stopped.
pause
