import { chaveMes, mesValido } from "./analytics-model.js";

export type Pagina = "registros" | "analitico";
export interface Rota { pagina: Pagina; mes: string }

export function lerRota(url: URL): Rota {
  const [caminho, consulta = ""] = url.hash.replace(/^#\/?/, "").split("?");
  const pagina: Pagina = caminho === "analitico" || caminho === "analytics" ? "analitico" : "registros";
  const parametro = new URLSearchParams(consulta).get("mes") ?? url.searchParams.get("mes");
  return { pagina, mes: mesValido(parametro) ? parametro : chaveMes(new Date()) };
}

export function linkRota(pagina: Pagina, mes: string): string {
  return "#/" + pagina + "?mes=" + mes;
}
