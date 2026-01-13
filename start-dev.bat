@echo off
set PATH=%~dp0nodejs;%PATH%
cd /d "%~dp0"
node nodejs\node_modules\npm\bin\npm-cli.js run dev
