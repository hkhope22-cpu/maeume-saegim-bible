$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "dist"))
if (-not $distRoot.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Unsafe dist path."
}

if (Test-Path -LiteralPath $distRoot) { Remove-Item -LiteralPath $distRoot -Recurse -Force }
$clientRoot = Join-Path $distRoot "client"
$serverRoot = Join-Path $distRoot "server"
New-Item -ItemType Directory -Force -Path $clientRoot, $serverRoot | Out-Null

foreach ($file in @("index.html", "app.js", "styles.css", "favicon.svg", "robots.txt")) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $clientRoot $file)
}
if (Test-Path -LiteralPath (Join-Path $projectRoot "social-card.png")) {
  Copy-Item -LiteralPath (Join-Path $projectRoot "social-card.png") -Destination (Join-Path $clientRoot "social-card.png")
}
Copy-Item -LiteralPath (Join-Path $projectRoot "data") -Destination $clientRoot -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "site-worker.js") -Destination (Join-Path $serverRoot "index.js")

$dataPath = Join-Path $clientRoot "data\kor1910.json"
$stream = [System.IO.File]::OpenRead($dataPath)
try {
  $buffer = New-Object byte[] 1024
  $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
  $metadataHeader = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
} finally {
  $stream.Dispose()
}
if ($metadataHeader -notmatch '"license":"Public Domain"' -or $metadataHeader -notmatch '"bookCount":66' -or $metadataHeader -notmatch '"verseCount":(\d+)') {
  throw "Public Bible validation failed."
}
$verseCount = [int]$Matches[1]
Write-Host "Site build ready: 66 books, $verseCount verses."
