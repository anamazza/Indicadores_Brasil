# Publica os paineis: um comando para montar, comparar, verificar, commitar e enviar.
#
#   .\publicar.ps1                       monta os 4 paineis, relatorio de diferencas, verifica, commit na main e push
#   .\publicar.ps1 -PullRequest          idem, mas em branch atualizacao-<data> (abre o link do pull request no fim)
#   .\publicar.ps1 -SemMontar            nao roda os montar_painel.py (usa o que ja esta espelhado)
#   .\publicar.ps1 -Mensagem "..."       mensagem do commit
#
# Os scripts de dados de cada pipeline (build_dados.py etc.) continuam sendo rodados antes, na pasta de trabalho,
# quando ha dado novo; este script cuida do "ultimo quilometro". Exige Python 3.12 ("py -3.12") e git.
param(
    [switch]$PullRequest,
    [switch]$SemMontar,
    [string]$Mensagem = ""
)
$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot
$docs = Split-Path -Parent $repo

function Falha($msg) { Write-Host "ERRO: $msg" -ForegroundColor Red; exit 1 }
function Etapa($msg) { Write-Host ""; Write-Host "== $msg" -ForegroundColor Cyan }

# pastas de trabalho (curingas evitam problemas de acentuacao no nome das pastas)
$trabalho = [ordered]@{
    nascimentos = "Pojeto Apresenta*es NV_2026\Painel_2026_Novo"
    internacao  = "Projeto Apresenta*es Interna*o\Painel_Internacao"
    mortalidade = "Mortalidade Indicadores\Painel_Mortalidade"
}

Etapa "git pull (resgata o CNES atualizado na nuvem)"
Set-Location $repo
git pull --ff-only
if ($LASTEXITCODE -ne 0) { Falha "git pull falhou (ha alteracoes locais em conflito?)" }

if (-not $SemMontar) {
    foreach ($p in $trabalho.Keys) {
        Etapa "montar_painel.py de $p"
        $pasta = Get-Item -Path (Join-Path $docs $trabalho[$p]) -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -eq $pasta) { Falha "pasta de trabalho de $p nao encontrada em $docs" }
        Push-Location $pasta.FullName
        py -3.12 montar_painel.py
        $rc = $LASTEXITCODE
        Pop-Location
        if ($rc -ne 0) { Falha "montar_painel.py de $p falhou" }
    }
    # painel de habilitacoes (29/10/2026): vive no repositorio e consolida os tres paineis ja espelhados
    Etapa "montar_painel.py de habilitacoes"
    py -3.12 (Join-Path $repo "habilitacoes\montar_painel.py")
    if ($LASTEXITCODE -ne 0) { Falha "montar_painel.py de habilitacoes falhou" }
}

Etapa "relatorio de diferencas em relacao ao publicado"
Set-Location $repo
py -3.12 relatorio_diferencas.py
if ($LASTEXITCODE -ne 0) { Falha "relatorio_diferencas.py falhou" }

Etapa "pagina principal (carimbos)"
py -3.12 montar_pagina.py
if ($LASTEXITCODE -ne 0) { Falha "montar_pagina.py falhou" }

Etapa "verificacao do site"
py -3.12 verificar_site.py
if ($LASTEXITCODE -ne 0) { Falha "verificar_site.py reprovou; nada foi commitado" }

Etapa "commit"
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host "Nada mudou; nada a publicar."; exit 0 }
$hoje = Get-Date -Format "yyyy-MM-dd"
if ($Mensagem -eq "") { $Mensagem = "Atualiza os paineis em $hoje" }

if ($PullRequest) {
    $branch = "atualizacao-$hoje"
    git checkout -b $branch
    if ($LASTEXITCODE -ne 0) { Falha "nao foi possivel criar a branch $branch (ja existe?)" }
    git commit -m $Mensagem
    git push -u origin $branch
    if ($LASTEXITCODE -ne 0) { Falha "push da branch falhou" }
    Write-Host ""
    Write-Host "Abra o pull request e anexe o relatorio de diferencas para a coordenacao:" -ForegroundColor Green
    Write-Host "  https://github.com/anamazza/Indicadores_Brasil/compare/$branch`?expand=1"
    Write-Host "Depois do merge, volte para a main:  git checkout main; git pull"
} else {
    git commit -m $Mensagem
    git push
    if ($LASTEXITCODE -ne 0) { Falha "push falhou" }
    Write-Host ""
    Write-Host "Publicado. O Actions verifica e o GitHub Pages atualiza o site em 1 ou 2 minutos:" -ForegroundColor Green
    Write-Host "  https://anamazza.github.io/Indicadores_Brasil/"
}
