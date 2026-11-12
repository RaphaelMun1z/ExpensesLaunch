import { ControleGastos } from "./data.js";
import { chaveMes, deslocarMes, mesValido } from "./analytics-model.js";
import { linkRota, type Pagina } from "./router.js";

interface AcoesLayout {
  aoMudarMes: (mes: string) => void;
  aoAlterarDados: () => void;
}

const templateCabecalho = [
  '<header class="topbar">',
  '  <div class="logo"><img src="logo.png" alt="expensesLaunch" /></div>',
  '  <div class="top-summary">',
  '    <div class="summary-metric balance-metric">',
  '      <small>SALDO INICIAL</small>',
  '      <div id="balanceDisplayRow" class="balance-display-row">',
  '        <strong id="balanceDisplay">Não configurado</strong>',
  '        <button id="editBalance" class="mini-button action-edit" type="button" title="Editar saldo inicial" aria-label="Editar saldo inicial"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>',
  '      </div>',
  '      <div id="balanceEditor" class="balance-editor" hidden>',
  '        <input id="balanceInput" type="text" inputmode="decimal" placeholder="R$ 0,00" aria-label="Saldo inicial do mês" />',
  '        <button id="saveBalance" class="balance-action-button expense-save-button" type="button" title="Salvar saldo" aria-label="Salvar saldo"><span class="material-symbols-rounded" aria-hidden="true">check</span></button>',
  '        <button id="cancelBalance" class="balance-action-button expense-cancel-button" type="button" title="Cancelar" aria-label="Cancelar"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>',
  '      </div>',
  '    </div>',
  '    <div class="summary-metric remaining-metric"><small>RESTANTE</small><strong id="remainingTotal">—</strong></div>',
  '  </div>',
  '  <div class="toolbar">',
  '    <nav class="app-navigation" aria-label="Páginas do app">',
  '      <a id="expensesLink" class="analytics-nav-link" href="#/registros"><span class="material-symbols-rounded" aria-hidden="true">view_column</span>Registros</a>',
  '      <a id="analyticsLink" class="analytics-nav-link" href="#/analitico"><span class="material-symbols-rounded" aria-hidden="true">monitoring</span>Analítico</a>',
  '    </nav>',
  '    <button id="exportButton" class="tool-button export-button" type="button" title="Exportar dados" aria-label="Exportar dados"><span class="material-symbols-rounded" aria-hidden="true">download</span></button>',
  '    <button id="importButton" class="tool-button import-button" type="button" title="Importar dados" aria-label="Importar dados"><span class="material-symbols-rounded" aria-hidden="true">upload</span></button>',
  '    <input id="importFile" type="file" accept="application/json,.json" hidden />',
  '  </div>',
  '</header>',
  '<nav class="monthbar" aria-label="Navegação entre meses">',
  '  <button id="previousMonth" class="month-arrow" type="button" aria-label="Mês anterior"><span class="material-symbols-rounded" aria-hidden="true">chevron_left</span></button>',
  '  <div class="month-details"><strong id="monthName" aria-live="polite"></strong></div>',
  '  <button id="duplicateCategories" class="month-arrow duplicate-categories-button" type="button" title="Duplicar categorias do mês anterior" aria-label="Duplicar categorias do mês anterior"><span class="material-symbols-rounded" aria-hidden="true">content_copy</span></button>',
  '  <button id="todayButton" class="today-button" type="button">MÊS ATUAL</button>',
  '  <button id="nextMonth" class="month-arrow" type="button" aria-label="Próximo mês"><span class="material-symbols-rounded" aria-hidden="true">chevron_right</span></button>',
  '</nav>'
].join("\n");

