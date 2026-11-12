import { deslocarMes, janelaMensal, mesValido, resumirMes, compararCategorias, referenciaHistorica } from "./analytics-model.js";
import { analyticsTemplate } from "./analytics-template.js";
import { graficoTendencia, mensagemGrafico } from "./analytics-charts.js";
export class AnalyticsView {
    controle;
    aoSelecionarMes;
    element = document.createElement("section");
    dados;
    versao = -1;
    periodo = 6;
    mes = "";
    categoria = "";
    busca = "";
    ordemDecrescente = true;
    moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
    cores = ["#ff705f", "#b7a0f0", "#67c4ce", "#dca776", "#79c3a0", "#9aa9dd"];
    constructor(controle, aoSelecionarMes) {
        this.controle = controle;
        this.aoSelecionarMes = aoSelecionarMes;
        this.dados = controle.lerDados();
        this.element.className = "analytics-main";
        this.element.innerHTML = analyticsTemplate;
        this.eventos();
    }
    atualizar(mes, versao) {
        if (this.mes === mes && this.versao === versao)
            return;
        if (this.mes !== mes) {
            this.categoria = "";
            this.busca = "";
            this.el("expenseSearch").value = "";
        }
        this.mes = mes;
        this.versao = versao;
        this.dados = this.controle.lerDados();
        this.renderizar();
    }
    el(id) {
        const elemento = this.element.querySelector("#" + id);
        if (!elemento)
            throw new Error("Elemento ausente: " + id);
        return elemento;
    }
    nomeMes(mes, curto = false) {
        const [ano, numero] = mes.split("-").map(Number);
        return new Date(ano, numero - 1, 1).toLocaleDateString("pt-BR", { month: curto ? "short" : "long", year: curto ? "2-digit" : "numeric" });
    }
    eventos() {
        this.element.querySelectorAll("[data-range]").forEach(botao => botao.addEventListener("click", () => {
            this.periodo = Number(botao.dataset.range);
            this.element.querySelectorAll("[data-range]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.range) === this.periodo)));
            this.renderizarGraficosPeriodo();
            this.renderizarDestaques(resumirMes(this.dados, this.mes));
        }));
        this.el("categoryFilter").addEventListener("change", e => {
            this.categoria = e.currentTarget.value;
            const resumo = resumirMes(this.dados, this.mes);
            this.renderizarCategorias(resumo);
            this.renderizarTabela(resumo);
        });
        this.el("expenseSearch").addEventListener("input", e => {
            this.busca = e.currentTarget.value;
            this.renderizarTabela(resumirMes(this.dados, this.mes));
        });
        this.el("sortAmount").addEventListener("click", () => {
            this.ordemDecrescente = !this.ordemDecrescente;
            this.renderizarTabela(resumirMes(this.dados, this.mes));
        });
    }
    selecionarMes(mes) { if (mesValido(mes))
        this.aoSelecionarMes(mes); }
    renderizar() {
        const resumo = resumirMes(this.dados, this.mes);
        this.el("analyticsPeriod").textContent = this.nomeMes(this.mes);
        this.el("analyticsEmpty").hidden = resumo.despesas.length > 0;
        this.renderizarResumo(resumo);
        this.renderizarGraficosPeriodo();
        this.renderizarFiltro(resumo);
        this.renderizarCategorias(resumo);
        this.renderizarDestaques(resumo);
        this.renderizarTabela(resumo);
    }
    renderizarResumo(resumo) {
        this.el("metricSpent").textContent = this.moeda.format(resumo.total);
        this.el("metricBalance").textContent = resumo.saldo === null ? "—" : this.moeda.format(resumo.saldo);
        this.el("metricBalanceHint").textContent = resumo.saldo === null ? "Configure o saldo no cabeçalho." : "Valor definido para este mês.";
        const restante = this.el("metricRemaining");
        restante.textContent = resumo.restante === null ? "—" : this.moeda.format(resumo.restante);
        restante.classList.toggle("negative", resumo.restante !== null && resumo.restante < 0);
        restante.classList.toggle("positive", resumo.restante !== null && resumo.restante >= 0);
        this.el("metricCount").textContent = String(resumo.despesas.length);
        this.el("metricAverage").textContent = resumo.despesas.length ? "Valor médio de " + this.moeda.format(resumo.media) : "Nenhuma despesa neste mês.";
        const anterior = resumirMes(this.dados, deslocarMes(this.mes, -1));
        const comparacao = this.el("metricComparison");
        comparacao.classList.remove("positive", "negative");
        if (!resumo.temDados)
            comparacao.textContent = "Sem registros neste mês para comparar.";
        else if (!anterior.temDados)
            comparacao.textContent = "Sem registros no mês anterior.";
        else if (anterior.total === 0)
            comparacao.textContent = "O mês anterior não teve despesas.";
        else {
            const diferenca = Math.round((resumo.total - anterior.total) * 100) / 100;
            const porcentagem = this.percentual.format(Math.abs(diferenca / anterior.total) * 100);
            comparacao.textContent = diferenca === 0 ? "Mesmo valor do mês anterior." : porcentagem + "% a " + (diferenca > 0 ? "mais" : "menos") + " que o mês anterior.";
            comparacao.classList.toggle("positive", diferenca < 0);
            comparacao.classList.toggle("negative", diferenca > 0);
        }
        const progresso = this.el("balanceProgress");
        progresso.hidden = resumo.saldo === null || resumo.saldo === 0;
        if (resumo.saldo === null)
            this.el("metricUsage").textContent = "Defina o saldo inicial para acompanhar.";
        else if (resumo.saldo === 0)
            this.el("metricUsage").textContent = resumo.total > 0 ? "As despesas excedem o saldo inicial." : "Saldo inicial de " + this.moeda.format(0);
        else {
            const uso = resumo.total / resumo.saldo * 100;
            this.el("metricUsage").textContent = this.percentual.format(uso) + "% do saldo utilizado.";
            this.el("balanceProgressFill").style.width = String(Math.min(100, uso)) + "%";
            progresso.setAttribute("aria-valuenow", String(Math.min(100, Math.round(uso))));
            progresso.setAttribute("aria-valuetext", this.percentual.format(uso) + "% do saldo utilizado");
            progresso.classList.toggle("is-over", uso > 100);
        }
    }
    renderizarGraficosPeriodo() {
        const historico = janelaMensal(this.mes, this.periodo).filter(mesValido).map(mes => resumirMes(this.dados, mes));
        this.el("historySubtitle").textContent = "Evolução mensal nos últimos " + this.periodo + " meses.";
        graficoTendencia(this.el("trendChart"), historico, this.mes, mes => this.selecionarMes(mes));
        this.el("periodCategoriesSubtitle").textContent = "Total acumulado nos últimos " + this.periodo + " meses.";
        this.renderizarCategoriasPeriodo(historico);
    }
    renderizarCategoriasPeriodo(historico) {
        const container = this.el("periodCategoryChart");
        container.replaceChildren();
        const grupos = new Map();
        const normalizar = (nome) => nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
        for (const mes of historico)
            for (const categoria of mes.categorias) {
                if (categoria.total <= 0)
                    continue;
                const chave = normalizar(categoria.nome);
                const grupo = grupos.get(chave) ?? { nome: categoria.nome, centavos: 0 };
                grupo.nome = categoria.nome;
                grupo.centavos += Math.round(categoria.total * 100);
                grupos.set(chave, grupo);
            }
        const categorias = [...grupos.values()].sort((a, b) => b.centavos - a.centavos);
        if (!categorias.length) {
            mensagemGrafico(container, "As categorias com gastos aparecerão aqui no período selecionado.");
            return;
        }
        const maior = categorias[0].centavos;
        for (const [indice, categoria] of categorias.entries()) {
            const linha = document.createElement("div");
            linha.className = "period-category-row";
            const cabecalho = document.createElement("div");
            cabecalho.className = "period-category-heading";
            const nome = document.createElement("span");
            nome.textContent = categoria.nome;
            const valor = document.createElement("strong");
            valor.textContent = this.moeda.format(categoria.centavos / 100);
            cabecalho.append(nome, valor);
            const trilho = document.createElement("div");
            trilho.className = "period-category-track";
            trilho.setAttribute("role", "img");
            const porcentagem = categoria.centavos / categorias.reduce((soma, item) => soma + item.centavos, 0) * 100;
            trilho.setAttribute("aria-label", categoria.nome + ": " + this.moeda.format(categoria.centavos / 100) + ", " + this.percentual.format(porcentagem) + "% dos gastos no período");
            const barra = document.createElement("span");
            barra.style.width = categoria.centavos / maior * 100 + "%";
            barra.style.background = this.cores[indice % this.cores.length];
            trilho.append(barra);
            const detalhe = document.createElement("small");
            detalhe.textContent = this.percentual.format(porcentagem) + "% do total do período";
            linha.append(cabecalho, trilho, detalhe);
            container.append(linha);
        }
    }
    renderizarFiltro(resumo) {
        if (!resumo.categorias.some(categoria => categoria.id === this.categoria))
            this.categoria = "";
        const filtro = this.el("categoryFilter");
        filtro.replaceChildren(new Option("Todas as categorias", ""));
        for (const categoria of [...resumo.categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
            filtro.append(new Option(categoria.nome, categoria.id));
        filtro.value = this.categoria;
    }
    renderizarCategorias(resumo) {
        const grafico = this.el("categoryChart");
        grafico.replaceChildren();
        const categorias = resumo.categorias.filter(categoria => categoria.total > 0).sort((a, b) => b.total - a.total);
        const donut = this.el("donutChart");
        donut.replaceChildren();
        donut.hidden = categorias.length === 0;
        if (categorias.length) {
            let acumulado = 0;
            const fatias = categorias.map((categoria, i) => {
                const inicio = acumulado;
                acumulado += categoria.total / resumo.total * 100;
                return this.cores[i % this.cores.length] + " " + inicio + "% " + acumulado + "%";
            });
            const anel = document.createElement("div");
            anel.className = "donut-ring";
            anel.style.background = "conic-gradient(" + fatias.join(",") + ")";
            anel.setAttribute("role", "img");
            anel.setAttribute("aria-label", categorias.map(c => c.nome + ": " + this.moeda.format(c.total)).join("; "));
            const centro = document.createElement("div");
            centro.className = "donut-center";
            const rotulo = document.createElement("span");
            rotulo.textContent = "TOTAL DO MÊS";
            const total = document.createElement("strong");
            total.textContent = this.moeda.format(resumo.total);
            centro.append(rotulo, total);
            anel.append(centro);
            donut.append(anel);
            const concentracao = categorias.slice(0, 3).reduce((soma, c) => soma + c.total, 0) / resumo.total * 100;
            this.el("concentrationNote").textContent = this.percentual.format(concentracao) + "% dos gastos estão " + (categorias.length === 1 ? "nesta categoria." : "nas " + Math.min(3, categorias.length) + " maiores categorias.");
        }
        else
            this.el("concentrationNote").textContent = "";
        if (!categorias.length) {
            const vazio = document.createElement("div");
            vazio.className = "analytics-chart-empty";
            const icone = document.createElement("span");
            icone.className = "material-symbols-rounded";
            icone.textContent = "donut_small";
            icone.setAttribute("aria-hidden", "true");
            const texto = document.createElement("span");
            texto.textContent = "Suas categorias aparecerão aqui quando houver despesas.";
            vazio.append(icone, texto);
            grafico.append(vazio);
            return;
        }
        categorias.forEach((categoria, i) => {
            const cor = this.cores[i % this.cores.length];
            const participacao = categoria.total / resumo.total * 100;
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "category-breakdown";
            botao.setAttribute("aria-pressed", String(this.categoria === categoria.id));
            botao.title = "Filtrar despesas de " + categoria.nome;
            botao.dataset.categoria = categoria.id;
            const cabecalho = document.createElement("span");
            cabecalho.className = "category-breakdown-heading";
            const ponto = document.createElement("span");
            ponto.className = "category-dot";
            ponto.style.background = cor;
            const nome = document.createElement("span");
            nome.className = "category-name";
            nome.textContent = categoria.nome;
            const total = document.createElement("strong");
            total.textContent = this.moeda.format(categoria.total);
            cabecalho.append(ponto, nome, total);
            const porcentagem = document.createElement("span");
            porcentagem.className = "category-share";
            porcentagem.textContent = this.percentual.format(participacao) + "% do mês · " + categoria.quantidade + (categoria.quantidade === 1 ? " despesa" : " despesas");
            botao.append(cabecalho, porcentagem);
            botao.addEventListener("click", () => {
                this.categoria = this.categoria === categoria.id ? "" : categoria.id;
                this.el("categoryFilter").value = this.categoria;
                this.renderizarCategorias(resumo);
                this.renderizarTabela(resumo);
                Array.from(grafico.querySelectorAll(".category-breakdown")).find(item => item.dataset.categoria === categoria.id)?.focus({ preventScroll: true });
            });
            grafico.append(botao);
        });
    }
    renderizarDestaques(resumo) {
        const container = this.el("insightGrid");
        container.replaceChildren();
        const cartao = (titulo, valor, descricao, icone, classe = "") => {
            const bloco = document.createElement("article");
            bloco.className = "insight-card";
            const label = document.createElement("span");
            label.className = "insight-label";
            const simbolo = document.createElement("span");
            simbolo.className = "material-symbols-rounded";
            simbolo.textContent = icone;
            simbolo.setAttribute("aria-hidden", "true");
            const texto = document.createElement("span");
            texto.textContent = titulo;
            label.append(simbolo, texto);
            const destaque = document.createElement("strong");
            destaque.textContent = valor;
            if (classe)
                destaque.classList.add(classe);
            const detalhe = document.createElement("p");
            detalhe.textContent = descricao;
            bloco.append(label, destaque, detalhe);
            container.append(bloco);
        };
        const anterior = resumirMes(this.dados, deslocarMes(this.mes, -1));
        const mudancas = compararCategorias(resumo, anterior);
        const principal = mudancas[0];
        if (anterior.temDados && principal && principal.diferenca !== 0) {
            const variacao = (principal.diferenca > 0 ? "+" : "−") + this.moeda.format(Math.abs(principal.diferenca));
            cartao("Maior mudança por categoria", variacao, principal.nome + " teve a maior variação em valor frente ao mês anterior.", "compare_arrows", principal.diferenca > 0 ? "negative" : "positive");
        }
        else
            cartao("Maior mudança por categoria", anterior.temDados && resumo.temDados ? "Sem variação" : "Sem base de comparação", anterior.temDados && resumo.temDados ? "Os valores por categoria não mudaram." : "Registre dados nos dois meses para comparar as categorias.", "compare_arrows");
        const maior = [...resumo.despesas].sort((a, b) => b.valor - a.valor)[0];
        if (maior)
            cartao("Maior lançamento", this.moeda.format(maior.valor), maior.descricao + " · " + maior.categoria + " · " + this.percentual.format(maior.valor / resumo.total * 100) + "% do total do mês.", "receipt_long");
        else
            cartao("Maior lançamento", "Nenhum registro", "Suas maiores despesas aparecerão aqui.", "receipt_long");
        const referencia = referenciaHistorica(this.dados, this.mes, this.periodo);
        if (referencia.media !== null) {
            const diferenca = resumo.total - referencia.media;
            const complemento = !resumo.temDados ? "Registre dados neste mês para comparar." : diferenca === 0 ? "O mês selecionado está na mesma média." : "Este mês: " + this.moeda.format(Math.abs(diferenca)) + (diferenca > 0 ? " acima da média." : " abaixo da média.");
            cartao("Média mensal anterior", this.moeda.format(referencia.media), "Base: " + referencia.quantidade + (referencia.quantidade === 1 ? " mês anterior com despesas. " : " meses anteriores com despesas. ") + complemento, "timeline");
        }
        else
            cartao("Média mensal anterior", "Histórico em construção", "Meses sem despesas não entram na média. A janela selecionada define a comparação.", "timeline");
    }
    renderizarTabela(resumo) {
        const busca = this.busca.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
        const despesas = resumo.despesas.filter(item => {
            const descricao = item.descricao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
            return (!this.categoria || item.categoriaId === this.categoria) && (!busca || descricao.includes(busca));
        }).sort((a, b) => this.ordemDecrescente ? b.valor - a.valor : a.valor - b.valor);
        this.el("amountHeading").setAttribute("aria-sort", this.ordemDecrescente ? "descending" : "ascending");
        this.el("sortIcon").textContent = this.ordemDecrescente ? "arrow_downward" : "arrow_upward";
        this.el("sortAmount").setAttribute("aria-label", this.ordemDecrescente ? "Ordenar valor do menor para o maior" : "Ordenar valor do maior para o menor");
        const tabela = this.el("expensesTable");
        tabela.replaceChildren();
        if (!despesas.length) {
            const linha = document.createElement("tr");
            const celula = document.createElement("td");
            celula.colSpan = 3;
            celula.className = "table-empty";
            celula.textContent = resumo.despesas.length ? "Nenhuma despesa encontrada com esses filtros." : "Ainda não há despesas por aqui.";
            linha.append(celula);
            tabela.append(linha);
        }
        for (const item of despesas) {
            const linha = document.createElement("tr");
            const descricao = document.createElement("td");
            descricao.textContent = item.descricao;
            const categoria = document.createElement("td");
            categoria.className = "table-category";
            categoria.textContent = item.categoria;
            const valor = document.createElement("td");
            valor.textContent = this.moeda.format(item.valor);
            linha.append(descricao, categoria, valor);
            tabela.append(linha);
        }
        const soma = despesas.reduce((total, item) => total + Math.round(item.valor * 100), 0) / 100;
        this.el("filteredSummary").textContent = despesas.length + (despesas.length === 1 ? " despesa" : " despesas") + " · " + this.moeda.format(soma);
    }
}
