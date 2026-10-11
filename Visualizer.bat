@echo off
rem Double-click: rebuilds "MathMusic Live.html" with all songs and opens it. Nothing needs to stay open.
cd /d "%~dp0"
node viz\build.js >nul
start "" "MathMusic Live.html"
