# Collect fresh flight prices and publish them to nagame.vercel.app (run on the owner's PC).
# Close any Chrome window that uses D:\TT\nagame-workers\chrome-cdp-profile first.
# Daily schedule (run once in PowerShell as the owner):
#   schtasks /Create /SC DAILY /ST 07:30 /TN "Nagame flight prices" /TR "powershell -ExecutionPolicy Bypass -File D:\TT\nagame\workers\flight-prices\run.ps1"

$ErrorActionPreference = "Stop"
Set-Location D:\TT\nagame
node workers/flight-prices/collect.mjs --months=6 --gap=20
if ($LASTEXITCODE -ne 0) {
  Write-Host "Collection stopped (blocked or no results). The previous prices stay online."
  exit $LASTEXITCODE
}
git add data/flights/snapshot.json
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host "No price changes."; exit 0 }
git commit -m "data(flights): price snapshot $(Get-Date -Format yyyy-MM-dd)"
git push origin main
