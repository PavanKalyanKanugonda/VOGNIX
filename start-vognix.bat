@echo off
setlocal
title VOGNIX Full-Stack Launcher

set "ROOT=%~dp0"
set "JAVA17=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\java.exe"
if exist "%JAVA17%" (
    set "JAVA_CMD=%JAVA17%"
) else (
    set "JAVA_CMD=java"
)

echo ==================================================
echo   Starting VOGNIX Fashion E-Commerce Platform
echo   Backend : http://localhost:8080
echo   Frontend: http://localhost:5173
echo   Swagger : http://localhost:8080/swagger-ui.html
echo ==================================================

start "VOGNIX Backend (Spring Boot :8080)" cmd /k "cd /d "%ROOT%backend" && "%JAVA_CMD%" -jar target\vognix-backend-1.0.0.jar"
timeout /t 4 /nobreak >nul
start "VOGNIX Frontend (React Vite :5173)" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Both servers launched in separate terminal windows.
endlocal
