@echo off
cd /d %~dp0
node scripts\setup.js
start "" http://127.0.0.1:5178
node server.js
pause
