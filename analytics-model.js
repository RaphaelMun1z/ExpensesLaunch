export function mesValido(mes) {
    return mes !== null && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(mes);
}
export function chaveMes(data) {
    return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0");
}
export function deslocarMes(mes, passo) {
    const [ano, numero] = mes.split("-").map(Number);
    return chaveMes(new Date(ano, numero - 1 + passo, 1));
}
export function janelaMensal(mes, quantidade = 6) {
    return Array.from({ length: quantidade }, (_, i) => deslocarMes(mes, i - quantidade + 1));
}
export function resumirMes(dados, mes) {
    const despesas = [];
    let centavos = 0;
    const categorias = (dados.categorias[mes] ?? []).map(categoria => {
        const itens = dados.gastos[mes]?.[categoria.id] ?? [];
        let totalCategoria = 0;
        for (const item of itens) {
            const valorCentavos = Math.round(item.valor * 100);
            totalCategoria += valorCentavos;
            despesas.push({ ...item, valor: valorCentavos / 100, categoriaId: categoria.id, categoria: categoria.nome });
        }
        centavos += totalCategoria;
        return { ...categoria, total: totalCategoria / 100, quantidade: itens.length };
    });
    const total = centavos / 100;
    const saldo = dados.saldos[mes] ?? null;
    return {
        mes, categorias, despesas, total, saldo,
        restante: saldo === null ? null : (Math.round(saldo * 100) - centavos) / 100,
        media: despesas.length ? total / despesas.length : 0,
        temDados: categorias.length > 0 || saldo !== null || despesas.length > 0
    };
}
export function compararCategorias(atual, anterior) {
    if (!atual.temDados || !anterior.temDados)
        return [];
    const grupos = new Map();
    const chave = (nome) => nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
    for (const categoria of anterior.categorias) {
        const key = chave(categoria.nome);
        const grupo = grupos.get(key) ?? { nome: categoria.nome, categoriaId: null, atual: 0, anterior: 0, diferenca: 0 };
        grupo.anterior = (Math.round(grupo.anterior * 100) + Math.round(categoria.total * 100)) / 100;
        grupos.set(key, grupo);
    }
    for (const categoria of atual.categorias) {
        const key = chave(categoria.nome);
        const grupo = grupos.get(key) ?? { nome: categoria.nome, categoriaId: null, atual: 0, anterior: 0, diferenca: 0 };
        grupo.nome = categoria.nome;
        grupo.categoriaId = categoria.id;
        grupo.atual = (Math.round(grupo.atual * 100) + Math.round(categoria.total * 100)) / 100;
        grupos.set(key, grupo);
    }
    return [...grupos.values()].map(grupo => ({ ...grupo, diferenca: (Math.round(grupo.atual * 100) - Math.round(grupo.anterior * 100)) / 100 }))
        .filter(grupo => grupo.atual > 0 || grupo.anterior > 0).sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
}
export function referenciaHistorica(dados, mes, meses) {
    const registros = janelaMensal(mes, meses).slice(0, -1).map(chave => resumirMes(dados, chave)).filter(resumo => resumo.despesas.length > 0);
    return { media: registros.length ? registros.reduce((soma, resumo) => soma + Math.round(resumo.total * 100), 0) / registros.length / 100 : null, quantidade: registros.length };
}
export function etapasSaldo(resumo) {
    if (resumo.saldo === null)
        return [];
    const etapas = [{ nome: "Saldo inicial", inicio: 0, fim: resumo.saldo, valor: resumo.saldo, tipo: "saldo" }];
    const categorias = resumo.categorias.filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    const grupos = categorias.slice(0, 5).map(c => ({ nome: c.nome, total: c.total }));
    if (categorias.length > 5)
        grupos.push({ nome: "Outras categorias", total: categorias.slice(5).reduce((soma, c) => soma + Math.round(c.total * 100), 0) / 100 });
    let atual = Math.round(resumo.saldo * 100);
    for (const categoria of grupos) {
        const fim = atual - Math.round(categoria.total * 100);
        etapas.push({ nome: categoria.nome, inicio: atual / 100, fim: fim / 100, valor: -categoria.total, tipo: "despesa" });
        atual = fim;
    }
    etapas.push({ nome: "Restante", inicio: 0, fim: atual / 100, valor: atual / 100, tipo: "restante" });
    return etapas;
}
