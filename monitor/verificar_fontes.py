# -*- coding: utf-8 -*-
"""Monitor de novidades nas fontes dos painéis (DATASUS e OpenDataSUS).

    py verificar_fontes.py              compara com monitor/estado.json; se houver novidade, grava monitor/novidades.md
    py verificar_fontes.py --baseline   só grava o estado atual (primeira execução), sem relatar novidades

Fontes consultadas:
  SINASC  CSV anual do OpenDataSUS (HEAD: data de modificação e tamanho), ano corrente e os dois anteriores
  SIM     FTP do DATASUS: DO<UF><ano>.dbc (definitivo e preliminar) e DOFET<aa>.dbc, a partir de 2019
  SIH     FTP do DATASUS: RD<UF><aamm>.dbc, competências a partir de 2019-01, para as 27 UFs
Sai com 0 em sucesso (com ou sem novidades) e 1 em erro (ex.: FTP recusou a conexão)."""
import ftplib, json, os, re, sys, urllib.request
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))
ESTADO = os.path.join(BASE, "estado.json")
NOVIDADES = os.path.join(BASE, "novidades.md")

ANO = date.today().year
ANOS_SINASC = [ANO - 2, ANO - 1, ANO]
URL_SINASC = "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/SINASC/csv/SINASC_{ano}_csv.zip"
FTP_HOST = "ftp.datasus.gov.br"
PASTAS_SIM = {
    "SIM definitivo (DORES)": "/dissemin/publicos/SIM/CID10/DORES",
    "SIM preliminar (DORES)": "/dissemin/publicos/SIM/PRELIM/DORES",
    "DOFET definitivo": "/dissemin/publicos/SIM/CID10/DOFET",
    "DOFET preliminar": "/dissemin/publicos/SIM/PRELIM/DOFET",
}
PASTA_SIH = "/dissemin/publicos/SIHSUS/200801_/Dados"
RE_DO = re.compile(r"^DO([A-Z]{2})(\d{4})\.dbc$", re.I)
RE_DOFET = re.compile(r"^DOFET(\d{2})\.dbc$", re.I)
RE_RD = re.compile(r"^RD([A-Z]{2})(\d{2})(\d{2})\.dbc$", re.I)
RE_LIST = re.compile(r"^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}[AP]M)\s+(\d+|<DIR>)\s+(.+?)\s*$")
LIMITE_LISTA = 40


def sinasc():
    saida = {}
    for ano in ANOS_SINASC:
        url = URL_SINASC.format(ano=ano)
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                saida[str(ano)] = {"modificado": r.headers.get("Last-Modified", "?"),
                                   "tamanho": int(r.headers.get("Content-Length", "0") or 0)}
        except Exception as e:
            saida[str(ano)] = {"indisponivel": str(e)[:80]}
    return saida


def listar(ftp, pasta):
    """{nome: 'aaaa-mm-dd|tamanho'} de uma pasta do FTP (formato de listagem do servidor do DATASUS)."""
    ftp.cwd(pasta)
    linhas = []
    ftp.retrlines("LIST", linhas.append)
    itens = {}
    for ln in linhas:
        m = RE_LIST.match(ln)
        if not m or m.group(5) == "<DIR>":
            continue
        mes, dia, aa, _, tam, nome = m.groups()
        itens[nome] = f"20{aa}-{mes}-{dia}|{tam}"
    if not itens:   # formato inesperado: cai para a lista de nomes, sem datas
        itens = {n: "?|?" for n in ftp.nlst() if not n.startswith(".")}
    return itens


def sim(ftp):
    saida = {}
    for rotulo, pasta in PASTAS_SIM.items():
        itens = listar(ftp, pasta)
        sel = {}
        for nome, v in itens.items():
            m = RE_DO.match(nome)
            if m and int(m.group(2)) >= 2019:
                sel[nome.upper()] = v
            m = RE_DOFET.match(nome)
            if m and int(m.group(1)) >= 19:
                sel[nome.upper()] = v
        saida[rotulo] = sel
    return saida


def sih(ftp):
    itens = listar(ftp, PASTA_SIH)
    saida = {}
    for nome, v in itens.items():
        m = RE_RD.match(nome)
        if not m:
            continue
        uf, aa, mm = m.group(1).upper(), m.group(2), m.group(3)
        if int(aa) < 19:
            continue
        saida.setdefault(uf, {})[f"20{aa}-{mm}"] = v
    return saida


