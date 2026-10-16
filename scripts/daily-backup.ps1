# Daily backup of the Angular Physics production data to this machine.
# 1. Runs remote-backup.sh on the VPS (mongodump of the real databases,
#    tar of uploaded files, a copy of backend/.env).
# 2. Pulls the resulting folder down via scp into
#    C:\Users\gargg\angular-physics-backups\<date>\.
# 3. Keeps the local archive capped at the most recent 30 days.
# Logs each run (success or failure) to backup.log in the same folder, so a
# missed/failed run is visible without having to watch it happen live.

$ErrorActionPreference = 'Stop'

$sshKey = "$env:USERPROFILE\.ssh\angularphysics_vps"
$vpsHost = "deploy@62.72.13.83"
$localRoot = "$env:USERPROFILE\angular-physics-backups"
$logFile = Join-Path $localRoot 'backup.log'
$keepDays = 30

if (-not (Test-Path $localRoot)) { New-Item -ItemType Directory -Path $localRoot -Force | Out-Null }

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Add-Content -Path $logFile -Value $line
    Write-Output $line
}

try {
    Log "Starting backup run"

    # Don't merge stderr here (2>&1) — mongodump's progress spam goes to
    # stderr on the remote side and, merged, its interleaving with the one
    # real stdout line (the staged dir path) isn't reliably ordered. Left
    # unredirected, stderr just flows to the console/log normally and
    # $stdoutLines ends up holding only the real stdout line.
    $stdoutLines = & ssh -i $sshKey $vpsHost "/home/deploy/remote-backup.sh"
    if ($LASTEXITCODE -ne 0) { throw "remote-backup.sh exited $LASTEXITCODE" }
    $remoteStageDir = ($stdoutLines | Select-Object -Last 1).ToString().Trim()
    if (-not $remoteStageDir.StartsWith('/home/deploy/backups/')) {
        throw "Unexpected remote-backup.sh output: $remoteStageDir"
    }
    Log "Remote dump staged at $remoteStageDir"

    $stamp = Split-Path $remoteStageDir -Leaf
    $localDir = Join-Path $localRoot $stamp

    & scp -i $sshKey -r "${vpsHost}:${remoteStageDir}" $localDir
    if ($LASTEXITCODE -ne 0) { throw "scp failed with exit code $LASTEXITCODE" }

    $size = (Get-ChildItem -Recurse $localDir | Measure-Object -Property Length -Sum).Sum
    Log "Pulled backup to $localDir ($([math]::Round($size / 1MB, 1)) MB)"

    # Prune local backups older than $keepDays.
    $cutoff = (Get-Date).AddDays(-$keepDays)
    Get-ChildItem -Directory $localRoot | Where-Object {
        $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{6}$' -and $_.CreationTime -lt $cutoff
    } | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName
        Log "Pruned old backup $($_.Name)"
    }

    Log "Backup run complete"
}
catch {
    Log "BACKUP FAILED: $_"
    exit 1
}
