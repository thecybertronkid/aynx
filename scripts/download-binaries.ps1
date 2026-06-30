$binDir = "E:\SABLE 2.0\resources\bin"
If (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }

$ytdlpPath = Join-Path $binDir "yt-dlp.exe"
If (!(Test-Path $ytdlpPath)) {
    Write-Host "Downloading yt-dlp.exe..."
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytdlpPath
} Else {
    Write-Host "yt-dlp.exe already exists, skipping."
}

$zipPath = "E:\SABLE 2.0\temp_ffmpeg.zip"
$extractPath = "E:\SABLE 2.0\temp_ffmpeg_extract"

Write-Host "Downloading ffmpeg release Essentials..."
$ffmpegUri = "https://github.com/GyanD/codexffmpeg/releases/download/7.0.1/ffmpeg-7.0.1-essentials_build.zip"

If (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Invoke-WebRequest -Uri $ffmpegUri -OutFile $zipPath

Write-Host "Extracting ffmpeg zip..."
If (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force | Out-Null }
New-Item -ItemType Directory -Path $extractPath | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Locating ffmpeg and ffprobe..."
$ffmpegFile = Get-ChildItem -Path $extractPath -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
$ffprobeFile = Get-ChildItem -Path $extractPath -Filter "ffprobe.exe" -Recurse | Select-Object -First 1

If ($ffmpegFile -and $ffprobeFile) {
    Copy-Item $ffmpegFile.FullName (Join-Path $binDir "ffmpeg.exe") -Force
    Copy-Item $ffprobeFile.FullName (Join-Path $binDir "ffprobe.exe") -Force
    Write-Host "FFmpeg binaries successfully copied!"
} Else {
    Write-Error "Could not find ffmpeg.exe or ffprobe.exe in the extracted archive."
}

Write-Host "Cleaning up temporary files..."
Remove-Item $zipPath -Force
Remove-Item $extractPath -Recurse -Force
Write-Host "Finished!"
