# Servidor HTTP estático para Windows — alternativa a `npm run serve` (python3)
# Uso: .\serve.ps1
# Luego abrir: http://localhost:8080/  o  http://localhost:8080/tests/tests.html

$port      = 8080
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "=========================================================="
    Write-Host "  Ficha D&D 5e — servidor local iniciado"
    Write-Host "  App:    http://localhost:$port/"
    Write-Host "  Tests:  http://localhost:$port/tests/tests.html"
    Write-Host "  Raiz:   $workspace"
    Write-Host "  Ctrl+C para detener"
    Write-Host "=========================================================="
} catch {
    Write-Host "Error al iniciar el servidor en puerto $port`: $_"
    exit 1
}

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req     = $context.Request
        $res     = $context.Response

        $localPath = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($localPath)) { $localPath = 'index.html' }

        $filePath = Join-Path $workspace $localPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext   = [System.IO.Path]::GetExtension($filePath).ToLower()
            $res.ContentType    = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 - $localPath no encontrado")
            $res.ContentType     = 'text/plain; charset=utf-8'
            $res.ContentLength64 = $err.Length
            $res.OutputStream.Write($err, 0, $err.Length)
        }
    } catch { }
    finally {
        try { $context.Response.Close() } catch { }
    }
}
