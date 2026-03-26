param(
    [int]$Port = 5055
)

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path $PSScriptRoot -Parent
$logPath = Join-Path $rootDir 'qa-artifacts\mock-provider-requests.jsonl'

New-Item -ItemType Directory -Force -Path (Split-Path $logPath -Parent) | Out-Null
if (-not (Test-Path $logPath)) {
    New-Item -ItemType File -Path $logPath | Out-Null
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "[mock-provider] Listening on http://127.0.0.1:$Port/"
Write-Host "[mock-provider] Logging to $logPath"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $reader = [System.IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
        $body = $reader.ReadToEnd()
        $reader.Dispose()

        $entry = [ordered]@{
            timestamp = (Get-Date).ToString('o')
            method = $request.HttpMethod
            rawUrl = $request.RawUrl
            userAgent = $request.UserAgent
            body = $body
        }
        Add-Content -Path $logPath -Value (($entry | ConvertTo-Json -Compress))

        $statusCode = if ($request.RawUrl -match '^/fail') { 500 } else { 200 }
        $payload = if ($request.RawUrl -eq '/health') {
            @{ ok = $true; status = 'healthy' }
        } elseif ($statusCode -ge 500) {
            @{ ok = $false; error = 'mock provider forced failure' }
        } else {
            @{ ok = $true; messageId = "mock-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" }
        }

        $json = ($payload | ConvertTo-Json -Compress)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.StatusCode = $statusCode
        $response.ContentType = 'application/json'
        $response.ContentEncoding = [System.Text.Encoding]::UTF8
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.OutputStream.Close()
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
