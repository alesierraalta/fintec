$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$AndroidHome = "C:\Users\ismar\AppData\Local\Android\Sdk"

Write-Host "Iniciando instalación manual de componentes Android SDK..." -ForegroundColor Cyan

# 1. Instalar Emulator
$EmulatorUrl = "https://dl.google.com/android/repository/emulator-windows_x64-14472402.zip"
$EmulatorZip = "$AndroidHome\emulator-temp.zip"
$EmulatorDest = "$AndroidHome"

Write-Host "Descargando Android Emulator..."
Invoke-WebRequest -Uri $EmulatorUrl -OutFile $EmulatorZip
Write-Host "Descarga completada. Extrayendo..."

if (Test-Path "$AndroidHome\emulator") {
    Rename-Item "$AndroidHome\emulator" "$AndroidHome\emulator-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

Expand-Archive -Path $EmulatorZip -DestinationPath $EmulatorDest -Force
Remove-Item $EmulatorZip
Write-Host "Emulator instalado en $AndroidHome\emulator" -ForegroundColor Green

# 2. Instalar System Image (Android 34 - UpsideDownCake, más estable que 36)
# Usamos API 34 porque 36 (Baklava) es muy nueva y puede ser inestable
$SysImgUrl = "https://dl.google.com/android/repository/sys-img/google_apis_playstore/x86_64-34_r14.zip"
$SysImgZip = "$AndroidHome\sys-img-temp.zip"
$SysImgParent = "$AndroidHome\system-images\android-34\google_apis_playstore"
$SysImgFinal = "$SysImgParent\x86_64"

# Crear estructura de carpetas
New-Item -ItemType Directory -Path $SysImgParent -Force | Out-Null

Write-Host "Descargando System Image (API 34)..."
Invoke-WebRequest -Uri $SysImgUrl -OutFile $SysImgZip
Write-Host "Descarga completada. Extrayendo..."

Expand-Archive -Path $SysImgZip -DestinationPath $SysImgParent -Force
Remove-Item $SysImgZip

# Mover contenido si se extrajo en una subcarpeta 'x86_64' (común en zips de Google)
if (Test-Path "$SysImgParent\x86_64\x86_64") {
    Move-Item -Path "$SysImgParent\x86_64\*" -Destination "$SysImgParent" -Force
    Remove-Item "$SysImgParent\x86_64" -Recurse -Force
}

Write-Host "System Image instalada en $SysImgParent" -ForegroundColor Green
Write-Host "INSTALACION COMPLETADA. Reinicia Android Studio." -ForegroundColor Cyan