def diferencas(antes, depois):
    """Compara dicionários {chave: valor} e devolve (novos, alterados) como listas de chaves."""
    novos = sorted(k for k in depois if k not in antes)
    alterados = sorted(k for k in depois if k in antes and antes[k] != depois[k])
    return novos, alterados


def resumo_lista(itens):
    if len(itens) <= LIMITE_LISTA:
        return ", ".join(itens)
    return ", ".join(itens[:LIMITE_LISTA]) + f" e mais {len(itens) - LIMITE_LISTA}"


def main():
    baseline = "--baseline" in sys.argv
    print("Consultando SINASC (OpenDataSUS)...")
    atual = {"consultado_em": date.today().isoformat(), "sinasc": sinasc()}
    print("Consultando FTP do DATASUS (SIM e SIH)...")
    try:
        ftp = ftplib.FTP(FTP_HOST, timeout=300)
        ftp.login("anonymous", "monitor@indicadores-brasil")
        atual["sim"] = sim(ftp)
        atual["sih"] = sih(ftp)
        ftp.quit()
    except Exception as e:
        print(f"ERRO: não foi possível consultar o FTP do DATASUS ({e}). Se isto rodou no GitHub Actions, o FTP pode "
              "estar recusando conexões de fora do Brasil; rode o monitor localmente.")
        sys.exit(1)

    anterior = None
    if os.path.exists(ESTADO):
        anterior = json.load(open(ESTADO, encoding="utf-8"))

    blocos = []
    if anterior and not baseline:
        # SINASC
        novos, alterados = diferencas(anterior.get("sinasc", {}), atual["sinasc"])
        linhas = []
        for ano in novos + alterados:
            d = atual["sinasc"][ano]
            if "indisponivel" in d:
                continue
            linhas.append(f"- SINASC {ano}: arquivo {'novo' if ano in novos else 'republicado'} em {d['modificado']} "
                          f"({d['tamanho'] // 1_048_576} MB)")
        if linhas:
            blocos.append("## SINASC (OpenDataSUS)\n" + "\n".join(linhas))
        # SIM
        linhas = []
        for rotulo, itens in atual["sim"].items():
            novos, alterados = diferencas(anterior.get("sim", {}).get(rotulo, {}), itens)
            if novos:
                linhas.append(f"- {rotulo}: arquivos novos: {resumo_lista(novos)}")
            if alterados:
                linhas.append(f"- {rotulo}: arquivos republicados: {resumo_lista(alterados)}")
        if linhas:
            blocos.append("## SIM (FTP do DATASUS)\n" + "\n".join(linhas))
        # SIH
        linhas = []
        for uf, comps in sorted(atual["sih"].items()):
            novos, alterados = diferencas(anterior.get("sih", {}).get(uf, {}), comps)
            if novos:
                linhas.append(f"- {uf}: competências novas {resumo_lista(novos)} (última disponível: {max(comps)})")
            if alterados:
                linhas.append(f"- {uf}: competências republicadas {resumo_lista(alterados)}")
        if linhas:
            blocos.append("## SIH/SUS (FTP do DATASUS, arquivos RD)\n" + "\n".join(linhas))

    json.dump(atual, open(ESTADO, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ult = {uf: max(c) for uf, c in atual["sih"].items()} if atual["sih"] else {}
    print(f"estado gravado: SINASC {list(atual['sinasc'])}, SIM {sum(len(v) for v in atual['sim'].values())} arquivos, "
          f"SIH {len(atual['sih'])} UFs (competência mais recente: {max(ult.values()) if ult else '?'})")

    if os.path.exists(NOVIDADES):
        os.remove(NOVIDADES)
    if blocos:
        texto = (f"Novidades encontradas em {atual['consultado_em']} em relação à consulta anterior "
                 f"({anterior.get('consultado_em', '?')}).\n\n" + "\n\n".join(blocos) +
                 "\n\nPróximo passo: rodar a atualização do painel correspondente (ver ESTRATEGIA_ATUALIZACAO.md, camada C).\n")
        open(NOVIDADES, "w", encoding="utf-8").write(texto)
        print("\n" + texto)
    elif anterior and not baseline:
        print("Sem novidades desde", anterior.get("consultado_em", "?"))
    else:
        print("Linha de base gravada; as próximas execuções relatam só o que mudar.")


if __name__ == "__main__":
    main()
