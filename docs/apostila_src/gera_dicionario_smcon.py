# -*- coding: utf-8 -*-
"""
gera_dicionario_smcon.py
Gera o Dicionário de Dados do SMCON (Sistema de Monitoramento do Cuidado Obstétrico e Neonatal, IFF/Fiocruz,
estratégia QualiNEO) no formato dos demais dicionários da apostila (blocos {"tipo":"p"} e {"tipo":"tabela"}),
a partir dos documentos públicos do Portal de Boas Práticas do IFF (instrutivos de abril/2024 e fichas de coleta).

    py -I gera_dicionario_smcon.py            -> fontes/DICIONARIO_SMCON_2026-11-09.json e ../DICIONARIO_SMCON_2026-11-09.md

O conteúdo de cada variável resume o texto do instrutivo correspondente; as opções e a numeração vêm das fichas de
coleta. Nada aqui foi inventado: o que os documentos não trazem (fórmulas de indicador, critério de adesão, metas)
está dito como ausente na seção de notas.
"""
import json, os

AQUI = os.path.dirname(os.path.abspath(__file__))
DATA = "2026-11-09"
SAIDA_JSON = os.path.join(AQUI, "fontes", f"DICIONARIO_SMCON_{DATA}.json")
SAIDA_MD = os.path.join(os.path.dirname(AQUI), f"DICIONARIO_SMCON_{DATA}.md")

FONTES = [
    ("Instrutivo dos módulos Parto e Nascimento e Abortamento (SMCON, IFF/Fiocruz, abril de 2024, 47 p.)",
     "https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2022/02/Instrutivo_SMCON_PARTONASCIMENTO_ABORTAMENTO.pdf"),
    ("Instrutivo do módulo Cuidado Neonatal (SMCON, IFF/Fiocruz, abril de 2024, 41 p.)",
     "https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2021/01/Instrutivo_SMCON.pdf"),
    ("Ficha de coleta — Monitoramento do Parto e Nascimento, versão 6, maio/2024 (5 p.)",
     "https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2021/12/Fichadecoleta_PartoeNascimento.pdf"),
    ("Ficha de coleta — Monitoramento do Abortamento, versão 5, junho/2022 (2 p.)",
     "https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2022/01/Ficha-de-coleta-Abortamento.pdf"),
    ("Ficha de coleta — Monitoramento do Cuidado Neonatal, versão 6, maio/2024 (4 p.)",
     "https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2021/01/Ficha-e-coleta-Cuidado-Neonatal-v2dez20.pdf"),
    ("Página do SMCON na estratégia QualiNEO (Portal de Boas Práticas em Saúde da Mulher, da Criança e do Adolescente)",
     "https://portaldeboaspraticas.iff.fiocruz.br/qualineo/#smcon"),
]

SN = "Sim / Não"
SNNA = "Sim / Não / Não se aplica"
DATA_ = "Data (dd/mm/aaaa)"
INT = "Número inteiro"


def P(texto, estilo=""):
    return {"tipo": "p", "estilo": estilo, "texto": texto}


def tabela(cab, linhas):
    """linhas: ('SEÇÃO', texto) para linha de seção; (variavel, obrigatoria, opcoes, regra) para variável.
    Cada célula vira lista de parágrafos (strings separadas por '\\n' viram parágrafos)."""
    out = [[[c] for c in cab]]
    for l in linhas:
        if l[0] == "SEÇÃO":
            out.append([[l[1]]])
        else:
            out.append([[s for s in str(c).split("\n") if s != ""] or [""] for c in l])
    return {"tipo": "tabela", "linhas": out}


