# Genera autocontenido/index.html a partir de separado/ (index.html + style.css + script.js).
# Uso (desde PowerShell, en la carpeta mi-entrega-utm):  .\generar-autocontenido.ps1
$raiz = $PSScriptRoot
$html = [IO.File]::ReadAllText("$raiz\separado\index.html")
$css  = [IO.File]::ReadAllText("$raiz\separado\style.css")
$js   = [IO.File]::ReadAllText("$raiz\separado\script.js")

# Se usa .Replace (texto literal) para que los símbolos $ del JS no se interpreten.
$html = $html.Replace('<link rel="stylesheet" href="style.css">', "<style>`n$css</style>")
$html = $html.Replace('<script src="script.js"></script>', "<script>`n$js</script>")

New-Item -ItemType Directory -Force "$raiz\autocontenido" | Out-Null
[IO.File]::WriteAllText("$raiz\autocontenido\index.html", $html)
Write-Output "Listo: autocontenido\index.html"
