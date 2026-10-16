# One-time setup for Thai quake alerts (docs/quake-alerts.md). Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-quake-alerts.ps1
# You paste the Supabase URL + service key (hidden input); the script makes the VAPID keys and writes them
# where they belong. Secrets go only to: .env.local, workers\quake-alert\.env (both git-ignored) and Vercel.
# Safe to re-run: keys already present are kept (a new VAPID pair would break every existing subscription).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$worker = Join-Path $root "workers\quake-alert"
$envLocal = Join-Path $root ".env.local"
$workerEnv = Join-Path $worker ".env"
$utf8 = New-Object System.Text.UTF8Encoding $false

function Read-EnvFile($path) {
  $map = [ordered]@{}
  if (Test-Path $path) {
    foreach ($line in [IO.File]::ReadAllLines($path)) {
      if ($line -match '^\s*([A-Z0-9_]+)=(.*)$' -and $Matches[2] -ne "") { $map[$Matches[1]] = $Matches[2] }
    }
  }
  return $map
}

function Set-EnvLines($path, $values) {
  $lines = @()
  if (Test-Path $path) { $lines = [IO.File]::ReadAllLines($path) }
  foreach ($k in $values.Keys) {
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match "^\s*$k=") { $lines[$i] = "$k=$($values[$k])"; $found = $true }
    }
    if (-not $found) { $lines += "$k=$($values[$k])" }
  }
  [IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), $utf8)
}

function Read-Secret($prompt) {
  $s = Read-Host $prompt -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

Write-Host "`n== 1/4 Supabase ==" -ForegroundColor Cyan
$have = Read-EnvFile $workerEnv
$local = Read-EnvFile $envLocal
$url = if ($have["SUPABASE_URL"]) { $have["SUPABASE_URL"] } else { $local["SUPABASE_URL"] }
$key = if ($have["SUPABASE_SERVICE_KEY"]) { $have["SUPABASE_SERVICE_KEY"] } else { $local["SUPABASE_SERVICE_KEY"] }
if (-not $url) {
  Write-Host "Supabase > Project Settings > API Keys: copy a Secret key (sb_secret_...) or the legacy service_role key."
  $url = (Read-Host "Project URL (https://xxxx.supabase.co)").Trim().TrimEnd("/")
}
if ($url -notmatch '^https://[a-z0-9]+\.supabase\.co$') { throw "That does not look like a Supabase project URL: $url" }
if (-not $key) { $key = (Read-Secret "secret key (hidden)").Trim() }
if ($key.Length -lt 20) { throw "service_role key looks too short" }
Write-Host "OK  $url"

Write-Host "`n== 2/4 VAPID keys ==" -ForegroundColor Cyan
if ($have["VAPID_PUBLIC_KEY"] -and $have["VAPID_PRIVATE_KEY"]) {
  $vapidPublic = $have["VAPID_PUBLIC_KEY"]; $vapidPrivate = $have["VAPID_PRIVATE_KEY"]
  Write-Host "Kept the existing pair (changing it would cancel every subscription)."
} else {
  Push-Location $worker
  try {
    if (-not (Test-Path "node_modules\web-push")) { npm install --no-audit --no-fund | Out-Null }
    $pair = (npx --no-install web-push generate-vapid-keys --json) | ConvertFrom-Json
  } finally { Pop-Location }
  $vapidPublic = $pair.publicKey; $vapidPrivate = $pair.privateKey
  Write-Host "Made a new pair. The private key stays in workers\quake-alert\.env only - back it up (password manager)."
}
$subject = if ($have["VAPID_SUBJECT"]) { $have["VAPID_SUBJECT"] } else {
  $mail = (Read-Host "Contact e-mail for push services (Apple/Google may write if something breaks)").Trim()
  "mailto:$mail"
}

Write-Host "`n== 3/4 Writing env files ==" -ForegroundColor Cyan
Set-EnvLines $workerEnv ([ordered]@{
  SUPABASE_URL = $url; SUPABASE_SERVICE_KEY = $key
  VAPID_PUBLIC_KEY = $vapidPublic; VAPID_PRIVATE_KEY = $vapidPrivate; VAPID_SUBJECT = $subject
})
Set-EnvLines $envLocal ([ordered]@{ SUPABASE_URL = $url; SUPABASE_SERVICE_KEY = $key; VAPID_PUBLIC_KEY = $vapidPublic })
Write-Host "OK  workers\quake-alert\.env (5 keys), .env.local (3 keys)"

Write-Host "`n== 4/4 Vercel (production) ==" -ForegroundColor Cyan
Push-Location $root
# Windows PowerShell 5.1 turns the CLI's progress text on stderr ("Retrieving project...") into a
# terminating error under "Stop" — judge the vercel calls by exit code instead
$ErrorActionPreference = "Continue"
try {
  $existing = (vercel env ls production 2>$null) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "vercel env ls failed - run 'vercel login' and 'vercel link' in the repo, then re-run" }
  foreach ($kv in @(@("SUPABASE_URL", $url, $false), @("SUPABASE_SERVICE_KEY", $key, $true), @("VAPID_PUBLIC_KEY", $vapidPublic, $false))) {
    if ($existing -match "(?m)^\s*$($kv[0])\s") { Write-Host "skip $($kv[0]) (already on Vercel)"; continue }
    $flags = @("env", "add", $kv[0], "production", "--value", $kv[1], "--yes")
    if ($kv[2]) { $flags += "--sensitive" }
    vercel @flags 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "vercel env add $($kv[0]) failed" }
    Write-Host "added $($kv[0])"
  }
} finally { Pop-Location; $ErrorActionPreference = "Stop" }

Write-Host "`n== Check: does the push_subscriptions table exist? ==" -ForegroundColor Cyan
$headers = @{ apikey = $key }
if ($key.StartsWith("eyJ")) { $headers["Authorization"] = "Bearer $key" }  # legacy service_role JWT
try {
  Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri "$url/rest/v1/push_subscriptions?select=endpoint&limit=1" | Out-Null
  Write-Host "OK  table is there." -ForegroundColor Green
} catch {
  $ref = ([Uri]$url).Host.Split(".")[0]
  Get-Content (Join-Path $root "supabase\schema.sql") -Raw | Set-Clipboard
  Write-Host "Table missing. supabase\schema.sql is now on your clipboard:" -ForegroundColor Yellow
  Write-Host "  paste it in the SQL editor that just opened, press Run, then run this script again."
  Start-Process "https://supabase.com/dashboard/project/$ref/sql/new"
  exit 1
}

Write-Host "`nDone. Next:" -ForegroundColor Green
Write-Host "  1. git push (Vercel redeploys with the new env) -> the alert button appears in the trip safety card"
Write-Host "  2. on the worker machine: copy workers\quake-alert\.env there, then: npm install; npm start"
