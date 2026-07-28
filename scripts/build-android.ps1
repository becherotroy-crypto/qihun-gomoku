param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('assembleDebug', 'bundleRelease')]
  [string]$Task
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'

$javaCandidates = @($env:JAVA_HOME)
if (Test-Path -LiteralPath 'C:\Program Files\Eclipse Adoptium') {
  $javaCandidates += Get-ChildItem -LiteralPath 'C:\Program Files\Eclipse Adoptium' -Directory |
    Sort-Object Name -Descending |
    ForEach-Object FullName
}

$javaHome = $null
foreach ($candidate in $javaCandidates | Where-Object { $_ }) {
  $javaExecutable = Join-Path $candidate 'bin\java.exe'
  $javaReleaseFile = Join-Path $candidate 'release'
  if (-not (Test-Path -LiteralPath $javaExecutable) -or -not (Test-Path -LiteralPath $javaReleaseFile)) {
    continue
  }

  $javaRelease = Get-Content -Raw -LiteralPath $javaReleaseFile
  if ($javaRelease -match 'JAVA_VERSION="21\.') {
    $javaHome = $candidate
    break
  }
}

if (-not $javaHome) {
  throw 'JDK 21 is required. Install it and set JAVA_HOME before building Android.'
}

$sdkCandidates = @(
  $env:ANDROID_SDK_ROOT,
  $env:ANDROID_HOME,
  (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
)
$androidSdk = $sdkCandidates |
  Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'platforms\android-35')) } |
  Select-Object -First 1

if (-not $androidSdk) {
  throw 'Android SDK Platform 35 is required. Install it with Android Studio SDK Manager.'
}

if ($Task -eq 'bundleRelease' -and -not (Test-Path -LiteralPath (Join-Path $androidRoot 'keystore.properties'))) {
  throw 'Release signing is not configured. Copy android/keystore.properties.example to android/keystore.properties and create an upload key first.'
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_SDK_ROOT = $androidSdk
$env:GRADLE_USER_HOME = Join-Path $env:LOCALAPPDATA 'QihunGomoku\gradle'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:Path"

Push-Location $projectRoot
try {
  & pnpm run android:sync
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Push-Location $androidRoot
  try {
    & .\gradlew.bat --no-daemon --max-workers=1 $Task
    $gradleExitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}

exit $gradleExitCode
