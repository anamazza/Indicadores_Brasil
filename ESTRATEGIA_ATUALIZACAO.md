# Estratégia de atualização automatizada dos painéis

Decisão (11/10/2026): os painéis continuam no GitHub Pages, como site estático de dados abertos, sem
login. O GitHub guarda o código e os dados gerados, e o GitHub Actions executa o que couber na nuvem.
O que não couber (microdados pesados, validação pela coordenação) fica na máquina local, mas reduzido a
um comando por painel.

## 1. O que muda, com que frequência, e onde dá para automatizar

| Insumo | Fonte e forma de chegada | Cadência típica | Volume | Validação humana? | Onde rodar |
|---|---|---|---|---|---|
| Ficha CNES + habilitações | API de Dados Abertos e serviço do site do CNES (`atualizar_cnes.py`) | contínua; basta a cada 6 meses | KB | não | **nuvem** (Actions agendado) |
| SINASC | CSV anual do OpenDataSUS (`baixar_sinasc.py`) | preliminar atualizado ao longo do ano; consolidado no ano seguinte | ~centenas de MB por ano | sim (planilha de indicadores validada) | local hoje; **nuvem possível** depois |
| SIM (DO e DOFET) | FTP do DATASUS, por UF e ano (`baixa_sim.py`) | preliminar ao longo do ano; consolidado no ano seguinte | MB por UF | sim (planilhas de validação) | local hoje; **nuvem possível** depois |
| SIH/SUS (AIH reduzida e SP) | FTP do DATASUS, por UF e competência mensal (`1_baixar_sih.py`) | mensal, com ~2 meses de atraso | GB por UF (31 GB hoje) | sim (regras aprovadas em 09/09/2026) | **só local** (não cabe no runner do Actions) |
| Lista oficial de maternidades por grupo | planilha da coordenação | eventual | KB | é a própria coordenação | local (entrada manual) |

Conclusão: automatizar de ponta a ponta os microdados não é adequado, porque a publicação depende de
validação da coordenação e o SIH não cabe na nuvem. O que vale automatizar é: **detectar** que há dado
novo, **atualizar sozinho** o que é leve (CNES), **reduzir a um comando** a cadeia local de cada painel,
**verificar e publicar** automaticamente a cada push, e **mostrar** na página a data de cada atualização.

## 2. Arquitetura em camadas

```
DATASUS / OpenDataSUS / CNES
        │
        ├─ (A) Monitor mensal no Actions: há arquivo novo? → abre uma issue "Novos dados: ..."  ← aviso por e-mail
        │
        ├─ (B) CNES agendado no Actions (1º jun / 1º dez): atualizar_cnes.py + montar_painel.py → commit → publicado
        │
        └─ (C) Máquina local, um comando por painel: baixar → extrair → calcular → build_dados → montar_painel
                 │        (gera relatório do que mudou; a coordenação valida)
                 └─ espelha na subpasta do repositório → commit em branch de atualização → pull request
                          │
                          ▼
   (D) Actions a cada push/PR: verificação (arquivos, links, JSON, tamanhos) → merge em main → GitHub Pages
                          │
                          ▼
   (E) Página principal e painéis mostram "atualizado em" por fonte (atualizacoes.json gerado na montagem)
   (F) Dados gerados também publicados como JSON puro (API estática) → base do futuro sistema
```

### (A) Monitor de novidades no DATASUS — `.github/workflows/monitor_datasus.yml`

- Roda todo mês (e sob demanda). Um script `monitor/verificar_fontes.py` consulta:
  - SINASC: `HEAD` em `https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/SINASC/csv/SINASC_<ano>_csv.zip`
    (ano corrente e anterior): data e tamanho.
  - SIM: listagem FTP de `SIM/PRELIM/DORES`, `SIM/CID10/DORES` e `DOFET`: datas dos `DO<UF><ano>.dbc` das UFs alvo.
  - SIH: listagem FTP de `SIHSUS/200801_/Dados`: competências `RD<UF><aamm>.dbc` novas para as UFs alvo.
