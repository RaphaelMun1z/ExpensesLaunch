import { chaveMes, mesValido } from "./analytics-model.js";
import { linkRota } from "./router.js";

const parametro = new URLSearchParams(window.location.search).get("mes");
const mes = mesValido(parametro) ? parametro : chaveMes(new Date());
window.location.replace("index.html" + linkRota("analitico", mes));
