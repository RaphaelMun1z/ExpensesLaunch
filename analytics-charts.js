const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const namespace = "http://www.w3.org/2000/svg";
function svg(tag, atributos = {}, texto) {
    const elemento = document.createElementNS(namespace, tag);
    for (const [nome, valor] of Object.entries(atributos))
        elemento.setAttribute(nome, String(valor));
    if (texto !== undefined)
        elemento.textContent = texto;
    return elemento;
}
function nomeMes(chave) {
    const [ano, mes] = chave.split("-").map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/").replace(".", "");
}
export function mensagemGrafico(container, texto, icone = "query_stats") {
    const vazio = document.createElement("div");
    vazio.className = "analytics-chart-empty";
    const simbolo = document.createElement("span");
    simbolo.className = "material-symbols-rounded";
    simbolo.setAttribute("aria-hidden", "true");
    simbolo.textContent = icone;
    const mensagem = document.createElement("p");
    mensagem.textContent = texto;
    vazio.append(simbolo, mensagem);
    container.replaceChildren(vazio);
}
export function graficoTendencia(container, historico, selecionado, selecionar) {
    container.replaceChildren();
    const quadro = document.createElement("div");
    quadro.className = "svg-chart-scroll";
    const figura = svg("svg", { viewBox: "0 0 720 240", class: "trend-svg", role: "img", "aria-label": "Evolução mensal dos gastos e do restante" });
    figura.append(svg("title", {}, "Gastos e restante mês a mês. Os botões abaixo apresentam os valores de cada mês."));
    const valores = historico.flatMap(m => [m.temDados ? m.total : null, m.restante]);
    const menor = Math.min(0, ...valores.filter((v) => v !== null));
    const maior = Math.max(1, ...valores.filter((v) => v !== null));
    const intervalo = Math.max(1, maior - menor);
    const x = (i) => 64 + i * 630 / Math.max(1, historico.length - 1);
    const y = (valor) => 210 - (valor - menor) / intervalo * 178;
    for (let i = 0; i <= 4; i++) {
        const valor = menor + intervalo * i / 4;
        figura.append(svg("line", { x1: 60, x2: 700, y1: y(valor), y2: y(valor), stroke: "#343842", "stroke-width": 1 }));
        figura.append(svg("text", { x: 50, y: y(valor) + 4, "text-anchor": "end", class: "chart-axis-label" }, compacto.format(valor)));
    }
    figura.append(svg("text", { x: 12, y: 16, class: "chart-axis-label" }, "R$"));
    const desenhar = (valores, cor, area) => {
        let pontos = [];
        const fechar = () => {
            if (!pontos.length)
                return;
            const caminho = pontos.map((p, i) => (i ? "L" : "M") + x(p.i) + " " + y(p.valor)).join(" ");
            if (area && pontos.length > 1)
                figura.append(svg("path", { d: caminho + " L" + x(pontos[pontos.length - 1].i) + " " + y(0) + " L" + x(pontos[0].i) + " " + y(0) + " Z", fill: cor, opacity: .09 }));
            figura.append(svg("path", { d: caminho, fill: "none", stroke: cor, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
            pontos.forEach(p => {
                const ponto = svg("circle", { cx: x(p.i), cy: y(p.valor), r: historico[p.i].mes === selecionado ? 5 : 3.5, fill: cor, stroke: "#202228", "stroke-width": 2 });
                ponto.append(svg("title", {}, nomeMes(historico[p.i].mes) + " · " + (area ? "Gastos: " : "Restante: ") + moeda.format(p.valor)));
                figura.append(ponto);
            });
            pontos = [];
        };
        valores.forEach((valor, i) => { if (valor === null)
            fechar();
        else
            pontos.push({ i, valor }); });
        fechar();
    };
    desenhar(historico.map(m => m.restante), "#a2aec0", false);
    desenhar(historico.map(m => m.temDados ? m.total : null), "#ff705f", true);
    const meses = document.createElement("div");
    meses.className = "trend-months";
    for (const resumo of historico) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "trend-month";
        botao.textContent = nomeMes(resumo.mes);
        botao.setAttribute("aria-pressed", String(resumo.mes === selecionado));
        const detalhe = resumo.temDados ? "Gastos: " + moeda.format(resumo.total) + "; restante: " + (resumo.restante === null ? "saldo não configurado" : moeda.format(resumo.restante)) : "Sem registros";
        botao.title = nomeMes(resumo.mes) + " · " + detalhe;
        botao.setAttribute("aria-label", botao.title);
        botao.addEventListener("click", () => { selecionar(resumo.mes); container.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); });
        meses.append(botao);
    }
    quadro.append(figura, meses);
    container.append(quadro);
    quadro.scrollLeft = quadro.scrollWidth;
    const dica = document.createElement("p");
    dica.className = "chart-mobile-hint";
    dica.textContent = "Deslize para explorar todos os meses.";
    container.append(dica);
}
export function graficoCascata(container, etapas) {
    if (!etapas.length) {
        mensagemGrafico(container, "Defina o saldo inicial no cabeçalho para ver como os gastos afetam o restante.", "account_balance_wallet");
        return;
    }
    container.replaceChildren();
    const quadro = document.createElement("div");
    quadro.className = "svg-chart-scroll";
    const figura = svg("svg", { viewBox: "0 0 660 280", class: "waterfall-svg", role: "img", "aria-label": "Composição do saldo: saldo inicial, saídas por categoria e restante" });
    const minimo = Math.min(0, ...etapas.flatMap(e => [e.inicio, e.fim]));
    const maximo = Math.max(0, ...etapas.flatMap(e => [e.inicio, e.fim]));
    const intervalo = Math.max(1, maximo - minimo);
    const y = (valor) => 214 - (valor - minimo) / intervalo * 164;
    const largura = 568 / etapas.length;
    figura.append(svg("title", {}, "Categorias ordenadas por valor, sem sequência cronológica."));
    for (let i = 0; i <= 4; i++) {
        const valor = minimo + intervalo * i / 4;
        figura.append(svg("line", { x1: 64, x2: 646, y1: y(valor), y2: y(valor), stroke: Math.abs(valor) < .001 ? "#667287" : "#343842" }));
        figura.append(svg("text", { x: 54, y: y(valor) + 4, "text-anchor": "end", class: "chart-axis-label" }, compacto.format(valor)));
    }
    figura.append(svg("text", { x: 14, y: 18, class: "chart-axis-label" }, "R$"));
    etapas.forEach((etapa, i) => {
        const x = 72 + largura * i, w = Math.min(48, largura - 15);
        const cor = etapa.tipo === "saldo" ? "#a2aec0" : etapa.tipo === "despesa" || etapa.valor < 0 ? "#ff705f" : "#75d6a5";
        const altura = Math.abs(y(etapa.inicio) - y(etapa.fim));
        const barra = svg("rect", { x, y: Math.min(y(etapa.inicio), y(etapa.fim)), width: w, height: Math.max(altura, 1), rx: 3, fill: cor });
        barra.append(svg("title", {}, etapa.nome + ": " + moeda.format(etapa.valor) + (etapa.tipo === "despesa" ? " · Disponível após a categoria: " + moeda.format(etapa.fim) : "")));
        figura.append(barra);
        if (i < etapas.length - 1)
            figura.append(svg("line", { x1: x + w, x2: 72 + largura * (i + 1), y1: y(etapa.fim), y2: y(etapa.fim), stroke: "#727c8d", "stroke-dasharray": "3 4" }));
        figura.append(svg("text", { x: x + w / 2, y: Math.max(24, Math.min(y(etapa.inicio), y(etapa.fim)) - 9), "text-anchor": "middle", class: "chart-axis-label" }, compacto.format(etapa.valor)));
        const nome = etapa.nome.length > 13 ? etapa.nome.slice(0, 12) + "…" : etapa.nome;
        const label = svg("text", { x: x + w / 2, y: 244, "text-anchor": "middle", class: "chart-axis-label" }, nome);
        label.append(svg("title", {}, etapa.nome));
        figura.append(label);
    });
    quadro.append(figura);
    container.append(quadro);
    quadro.scrollLeft = quadro.scrollWidth;
    const dica = document.createElement("p");
    dica.className = "chart-mobile-hint";
    dica.textContent = "Deslize para ver todas as etapas.";
    container.append(dica);
}
