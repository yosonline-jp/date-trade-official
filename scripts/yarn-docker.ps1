# Run Yarn in the project's Docker environment, without a Windows Node.js install.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $YarnArguments
)

$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $PSScriptRoot
$dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
$dockerExecutable = if ($dockerCommand) { $dockerCommand.Source } else {
    Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"
}
if (-not (Test-Path -LiteralPath $dockerExecutable)) {
    throw "Docker Desktop was not found. Install and start Docker Desktop first."
}
if (-not $YarnArguments) { $YarnArguments = @("--version") }
& $dockerExecutable compose --project-directory $projectDirectory exec -T app yarn @YarnArguments
exit $LASTEXITCODE
