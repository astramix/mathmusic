@echo off
rem Double-click: starts MathMusic on http://localhost:5178 and opens it in the browser. Songs you save
rem go straight into my_songs\ (no folder dialog). Keep this window open while you play; close it to stop.
cd /d "%~dp0"
title MathMusic
where node >nul 2>nul || (echo MathMusic needs Node.js: https://nodejs.org & pause & exit /b 1)
node viz\serve.js --open
if errorlevel 1 pause
