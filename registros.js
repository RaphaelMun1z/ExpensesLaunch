export class RegistrosView {
    controle;
    aoAlterarDados;
    element = document.createElement("section");
    mes = "";
    versao = -1;
    editando = null;
    criandoCategoria = false;
    moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    constructor(controle, aoAlterarDados) {
        this.controle = controle;
        this.aoAlterarDados = aoAlterarDados;
        this.element.className = "board";
        this.element.id = "board";
        this.element.setAttribute("aria-label", "Registros do mês");
        this.element.innerHTML = '<button id="addCategory" class="add-category-tile" aria-label="Nova categoria" title="Nova categoria" type="button"><span class="material-symbols-rounded" aria-hidden="true">add</span></button>';
        this.el("addCategory").addEventListener("click", () => this.abrir());
    }
    atualizar(mes, versao) {
        if (this.mes === mes && this.versao === versao)
            return;
        if (this.mes !== mes) {
            this.editando = null;
            this.criandoCategoria = false;
        }
        this.mes = mes;
        this.versao = versao;
        this.renderizar();
    }
    el(id) {
        const elemento = this.element.id === id ? this.element : this.element.querySelector("#" + id);
        if (!elemento)
            throw new Error("Elemento ausente: " + id);
        return elemento;
    }
    renderizar() {
        const board = this.el('board');
        const addCategory = this.el('addCategory');
        board.replaceChildren();
        for (const categoria of this.controle.categorias(this.mes))
            board.appendChild(this.coluna(categoria));
        const semCategorias = this.controle.quantidade(this.mes) === 0;
        board.classList.toggle('board-empty', semCategorias);
        if (semCategorias && !this.criandoCategoria) {
            const vazio = document.createElement('div');
            vazio.className = 'empty-board';
            vazio.innerHTML = '<h2>Nenhuma categoria cadastrada</h2><p>Use o botão + ou duplique as categorias do mês anterior.</p>';
            board.appendChild(vazio);
        }
        if (this.criandoCategoria) {
            board.append(this.colunaNovaCategoria());
            addCategory.hidden = true;
        }
        else
            addCategory.hidden = false;
        board.append(addCategory);
    }
    coluna(categoria) {
        const coluna = document.createElement('section');
        coluna.className = 'category-column';
        const head = document.createElement('div');
        head.className = 'column-head';
        const titulo = document.createElement('div');
        const acoes = document.createElement('div');
        acoes.className = 'column-actions';
        if (this.editando === categoria.id) {
            titulo.append(this.campoNome(categoria.nome));
            acoes.append(this.botao('check', 'Salvar categoria', () => this.salvarCategoria()), this.botao('close', 'Cancelar', () => this.cancelarEdicao()));
        }
        else {
            const nome = document.createElement('strong');
            nome.textContent = categoria.nome;
            titulo.append(nome);
            acoes.append(this.botao('edit', 'Renomear categoria', () => this.abrir(categoria)), this.botao('close', 'Excluir categoria', () => { if (confirm(`Excluir ${categoria.nome} deste mês?`)) {
                this.controle.remover(this.mes, categoria.id);
                this.aoAlterarDados();
            } }));
        }
        head.append(titulo, acoes);
        const conteudo = document.createElement('div');
        conteudo.className = 'column-content';
        const cartao = document.createElement('article');
        cartao.className = 'expense-card';
        const tituloCartao = document.createElement('div');
        tituloCartao.className = 'card-label';
        const icone = document.createElement('span');
        icone.className = 'material-symbols-rounded';
        icone.textContent = 'receipt_long';
        const texto = document.createElement('span');
        texto.textContent = 'Despesas';
        tituloCartao.append(icone, texto);
        const lista = document.createElement('div');
        lista.className = 'expense-items';
        const despesas = this.controle.despesas(this.mes, categoria.id);
        if (!despesas.length) {
            cartao.classList.add('empty-expenses');
            const mensagem = document.createElement('p');
            mensagem.className = 'empty-expenses-message';
            mensagem.textContent = 'Ainda não há despesas por aqui.';
            lista.append(mensagem);
        }
        for (const item of despesas) {
            const linha = document.createElement('div');
            linha.className = 'expense-item';
            const descricao = document.createElement('span');
            descricao.className = 'expense-description';
            descricao.textContent = item.parcelamento ? `${item.descricao} (${item.parcelamento.numero}/${item.parcelamento.total})` : item.descricao;
            const valor = document.createElement('strong');
            valor.textContent = this.moeda.format(item.valor);
            linha.append(descricao, valor, this.botao('close', 'Remover despesa', () => { this.controle.removerDespesa(this.mes, categoria.id, item.id); this.aoAlterarDados(); }));
            lista.append(linha);
        }
        const total = document.createElement('div');
        total.className = 'category-total';
        total.innerHTML = '<span>Total da categoria</span>';
        const totalValor = document.createElement('strong');
        totalValor.textContent = this.moeda.format(this.controle.gasto(this.mes, categoria.id));
        total.append(totalValor);
        const form = document.createElement('form');
        form.className = 'expense-form';
        form.hidden = true;
        const descricaoInput = document.createElement('input');
        descricaoInput.type = 'text';
        descricaoInput.maxLength = 80;
        descricaoInput.placeholder = 'Descrição';
        descricaoInput.setAttribute('aria-label', 'Descrição da despesa');
        descricaoInput.required = true;
        const valorInput = document.createElement('input');
        valorInput.type = 'text';
        valorInput.inputMode = 'decimal';
        valorInput.placeholder = 'R$ 0,00';
        valorInput.setAttribute('aria-label', 'Valor da despesa');
        valorInput.required = true;
        valorInput.addEventListener('input', () => { const digitos = valorInput.value.replace(/\D/g, ''); valorInput.value = digitos ? this.moeda.format(Number(digitos) / 100) : ''; });
        const parcelarRotulo = document.createElement('label');
        parcelarRotulo.className = 'installment-toggle';
        const parcelar = document.createElement('input');
        parcelar.type = 'checkbox';
        parcelar.setAttribute('aria-label', 'Adicionar esta despesa parcelada em vários meses');
        const parcelarTexto = document.createElement('span');
        parcelarTexto.textContent = 'Parcelar em vários meses';
        parcelarRotulo.append(parcelar, parcelarTexto);
        const opcoesParcelamento = document.createElement('div');
        opcoesParcelamento.className = 'installment-options';
        opcoesParcelamento.hidden = true;
        const quantidadeRotulo = document.createElement('label');
        quantidadeRotulo.className = 'installment-field';
        const quantidadeLegenda = document.createElement('span');
        quantidadeLegenda.textContent = 'Número de parcelas';
        const quantidadeParcelas = document.createElement('input');
        quantidadeParcelas.type = 'number';
        quantidadeParcelas.min = '2';
        quantidadeParcelas.max = '60';
        quantidadeParcelas.step = '1';
        quantidadeParcelas.value = '2';
        quantidadeParcelas.required = true;
        quantidadeParcelas.setAttribute('aria-label', 'Número de parcelas, de 2 a 60');
        quantidadeRotulo.append(quantidadeLegenda, quantidadeParcelas);
        opcoesParcelamento.append(quantidadeRotulo);
        parcelar.addEventListener('change', () => { opcoesParcelamento.hidden = !parcelar.checked; quantidadeParcelas.required = parcelar.checked; });
        const acoesForm = document.createElement('div');
        acoesForm.className = 'expense-form-actions';
        const salvar = document.createElement('button');
        salvar.type = 'submit';
        salvar.className = 'expense-save-button';
        salvar.title = 'Salvar despesa';
        salvar.setAttribute('aria-label', 'Salvar despesa');
        const iconeSalvar = document.createElement('span');
        iconeSalvar.className = 'material-symbols-rounded';
        iconeSalvar.textContent = 'check';
        salvar.append(iconeSalvar);
        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'expense-cancel-button';
        cancelar.title = 'Cancelar';
        cancelar.setAttribute('aria-label', 'Cancelar');
        const iconeCancelar = document.createElement('span');
        iconeCancelar.className = 'material-symbols-rounded';
        iconeCancelar.textContent = 'close';
        cancelar.append(iconeCancelar);
        cancelar.addEventListener('click', () => { form.reset(); form.hidden = true; mostrarForm.hidden = false; });
        acoesForm.append(salvar, cancelar);
        form.append(descricaoInput, valorInput, parcelarRotulo, opcoesParcelamento, acoesForm);
        const mostrarForm = document.createElement('button');
        mostrarForm.type = 'button';
        mostrarForm.className = 'add-expense-option';
        mostrarForm.textContent = '＋ Adicionar despesa';
        mostrarForm.addEventListener('click', () => { form.hidden = false; mostrarForm.hidden = true; descricaoInput.focus(); });
        form.addEventListener('submit', e => { e.preventDefault(); const valorNumerico = this.converterNumero(valorInput.value); if (valorNumerico === null || valorNumerico <= 0) {
            alert('Informe um valor maior que zero, como 12,50.');
            return;
        } try {
            if (parcelar.checked)
                this.controle.adicionarParcelamento(this.mes, categoria.nome, descricaoInput.value, valorNumerico, Number(quantidadeParcelas.value));
            else
                this.controle.adicionarDespesa(this.mes, categoria.id, descricaoInput.value, valorNumerico);
            this.aoAlterarDados();
        }
        catch (erro) {
            alert(erro instanceof Error ? erro.message : 'Erro ao adicionar.');
        } });
        cartao.append(tituloCartao, lista, mostrarForm, form);
        conteudo.append(cartao);
        coluna.append(head, conteudo, total);
        return coluna;
    }
    botao(icone, descricao, acao) {
        const b = document.createElement('button');
        b.className = 'mini-button';
        b.type = 'button';
        b.title = descricao;
        b.setAttribute('aria-label', descricao);
        if (descricao.startsWith('Salvar'))
            b.classList.add('action-save');
        else if (descricao.startsWith('Renomear'))
            b.classList.add('action-edit');
        else if (descricao === 'Cancelar')
            b.classList.add('action-cancel');
        const i = document.createElement('span');
        i.className = 'material-symbols-rounded';
        i.textContent = icone;
        b.append(i);
        b.addEventListener('click', acao);
        return b;
    }
    converterNumero(texto) {
        const limpo = texto.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
        if (!limpo)
            return 0;
        if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(limpo))
            return null;
        const numero = Number(limpo.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(numero) && numero >= 0 ? numero : null;
    }
    formatarNumero(valor) { return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    abrir(categoria) {
        this.editando = categoria?.id ?? null;
        this.criandoCategoria = !categoria;
        this.renderizar();
        this.el('categoryName').focus();
    }
    cancelarEdicao() { this.editando = null; this.criandoCategoria = false; this.renderizar(); }
    salvarCategoria() {
        try {
            const nome = this.el('categoryName').value;
            if (this.editando)
                this.controle.renomear(this.mes, this.editando, nome);
            else
                this.controle.criar(this.mes, nome);
            this.editando = null;
            this.criandoCategoria = false;
            this.aoAlterarDados();
        }
        catch (erro) {
            alert(erro instanceof Error ? erro.message : 'Erro ao salvar.');
        }
    }
    campoNome(valor = '') {
        const input = document.createElement('input');
        input.id = 'categoryName';
        input.className = 'category-name-input';
        input.type = 'text';
        input.maxLength = 36;
        input.placeholder = 'Nome da categoria';
        input.value = valor;
        input.autocomplete = 'off';
        input.addEventListener('keydown', e => { if (e.key === 'Enter') {
            e.preventDefault();
            this.salvarCategoria();
        }
        else if (e.key === 'Escape')
            this.cancelarEdicao(); });
        return input;
    }
    colunaNovaCategoria() {
        const coluna = document.createElement('section');
        coluna.className = 'category-column category-editor-column';
        const cabecalho = document.createElement('div');
        cabecalho.className = 'column-head';
        const titulo = document.createElement('div');
        titulo.className = 'category-title-editor';
        titulo.append(this.campoNome());
        const acoes = document.createElement('div');
        acoes.className = 'column-actions';
        acoes.append(this.botao('check', 'Salvar categoria', () => this.salvarCategoria()), this.botao('close', 'Cancelar', () => this.cancelarEdicao()));
        cabecalho.append(titulo, acoes);
        const conteudo = document.createElement('div');
        conteudo.className = 'column-content';
        coluna.append(cabecalho, conteudo);
        return coluna;
    }
}
