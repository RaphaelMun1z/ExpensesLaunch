# expensesLaunch

Controle mensal de gastos com interface inspirada no SchedLaunch.

## Executar

Abra `index.html` com Live Server ou outro servidor HTTP local.

## Alterar código

`npm install` e `npm run build` para compilar TypeScript e SCSS.

Os dados ficam no localStorage. Use os botões de exportação e importação para fazer backup em JSON.

## Navegação SPA

O app usa uma única base em `index.html`. O cabeçalho e o rodapé permanecem
montados enquanto a área central alterna entre **Registros** e **Analítico**,
sem recarregar a página. O mês selecionado acompanha a navegação.
Os botões voltar e avançar do navegador também funcionam.

Rotas: `index.html#/registros?mes=2026-11` e
`index.html#/analitico?mes=2026-11`. As rotas com hash funcionam em hospedagens
estáticas como GitHub Pages. O endereço antigo `analytics.html?mes=2026-11`
redireciona para o Analítico da SPA.

## Analítico

- Linha e área para evolução de gastos e saldo em janelas de 6 ou 12 meses.
- Rosca para participação das categorias e filtro dos lançamentos.
- Barras divergentes para comparar categorias com o mês anterior, pelo nome
  da categoria, mesmo quando seus identificadores são diferentes.
- Cascata para mostrar como as categorias consomem o saldo inicial.
- Destaques da maior variação, do maior lançamento e da média mensal anterior.
- Busca, filtro e ordenação dos lançamentos do mês.

Meses sem registros não viram gastos fictícios no gráfico. A média histórica
considera apenas meses anteriores com despesas dentro da janela selecionada.
A cascata ordena categorias por valor e não representa uma sequência diária:
os registros atuais não possuem uma data individual de lançamento.
Sem saldo configurado, o restante e a cascata indicam essa ausência.

O cabeçalho permite editar o saldo inicial, duplicar categorias e importar ou
exportar dados nas duas áreas. A leitura dos gráficos não altera os registros.
Não há bibliotecas externas de gráficos nem dados de exemplo.
Para publicar, inclua os arquivos HTML, CSS, JavaScript compilados e a logo
no mesmo diretório.
