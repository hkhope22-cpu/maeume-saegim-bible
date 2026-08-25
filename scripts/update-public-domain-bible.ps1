param(
  [string]$ArchivePath = "",
  [string]$SourceUrl = "https://ebible.org/Scriptures/kor_vpl.zip",
  [string]$OutputPath = "data/kor1910.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputFile = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))
if (-not $outputFile.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "OutputPath must stay inside the project directory."
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("maeume-saegim-kor1910-" + [guid]::NewGuid().ToString("N"))
$archiveFile = Join-Path $temporaryRoot "kor_vpl.zip"
$expandedRoot = Join-Path $temporaryRoot "expanded"

$bookOrder = @(
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SOL", "ISA", "JER", "LAM", "EZE", "DAN", "HOS", "JOE", "AMO", "OBA", "JON", "MIC", "NAH", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MAR", "LUK", "JOH", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHI", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAM", "1PE", "2PE", "1JO", "2JO", "3JO", "JUD", "REV"
)

try {
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  if ($ArchivePath) {
    $resolvedArchive = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $ArchivePath))
    Copy-Item -LiteralPath $resolvedArchive -Destination $archiveFile
  } else {
    $rightsPage = Invoke-WebRequest -Uri "https://ebible.org/find/details.php?id=kor"
    if ($rightsPage.Content -notmatch '(?i)public\s+domain') {
      throw "The official source page no longer identifies the Korean Bible 1910 as Public Domain. Update cancelled."
    }
    Write-Host "Downloading the public-domain Korean Bible from eBible.org..."
    Invoke-WebRequest -Uri $SourceUrl -OutFile $archiveFile
  }

  Expand-Archive -LiteralPath $archiveFile -DestinationPath $expandedRoot
  $verseFile = Join-Path $expandedRoot "kor_vpl.txt"
  if (-not (Test-Path -LiteralPath $verseFile)) {
    throw "kor_vpl.txt was not found in the downloaded archive."
  }

  $rawBooks = @{}
  foreach ($bookCode in $bookOrder) { $rawBooks[$bookCode] = @{} }
  $verseCount = 0

  foreach ($line in [System.IO.File]::ReadLines($verseFile, [System.Text.Encoding]::UTF8)) {
    if ($line -notmatch '^([1-3]?[A-Z]{2,3})\s+(\d+):(\d+)\s+(.+)$') { continue }
    $book = $Matches[1]
    $chapter = [int]$Matches[2]
    $verse = [int]$Matches[3]
    $text = $Matches[4].Trim()
    if (-not $rawBooks.ContainsKey($book)) { continue }
    if (-not $rawBooks[$book].ContainsKey($chapter)) { $rawBooks[$book][$chapter] = @{} }
    $rawBooks[$book][$chapter][$verse] = $text
    $verseCount += 1
  }

  $books = [ordered]@{}
  foreach ($bookCode in $bookOrder) {
    $chapters = [System.Collections.ArrayList]::new()
    foreach ($chapterNumber in ($rawBooks[$bookCode].Keys | Sort-Object)) {
      $verses = [System.Collections.ArrayList]::new()
      foreach ($verseNumber in ($rawBooks[$bookCode][$chapterNumber].Keys | Sort-Object)) {
        [void]$verses.Add($rawBooks[$bookCode][$chapterNumber][$verseNumber])
      }
      [void]$chapters.Add($verses.ToArray())
    }
    $books[$bookCode] = $chapters.ToArray()
  }
  if ($verseCount -lt 30000 -or ($books.Keys | Where-Object { $books[$_].Count -eq 0 }).Count -gt 0) {
    throw "The downloaded Bible is incomplete. Update cancelled."
  }

  $payload = [ordered]@{
    meta = [ordered]@{
      id = "kor1910"
      title = "한국어 성경"
      shortTitle = "한국어 성경 1910"
      language = "ko"
      year = 1910
      license = "Public Domain"
      sourceName = "eBible.org"
      sourceUrl = "https://ebible.org/find/details.php?id=kor"
      downloadUrl = $SourceUrl
      generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      bookCount = $bookOrder.Count
      verseCount = $verseCount
    }
    books = $books
  }

  $outputDirectory = Split-Path $outputFile -Parent
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  $json = $payload | ConvertTo-Json -Depth 8 -Compress
  [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Wrote $verseCount verses from $($bookOrder.Count) books to $outputFile"
} finally {
  $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
  $resolvedSystemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedTemporaryRoot.StartsWith($resolvedSystemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemporaryRoot)) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
  }
}
