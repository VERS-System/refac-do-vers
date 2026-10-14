@echo off
rem Sobe as APIs e Redis pelo Compose do projeto, preservando falhas do Docker.
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
where docker >nul 2>&1
if errorlevel 1 (
    echo Docker nao encontrado. Instale e abra o Docker Desktop.
    goto failure
)
call docker compose version >nul 2>&1
if errorlevel 1 goto failure
call docker info >nul 2>&1
if errorlevel 1 (
    echo Docker indisponivel. Abra o Docker Desktop com containers Linux.
    goto failure
)
echo Construindo e iniciando backend, ai-service e Redis...
call docker compose -f docker-compose.yml up --build -d redis backend ai-service
if errorlevel 1 goto failure
call docker compose -f docker-compose.yml ps redis backend ai-service
if errorlevel 1 goto failure
echo.
echo Backend: http://localhost:3000/api/v1
echo IA:      http://localhost:8000/docs
echo Logs: docker compose logs -f backend ai-service
echo Parar: docker compose stop backend ai-service redis
popd
pause
exit /b 0

:failure
rem Guarda o erro antes de exibir instrucoes ou restaurar o diretorio.
set "apiExitCode=%errorlevel%"
if "%apiExitCode%"=="0" set "apiExitCode=1"
echo Falha ao iniciar as APIs. Confira o Docker e a configuracao local descrita em .env.example.
popd
pause
exit /b %apiExitCode%