- Guarda o estado em `monitor/estado.json` (commitado). Quando algo muda, abre uma issue no repositório
  com o resumo ("SIH: competências 2026-07 e 2026-08 disponíveis para PE, SP, RJ"). O GitHub avisa por e-mail.
- Custo zero; risco: o FTP do DATASUS pode recusar conexões de fora do Brasil. Testar com `workflow_dispatch`;
  se recusar, o monitor roda localmente na tarefa agendada do Windows (mesmo script).

### (B) CNES na nuvem — `.github/workflows/cnes.yml`

- `schedule` em 1º de junho e 1º de dezembro (o que o README do NV já prometia, mas nunca foi agendado no
  Windows). Também `workflow_dispatch` para rodar quando quiser.
- Para cada subpasta (`nascimentos`, `internacao`, `mortalidade`): `py atualizar_cnes.py` e `py montar_painel.py`.
  Os dois rodam na subpasta sem dependências externas (só biblioteca padrão); o espelhamento é pulado
  automaticamente porque não há clone local no runner.
- Se `cnes_dados.json` mudou: commit "CNES atualizado em <data>" e push → Pages publica.
- Regra para não haver conflito com a máquina local: **o CNES passa a ser atualizado só na nuvem**. O comando
  local (C) começa com `git pull` e copia o `cnes_dados.json` do repositório para a pasta de trabalho antes
  de montar. `atualizar_painel.bat` do NV deixa de chamar `atualizar_cnes.py`.

### (C) Um comando por painel — `atualizar.ps1` em cada pasta de trabalho + `publicar.ps1` na raiz do clone

Sequência, parametrizada por ano/competência e UFs:

1. `git pull` no clone e resgate do `cnes_dados.json` mais novo.
2. Download incremental (os scripts já pulam o que existe em disco).
3. Extração e cálculo (scripts numerados de cada pipeline, na ordem documentada nos READMEs).
4. `build_dados.py` e `montar_painel.py` (gera o painel e espelha na subpasta do repositório).
5. **Relatório de diferenças** (`relatorio_atualizacao_<data>.md`): por unidade e ano, o que mudou em relação
   ao que está publicado (n e % de cada indicador), lido do `dados_*.js` anterior e do novo. É o que a
   coordenação valida, em vez de abrir 120 decks.
6. Commit numa branch `atualizacao-<aaaa-mm>` e `git push`; abrir pull request (via `gh` ou pelo site).
   O site publicado não muda até o merge. Para ver a versão nova antes de publicar: servidor local da pasta
   do clone (`.claude/launch.json` já serve a raiz em `localhost:8140`).
7. Aprovado → merge em `main` → (D) verifica e o Pages publica.

Enquanto a coordenação não exigir revisão, o passo 6 pode commitar direto em `main` (`-Publicar`).

### (D) Verificação a cada push — `.github/workflows/verificar.yml`

Script `verificar_site.py`, rodado no Actions e também no fim do (C):

- Existem `index.html` na raiz e nas três subpastas, cada um idêntico ao `Painel_*.html` correspondente
  e com tamanho dentro de uma faixa (evita publicar um painel vazio ou truncado).
- Todos os `href` para `anamazza.github.io/Indicadores_Brasil/...` apontam para pastas existentes no repositório.
- `cnes_dados.json` e os `dados_*.js` são JSON válidos; número de unidades por painel não caiu sem aviso.
- O `atualizacoes.json` (E) tem data para cada painel.
- Falhou → o Actions marca o commit em vermelho e o GitHub manda e-mail. Com Pages em "deploy from a branch",
  a publicação acontece mesmo assim; se quiser bloquear publicação com erro, muda-se a fonte do Pages para
  "GitHub Actions" e o deploy passa a ser o último passo deste workflow.

### (E) Carimbo de atualização visível

