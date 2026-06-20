@echo off
cd /d "%~dp0"
echo.
echo  Unicorn Train - local server
echo  Open in your browser:  http://127.0.0.1:8765
echo.
echo  Press Ctrl+C to stop.
echo.
python -m http.server 8765 --bind 127.0.0.1 --directory "%~dp0"
