@echo off
rem Inicia o Expo no projeto mobile, mesmo quando chamado de outra pasta.
setlocal
pushd "%~dp0services\mobile" || exit /b 1
set "EXPO_NO_DOTENV=1"
call pnpm.cmd exec expo start --clear %*
set "mobile_exit_code=%errorlevel%"
popd
exit /b %mobile_exit_code%
