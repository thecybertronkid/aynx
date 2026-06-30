$cacheDir = "C:\Users\ayanc\AppData\Local\electron-builder\Cache\winCodeSign"
$zipExe = "E:\SABLE 2.0\node_modules\.pnpm\7zip-bin@5.2.0\node_modules\7zip-bin\win\x64\7za.exe"

If (!(Test-Path $cacheDir)) {
    Write-Host "Cache directory does not exist yet."
    Exit 0
}

Get-ChildItem -Path $cacheDir -Filter "*.7z" | ForEach-Object {
    $zipPath = $_.FullName
    $destDir = Join-Path $cacheDir $_.BaseName

    Write-Host "Processing archive: $_.Name"
    
    # Extract excluding darwin folder (to prevent privilege/symlink errors)
    & $zipExe x -bd -y $zipPath "-o$destDir" -xr!darwin
    
    # Create a dummy darwin folder structure just in case electron-builder expects the folders to exist
    $dummyDarwinLib = Join-Path $destDir "darwin/10.12/lib"
    New-Item -ItemType Directory -Path $dummyDarwinLib -Force | Out-Null
    
    # Create empty dummy files for the symlinks to prevent missing file warnings
    New-Item -ItemType File -Path (Join-Path $dummyDarwinLib "libcrypto.dylib") -Force | Out-Null
    New-Item -ItemType File -Path (Join-Path $dummyDarwinLib "libssl.dylib") -Force | Out-Null
    
    Write-Host "Successfully extracted and patched: $destDir"
}