# ----------------------------------------------------------------------------------------------------------------
# MÓDULO PARTO E NASCIMENTO (ficha v6, maio/2024; instrutivo abril/2024)
# ----------------------------------------------------------------------------------------------------------------
PARTO = [
    ("SEÇÃO", "IDENTIFICAÇÃO DA MULHER E DA PESSOA QUE GESTA (aba IDM)"),
    ("1. Identificador / Prontuário do hospital", "Sim", "Texto (número do prontuário)",
     "Números exatos do prontuário clínico da paciente no serviço."),
    ("2. Data de nascimento da mulher", "Sim", DATA_,
     "Se a paciente não souber o dia, registrar 15; se não souber o mês, registrar junho; registrar sempre o ano (ex.: 15/06/aaaa). "
     "O SMCON usa esta data para calcular o identificador do registro."),
    ("3. Idade da mulher", "Sim", "Anos (calculada)",
     "Calculada pelo sistema a partir da data de nascimento; na ficha, preenchida só quando a data de nascimento é desconhecida."),
    ("4. Data da internação da mulher", "Sim", DATA_, "Data da admissão da paciente no serviço."),
    ("5. Estado de residência", "Não", "UF (lista do sistema)", "Estado de procedência da paciente, no formato UF."),
    ("6. Município de residência", "Não", "Município (lista filtrada pela UF)", "Município de residência; só aparecem os municípios da UF escolhida."),
    ("7. CEP de residência", "Não", "8 dígitos (00000-000)", "Código de endereçamento postal da residência."),
    ("8. Mulher vinculada a esta maternidade", "Não",
     "Vinculada desde o pré-natal / Transferida através da regulação / Não vinculada nem transferida pela regulação (demanda espontânea) / Não se aplica / Sem informação",
     "Vinculação da gestante à maternidade do parto (Lei 11.634/2007; Portaria de Consolidação 3/2017). 'Não se aplica' só para atendimentos particulares ou por plano, "
     "nos serviços que optaram por registrar também esses partos; 'Sem informação' quando não é possível saber se havia vinculação."),
    ("9. Cor/raça da mulher", "Sim", "Branca / Preta / Parda / Amarela / Indígena", "Autodeclarada, obtida em entrevista ou no prontuário."),
    ("10. Escolaridade da mulher", "Sim", "< 8 anos / 8 anos / 9 a 11 anos / 12 anos ou mais",
     "Anos de estudo: < 8 = fundamental incompleto (inclui nenhum ano de estudo); 8 = fundamental completo; 9 a 11 = ensino médio; 12 ou mais = superior."),
    ("11. Situação conjugal da mulher", "Sim (ficha) / não exigida no instrutivo", "Vive com companheiro(a) / Vive sem companheiro(a)",
     "Casada ou união estável = vive com companheiro(a)."),
    ("SEÇÃO", "DADOS OBSTÉTRICOS (aba OBS)"),
    ("12. Nº de gestações", "Sim", INT, "Total de gestações, contando a atual. Se for a primeira gestação, as variáveis seguintes não abrem."),
    ("13. Nº de partos normais", "Sim", INT, "Partos vaginais anteriores, independentemente de métodos auxiliares; não contar o parto atual."),
    ("14. Nº de cesarianas", "Sim", INT, "Cesarianas anteriores, eletivas ou de urgência; não contar o parto atual."),
    ("15. Nº de abortamentos", "Sim", INT, "Abortamentos anteriores à gestação atual."),
    ("16. Data da última cesariana", "Não", DATA_, "Se houve cesariana anterior. Dia desconhecido = 15; informar mês e ano."),
    ("SEÇÃO", "DADOS DA GESTAÇÃO ATUAL (aba OBS)"),
    ("17. Pré-natal na gestação", "Sim", SN, "Priorizar a Caderneta da Gestante. Se 'Não', os subitens 17.1 a 17.4 não são preenchidos."),
    ("17.1 Nº de consultas", "Não", INT, "Total de consultas de pré-natal até a internação."),
    ("17.2 Semana da gestação em que iniciou o pré-natal", "Não", INT, "Semanas de gestação no início do pré-natal (o instrutivo traz o texto 'no momento da internação', aparente erro de redação)."),
    ("17.3 Peso na 1ª consulta de pré-natal", "Não", "Quilogramas, número inteiro (ex.: 78)", "Peso materno na 1ª consulta; usado com a altura para calcular o IMC materno."),
    ("17.4 Altura", "Não", "Metros, com decimais (ex.: 1,65)", "Altura materna; usada com o peso para calcular o IMC."),
    ("18.1 Idade gestacional — semanas", "Sim", INT, "Semanas de idade gestacional no momento da internação."),
    ("18.2 Idade gestacional — dias", "Sim", "0 a 6", "Dias além das semanas completas; semana inteira = 0."),
    ("18.3 Método de estimação da idade gestacional", "Sim", "Ultrassonografia / Data da última menstruação (DUM)", "Método em que se baseia a idade gestacional informada."),
    ("18.4 Data do 1º exame de ultrassonografia", "Não", DATA_, "Datação pelo primeiro US, qualquer idade gestacional; o período mais confiável é até 20 semanas, idealmente até 14."),
    ("18.5 Data da última menstruação (DUM)", "Não", DATA_, "Registrada no cartão da gestante ou referida pela paciente."),
    ("SEÇÃO", "INFECÇÃO NA GESTAÇÃO (aba INFC)"),
    ("19. Sífilis", "Sim", "Teste rápido/treponêmico positivo / negativo / Exame não realizado", "Resultado do teste rápido ou treponêmico na gestação."),
    ("19.1 Valor do VDRL 1º trimestre", "Não", "Titulação (1/x)", "Só se o teste treponêmico foi positivo."),
    ("19.2 Valor do VDRL 3º trimestre", "Não", "Titulação (1/x)", "Só se o teste treponêmico foi positivo."),
    ("20. Toxoplasmose com indicação de tratamento nessa gestação", "Não", SN, "Indicação de tratamento para toxoplasmose na gestação atual (fluxograma no Anexo 1 do instrutivo)."),
    ("21. Mulher vivendo com HIV", "Sim", SN, "'Sim' apenas com diagnóstico confirmado."),
    ("21.1 Carga viral no final da gestação / momento do parto", "Não", "< 1.000 cópias / ≥ 1.000 cópias", "Para mulheres vivendo com HIV."),
    ("21.2 Uso de terapia antirretroviral (TARV) na gestação", "Não", SN, "Para mulheres vivendo com HIV."),
    ("22. Infecção urinária na gestação", "Não", SN, "Diagnóstico de infecção urinária na gestação atual."),
    ("22.1 Realizou tratamento para infecção urinária", "Não", SN, "Tratamento durante a gestação."),
    ("22.2 Tratamento realizado", "Não", "Amoxicilina / Amoxicilina + clavulanato / Acetilcefuroxima / Cefalexina / Nitrofurantoína / Fosfomicina / Ceftriaxona / Outro", "Último tratamento utilizado."),
    ("23. Síndrome respiratória aguda grave", "Não", SN,
     "Infecção do trato respiratório inferior na admissão com sinal de gravidade: FR ≥ 24 irpm, SpO2 ≤ 95% em ar ambiente ou desconforto respiratório; "
     "ou a definição clássica (insuficiência respiratória aguda com alterações radiológicas, edema pulmonar não cardiogênico, PaO2/FiO2 < 300)."),
    ("24. Covid-19", "Não", SN, "Diagnóstico clínico-radiológico ou laboratorial em vigência."),
    ("SEÇÃO", "SITUAÇÕES DE RISCO NA GESTAÇÃO (aba RISCO)"),
    ("25. Hipertensão", "Sim", "Hipertensão arterial crônica / Hipertensão gestacional / Não",
     "Crônica: PA ≥ 140 e/ou 90 mmHg registrada no cartão antes de 20 semanas, mesmo sem diagnóstico prévio. Gestacional: o mesmo registro após 20 semanas. Pré-eclâmpsia é avaliada no item seguinte."),
    ("26. Pré-eclâmpsia", "Não", SN,
     "Hipertensão após a 20ª semana com proteinúria significativa ou, mesmo sem proteinúria, com comprometimento sistêmico ou de órgão-alvo "
     "(trombocitopenia, disfunção hepática, insuficiência renal, edema agudo de pulmão, iminência de eclâmpsia ou eclâmpsia)."),
    ("27. Uso de ácido acetilsalicílico (AAS)", "Não", SN, "AAS 100 mg, 1 vez ao dia, no pré-natal (indicações no Anexo 2 do instrutivo)."),
    ("28. Uso de cálcio", "Não", SN, "Carbonato de cálcio 500 mg de 8/8 h no pré-natal (Anexo 2)."),
    ("29. Diabetes", "Não", "Diabetes pré-gestacional / Diabetes gestacional / Não",
     "Pré-gestacional: diagnóstico anterior à gestação (DM1, DM2, outros tipos). Gestacional: hiperglicemia detectada pela primeira vez na gravidez (glicemia de jejum > 92) sem critérios de DM."),
    ("30. Uso de insulina", "Não", SN, "Uso de insulina durante a gestação."),
    ("31. Internação durante a gestação", "Não", SN, "Qualquer internação durante a gestação."),
    ("32. Corticoide antenatal", "Não", SN, "Corticosteroide IM ou EV em qualquer momento antes do parto, mesmo uma dose (betametasona ou dexametasona)."),
    ("33. Fumo", "Sim", SN, "Fuma cigarro, em qualquer quantidade."),
    ("34. Bebida alcoólica", "Não", SN, "Relato de uso de qualquer quantidade de bebida alcoólica na gestação."),
    ("35. Uso de drogas psicoativas na gestação (lícitas ou ilícitas)", "Não", SN, "Relato de uso de qualquer quantidade na gestação."),
    ("36. Violência psicológica e/ou física e/ou sexual", "Não", SN,
     "Sofreu qualquer tipo de violência durante a gestação, uma ou mais vezes (definição da Convenção de Belém do Pará, 1994). "
     "Atenção: é violência sofrida pela gestante, não atendimento a vítima de violência sexual."),
    ("SEÇÃO", "ADMISSÃO (aba A-TP&P)"),
    ("37. Pré-eclâmpsia com sinais de gravidade / eclâmpsia", "Sim", SN,
     "Pré-eclâmpsia com sinais de gravidade (cefaleia, alterações visuais, epigastralgia) ou eclâmpsia (convulsões tônico-clônicas em paciente com pré-eclâmpsia)."),
    ("38. Usou sulfato de magnésio", "Sim", "Sim, para neuroproteção e pré-eclâmpsia/eclâmpsia / Sim, somente para pré-eclâmpsia/eclâmpsia / Não fez uso",
     "Sulfato de magnésio EV em algum momento da gestação, para pré-eclâmpsia, eclâmpsia ou neuroproteção fetal."),
    ("39. Bolsa rota na admissão", "Não", "< 18 h / ≥ 18 h e ≤ 24 h / > 24 h / Não",
     "Tempo de bolsa rota na admissão; bolsa íntegra = Não. Sem informação: deixar em branco."),
    ("SEÇÃO", "TRABALHO DE PARTO (aba A-TP&P)"),
    ("40. Tipo de gestação", "Sim", "Única / Gemelar / Trigemelar", "Gemelar ou trigemelar quando dois ou três fetos vivos foram documentados em qualquer época da gravidez."),
    ("41. Apresentação do RN / 1º feto", "Sim", "Cefálica / Pélvica / Outra (córmica, transversa)", "Em gestação múltipla, apresentação do 1º feto."),
    ("42. Trabalho de parto", "Sim", "Espontâneo / Induzido / Não entrou em trabalho de parto",
     "Espontâneo: início natural das contrações, dilatação e esvaecimento, inclusive se depois houve condução farmacológica. "
     "Induzido: iniciado por método farmacológico ou mecânico (misoprostol, ocitocina, balão cervical)."),
    ("43. Durante o TP: presença de acompanhante de livre escolha", "Não", SN, "Pessoa escolhida pela mulher presente no trabalho de parto."),
    ("43.1 Acompanhante", "Não", "Mãe / Companheiro(a) / Outro", "Quem foi o acompanhante."),
    ("44. Deambulação", "Não", SN, "A mulher caminhou durante o trabalho de parto."),
    ("45. Métodos não farmacológicos de alívio da dor", "Sim", SN, "Bola, compressa quente, banho, massagem, barra de Ling ou outro método não farmacológico."),
    ("46. Utilização de analgesia", "Sim", SN, "Método farmacológico de alívio da dor durante o trabalho de parto."),
    ("46.1 Tipo de analgesia", "Não", "Peridural / Raquidiana / Combinada / Opioide injetável (petidina na ficha)", "Tipo de analgesia utilizada."),
    ("47. Utilização de ocitocina", "Sim", SN, "Ocitocina endovenosa para estímulo do trabalho de parto."),
    ("47.1 Período de início do uso de ocitocina", "Não", "1º período (dilatação) / 2º período (expulsivo)",
     "Marcar o período em que o uso começou, mesmo que tenha se estendido ao 2º período. 1º período: das contrações rítmicas à dilatação total (10 cm); 2º: da dilatação total à expulsão."),
    ("48. Realização de amniotomia", "Sim (instrutivo) / ficha traz 'Não se aplica'", SNNA, "Ruptura artificial da membrana amniótica."),
    ("49. Dieta prescrita", "Sim", "Zero / Líquidos claros / Livre / Outra", "Dieta prescrita no trabalho de parto."),
    ("SEÇÃO", "ASSISTÊNCIA AO PARTO E NASCIMENTO (aba A-TP&P)"),
    ("50. Data do parto", "Sim", DATA_, "Dia, mês e ano do parto."),
    ("51. Tipo de parto", "Sim", "Normal / Fórceps / Vácuo / Cesárea eletiva / Cesárea em trabalho de parto",
     "'Normal' para qualquer parto vaginal espontâneo ou induzido sem instrumento; 'Fórceps' e 'Vácuo' quando usados em qualquer momento; "
     "'Cesárea eletiva' sem trabalho de parto; 'Cesárea em trabalho de parto' quando a mulher entrou em trabalho de parto."),
    ("52. No parto: presença de acompanhante de livre escolha", "Sim", SN, "Acompanhante de livre escolha presente no parto."),
    ("52.1 Acompanhante", "Não", "Mãe / Companheiro(a) / Outro", "Quem foi o acompanhante."),
    ("53. Posição materna no período expulsivo", "Sim", "Deitada de costas (litotomia) / Semi-sentada / Cócoras / Sims (lateral) / Quatro apoios / Outro / Não se aplica",
     "Posição no expulsivo do parto normal, fórceps ou vácuo; cesariana = Não se aplica."),
    ("54. Episiotomia", "Sim", SN, "Realização de episiotomia."),
    ("55. Profissional que assistiu (conduziu) o parto", "Sim", "Médico(a) obstetra / Enfermeiro(a) obstetra ou obstetriz / Outros / Não se aplica",
     "Profissional que realizou a assistência ao parto vaginal, em contexto multiprofissional. 'Enfermeiro(a) obstetra ou obstetriz' exige especialização em obstetrícia; "
     "'Outros' = médico ou enfermeira sem especialização em obstetrícia, inclusive residentes; 'Não se aplica' quando nenhuma opção cabe."),
    ("56. Laceração vaginal/perineal", "Não", SN, "Laceração do canal de parto de qualquer grau ou localização."),
    ("56.1 Grau da laceração", "Não", "1º grau / 2º grau / 3º-4º graus / Sem especificação",
     "1º: pele do períneo e/ou mucosa vaginal; 2º: músculos do períneo sem esfíncter anal; 3º: esfíncter anal (3a < 50%, 3b > 50% do esfíncter externo, 3c ambos os esfíncteres); 4º: esfíncteres e mucosa anorretal."),
    ("57. Utilização de anestesia", "Não", SN, "Anestesia durante o parto."),
    ("57.1 Anestesia", "Não", "Peridural / Raquidiana / Combinada / Geral / Locorregional", "Tipo de anestesia (a ficha rotula o campo como 'Analgesia')."),
    ("SEÇÃO", "PÓS-PARTO E DESFECHO DA MULHER (aba PP)"),
    ("58. Ocitocina profilática no 3º período", "Sim", SN, "10 UI IM ou EV de ocitocina após o nascimento."),
    ("59. Hemorragia pós-parto", "Sim", SN, "Sangramento pelo trato genital superior a 500 mL nas primeiras 24 horas (formas de medir no Anexo 3, FEBRASGO)."),
    ("59.1 Tratamento da hemorragia pós-parto", "Não", "Múltipla escolha: Medicamentoso (ocitocina, metilergometrina, misoprostol, ácido tranexâmico) / Massagem uterina bimanual / Balão de tamponamento / Traje antichoque não pneumático / Histerectomia / Outros tratamentos cirúrgicos",
     "Podem ser indicados um ou mais tratamentos."),
    ("60. Tipo de desfecho da mulher", "Sim", "Alta / Transferência interna / Transferência externa / Óbito",
     "Alta: saída viva para a residência, inclusive alta à revelia. Transferência interna: leitos clínicos ou intensivos no mesmo hospital (alojamento conjunto não conta). Externa: outro hospital."),
    ("61. Data do desfecho da mulher", "Sim", DATA_, "Dia, mês e ano do desfecho."),
    ("SEÇÃO", "RECÉM-NASCIDO (aba RN) — em gestação múltipla, uma ficha de RN por bebê"),
    ("62. Condição do recém-nascido", "Sim", "Nascido vivo / Natimorto", "Definições da OMS (1995) de nascido vivo e de óbito fetal, transcritas no instrutivo."),
    ("63. Peso do recém-nascido/feto", "Sim", "Gramas (3 ou 4 dígitos)", "Primeiro peso aferido após o nascimento; se o RN morrer nas primeiras 24 h, pode ser o peso da necrópsia."),
    ("63. Sexo", "Não", "Masculino / Feminino / Indeterminado", "Sexo do bebê."),
    ("64. Idade gestacional — semanas", "Sim", INT, "Melhor estimativa: 1º DUM, parâmetros obstétricos e US antes de 22 semanas; 2º avaliação neonatal (New Ballard)."),
    ("65. Idade gestacional — dias", "Sim", "0 a 6", "Dias além das semanas completas; semana inteira = 0."),
    ("SEÇÃO", "CUIDADOS IMEDIATOS AO RN (aba RN)"),
    ("66. Apgar 1º minuto", "Sim", "0 a 10", "Valor do Apgar no primeiro minuto."),
    ("67. Apgar 5º minuto", "Sim", "0 a 10", "Valor do Apgar no quinto minuto."),
    ("68. Tempo de clampeamento do cordão", "Sim", "< 1 minuto / 1 a 3 minutos", "Tempo entre o nascimento e o clampeamento."),
    ("69. Reanimação neonatal", "Sim", SN, "Necessidade de manobras de reanimação na sala de parto."),
    ("69.1 Uso de oxigênio > 21% na ventilação", "Não", SN, "Na reanimação."),
    ("69.2 Ventilação com máscara", "Não", SN, "Na reanimação."),
    ("69.3 Ventilação com cânula traqueal", "Não", SN, "Intubação endotraqueal para ventilação."),
    ("69.4 Massagem cardíaca", "Não", SN, "Na reanimação."),
    ("69.5 Drogas", "Não", SN, "Uso de droga durante a reanimação."),
    ("70. Contato pele a pele mãe/bebê na primeira hora", "Sim", SN, "Contato pele a pele imediatamente após o nascimento, na primeira hora de vida."),
    ("71. Temperatura do RN na primeira hora", "Sim", "°C, uma decimal", "Temperatura axilar da primeira avaliação do RN."),
    ("72. Amamentação na sala de parto", "Sim", SN, "RN colocado para amamentar na sala de parto."),
    ("SEÇÃO", "DESFECHO DO RECÉM-NASCIDO (aba RN)"),
    ("73. Tipo de desfecho do RN", "Sim", "Alta / Internação em unidade neonatal / Transferência para outro hospital / Óbito",
     "Alta: saída viva para casa sem internação em unidade neonatal. Internação em UN quando precisou de cuidados nela no hospital."),
    ("74. Amamentação exclusiva à alta", "Sim", SN, "RN em amamentação exclusiva na alta."),
    ("75. Data do desfecho do RN", "Sim", DATA_, "Data da alta, transferência ou óbito."),
    ("SEÇÃO", "CUIDADOS AO RECÉM-NASCIDO (aba RN)"),
    ("76. Teste do reflexo vermelho", "Não", "Realizado sem alterações / Realizado com alterações / Não realizado", "Triagem ocular."),
    ("77. Triagem auditiva", "Não", "Realizado sem alterações / Realizado com alterações / Não realizado", "Teste da orelhinha."),
    ("78. Triagem para cardiopatia congênita crítica (teste do coraçãozinho)", "Não", "Realizado sem alterações / Realizado com alterações / Não realizado", "Oximetria de pulso neonatal."),
    ("79. Vacina BCG (ID)", "Não", SN, "RN recebeu BCG."),
    ("80. Vacina contra hepatite B", "Não", SN, "RN recebeu vacina contra hepatite B."),
    ("81. Diagnóstico de sífilis congênita", "Sim", SN, "Diagnóstico positivo de sífilis congênita no RN."),
    ("SEÇÃO", "MORBIDADE MATERNA GRAVE (aba MM) — no trabalho de parto, parto ou pós-parto"),
    ("81. Apresentou alguma morbidade materna grave?", "Sim", SN, "Se 'Sim', registrar quais morbidades (itens abaixo)."),
    ("81.1 Rotura uterina", "Sim", SN, "Rompimento do miométrio na gravidez ou no trabalho de parto com sangramento ou alteração da vitalidade fetal; não inclui deiscência subclínica de cicatriz vista no ato operatório."),
    ("81.2 Histerectomia pós-infecção ou hemorragia", "Sim", SN, "Retirada do útero por causa infecciosa ou hemorrágica."),
    ("81.3 Hemorragia pós-parto severa", "Sim", SN, "Hemorragia severa no pós-parto."),
    ("81.4 Transfusão ≥ 4 unidades de hemácias", "Não", SN, "Transfusão de hemoderivados (o instrutivo não repete o limiar de 4 unidades no texto)."),
    ("81.5 Pré-eclâmpsia com sinais de gravidade", "Sim", SN, "Sinais ou sintomas de comprometimento clínico e/ou laboratorial."),
    ("81.6 Eclâmpsia", "Não", SN, "Convulsões tônico-clônicas em paciente com pré-eclâmpsia."),
    ("81.7 Síndrome HELLP", "Sim", SN, "Hemólise (esquizócitos, DHL > 600 UI/L ou bilirrubina indireta > 1,2 mg/dL), AST/ALT > 2 vezes o normal e plaquetas < 100.000/mm³, em pré-eclâmpsia."),
    ("81.8 Edema agudo de pulmão", "Não", SN, "Acúmulo de fluido alveolar e intersticial com hipoxemia e esforço respiratório, em geral de causa cardíaca."),
    ("81.9 Descolamento prematuro de placenta", "Não", SN, "Separação parcial ou completa da placenta normalmente inserida antes do nascimento, em geral com 20 semanas ou mais."),
    ("81.10 Insuficiência renal aguda", "Não", SN, "Redução aguda da função renal em horas ou dias."),
    ("81.11 Sepse ou infecção sistêmica grave", "Sim", SN, "Síndrome da resposta inflamatória sistêmica com infecção suspeita ou confirmada."),
    ("81.12 Retorno à sala de cirurgia", "Sim", SN,
     "Retorno em menos de 24 h por complicação ou evolução desfavorável do procedimento anterior. Não contar procedimento com outra finalidade (ex.: laqueadura puerperal) nem curetagem por restos ovulares sem complicação."),
    ("81.13 Laparotomia e/ou laparoscopia", "Sim", SN, "Cirurgia após o parto, por via abdominal convencional ou vídeo."),
    ("81.14 Ocitocina no pós-parto", "Sim", SN, "Uso terapêutico de ocitocina no pós-parto; não considerar a dose profilática."),
    ("81.15 Antibiótico no pós-parto", "Sim", SN, "Antibiótico no pós-parto além da profilaxia."),
    ("81.16 Indicação de UTI", "Sim", SN, "Qualquer indicação de terapia intensiva, transferida ou não."),
    ("81.17 Admissão em UTI", "Sim", SN, "Admitida em leito de UTI no período gravídico-puerperal."),
]

