export class Repositorio {
    chave = 'launch-gastos';
    carregar() {
        try {
            const texto = localStorage.getItem(this.chave);
            if (texto) {
                const valor = JSON.parse(texto);
                if (this.valido(valor))
                    return this.normalizar(valor);
            }
        }
        catch {
            console.warn('Não foi possível ler os dados locais.');
        }
        return { categorias: {}, gastos: {}, saldos: {} };
    }
    valido(valor) {
        if (!valor || typeof valor !== 'object')
            return false;
        const dado = valor;
        const categorias = dado.categoriasPorMes ?? dado.categorias;
        const categoriasValidas = Array.isArray(categorias)
            ? categorias.every((c) => typeof c.id === 'string' && typeof c.nome === 'string')
            : !!categorias && typeof categorias === 'object' && !Array.isArray(categorias) && Object.values(categorias).every(lista => Array.isArray(lista) && lista.every((c) => typeof c.id === 'string' && typeof c.nome === 'string'));
        const saldosValidos = dado.saldos === undefined || (!!dado.saldos && typeof dado.saldos === 'object' && !Array.isArray(dado.saldos) && Object.values(dado.saldos).every(saldo => typeof saldo === 'number' && Number.isFinite(saldo) && saldo >= 0));
        return categoriasValidas && !!dado.gastos && typeof dado.gastos === 'object' && !Array.isArray(dado.gastos) && saldosValidos;
    }
    normalizar(valor) {
        const bruto = valor;
        const categoriasAntigas = bruto.categoriasPorMes ?? bruto.categorias;
        let categorias;
        if (Array.isArray(categoriasAntigas)) {
            const meses = new Set(Object.keys(bruto.gastos));
            const agora = new Date();
            meses.add(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`);
            categorias = Object.fromEntries([...meses].map(mes => [mes, categoriasAntigas.map(c => ({ ...c }))]));
        }
        else
            categorias = Object.fromEntries(Object.entries(categoriasAntigas ?? {}).map(([mes, lista]) => [mes, [...lista].map(c => ({ ...c }))]));
        const gastos = {};
        for (const [mes, porCategoria] of Object.entries(bruto.gastos)) {
            gastos[mes] = {};
            for (const [id, itens] of Object.entries(porCategoria)) {
                if (typeof itens === 'number')
                    gastos[mes][id] = itens > 0 ? [{ id: crypto.randomUUID(), descricao: 'Despesa anterior', valor: itens }] : [];
                else if (Array.isArray(itens))
                    gastos[mes][id] = itens.filter((item) => !!item && typeof item.id === 'string' && typeof item.descricao === 'string' && Number.isFinite(item.valor) && item.valor >= 0);
            }
        }
        const saldos = Object.fromEntries(Object.entries(bruto.saldos ?? {}).filter(([, saldo]) => Number.isFinite(saldo) && saldo >= 0));
        return { categorias, gastos, saldos };
    }
    importar(texto) {
        const dados = JSON.parse(texto);
        if (!this.valido(dados))
            throw new Error('Arquivo inválido.');
        return this.normalizar(dados);
    }
    salvar(dados) { localStorage.setItem(this.chave, JSON.stringify(dados)); }
}
export class ControleGastos {
    repositorio = new Repositorio();
    dados = this.repositorio.carregar();
    lerDados() { return this.dados; }
    recarregar() { this.dados = this.repositorio.carregar(); }
    categorias(mes) { return [...(this.dados.categorias[mes] ?? [])]; }
    quantidade(mes) { return this.categorias(mes).length; }
    saldo(mes) { return this.dados.saldos[mes] ?? null; }
    definirSaldo(mes, valor) {
        if (valor !== null && (!Number.isFinite(valor) || valor < 0))
            throw new Error('Informe um saldo válido.');
        if (valor === null)
            delete this.dados.saldos[mes];
        else
            this.dados.saldos[mes] = Math.round(valor * 100) / 100;
        this.salvar();
    }
    despesas(mes, id) { return [...(this.dados.gastos[mes]?.[id] ?? [])]; }
    gasto(mes, id) { return this.despesas(mes, id).reduce((total, item) => total + item.valor, 0); }
    total(mes) { return this.categorias(mes).reduce((soma, categoria) => soma + this.gasto(mes, categoria.id), 0); }
    duplicarCategorias(origem, destino) {
        const categoriasOrigem = this.categorias(origem);
        if (!categoriasOrigem.length || this.quantidade(destino))
            return false;
        this.dados.categorias[destino] = categoriasOrigem.map(c => ({ id: crypto.randomUUID(), nome: c.nome }));
        this.salvar();
        return true;
    }
    adicionarDespesa(mes, id, descricao, valor) {
        if (!descricao.trim())
            throw new Error('Informe uma descrição.');
        if (!Number.isFinite(valor) || valor <= 0)
            throw new Error('Informe um valor maior que zero.');
        if (!this.categorias(mes).some(c => c.id === id))
            throw new Error('Categoria não encontrada.');
        const itens = ((this.dados.gastos[mes] ??= {})[id] ??= []);
        itens.push({ id: crypto.randomUUID(), descricao: descricao.trim(), valor: Math.round(valor * 100) / 100 });
        this.salvar();
    }
    removerDespesa(mes, categoriaId, despesaId) {
        const itens = this.dados.gastos[mes]?.[categoriaId];
        if (itens)
            this.dados.gastos[mes][categoriaId] = itens.filter(item => item.id !== despesaId);
        this.salvar();
    }
    criar(mes, nome) {
        this.validarNome(mes, nome);
        (this.dados.categorias[mes] ??= []).push({ id: crypto.randomUUID(), nome: nome.trim() });
        this.salvar();
    }
    renomear(mes, id, nome) {
        this.validarNome(mes, nome, id);
        const categoria = this.categorias(mes).find(c => c.id === id);
        if (!categoria)
            throw new Error('Categoria não encontrada.');
        categoria.nome = nome.trim();
        this.salvar();
    }
    remover(mes, id) {
        this.dados.categorias[mes] = this.categorias(mes).filter(c => c.id !== id);
        delete this.dados.gastos[mes]?.[id];
        this.salvar();
    }
    exportar() { return JSON.stringify(this.dados, null, 2); }
    importar(texto) { const dados = this.repositorio.importar(texto); this.dados = dados; this.salvar(); }
    validarNome(mes, nome, ignorar) {
        if (!nome.trim())
            throw new Error('Informe um nome.');
        if (this.categorias(mes).some(c => c.id !== ignorar && c.nome.toLocaleLowerCase('pt-BR') === nome.trim().toLocaleLowerCase('pt-BR')))
            throw new Error('Essa categoria já existe.');
    }
    salvar() { this.repositorio.salvar(this.dados); }
}
