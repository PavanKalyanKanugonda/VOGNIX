@echo off
setlocal EnableDelayedExpansion
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

if not exist "%ROOT%backend\target\vognix-backend-1.0.0.jar" (
    echo [INFO] Backend JAR missing. Building backend package...
    pushd "%ROOT%backend"
    call mvn -B -DskipTests package
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to build backend JAR.
        pause
        exit /b 1
    )
    popd
)

if not exist "%ROOT%frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    pushd "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    popd
)

netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Backend is already listening on port 8080; reusing active instance to avoid database locks.
) else (
    start "VOGNIX Backend (Spring Boot :8080)" cmd /k "cd /d "%ROOT%backend" && "%JAVA_CMD%" -jar target\vognix-backend-1.0.0.jar"
    echo [INFO] Waiting for backend API on http://127.0.0.1:8080 ...
    powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080/api/categories' -TimeoutSec 2; if($r.StatusCode -eq 200){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if($ready){ Write-Host '[OK] Backend API is ready.' } else { Write-Host '[WARN] Backend still starting up; continuing launch...' }"
)

netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Frontend dev server is already listening on port 5173.
) else (
    start "VOGNIX Frontend (React Vite :5173)" cmd /k "cd /d "%ROOT%frontend" && npm run dev"
)

echo VOGNIX servers are ready. Open http://localhost:5173 in your browser.
endlocal