- Cada `montar_painel.py` grava, na subpasta do repositório, `atualizacao.json`:
  `{"painel": "nascimentos", "montado_em": "2026-10-11", "fontes": {"SINASC": "2019-2025, extração 23/09/2026", "CNES": "01/06/2026"}}`.
- `montar_pagina.py` lê os três e escreve, sob cada botão redondo, "atualizado em dd/mm/aaaa"; e, na nota de
  fontes, a situação de cada base. Quem abre a página sabe o quão fresco está cada painel.

### (F) Dados como API estática (ponte para o sistema)

- Além do `dados_*.js` (que define uma constante para o HTML), gravar o mesmo conteúdo em `dados/<painel>.json`
  puro. O GitHub Pages serve JSON com CORS liberado: `https://anamazza.github.io/Indicadores_Brasil/nascimentos/dados/nascimentos.json`.
- Qualquer sistema futuro (ou uma planilha, ou um painel novo) lê esses arquivos sem depender do HTML.
  Quando vier o sistema, os mesmos JSON viram a carga inicial do banco.

## 3. Ordem de implementação sugerida

| Fase | Entrega | Esforço | Ganho imediato |
|---|---|---|---|
| 1 | (D) verificação no Actions + (E) carimbo de atualização | pequeno | segurança a cada push e transparência para quem usa |
| 2 | (B) CNES agendado na nuvem (+ ajuste do fluxo local para puxar o CNES) | pequeno | some a única tarefa que hoje depende de lembrar |
| 3 | (A) monitor do DATASUS com issue automática | pequeno/médio | você fica sabendo quando há dado novo, sem olhar o FTP |
| 4 | (C) um comando por painel com relatório de diferenças e PR | médio | atualização de dados vira rotina de minutos, com revisão |
| 5 | (F) JSON puro por painel | pequeno | base para o sistema e para painéis novos |
| 6 | SINASC e SIM na nuvem (download e cálculo no Actions; SIH continua local) | grande | opcional; só se a máquina local virar gargalo |

### Situação em 11/10/2026

- Fases 1 a 5 implementadas no mesmo dia: `verificar_site.py` + workflow "Verificar site"; carimbos
  (`atualizacao.json` por painel, exibidos na página principal); workflow "Atualizar CNES" com proteção contra
  perda de fichas; monitor do DATASUS (`monitor/verificar_fontes.py` + workflow mensal com issue automática;
  linha de base gravada localmente); `publicar.ps1` com `relatorio_diferencas.py` e opção de pull request;
  `dados.json` por painel. O fluxo (C) cobre o "último quilômetro"; os scripts de dados de cada pipeline
  continuam sendo rodados à mão na pasta de trabalho quando há dado novo.
- Pendente: fase 6 (SINASC e SIM na nuvem), só se a máquina local virar gargalo. Conferir na aba Actions se as
  primeiras execuções manuais de "Atualizar CNES" e "Monitor DATASUS" passaram: é o teste de que as APIs do CNES
  e o FTP do DATASUS aceitam conexões do runner do GitHub.

## 4. Regras que mantêm tudo coerente

- Fonte da verdade do código e dos dados calculados: as pastas de trabalho, espelhadas no repositório pelo
  `montar_painel.py`. Exceção: `cnes_dados.json`, que a nuvem atualiza e o fluxo local resgata com `git pull`.
- Nada publica sem passar pelo `verificar_site.py`.
- Toda atualização de dados deixa rastro: commit com a competência/ano e a data de extração, relatório de
  diferenças na pasta `relatorios/`, e carimbo na página.
- Novo painel = nova pasta de trabalho com `montar_painel.py` nos mesmos moldes, nova subpasta, novo botão,
  e entrada no `verificar_site.py`. Painel que só reaproveita dados já publicados no repositório (caso do painel de
  habilitações, 29/10/2026, que consolida o CNES dos três) vive só aqui, sem pasta de trabalho, e é remontado pelo
  `publicar.ps1` e pelo workflow "Atualizar CNES".