export class LayoutApp {
  private mes = chaveMes(new Date());
  private editandoSaldo = false;
  private moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  constructor(private controle: ControleGastos, private acoes: AcoesLayout) {
    this.el("appHeader").innerHTML = templateCabecalho;
    this.eventos();
  }

  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    const elemento = document.getElementById(id);
    if (!elemento) throw new Error("Elemento ausente: " + id);
    return elemento as T;
  }

  atualizar(mes: string, pagina: Pagina): void {
    if (this.mes !== mes) this.editandoSaldo = false;
    this.mes = mes;
    const [ano, numero] = mes.split("-").map(Number);
    this.el("monthName").textContent = new Date(ano, numero - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    this.el<HTMLButtonElement>("previousMonth").disabled = mes === "1000-01";
    this.el<HTMLButtonElement>("nextMonth").disabled = mes === "9999-12";
    this.el<HTMLAnchorElement>("expensesLink").href = linkRota("registros", mes);
    this.el<HTMLAnchorElement>("analyticsLink").href = linkRota("analitico", mes);
    for (const id of ["expensesLink", "analyticsLink"]) this.el(id).removeAttribute("aria-current");
    this.el(pagina === "registros" ? "expensesLink" : "analyticsLink").setAttribute("aria-current", "page");
    this.el<HTMLButtonElement>("duplicateCategories").disabled = this.controle.quantidade(mes) > 0 || this.controle.quantidade(deslocarMes(mes, -1)) === 0;
    this.atualizarResumo();
  }

  private mudarMes(mes: string): void {
    if (!mesValido(mes)) return;
    this.editandoSaldo = false;
    this.acoes.aoMudarMes(mes);
  }

  private eventos(): void {
    this.el("previousMonth").addEventListener("click", () => this.mudarMes(deslocarMes(this.mes, -1)));
    this.el("nextMonth").addEventListener("click", () => this.mudarMes(deslocarMes(this.mes, 1)));
    this.el("todayButton").addEventListener("click", () => this.mudarMes(chaveMes(new Date())));
    this.el("duplicateCategories").addEventListener("click", () => {
      if (this.controle.duplicarCategorias(deslocarMes(this.mes, -1), this.mes)) this.acoes.aoAlterarDados();
    });
    this.el("editBalance").addEventListener("click", () => {
      this.editandoSaldo = true; this.atualizarResumo();
      const input = this.el<HTMLInputElement>("balanceInput"); input.focus(); input.select();
    });
    this.el("saveBalance").addEventListener("click", () => this.salvarSaldo());
    this.el("cancelBalance").addEventListener("click", () => this.cancelarSaldo());
    const saldoInput = this.el<HTMLInputElement>("balanceInput");
    saldoInput.addEventListener("input", () => {
      const digitos = saldoInput.value.replace(/\D/g, "");
      saldoInput.value = digitos ? this.moeda.format(Number(digitos) / 100) : "";
    });
    saldoInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); this.salvarSaldo(); }
      else if (e.key === "Escape") this.cancelarSaldo();
    });
    this.el("exportButton").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([this.controle.exportar()], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "expensesLaunch.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    this.el("importButton").addEventListener("click", () => this.el<HTMLInputElement>("importFile").click());
    this.el<HTMLInputElement>("importFile").addEventListener("change", async e => {
      const input = e.currentTarget as HTMLInputElement;
      const arquivo = input.files?.[0]; if (!arquivo) return;
      try {
        const texto = await arquivo.text();
        if (!confirm("Substituir os dados atuais pelos dados importados?")) return;
        this.controle.importar(texto); this.editandoSaldo = false; this.acoes.aoAlterarDados();
      } catch (erro) { alert(erro instanceof Error ? erro.message : "Erro na importação."); }
      finally { input.value = ""; }
    });
  }

  private atualizarResumo(): void {
    const saldo = this.controle.saldo(this.mes);
    const total = this.controle.total(this.mes);
    if (!this.editandoSaldo) this.el<HTMLInputElement>("balanceInput").value = saldo === null ? "" : this.moeda.format(saldo);
    this.el("balanceDisplay").textContent = saldo === null ? "Não configurado" : this.moeda.format(saldo);
    this.el("balanceDisplayRow").hidden = this.editandoSaldo;
    this.el("balanceEditor").hidden = !this.editandoSaldo;
    this.el("remainingTotal").textContent = saldo === null ? "—" : this.moeda.format(saldo - total);
    this.el("bottomTotal").textContent = "Total: " + this.moeda.format(total);
  }

  private cancelarSaldo(): void {
    this.editandoSaldo = false; this.atualizarResumo(); this.el("editBalance").focus();
  }

  private salvarSaldo(): void {
    const input = this.el<HTMLInputElement>("balanceInput");
    const texto = input.value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
    if (texto && !/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(texto)) { alert("Informe um saldo válido."); input.focus(); return; }
    const valor = texto ? Number(texto.replace(/\./g, "").replace(",", ".")) : null;
    if (valor !== null && !Number.isFinite(valor)) { alert("Informe um saldo válido."); input.focus(); return; }
    this.controle.definirSaldo(this.mes, valor); this.editandoSaldo = false;
    this.acoes.aoAlterarDados(); this.el("editBalance").focus();
  }
}
