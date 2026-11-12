import { chaveMes, mesValido } from "./analytics-model.js";
export function lerRota(url) {
    const [caminho, consulta = ""] = url.hash.replace(/^#\/?/, "").split("?");
    const pagina = caminho === "analitico" || caminho === "analytics" ? "analitico" : "registros";
    const parametro = new URLSearchParams(consulta).get("mes") ?? url.searchParams.get("mes");
    return { pagina, mes: mesValido(parametro) ? parametro : chaveMes(new Date()) };
}
export function linkRota(pagina, mes) {
    return "#/" + pagina + "?mes=" + mes;
}