# ----------------------------------------------------------------------------------------------------------------
# MÓDULO ABORTAMENTO (ficha v5, junho/2022). O instrutivo só define o que difere do módulo Parto e Nascimento.
# ----------------------------------------------------------------------------------------------------------------
ABORTO = [
    ("SEÇÃO", "IDENTIFICAÇÃO DA MULHER (aba IDM) — itens 1 a 11 como no módulo Parto e Nascimento, mais:"),
    ("5. Horário da internação da mulher", "Sim", "hh:mm", "Horário da admissão (não existe no módulo Parto e Nascimento)."),
    ("9. Cor da pele da mulher", "Não", "Branca / Preta / Parda / Amarela / Indígena", "Na ficha de abortamento não é obrigatória."),
    ("12. Tipo de desfecho", "Sim", "Alta / Transferência interna / Transferência externa / Óbito", "Mesmas definições do módulo Parto e Nascimento; na ficha de abortamento o desfecho fica na aba de identificação."),
    ("13. Data do desfecho", "Sim", DATA_, "Dia, mês e ano."),
    ("SEÇÃO", "DADOS OBSTÉTRICOS (aba OBS)"),
    ("14 a 17. Nº de gestações, partos normais, cesarianas e abortamentos", "Sim", INT,
     "Como no módulo Parto e Nascimento; o nº de abortamentos é o de abortamentos anteriores ao aborto atual."),
    ("18. Pré-natal nesta gestação", "Sim", SN, "Fez pré-natal na gestação interrompida."),
    ("SEÇÃO", "INFECÇÃO (aba INFC) — itens 19 a 24 como no módulo Parto e Nascimento (um só valor de VDRL), mais:"),
    ("25. Outras infecções", "Não", "Texto livre", "Outras infecções na gestação."),
    ("SEÇÃO", "SITUAÇÕES DE RISCO NA GESTAÇÃO (aba RISCO) — versão reduzida"),
    ("26. Hipertensão", "Sim", SN, "Na ficha de abortamento é só Sim/Não (sem distinção crônica/gestacional)."),
    ("27. Diabetes pré-gestacional", "Não", SN, "Diagnóstico anterior à gestação."),
    ("28 a 32. Internação na gestação, fumo, bebida alcoólica, drogas psicoativas, violência", "Não", SN, "Mesmas definições do módulo Parto e Nascimento."),
    ("SEÇÃO", "INTERNAÇÃO POR ABORTAMENTO (aba INT)"),
    ("33. Tipo de abortamento", "Sim", "Completo / Incompleto / Infectado / Molar / Prenhez ectópica / Gravidez anembrionada / Aborto retido",
     "Completo: eliminação integral do produto conceptual. Incompleto: colo dilatado com membranas ou embrião tocáveis ou visíveis. Infectado: complicado por infecção intrauterina. "
     "Molar: doença trofoblástica. Ectópica: implantação fora da cavidade uterina. Anembrionada: saco gestacional vazio. Retido: embrião morto não expulso."),
    ("34.1 Idade gestacional — semanas", "Sim", INT, "Idade gestacional na internação."),
    ("34.2 Idade gestacional — dias", "Sim", "0 a 6", "Dias além das semanas completas."),
    ("SEÇÃO", "PROCEDIMENTOS REALIZADOS (aba INT)"),
    ("35. Curetagem", "Sim", SN, "Uso de curetas para raspar as paredes do útero e retirar restos ovulares."),
    ("34 (sic). AMIU", "Sim", SN, "Aspiração manual intrauterina realizada."),
    ("36. Aspiração elétrica", "Sim", SN, "Aspiração elétrica realizada."),
    ("37. Misoprostol", "Sim", SN, "Uso de misoprostol."),
    ("38. Outro", "Sim (instrutivo)", "Texto livre", "Outro procedimento de esvaziamento, descrito no campo."),
    ("39. Data do 1º procedimento", "Sim", DATA_, "Data do primeiro procedimento realizado."),
    ("40. Horário do 1º procedimento", "Sim", "hh:mm", "Horário do primeiro procedimento."),
    ("SEÇÃO", "MORBIDADE MATERNA GRAVE (aba MM) — no processo de abortamento"),
    ("41. Apresentou alguma morbidade materna grave?", "Sim", SN, "Se 'Sim', registrar quais."),
    ("42 a 52. Perfuração/rotura uterina; histerectomia pós-infecção ou hemorragia; hemorragia severa pós-abortamento; transfusão ≥ 4 unidades; sepse; retorno à sala de cirurgia; laparotomia/laparoscopia; ocitocina pós-abortamento; antibiótico pós-abortamento; indicação de UTI; admissão em UTI",
     "Sim (exceto transfusão)", SN, "Mesmas definições das morbidades do módulo Parto e Nascimento, aplicadas ao abortamento."),
]

