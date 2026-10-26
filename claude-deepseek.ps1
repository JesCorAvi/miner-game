# Traces of Rust - Lanzador de Claude Code con control horario DeepSeek
# No modifica la configuración ni las credenciales de Claude Code.
#
# Tarifa punta de DeepSeek (el doble de precio):
#   01:00-04:00 y 06:00-10:00 UTC, de lunes a viernes.
# Nota: los festivos chinos se facturan como valle; este script los ignora,
# así que en esos días puede avisar de más (error hacia el lado seguro).

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ClaudeArgs
)

$ErrorActionPreference = "Stop"

# --- Configuración -----------------------------------------------------------

$PeakWindows = @(
    @{ Start = [TimeSpan]::FromHours(1); End = [TimeSpan]::FromHours(4) },
    @{ Start = [TimeSpan]::FromHours(6); End = [TimeSpan]::FromHours(10) }
)

# --- Funciones ---------------------------------------------------------------

function Test-DeepSeekPeak {
    param([DateTime]$Utc)

    if ($Utc.DayOfWeek -in @([DayOfWeek]::Saturday, [DayOfWeek]::Sunday)) {
        return $false
    }

    $t = $Utc.TimeOfDay
    foreach ($w in $PeakWindows) {
        if ($t -ge $w.Start -and $t -lt $w.End) { return $true }
    }
    return $false
}

# Devuelve el próximo instante (UTC) en que cambia el estado punta/valle.
# Los cambios ocurren siempre en horas en punto.
function Get-NextChangeUtc {
    param([DateTime]$Utc)

    $state = Test-DeepSeekPeak $Utc
    $probe = $Utc.Date.AddHours($Utc.Hour + 1)

    for ($i = 0; $i -lt 24 * 8; $i++) {
        if ((Test-DeepSeekPeak $probe) -ne $state) { return $probe }
        $probe = $probe.AddHours(1)
    }
    return $null
}

function ConvertTo-SpainTime {
    param([DateTime]$Utc)
    $zone = [TimeZoneInfo]::FindSystemTimeZoneById("Romance Standard Time")
    return [TimeZoneInfo]::ConvertTimeFromUtc($Utc, $zone)
}

function Format-Remaining {
    param([TimeSpan]$Span)
    return "{0}h {1:00}min" -f [int][Math]::Floor($Span.TotalHours), $Span.Minutes
}

# --- Comprobaciones previas --------------------------------------------------

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "No se encuentra el comando 'claude' en el PATH." -ForegroundColor Red
    exit 1
}

# --- Control horario ---------------------------------------------------------

$utcNow    = [DateTime]::UtcNow
$spainNow  = ConvertTo-SpainTime $utcNow
$isPeak    = Test-DeepSeekPeak $utcNow
$nextUtc   = Get-NextChangeUtc $utcNow

Write-Host ""
Write-Host "=== TRACES OF RUST ===" -ForegroundColor Cyan
Write-Host ("Hora España: {0}" -f $spainNow.ToString("dd/MM/yyyy HH:mm:ss"))
Write-Host ("Hora UTC:    {0}" -f $utcNow.ToString("HH:mm:ss"))
Write-Host ""

if ($isPeak) {
    Write-Host "AVISO: DEEPSEEK ESTÁ EN HORARIO CARO" -ForegroundColor Red
    Write-Host "Las peticiones a la API cuestan el doble."
    if ($nextUtc) {
        $end = ConvertTo-SpainTime $nextUtc
        Write-Host ("La tarifa normal vuelve el {0} a las {1} (hora España)." -f `
            $end.ToString("dd/MM"), $end.ToString("HH:mm"))
        Write-Host ("Tiempo restante de tarifa cara: {0}" -f `
            (Format-Remaining ($nextUtc - $utcNow))) -ForegroundColor Yellow
    }
    Write-Host ""

    $answer = (Read-Host "¿Quieres iniciar Claude Code igualmente? (s/N)").Trim()

    if ($answer -notmatch '^(s|si|sí)$') {
        Write-Host "Inicio cancelado. No se ha ejecutado Claude Code." `
            -ForegroundColor Yellow
        exit 0
    }
}
else {
    Write-Host "Horario valle de DeepSeek (tarifa normal)." -ForegroundColor Green
    if ($nextUtc) {
        $start = ConvertTo-SpainTime $nextUtc
        Write-Host ("Próxima tarifa cara: {0} a las {1} (hora España)." -f `
            $start.ToString("dd/MM"), $start.ToString("HH:mm"))

        $remaining = $nextUtc - $utcNow
        if ($remaining -lt [TimeSpan]::FromHours(1)) {
            Write-Host ("Quedan {0} de tarifa normal." -f `
                (Format-Remaining $remaining)) -ForegroundColor Red
            Write-Host "AVISO: ¡Queda menos de una hora para que empiece la tarifa cara!" `
                -ForegroundColor Red
        }
        else {
            Write-Host ("Quedan {0} de tarifa normal." -f `
                (Format-Remaining $remaining)) -ForegroundColor Green
        }
    }
}

# --- Lanzamiento -------------------------------------------------------------

Write-Host ""
Set-Location $PSScriptRoot

# Ejecutar Claude desde la raíz del proyecto y propagar su código de salida.
& claude @ClaudeArgs
exit $LASTEXITCODE