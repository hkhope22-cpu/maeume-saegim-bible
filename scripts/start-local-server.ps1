param([int]$Port = 4173)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
}

function Write-HttpResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [byte[]]$Body,
    [string]$ContentType,
    [bool]$HeadOnly = $false
  )
  $headers = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

try {
  $listener.Start()
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { continue }
      while (($headerLine = $reader.ReadLine()) -ne $null -and $headerLine -ne "") { }

      $parts = $requestLine.Split(" ")
      if ($parts.Length -lt 2 -or $parts[0] -notin @("GET", "HEAD")) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
        Write-HttpResponse -Stream $stream -StatusCode 405 -StatusText "Method Not Allowed" -Body $body -ContentType "text/plain; charset=utf-8"
        continue
      }

      $requestPath = [System.Uri]::UnescapeDataString(($parts[1] -split "\?")[0]).TrimStart("/")
      if (-not $requestPath) { $requestPath = "index.html" }
      $targetPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $requestPath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)))
      if (-not $targetPath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        Write-HttpResponse -Stream $stream -StatusCode 404 -StatusText "Not Found" -Body $body -ContentType "text/plain; charset=utf-8" -HeadOnly ($parts[0] -eq "HEAD")
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($targetPath)
      $extension = [System.IO.Path]::GetExtension($targetPath).ToLowerInvariant()
      $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
      Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -Body $body -ContentType $contentType -HeadOnly ($parts[0] -eq "HEAD")
    } catch {
      # A malformed or cancelled browser request should not stop the local server.
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