# ----------------------------------------------------------------------------------------------------------------
# MÓDULO CUIDADO NEONATAL (ficha v6, maio/2024; instrutivo abril/2024)
# ----------------------------------------------------------------------------------------------------------------
NEO = [
    ("SEÇÃO", "IDENTIFICAÇÃO DO REGISTRO (aba REG)"),
    ("1. Declaração de Nascido Vivo (DNV)", "Sim", "00-00000000-0", "Identificador do RN no banco; número atribuído pelo Ministério da Saúde, não se repete. Sem o número da DNV o RN não pode ser incluído."),
    ("2. Procedência", "Sim", "Nascido nesse hospital / Nascido fora desse hospital",
     "Nascido no hospital inclui emergência, outro local do hospital ou na rua, desde que chegue vivo à unidade neonatal. Fora: transferido de outra unidade em ambulância."),
    ("3. Nascimento", "Sim", DATA_, "Data do nascimento."),
    ("4. Hora do nascimento", "Sim (instrutivo)", "hh:mm", "Hora e minuto, dois dígitos cada."),
    ("SEÇÃO", "DADOS MATERNOS (aba MAT)"),
    ("5. Idade materna", "Não", "Anos completos", "Idade da mãe em anos completos."),
    ("6. Cor/raça da mulher", "Não", "Branca / Preta / Parda / Amarela / Indígena / Sem informação", "Mesma informação da DNV; entrevista ou prontuário."),
    ("7. Escolaridade", "Não", "< 8 anos / 8 anos / 9 a 11 anos / 12 anos ou mais", "Anos de estudo completos; < 8 inclui nenhum ano."),
    ("8. Fumo", "Não", SN, "Fumou qualquer quantidade em qualquer período da gestação."),
    ("9. Frequência de bebida alcoólica na gestação", "Não", "Não bebia ou no máximo 2 vezes por mês / Semanalmente", "Frequência de uso de álcool na gestação."),
    ("10. Uso de drogas psicoativas na gestação", "Não", SN, "Relato ou registro de uso de qualquer quantidade (maconha, cocaína, crack etc.); cigarro e álcool não entram aqui."),
    ("11. Violência sofrida (psicológica, física ou sexual)", "Não", SN, "Violência sofrida pela mulher durante a gestação, uma ou mais vezes (Convenção de Belém do Pará, 1994)."),
    ("12. Quantas consultas de pré-natal", "Não", "Número / Não realizou consulta", "Consultas de pré-natal realizadas na gestação."),
    ("13. Hipertensão arterial", "Não", SN, "Hipertensão crônica ou induzida pela gravidez registrada no prontuário, ou PA sistólica > 140 ou diastólica > 90 mmHg antes ou durante a gravidez."),
    ("14. Gestação múltipla", "Não", SN, "Dois ou mais fetos vivos documentados em qualquer época da gravidez."),
    ("15. Bolsa rota no parto", "Não", "< 18 h / 18 a 24 h / > 24 h / Não", "Tempo de bolsa rota no momento do parto; íntegra = Não; sem informação = em branco."),
    ("16. Esteroide antenatal", "Sim", SN, "Corticosteroide IM ou EV em qualquer momento antes do parto, mesmo uma dose (betametasona, dexametasona, hidrocortisona)."),
    ("17. Sulfato de magnésio", "Não", SN, "Sulfato de magnésio EV em qualquer momento antes do parto."),
    ("18. Tipo de parto", "Sim", "Vaginal / Fórcipe / Cesáreo (/ Sem informação)",
     "'Vaginal' para qualquer parto vaginal espontâneo ou induzido; 'Fórcipe' quando houve manobra com fórcipe; 'Cesáreo' para qualquer cesariana. RN transferido sem a informação: perguntar à mãe; se impossível, 'Sem informação'."),
    ("SEÇÃO", "DADOS DO NASCIMENTO (aba NASC)"),
    ("19. Sexo", "Não", "Masculino / Feminino / Indeterminado", "'Indeterminado' se não definido até o fim da internação."),
    ("20. Peso de nascimento", "Sim", "Gramas (3 ou 4 dígitos)", "Primeiro peso após o nascimento; se o RN morrer nas primeiras 24 h, pode ser o da necrópsia."),
    ("21. Idade gestacional — semanas", "Sim", INT, "Melhor estimativa: 1º DUM, parâmetros obstétricos e US antes de 22 semanas; 2º New Ballard."),
    ("22. Idade gestacional — dias", "Sim", "0 a 6", "Dias além das semanas completas; semana inteira = 0."),
    ("23. Perímetro cefálico", "Não", "Centímetros, uma decimal", "Medido ao nascimento ou no dia seguinte; fora desse período, deixar em branco."),
    ("24. Reanimação neonatal", "Sim", SN, "Ventilação com pressão positiva, massagem cardíaca ou medicação na sala de parto ou logo após o nascimento. RN transferido: buscar na DNV, no relatório de transferência ou no hospital de origem."),
    ("24.1 Uso de oxigênio (FiO2 > 21%) na ventilação", "Não", SN, "Oxigênio suplementar na reanimação, antes da admissão na UTIN."),
    ("24.2 Ventilação com máscara e balão autoinflável", "Não", SN, "Pressão positiva por máscara facial com balão autoinflável ou anestésico."),
    ("24.3 Ventilação com máscara e ventilador manual com peça T", "Não", SN, "Pressão positiva por máscara facial com ventilador mecânico manual em T."),
    ("24.4 Ventilação com cânula traqueal", "Não", SN, "Pressão positiva por cânula traqueal na reanimação."),
    ("24.5 Massagem cardíaca", "Não", SN, "Massagem cardíaca externa na reanimação."),
    ("24.6 Drogas", "Não", SN, "Adrenalina ou expansão com soro fisiológico, por via endovenosa, traqueal ou intraóssea."),
    ("25. CPAP nasal na sala de parto", "Não", SN, "CPAP por máscara facial, máscara nasal ou pronga nasal antes da admissão na unidade neonatal. RNs do alojamento conjunto não são elegíveis ao monitoramento."),
    ("26. Apgar — primeiro minuto", "Sim", "0 a 10", "RN transferido: buscar no relato da transferência, na DNV ou com a mãe."),
    ("27. Apgar — quinto minuto", "Sim", "0 a 10", "Idem."),
    ("28. Tempo para o clampeamento do cordão", "Não", "< 1 minuto / ≥ 1 minuto", "Do nascimento (extração completa) ao clampeamento."),
    ("29. Medidas para evitar hipotermia na sala de parto", "Sim", SN, "Sala a 23–25 °C, berço de calor radiante e incubadora aquecidos, saco plástico, touca, colchão térmico."),
    ("29.1 Envolveu em saco plástico", "Não", SN, "Medida contra hipotermia."),
    ("29.2 Colocou touca", "Não", SN, "Medida contra hipotermia."),
    ("29.3 Usou colchão térmico", "Não", SN, "Berço aquecido não é colchão térmico; sem colchão na unidade, registrar Não para todos."),
    ("SEÇÃO", "INTERNAÇÃO NOS COMPONENTES DA UNIDADE NEONATAL (aba INT/MC)"),
    ("30. Houve internação na UTIN?", "Sim", SN, "Registrar a internação só quando efetivada (não a indicação sem vaga). Reinternações não são registradas."),
    ("30.1 Data de internação na UTIN", "Não", DATA_, "Primeira internação no componente, pode ser igual à data de nascimento."),
    ("31. Houve internação na UCINCo?", "Não", SN, "Unidade de cuidado intermediário convencional."),
    ("31.1 Data de internação na UCINCo", "Não", DATA_, "Primeira internação no componente."),
    ("32. Houve internação na UCINCa?", "Não", SN, "Unidade de cuidado intermediário canguru."),
    ("32.1 Data de internação na UCINCa", "Não", DATA_, "Primeira internação no componente."),
    ("32.2 Peso do RN no dia da internação na UCINCa", "Não", "Gramas (até 4 dígitos)", "Peso na admissão à UCINCa."),
    ("33. Temperatura medida na 1ª hora de admissão na unidade neonatal", "Sim", SN, "Se 'Sim', abre o campo da temperatura."),
    ("33.1 Temperatura medida", "Sim (se 33 = Sim)", "°C, uma decimal (ex.: 36,0)", "Temperatura axilar na primeira hora, no primeiro componente da UN em que o RN foi internado."),
    ("SEÇÃO", "MÉTODO CANGURU (aba INT/MC)"),
    ("34. Contato pele a pele (posição canguru) na UTIN ou UCINCo", "Sim", SN, "Pelo menos uma vez; posição canguru = RN em contato pele a pele, vertical, junto ao peito dos pais."),
    ("35. Tempo de vida em dias do primeiro contato pele a pele", "Sim", INT, "Idade em dias no primeiro contato pele a pele na UTIN ou UCINCo."),
    ("SEÇÃO", "SISTEMA RESPIRATÓRIO (aba RESP)"),
    ("36. Síndrome do desconforto respiratório (SDR)", "Não", SN,
     "Dois critérios nas primeiras 24 h: PaO2 < 50 mmHg em ar ambiente, cianose central ou necessidade de O2 para manter PaO2 > 50 ou SatO2 > 85%; e raio X compatível (infiltrado reticulogranular, broncogramas). SARA por outras doenças não é SDR."),
    ("37. Adaptação respiratória ou TTRN", "Não", SN, "Dificuldade respiratória nas primeiras horas, raio X com hiperinsuflação e trama vascular aumentada, recuperação em 2 a 4 dias."),
    ("38. Hipertensão pulmonar", "Não", SN, "Ecocardiografia com hipertensão pulmonar; ou VM com FiO2 1,0 sem lesão pulmonar importante com cianose central (PaO2 pós-ductal < 100 ou SatO2 < 90%); ou diferença pré/pós-ductal de PaO2 > 20 mmHg ou SatO2 > 5%."),
    ("39. Hemorragia pulmonar", "Não", SN, "Líquido sanguinolento pelo trato respiratório ou cânula, agudo, com piora clínica (intubação, ou aumento ≥ 10% da pressão inspiratória ou FiO2 com piora radiológica)."),
    ("40. Pneumonia congênita", "Não", SN, "Pneumonia à radiografia até o 3º dia, com fatores de risco e sinais de sepse; síndrome de aspiração de mecônio não conta."),
    ("41. Pneumonia adquirida", "Não", SN, "Pneumonia à radiografia depois do 3º dia de vida."),
    ("42. Pneumotórax associado à ventilação mecânica convencional", "Sim", SN, "Ar extrapleural em RN sob VM convencional, por raio X ou toracocentese."),
    ("43. Oxigênio na unidade neonatal", "Não", SN, "O2 suplementar (FiO2 > 21%) após sair da sala de parto ou do local de reanimação."),
    ("43.1 Tempo total de oxigênio em dias", "Não", INT, "Dias de O2 suplementar; menos de 24 h = 1."),
    ("44. Oxigênio no dia 28 de vida", "Não", SNNA, "O2 suplementar no dia em que completa 28 dias; se já teve alta ou óbito, Não se aplica."),
    ("45. Oxigênio com 36 semanas de idade gestacional corrigida", "Não", SNNA, "O2 suplementar no dia em que completa 36 semanas e 6 dias; se já teve alta ou óbito, Não se aplica."),
    ("46. Ventilação mecânica convencional", "Sim", SN, "Pressão positiva intermitente por cânula traqueal ou traqueostomia com ventilador convencional, após a sala de parto; IMV/SIMV por pronga nasal não conta."),
    ("46.1 Ventilação mecânica convencional em dias", "Não", INT, "Somar todos os períodos de VM na internação; menos de 24 h = 1."),
    ("47. Ventilação mecânica convencional com 36 semanas corrigidas", "Não", SNNA, "VM por cânula ou traqueostomia no dia em que completa 36 semanas e 6 dias."),
    ("48. CPAP nasal", "Sim", SN, "CPAP nasal em qualquer momento após a sala de parto."),
    ("48.1 CPAP nasal antes ou sem nunca ter recebido VM com cânula", "Não", SN, "'Não' se o CPAP só veio depois da ventilação por cânula."),
    ("49. Surfactante em algum momento", "Sim", SN, "Surfactante exógeno em qualquer momento, inclusive na sala de parto."),
    ("49.1 Tempo de vida da primeira dose (horas)", "Não", INT, "Horas de vida na primeira dose; menos de 1 h = 1."),
    ("50. Extubação acidental", "Sim", SN, "Pelo menos uma extubação acidental ou não programada."),
    ("SEÇÃO", "CÉREBRO E ABDOME (aba CA)"),
    ("51. Convulsão até o dia 3 de vida", "Não", SN, "Evidência clínica e/ou eletroencefalográfica até o dia 3; se não internado nesse dia, não preencher."),
    ("52. Hemorragia intracraniana", "Não", "Grau 0 (não houve) / I (matriz germinal) / II (intraventricular sem dilatação) / III (com dilatação) / IV (intraparenquimatosa) / Não realizou exame",
     "Pior grau por imagem (US de crânio, TC ou RM) até o 28º dia de vida; sem informação, deixar em branco."),
    ("53. Enterocolite necrosante", "Sim", SN, "Pelo menos um sinal clínico (aspirado bilioso ou vômitos, distensão, sangue nas fezes) e um radiológico (pneumatose, gás hepatobiliar, pneumoperitônio); perfuração focal não é ECN."),
    ("53.1 Cirurgia ou drenagem abdominal para ECN", "Não", SN, "Laparotomia, laparoscopia, ressecção intestinal ou dreno peritoneal."),
    ("SEÇÃO", "INFECÇÃO (aba INFC)"),
    ("54. Infecção precoce (≤ 48 h de vida)", "Sim", SN, "Manifestação clínica até 48 h completas; suspeita descartada com suspensão do antibiótico = Não."),
    ("54.1 Confirmada por hemocultura?", "Não", SN, "Para a infecção precoce."),
    ("55. Infecção tardia (> 48 h de vida)", "Sim", SN, "Manifestação clínica após 48 h; suspeita descartada = Não."),
    ("55.1 Confirmada por hemocultura?", "Não", SN, "Para a infecção tardia."),
    ("56. Antibiótico com início na primeira semana de vida para sepse", "Sim", "Não usou / ≤ 48 h / > 48 h a ≤ 72 h / > 72 h a ≤ 7 dias / > 7 dias / Sem informação", "Tempo de uso do antibiótico sistêmico iniciado na primeira semana."),
    ("57. Tratamento para sífilis congênita", "Não", "Sim, teve sífilis e tratou / Não tratou, mas teve sífilis / Não se aplica", "'Não se aplica' quando não havia o diagnóstico."),
    ("58. Pneumonia associada à ventilação mecânica", "Não", SN, "Pelo menos um diagnóstico de PAV em RN sob VM, com evidência radiológica."),
    ("59. Infecção primária de corrente sanguínea associada a cateter central (ICS-cat)", "Não", SN, "Pelo menos um diagnóstico clínico e/ou laboratorial; RN que nunca usou cateter: deixar em branco."),
    ("60. Drogas vasoativas até o dia 3 de vida", "Sim", SN, "Dopamina, dobutamina, adrenalina, noradrenalina ou milrinona até o dia 3; não contar as usadas na reanimação."),
    ("SEÇÃO", "ACESSO VASCULAR APÓS ADMISSÃO NA UNIDADE NEONATAL (aba AV)"),
    ("61. Epicutâneo (PICC)", "Não", SN, "Cateter epicutâneo após a admissão na UN."),
    ("61.1 Duração em dias do epicutâneo", "Não", INT, "Total de dias, somando mais de um cateter se houve."),
    ("62. Dissecção venosa", "Não", SN, "Cateter central por dissecção ou por punção com Intracath."),
    ("62.1 Duração em dias da dissecção venosa", "Não", INT, "Total de dias de todos os cateteres."),
    ("63. Cateter umbilical venoso", "Não", SN, "Após o nascimento e/ou a admissão na UN."),
    ("63.1 Duração em dias", "Não", INT, "Dias de uso."),
    ("64. Cateter umbilical arterial", "Não", SN, "Após o nascimento e/ou a admissão na UN."),
    ("64.1 Duração em dias", "Não", INT, "Dias de uso."),
    ("SEÇÃO", "NUTRIÇÃO DURANTE A INTERNAÇÃO (aba NUTR)"),
    ("65. Aminoácido no primeiro dia de vida", "Não", SNNA, "'Sim' se tinha indicação e recebeu; 'Não' se tinha indicação e não recebeu; 'Não se aplica' sem indicação. Parenteral plena no lugar do soro com aminoácido: registrar Não aqui e Sim na parenteral."),
    ("66. Parenteral plena ou total", "Sim", SNNA, "Nutrição parenteral endovenosa plena ou total (só aminoácidos não conta)."),
    ("66.1 Tempo de vida no primeiro dia de parenteral", "Não", INT, "Dias de vida; iniciada nas primeiras 24 h = 1."),
    ("66.2 Duração da parenteral em dias", "Não", INT, "Tempo total, somando períodos interrompidos (ex.: 5 + 7 = 12)."),
    ("67. Enteral", "Sim", "Sim / Não / Sem informação", "Nutrição enteral, inclusive sucção ao seio; colostroterapia em gotas na mucosa oral não conta."),
    ("67.1 Tempo de vida no primeiro dia de enteral", "Não", INT, "Dias de vida; iniciada nas primeiras 24 h = 1."),
    ("67.2 Tipo da primeira enteral", "Não", "Leite materno e/ou colostro (sem colostroterapia) / Leite humano pasteurizado / Fórmula", "Registrar só a primeira enteral."),
    ("SEÇÃO", "RETINOPATIA DA PREMATURIDADE (aba ROP/AC)"),
    ("68. Exame de fundo de olho realizado na internação?", "Sim", SN, "Pelo menos um exame por oftalmoscopia indireta para ROP; oftalmoscopia direta e teste do reflexo vermelho não contam."),
    ("68.1 Pior grau da retinopatia", "Não", "Sem ROP / 1 / 2 / 3 / 4 / 5", "Uma só resposta, se o exame foi realizado."),
    ("68.2 Realizou cirurgia para ROP?", "Não", SN, "Criocirurgia ou laser, inclusive se feita em outro hospital com retorno à unidade."),
    ("SEÇÃO", "ANOMALIA CONGÊNITA (aba ROP/AC)"),
    ("Anomalia congênita (grupos)", "Não", "Múltipla escolha: SNC / Cardíacas / Gastrintestinais / Geniturinárias / Cromossômicas / Pulmonares / Outros defeitos congênitos",
     "Um ou mais grupos identificados no RN; sem anomalia, deixar em branco. A lista de anomalias de cada grupo está no instrutivo (ex.: anencefalia, tetralogia de Fallot, gastrosquise, trissomias 13, 18 e 21, hérnia diafragmática)."),
    ("69. Qual?", "Não", "Texto livre", "Descrição da anomalia, de preferência com os termos da lista do instrutivo; não aparece nos relatórios automáticos."),
    ("70. Cirurgia por anomalia congênita", "Não", SN, "Cirurgia realizada por anomalia congênita, inclusive em outro hospital com retorno à unidade."),
    ("SEÇÃO", "DESFECHO (aba DESF)"),
    ("71. Tipo de desfecho", "Sim", "Alta hospitalar / Transferência / Óbito", "Alta: saída viva para a residência ou para o alojamento conjunto. Transferência: outro hospital, para tratamento mais ou menos complexo."),
    ("72. Data do desfecho", "Sim", DATA_, "Alta da UN (inclusive para o alojamento conjunto), transferência ou óbito. RN internado até 180 dias: finalizar como alta nessa data."),
    ("73. Peso em gramas no desfecho", "Sim", "Gramas", "Peso no dia da alta, transferência ou óbito."),
    ("74. Perímetro cefálico no desfecho", "Sim (instrutivo)", "Centímetros, uma decimal", "No dia da alta, transferência ou óbito."),
    ("75. Dieta prescrita na alta da unidade neonatal", "Não", "Leite materno / Leite materno + fórmula / Fórmula", "Para desfecho alta; leite materno inclui ordenhado; fórmula exclusiva de qualquer tipo."),
    ("76. Local do óbito", "Não", "UTI neonatal / Local de parto ou centro obstétrico / Outros espaços", "Para desfecho óbito."),
    ("77. Causa do óbito", "Não", "Sepse / Hemorragia intracraniana / Asfixia perinatal / Hemorragia pulmonar / Pneumotórax / Anomalia ou malformação congênita / Distúrbio metabólico",
     "Diagnóstico principal da causa terminal (doença ou lesão que levou diretamente à morte)."),
    ("78. Outra causa?", "Não", SN, "Outra causa além das listadas."),
]

