# expensesLaunch

Controle mensal de gastos com interface inspirada no SchedLaunch.

## Executar

Abra `index.html` com Live Server ou outro servidor HTTP local.

## Alterar código

`npm ci` e `npm run build` para compilar TypeScript e SCSS.

## Publicar no GitHub Pages

O workflow em `.github/workflows/pages.yml` compila o app e publica os arquivos
estáticos automaticamente a cada push para `main`. Para habilitar a publicação,
abra **Settings → Pages** no repositório e escolha **GitHub Actions** em
**Build and deployment → Source**. Também é possível iniciar a publicação
manualmente na aba **Actions**, executando **Deploy GitHub Pages**.

Depois que a execução terminar, o endereço do site aparece no ambiente
`github-pages` da execução. A navegação usa rotas com hash e os assets são
relativos, então funciona no endereço de projeto do GitHub Pages.

Os dados ficam no localStorage. Use os botões de exportação e importação para fazer backup em JSON.

Ao adicionar uma despesa, marque **Parcelar em vários meses** para repetir o
valor mensal a partir do mês atual. O app cria automaticamente a categoria
correspondente nos meses necessários e identifica cada parcela na listagem.

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

- Gráfico de setores para participação das categorias no mês selecionado.
- Gráfico de linhas para acompanhar gastos e restante em janelas de 6 ou 12 meses.
- Barras para comparar os gastos acumulados por categoria no período selecionado.
- Destaques da maior variação, do maior lançamento e da média mensal anterior.
- Busca, filtro e ordenação dos lançamentos do mês.

Meses sem registros não viram gastos fictícios no gráfico. A média histórica
considera apenas meses anteriores com despesas dentro da janela selecionada.
Sem saldo configurado, o gráfico não inventa valores de restante.

O cabeçalho permite editar o saldo inicial, duplicar categorias e importar ou
exportar dados nas duas áreas. A leitura dos gráficos não altera os registros.
Não há bibliotecas externas de gráficos nem dados de exemplo.
Para publicar, inclua os arquivos HTML, CSS, JavaScript compilados e a logo
no mesmo diretório.
