/* Ajusta a conversão aproximada lat/lon -> coordenadas da malha (const GEO) usada no mapa do Brasil deste painel.
   Uso (precisa de Node e Playwright, que só servem para o teste de "ponto dentro da UF"):
       node habilitacoes/ajusta_projecao.js
   Ajusta por mínimos quadrados um polinômio de grau 3 em (lon, lat) tomando como pontos de controle o centro de cada
   região de saúde (vértices da malha) e as coordenadas CNES das unidades daquela região (dados.json do painel de
   Mortalidade, que traz os ids de malha). Imprime os coeficientes para colar em PROJ no painel_app.js e a taxa de
   unidades que caem dentro da própria UF. A malha foi gerada fora do repositório a partir das camadas em WGS 84 dos
   projetos QGIS (macrorregioes_brasil.geojson e microrregioes_brasil.geojson); se essas camadas ficarem disponíveis,
   a conversão pode passar a ser exata. Resultado em 29/10/2026: 116 de 122 unidades dentro da própria UF antes do
   encaixe na região de saúde que o painel faz em seguida (encaixaPontos em painel_app.js). */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(RAIZ, "mortalidade", "dados_mortalidade.js"), "utf8");
const i0 = js.indexOf("const GEO = ") + 12; let depth = 0, j = i0;
for(; j < js.length; j++){ if(js[j] === "{") depth++; else if(js[j] === "}"){ depth--; if(!depth){ j++; break; } } }
const GEO = JSON.parse(js.slice(i0, j));
const M = JSON.parse(fs.readFileSync(path.join(RAIZ, "mortalidade", "dados.json"), "utf8")).maternidades.filter(m => m.geo && m.geo.rs != null && m.lat != null);
const centro = d => { const pts = [...d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m => [+m[1], +m[2]]); return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]; };
const rsC = {}; GEO.niveis.rs.forEach(t => rsC[String(t.id)] = centro(t.d));
const DEG = 3, LON0 = -54, LAT0 = -14;
const termos = (lon, lat) => { const t = []; for(let a = 0; a <= DEG; a++) for(let b = 0; b <= DEG - a; b++) t.push(Math.pow((lon - LON0) / 10, a) * Math.pow((lat - LAT0) / 10, b)); return t; };
function solve(A, b){ const n = A[0].length, AtA = Array.from({length: n}, () => Array(n).fill(0)), Atb = Array(n).fill(0);
  A.forEach((r, k) => { for(let p = 0; p < n; p++){ Atb[p] += r[p] * b[k]; for(let q = 0; q < n; q++) AtA[p][q] += r[p] * r[q]; } });
  const Mx = AtA.map((r, k) => [...r, Atb[k]]);
  for(let c = 0; c < n; c++){ let piv = c; for(let r = c + 1; r < n; r++) if(Math.abs(Mx[r][c]) > Math.abs(Mx[piv][c])) piv = r; [Mx[c], Mx[piv]] = [Mx[piv], Mx[c]];
    for(let r = 0; r < n; r++){ if(r === c) continue; const f = Mx[r][c] / Mx[c][c]; for(let q = c; q <= n; q++) Mx[r][q] -= f * Mx[c][q]; } }
  return Mx.map((r, k) => r[n] / r[k]); }
const A = M.map(m => termos(m.lon, m.lat));
const cx = solve(A, M.map(m => rsC[String(m.geo.rs)][0])), cy = solve(A, M.map(m => rsC[String(m.geo.rs)][1]));
console.log(JSON.stringify({lon0: LON0, lat0: LAT0, deg: DEG, cx, cy}));
(async () => {
  let chromium; try { ({chromium} = require("playwright")); } catch(e){ console.log("(sem Playwright: teste de ponto dentro da UF não executado)"); return; }
  const H = JSON.parse(fs.readFileSync(path.join(__dirname, "dados.json"), "utf8")).maternidades;
  const f = (lon, lat) => { const t = termos(lon, lat); return [t.reduce((s, v, k) => s + v * cx[k], 0), t.reduce((s, v, k) => s + v * cy[k], 0)]; };
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GEO.W} ${GEO.H}"></svg>`);
  const ok = await p.evaluate(({uf, pts}) => { const svg = document.getElementById("s"), paths = {}; uf.forEach(u => { const el = document.createElementNS("http://www.w3.org/2000/svg", "path"); el.setAttribute("d", u.d); svg.appendChild(el); paths[u.id] = el; });
    return pts.filter(q => { const pt = svg.createSVGPoint(); pt.x = q.xy[0]; pt.y = q.xy[1]; return paths[q.uf] && paths[q.uf].isPointInFill(pt); }).length; }, {uf: GEO.niveis.uf, pts: H.map(m => ({uf: m.uf, xy: f(m.lon, m.lat)}))});
  console.log(`dentro da própria UF: ${ok} de ${H.length}`); await b.close();
})();