# ----------------------------------------------------------------------------------------------------------------
# Correspondência com as fontes usadas nos painéis (SINASC, SIH, CNES)
# ----------------------------------------------------------------------------------------------------------------
CORRESP = [
    ("Tipo de parto (Parto e Nascimento 51; Neonatal 18)", "SINASC PARTO (1 vaginal, 2 cesáreo); SIH PROC_REA 0310010039/47/55 (vaginal) e 0411010026/34/42 (cesariana)",
     "O SMCON separa normal, fórceps, vácuo, cesárea eletiva e cesárea em trabalho de parto; o SINASC só vaginal × cesáreo. Compatível no nível vaginal × cesárea."),
    ("Profissional que assistiu o parto (Parto e Nascimento 55)", "SINASC TPNASCASSI (1 médico, 2 enfermeira/obstetriz, 3 parteira, 4 outros, 9 ignorado)",
     "No SMCON a categoria exige enfermeiro(a) obstetra ou obstetriz com especialização; no SINASC 'enfermeira/obstetriz' não distingue especialização. O indicador do painel, baseado no SINASC, é mais amplo."),
    ("Apgar 5º minuto (Parto e Nascimento 67; Neonatal 27)", "SINASC APGAR5", "Mesma escala de 0 a 10. O módulo Parto e Nascimento não tem peso < 2.500 g nem anomalia como filtro; o recorte do indicador de asfixia (≥ 2.500 g sem anomalia) vem do painel, não do SMCON."),
    ("Peso do RN (Parto e Nascimento 63; Neonatal 20)", "SINASC PESO", "Mesma definição: primeiro peso após o nascimento, em gramas."),
    ("Anomalia congênita (Neonatal, aba ROP/AC)", "SINASC IDANOMAL (1 sim, 2 não, 9 ignorado) e CODANOMAL (CID-10)",
     "O SMCON registra grupos de anomalia só para RN internado na unidade neonatal; o SINASC registra para todo nascido vivo."),
    ("Idade gestacional (Parto e Nascimento 64–65; Neonatal 21–22)", "SINASC SEMAGESTAC (semanas) e GESTACAO (faixas)", "SMCON em semanas e dias; SINASC em semanas completas."),
    ("Grupos de Robson", "SINASC TPROBSON (1 a 10)",
     "O SMCON não calcula Robson, mas coleta os componentes: paridade (12–14), cesárea anterior (14), tipo de gestação (40), apresentação (41), trabalho de parto (42), idade gestacional (18). O painel usa o TPROBSON do SINASC."),
    ("AMIU, curetagem, aspiração elétrica, misoprostol (Abortamento 34–37)", "SIH PROC_REA 0409060070 (AMIU) e 0411020013 (curetagem pós-abortamento)",
     "O SMCON registra cada procedimento por ficha de abortamento; o SIH registra o procedimento principal da AIH. O indicador do painel (AMIU ÷ AMIU + curetagem) não considera aspiração elétrica nem misoprostol."),
    ("Internação na UTIN, UCINCo e UCINCa (Neonatal 30–32)", "CNES-LT CODLEITO 80/81/82 (UTIN), 92 (UCINCo), 93 (UCINCa)",
     "O SMCON registra a internação do RN em cada componente; o CNES registra a existência dos leitos. O indicador 'unidade neonatal completa' do painel usa só o CNES."),
    ("Violência psicológica/física/sexual na gestação (Parto e Nascimento 36; Neonatal 11)", "Nenhuma fonte do painel",
     "Conceito diferente do indicador 'atendimento a vítima de violência sexual' (SIA 0301040052 e 0301040060, atendimento prestado pelo serviço)."),
    ("Morbidade materna grave (Parto e Nascimento 81; Abortamento 41)", "SIH-RD e SIH-SP (critérios do Observatório Obstétrico Brasileiro usados no painel de Internação)",
     "O SMCON registra a condição clínica declarada; o SIH infere por procedimentos, diárias de UTI e diagnósticos."),
]


