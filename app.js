import { ControleGastos } from "./data.js";
import { LayoutApp } from "./app-layout.js";
import { RegistrosView } from "./registros.js";
import { AnalyticsView } from "./analytics.js";
import { lerRota, linkRota } from "./router.js";
class Aplicativo {
    controle = new ControleGastos();
    rota = lerRota(new URL(window.location.href));
    layout;
    registros;
    analitico;
    conteudo = document.getElementById("pageContent");
    versao = 0;
    ultimaGravacao = localStorage.getItem("launch-gastos");
    paginaMontada = null;
    rolagem = { registros: 0, analitico: 0 };
    constructor() {
        this.registros = new RegistrosView(this.controle, () => this.dadosAlterados());
        this.analitico = new AnalyticsView(this.controle, mes => this.navegar("analitico", mes));
        this.layout = new LayoutApp(this.controle, {
            aoMudarMes: mes => this.navegar(this.rota.pagina, mes),
            aoAlterarDados: () => this.dadosAlterados()
        });
        const url = new URL(window.location.href);
        url.search = "";
        url.hash = linkRota(this.rota.pagina, this.rota.mes);
        window.history.replaceState(null, "", url);
        window.addEventListener("hashchange", () => this.sincronizarRota());
        window.addEventListener("popstate", () => this.sincronizarRota());
        window.addEventListener("storage", e => {
            if (e.key === "launch-gastos" || e.key === null) {
                this.controle.recarregar();
                this.dadosAlterados();
            }
        });
        window.addEventListener("focus", () => {
            if (this.ultimaGravacao !== localStorage.getItem("launch-gastos")) {
                this.controle.recarregar();
                this.dadosAlterados();
            }
        });
        this.renderizar();
    }
    navegar(pagina, mes) {
        const hash = linkRota(pagina, mes);
        if (window.location.hash !== hash)
            window.history.pushState(null, "", hash);
        this.sincronizarRota();
    }
    sincronizarRota() {
        const url = new URL(window.location.href);
        const rota = lerRota(url);
        const hash = linkRota(rota.pagina, rota.mes);
        if (url.hash !== hash || url.search) {
            url.hash = hash;
            url.search = "";
            window.history.replaceState(null, "", url);
        }
        if (rota.pagina === this.rota.pagina && rota.mes === this.rota.mes)
            return;
        this.rota = rota;
        this.renderizar();
    }
    dadosAlterados() { this.ultimaGravacao = localStorage.getItem("launch-gastos"); this.versao++; this.renderizar(); }
    renderizar() {
        const mudouPagina = this.paginaMontada !== this.rota.pagina;
        if (mudouPagina && this.paginaMontada)
            this.rolagem[this.paginaMontada] = window.scrollY;
        const view = this.rota.pagina === "registros" ? this.registros : this.analitico;
        if (mudouPagina)
            this.conteudo.replaceChildren(view.element);
        this.conteudo.classList.toggle("analytics-page", this.rota.pagina === "analitico");
        this.conteudo.setAttribute("aria-label", this.rota.pagina === "registros" ? "Registros do mês" : "Análise dos gastos");
        view.atualizar(this.rota.mes, this.versao);
        this.layout.atualizar(this.rota.mes, this.rota.pagina);
        document.title = (this.rota.pagina === "registros" ? "Registros" : "Analítico") + " · expensesLaunch";
        if (mudouPagina && this.paginaMontada) {
            this.conteudo.focus({ preventScroll: true });
            window.scrollTo(0, this.rolagem[this.rota.pagina]);
        }
        this.paginaMontada = this.rota.pagina;
    }
}
new Aplicativo();
