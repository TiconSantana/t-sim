# Instruções do projeto T-Sim

## Objetivo

Construir o T-Sim conforme `docs/T-SIM_BLUEPRINT.md`. O produto simula cargos, promoções, desligamentos, orçamento, custos operacionais e cobertura de equipes para apoiar decisões aprováveis.

## Regras obrigatórias

- Leia o blueprint antes de alterar domínio, dados ou UI.
- Mantenha regras de cálculo fora dos componentes de interface.
- Não transforme valores de referência em constantes de frontend.
- Registre fonte, vigência, versão e responsável das premissas.
- Rotule ROI, retenção, turnover, produtividade e payback como estimativas até que dados históricos validem outra classificação.
- Não aprovar nem exportar cenário com erro, cobertura insuficiente sem justificativa ou premissa sem fonte.
- Toda tela nova deve declarar objetivo, decisão, público, dados/unidades/fontes, estados, responsividade, acessibilidade e limitações.
- Aplique T-Vision Telecom Lab: visual técnico detalhado, contexto de campo, azul e laranja TConnect, texto editável e referências usadas apenas para estrutura.
- Não usar minimalismo genérico, ícones decorativos, cards vazios ou equipamentos fictícios.

## Fontes do domínio

Os anexos fornecidos pelo responsável são referências de dados e comportamento. A base inicial de cargos usa seis níveis de fibra óptica e 113% de encargos. A planilha de custos operacionais alimenta os módulos Budget e Ops e não deve ser misturada silenciosamente com a regra simplificada de cargos.

## Forma de trabalho

- Inspecione o repositório antes de criar arquivos.
- Faça mudanças pequenas e executáveis.
- Atualize documentação e migrações junto com o código.
- Verifique o que foi alterado; não alegue validação que não foi executada.
- Ao final de cada fase, reporte arquivos, regras entregues, lacunas e riscos.