def main():
    blocos = [
        P("DICIONÁRIO DE DADOS DO SMCON — SISTEMA DE MONITORAMENTO DO CUIDADO OBSTÉTRICO E NEONATAL (IFF/FIOCRUZ, ESTRATÉGIA QUALINEO)"),
        P(f"Versão de {DATA[8:]}/{DATA[5:7]}/{DATA[:4]}. Compilado a partir dos documentos públicos do Portal de Boas Práticas em Saúde da Mulher, da Criança e do Adolescente "
          "(IFF/Fiocruz): os instrutivos dos módulos Parto e Nascimento e Abortamento e do módulo Cuidado Neonatal (ambos de abril de 2024) e as fichas de coleta de dados "
          "dos três módulos (Parto e Nascimento v6, maio/2024; Abortamento v5, junho/2022; Cuidado Neonatal v6, maio/2024). A numeração das variáveis é a das fichas; "
          "a obrigatoriedade segue a marcação com asterisco na ficha e a expressão 'variável obrigatória' no instrutivo (quando divergem, as duas são indicadas); "
          "as definições resumem o texto do instrutivo."),
        P("O que é o SMCON. Sistema web do IFF/Fiocruz (smcon.iff.fiocruz.br) para monitoramento do cuidado nas maternidades da estratégia QualiNEO, alimentado pelas "
          "próprias unidades por fichas individuais (uma por mulher internada para parto ou abortamento; uma por recém-nascido internado na unidade neonatal). "
          "As fichas são preenchidas em papel ao longo da internação, revistas no desfecho e digitadas no sistema. Perfis de acesso: serviço (inclui, altera e vê só a "
          "própria unidade), gestor municipal e estadual (veem as unidades do seu território), coordenador e administrador (o único que exclui registros). "
          "O sistema gera relatórios automáticos; os instrutivos afirmam que as variáveis 'irão prover um conjunto de indicadores prioritários', mas não publicam a lista nem "
          "as fórmulas desses indicadores."),
        P("Módulos e população-alvo. Parto e Nascimento e Abortamento (registros a partir de 01/01/2022): todas as mulheres e pessoas que gestam internadas para parto ou em "
          "situação de abortamento, em leitos clínicos ou intensivos, inclusive as que evoluíram para óbito e as que pariram fora do hospital ou em trânsito; em gestação "
          "múltipla, uma ficha de RN por bebê. Cuidado Neonatal: todos os RN internados em qualquer componente da unidade neonatal (UTIN, UCINCo, UCINCa), nascidos no "
          "hospital ou transferidos, inclusive os internados por motivo materno e os que morreram logo após o parto sem internação; não entram os RN que foram ao alojamento "
          "conjunto nem as reinternações. O relatório do IFF de 2026 menciona um módulo de Cuidado Pré-natal, sem instrutivo público."),
        P("Fontes: " + " · ".join(f"{t} ({u})" for t, u in FONTES)),
        P("Tabela 1. Módulo Parto e Nascimento"),
        tabela(["VARIÁVEL (nº na ficha)", "OBRIGATÓRIA", "OPÇÕES / FORMATO", "DEFINIÇÃO E REGRA DE PREENCHIMENTO (instrutivo)"], PARTO),
        P("Tabela 2. Módulo Abortamento (só o que difere do módulo Parto e Nascimento)"),
        tabela(["VARIÁVEL (nº na ficha)", "OBRIGATÓRIA", "OPÇÕES / FORMATO", "DEFINIÇÃO E REGRA DE PREENCHIMENTO (instrutivo)"], ABORTO),
        P("Tabela 3. Módulo Cuidado Neonatal"),
        tabela(["VARIÁVEL (nº na ficha)", "OBRIGATÓRIA", "OPÇÕES / FORMATO", "DEFINIÇÃO E REGRA DE PREENCHIMENTO (instrutivo)"], NEO),
        P("Tabela 4. Correspondência entre variáveis do SMCON e as fontes usadas nos painéis (SINASC, SIH, CNES, SIA)"),
        tabela(["VARIÁVEL DO SMCON", "VARIÁVEL EQUIVALENTE NOS PAINÉIS", "OBSERVAÇÃO"], CORRESP),
        P("Notas"),
        P("1. Regras gerais de preenchimento. Datas parcialmente desconhecidas: dia 15 e, se preciso, mês de junho. Campos obrigatórios marcados com asterisco; cada aba "
          "precisa ser salva e o registro só é computado após 'Finalizar e confirmar'. Registros salvos sem envio ficam em amarelo e podem ser editados; a exclusão é "
          "exclusiva do administrador."),
        P("2. O que os instrutivos não trazem. Não há definição de 'adesão' de uma unidade ao SMCON, nem critério de completude ou volume mínimo de fichas; a lista de "
          "unidades aderidas usada no painel de partos (SMCON NEO e SMCON OBST, 2024) é fornecida pelo IFF e seu critério não está documentado. Não há fórmulas, "
          "denominadores nem metas de indicador (o 'instrutivo de uso do sistema' e os indicadores ficam na Plataforma de Interação QualiNEO, de acesso restrito). "
          "Não há tabela de códigos (SIGTAP, CID) nem dicionário de exportação da base."),
        P("3. Diferenças entre instrutivo e ficha. A ficha de Parto e Nascimento v6 traz 'Não se aplica' na amniotomia e 'Petidina injetável' como opção de analgesia, onde o "
          "instrutivo diz 'Opioides injetável'; o item 57.1 chama-se 'Analgesia' na ficha e 'Anestesia' no instrutivo; a numeração da ficha repete o 63 (peso e sexo) e o 81 "
          "(sífilis congênita e morbidade materna); a ficha de abortamento repete o 34. A ficha de Cuidado Neonatal mantém o nome de arquivo 'v2dez20', mas o conteúdo é a "
          "versão 6 de maio/2024."),
        P("4. Nomes dos módulos no painel de partos. A planilha institucional usa 'SMCON NEO' e 'SMCON OBST'; os módulos do sistema chamam-se Cuidado Neonatal, "
          "Parto e Nascimento e Abortamento. Falta confirmar com o IFF se 'OBST' corresponde ao módulo Parto e Nascimento apenas ou também ao de Abortamento."),
    ]
    os.makedirs(os.path.dirname(SAIDA_JSON), exist_ok=True)
    json.dump(blocos, open(SAIDA_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # versão de leitura em Markdown
    md = []
    for b in blocos:
        if b["tipo"] == "p":
            t = b["texto"]
            if t.isupper() or t.startswith("Tabela ") or t == "Notas":
                md.append(("# " if t.isupper() else "## ") + t)
            else:
                md.append(t)
            md.append("")
        else:
            cab = [c[0] for c in b["linhas"][0]]
            md.append("| " + " | ".join(cab) + " |"); md.append("|" + "---|" * len(cab))
            for l in b["linhas"][1:]:
                if len(l) == 1:
                    md.append("| **" + l[0][0] + "** |" + " |" * (len(cab) - 1))
                else:
                    md.append("| " + " | ".join("<br>".join(c).replace("|", "/") for c in l) + " |")
            md.append("")
    open(SAIDA_MD, "w", encoding="utf-8", newline="\n").write("\n".join(md))
    n = {k: sum(1 for l in v if l[0] != "SEÇÃO") for k, v in (("parto", PARTO), ("aborto", ABORTO), ("neo", NEO), ("corresp", CORRESP))}
    print(f"gravado {SAIDA_JSON} e {SAIDA_MD} | variáveis: {n}")


if __name__ == "__main__":
    main()
