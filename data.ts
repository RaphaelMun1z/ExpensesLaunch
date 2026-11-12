export interface Categoria { id: string; nome: string }
export interface Despesa { id: string; descricao: string; valor: number; parcelamento?: { id: string; numero: number; total: number } }
export interface Dados { categorias: Record<string, Categoria[]>; gastos: Record<string, Record<string, Despesa[]>>; saldos: Record<string, number> }

export class Repositorio {
  private readonly chave = 'launch-gastos';
  carregar(): Dados {
    try {
      const texto = localStorage.getItem(this.chave);
      if (texto) {
        const valor: unknown = JSON.parse(texto);
        if (this.valido(valor)) return this.normalizar(valor);
      }
    } catch { console.warn('Não foi possível ler os dados locais.'); }
    return { categorias: {}, gastos: {}, saldos: {} };
  }
  private valido(valor: unknown): valor is Dados {
    if (!valor || typeof valor !== 'object') return false;
    const dado = valor as { categorias?: unknown; gastos?: unknown; categoriasPorMes?: unknown; saldos?: unknown };
    const categorias = dado.categoriasPorMes ?? dado.categorias;
    const categoriasValidas = Array.isArray(categorias)
      ? categorias.every((c: Categoria) => typeof c.id === 'string' && typeof c.nome === 'string')
      : !!categorias && typeof categorias === 'object' && !Array.isArray(categorias) && Object.values(categorias as Record<string, unknown>).every(lista => Array.isArray(lista) && lista.every((c: Categoria) => typeof c.id === 'string' && typeof c.nome === 'string'));
    const saldosValidos = dado.saldos === undefined || (!!dado.saldos && typeof dado.saldos === 'object' && !Array.isArray(dado.saldos) && Object.values(dado.saldos as Record<string, unknown>).every(saldo => typeof saldo === 'number' && Number.isFinite(saldo) && saldo >= 0));
    return categoriasValidas && !!dado.gastos && typeof dado.gastos === 'object' && !Array.isArray(dado.gastos) && saldosValidos;
  }
  private normalizar(valor: unknown): Dados {
    const bruto = valor as { categorias?: Categoria[] | Record<string, Categoria[]>; categoriasPorMes?: Record<string, Categoria[]>; gastos: Record<string, Record<string, unknown>>; saldos?: Record<string, number> };
    const categoriasAntigas = bruto.categoriasPorMes ?? bruto.categorias;
    let categorias: Record<string, Categoria[]>;
    if (Array.isArray(categoriasAntigas)) {
      const meses = new Set(Object.keys(bruto.gastos));
      const agora = new Date(); meses.add(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`);
      categorias = Object.fromEntries([...meses].map(mes => [mes, categoriasAntigas.map(c => ({ ...c }))]));
    } else categorias = Object.fromEntries(Object.entries(categoriasAntigas ?? {}).map(([mes, lista]) => [mes, [...lista].map(c => ({ ...c }))]));
    const gastos: Dados['gastos'] = {};
    for (const [mes, porCategoria] of Object.entries(bruto.gastos)) {
      gastos[mes] = {};
      for (const [id, itens] of Object.entries(porCategoria as Record<string, unknown>)) {
        if (typeof itens === 'number') gastos[mes][id] = itens > 0 ? [{ id: crypto.randomUUID(), descricao: 'Despesa anterior', valor: itens }] : [];
        else if (Array.isArray(itens)) gastos[mes][id] = itens.filter((item): item is Despesa => !!item && typeof item.id === 'string' && typeof item.descricao === 'string' && Number.isFinite(item.valor) && item.valor >= 0);
      }
    }
    const saldos = Object.fromEntries(Object.entries(bruto.saldos ?? {}).filter(([, saldo]) => Number.isFinite(saldo) && saldo >= 0));
    return { categorias, gastos, saldos };
  }
  importar(texto: string): Dados {
    const dados: unknown = JSON.parse(texto);
    if (!this.valido(dados)) throw new Error('Arquivo inválido.');
    return this.normalizar(dados);
  }
  salvar(dados: Dados): void { localStorage.setItem(this.chave, JSON.stringify(dados)); }
}

export class ControleGastos {
  private repositorio = new Repositorio();
  private dados = this.repositorio.carregar();
  lerDados(): Dados { return this.dados; }
  recarregar(): void { this.dados = this.repositorio.carregar(); }
  categorias(mes: string): Categoria[] { return [...(this.dados.categorias[mes] ?? [])]; }
  quantidade(mes: string): number { return this.categorias(mes).length; }
  saldo(mes: string): number | null { return this.dados.saldos[mes] ?? null; }
  definirSaldo(mes: string, valor: number | null): void {
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) throw new Error('Informe um saldo válido.');
    if (valor === null) delete this.dados.saldos[mes];
    else this.dados.saldos[mes] = Math.round(valor * 100) / 100;
    this.salvar();
  }
  despesas(mes: string, id: string): Despesa[] { return [...(this.dados.gastos[mes]?.[id] ?? [])]; }
  gasto(mes: string, id: string): number { return this.despesas(mes, id).reduce((total, item) => total + item.valor, 0); }
  total(mes: string): number { return this.categorias(mes).reduce((soma, categoria) => soma + this.gasto(mes, categoria.id), 0); }
  duplicarCategorias(origem: string, destino: string): boolean {
    const categoriasOrigem = this.categorias(origem);
    if (!categoriasOrigem.length || this.quantidade(destino)) return false;
    this.dados.categorias[destino] = categoriasOrigem.map(c => ({ id: crypto.randomUUID(), nome: c.nome }));
    this.salvar(); return true;
  }
  adicionarDespesa(mes: string, id: string, descricao: string, valor: number): void {
    if (!descricao.trim()) throw new Error('Informe uma descrição.');
    if (!Number.isFinite(valor) || valor <= 0) throw new Error('Informe um valor maior que zero.');
    if (!this.categorias(mes).some(c => c.id === id)) throw new Error('Categoria não encontrada.');
    const itens = ((this.dados.gastos[mes] ??= {})[id] ??= []);
    itens.push({ id: crypto.randomUUID(), descricao: descricao.trim(), valor: Math.round(valor * 100) / 100 });
    this.salvar();
  }
  adicionarParcelamento(mesInicial: string, nomeCategoria: string, descricao: string, valorParcela: number, quantidade: number): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesInicial)) throw new Error('Informe um mês inicial válido.');
    if (!descricao.trim()) throw new Error('Informe uma descrição.');
    if (!Number.isFinite(valorParcela) || valorParcela <= 0) throw new Error('Informe um valor de parcela maior que zero.');
    if (!Number.isInteger(quantidade) || quantidade < 2 || quantidade > 60) throw new Error('Escolha de 2 a 60 parcelas.');
    if (!nomeCategoria.trim()) throw new Error('Categoria não encontrada.');
    const nomeNormalizado = nomeCategoria.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
    const parcela = Math.round(valorParcela * 100) / 100;
    const serie = crypto.randomUUID();
    const [anoInicial, numeroInicial] = mesInicial.split('-').map(Number);
    for (let indice = 0; indice < quantidade; indice++) {
      const data = new Date(anoInicial, numeroInicial - 1 + indice, 1);
      const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const categoriasMes = this.dados.categorias[mes] ??= [];
      let categoria = categoriasMes.find(c => c.nome.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR') === nomeNormalizado);
      if (!categoria) { categoria = { id: crypto.randomUUID(), nome: nomeCategoria }; categoriasMes.push(categoria); }
      const itens = (this.dados.gastos[mes] ??= {})[categoria.id] ??= [];
      itens.push({ id: crypto.randomUUID(), descricao: descricao.trim(), valor: parcela, parcelamento: { id: serie, numero: indice + 1, total: quantidade } });
    }
    this.salvar();
  }
  removerDespesa(mes: string, categoriaId: string, despesaId: string): void {
    const itens = this.dados.gastos[mes]?.[categoriaId];
    if (itens) this.dados.gastos[mes][categoriaId] = itens.filter(item => item.id !== despesaId);
    this.salvar();
  }
  criar(mes: string, nome: string): void {
    this.validarNome(mes, nome);
    (this.dados.categorias[mes] ??= []).push({ id: crypto.randomUUID(), nome: nome.trim() });
    this.salvar();
  }
  renomear(mes: string, id: string, nome: string): void {
    this.validarNome(mes, nome, id);
    const categoria = this.categorias(mes).find(c => c.id === id);
    if (!categoria) throw new Error('Categoria não encontrada.');
    categoria.nome = nome.trim(); this.salvar();
  }
  remover(mes: string, id: string): void {
    this.dados.categorias[mes] = this.categorias(mes).filter(c => c.id !== id);
    delete this.dados.gastos[mes]?.[id];
    this.salvar();
  }
  exportar(): string { return JSON.stringify(this.dados, null, 2); }
  importar(texto: string): void { const dados = this.repositorio.importar(texto); this.dados = dados; this.salvar(); }
  private validarNome(mes: string, nome: string, ignorar?: string): void {
    if (!nome.trim()) throw new Error('Informe um nome.');
    if (this.categorias(mes).some(c => c.id !== ignorar && c.nome.toLocaleLowerCase('pt-BR') === nome.trim().toLocaleLowerCase('pt-BR'))) throw new Error('Essa categoria já existe.');
  }
  private salvar(): void { this.repositorio.salvar(this.dados); }
}

