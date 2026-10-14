# Verifica o launcher com Docker simulado, sem subir containers ou acessar .env.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $projectRoot 'rodar-apis.bat'
if (-not (Test-Path -LiteralPath $launcher)) { throw 'Launcher ausente' }
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('vers-apis-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $testRoot | Out-Null
$mock = @'
@echo off
echo %*>>"%VERS_DOCKER_TEST_LOG%"
if "%VERS_DOCKER_TEST_FAIL%"=="daemon" if "%1"=="info" exit /b 7
if "%VERS_DOCKER_TEST_FAIL%"=="compose" if "%2"=="version" exit /b 8
if "%VERS_DOCKER_TEST_FAIL%"=="build" if "%4"=="up" exit /b 9
echo cwd=%CD%>>"%VERS_DOCKER_TEST_LOG%"
exit /b 0
'@
[IO.File]::WriteAllText((Join-Path $testRoot 'docker.bat'), $mock)
$previousPath = $env:PATH
$previousFail = $env:VERS_DOCKER_TEST_FAIL
$previousLog = $env:VERS_DOCKER_TEST_LOG
try {
    $env:PATH = "$testRoot;$previousPath"
    $env:VERS_DOCKER_TEST_LOG = Join-Path $testRoot 'calls.txt'
    foreach ($scenario in @('success', 'daemon', 'compose', 'build')) {
        $env:VERS_DOCKER_TEST_FAIL = $scenario
        [IO.File]::WriteAllText($env:VERS_DOCKER_TEST_LOG, '')
        & cmd.exe /d /c "call `"$launcher`" <NUL" | Out-Null
        $code = $LASTEXITCODE
        $calls = [IO.File]::ReadAllText($env:VERS_DOCKER_TEST_LOG)
        if ($scenario -eq 'success') {
            if ($code -ne 0 -or $calls -notmatch 'up --build -d redis backend ai-service') { throw 'Subida incorreta' }
            if (-not $calls.Contains("cwd=$projectRoot")) { throw 'Diretorio do projeto incorreto' }
            if ($calls -match '\b(web|dashboard|mobile)\b') { throw 'Front incluido indevidamente' }
        } else {
            $expected = @{ daemon = 7; compose = 8; build = 9 }[$scenario]
            if ($code -ne $expected) { throw "Falha $scenario perdeu exit code: $code" }
            if ($scenario -ne 'build' -and $calls -match 'up --build') { throw 'Subiu apos preflight falhar' }
            if ($calls -match '\bps\b') { throw 'Consultou sucesso apos falha' }
        }
    }
    Write-Output 'Launcher: sucesso, diretorio com espacos e tres falhas verificados.'
} finally {
    $env:PATH = $previousPath
    $env:VERS_DOCKER_TEST_FAIL = $previousFail
    $env:VERS_DOCKER_TEST_LOG = $previousLog
}
