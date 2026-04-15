import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Generates output/index.html — an interactive dashboard that fetches
 * commit-analysis.json at runtime.
 *
 * Requires the output/ folder to be served over HTTP (see serve.mjs).
 *
 * @param {Object} opts
 * @param {string} opts.outputDir
 * @returns {string} path to the written file
 */
export function writeHtmlReport({ outputDir }) {
  const filePath = join(outputDir, 'index.html');
  writeFileSync(filePath, buildHtml(), 'utf-8');
  return filePath;
}

// ── HTML shell ────────────────────────────────────────────────────────────────

function buildHtml() {
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>Commit Analysis</title>\n' +
    '  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>\n' +
    '  <style>\n' + buildCss() + '\n  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div id="error-banner" style="display:none"></div>\n' +
    '  <header>\n' +
    '    <h1>&#x1F4CA; Commit Analysis</h1>\n' +
    '    <p id="meta">Loading&hellip;</p>\n' +
    '  </header>\n' +
    '  <div id="kpis" class="kpi-grid"></div>\n' +
    '  <div class="charts-grid">\n' +
    '    <div class="card">\n' +
    '      <h2>Distribution by type</h2>\n' +
    '      <div class="chart-wrap" style="height:300px"><canvas id="c-donut"></canvas></div>\n' +
    '    </div>\n' +
    '    <div class="card">\n' +
    '      <h2>Top authors</h2>\n' +
    '      <div class="chart-wrap" style="height:300px"><canvas id="c-authors"></canvas></div>\n' +
    '    </div>\n' +
    '    <div class="card wide">\n' +
    '      <h2>Commits per week by type</h2>\n' +
    '      <div class="chart-wrap" style="height:280px"><canvas id="c-weekly"></canvas></div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <div class="card wide" id="commits-card">\n' +
    '    <div class="table-toolbar">\n' +
    '      <input id="search" type="text" placeholder="&#x1F50D;&ensp;Search commits\u2026" autocomplete="off" spellcheck="false">\n' +
    '      <div class="type-filters" id="type-filters"></div>\n' +
    '      <span id="count-badge" class="count-badge"></span>\n' +
    '    </div>\n' +
    '    <div class="table-wrap">\n' +
    '      <table id="commits-table">\n' +
    '        <thead><tr>\n' +
    '          <th>Hash</th><th>Date</th><th>Author</th><th>Type</th><th>Scope</th><th>Description</th>\n' +
    '        </tr></thead>\n' +
    '        <tbody id="commits-tbody"></tbody>\n' +
    '      </table>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <script>\n' + buildClientJs() + '\n  </script>\n' +
    '</body>\n</html>'
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function buildCss() {
  return [
    '    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    '    :root {',
    '      --bg: #0f172a; --surface: #1e293b; --border: #334155;',
    '      --text: #f1f5f9; --muted: #94a3b8;',
    '    }',
    '    body { background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; padding: 2rem; min-height: 100vh; }',
    '    header { margin-bottom: 2rem; }',
    '    h1 { font-size: 1.75rem; font-weight: 700; }',
    '    #meta { color: var(--muted); margin-top: 0.4rem; font-size: 0.875rem; }',
    '    code { font-size: 0.8em; background: rgba(255,255,255,0.1); padding: 0.15em 0.45em; border-radius: 0.25rem; }',
    '    #error-banner { color: #f97316; background: rgba(249,115,22,0.12); border: 1px solid #f97316; border-radius: 0.5rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.9rem; line-height: 1.6; }',
    '    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }',
    '    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem 1.5rem; }',
    '    .kpi-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.3rem; }',
    '    .kpi-value { font-size: 2rem; font-weight: 700; line-height: 1; }',
    '    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }',
    '    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; overflow: hidden; }',
    '    .card.wide { grid-column: 1 / -1; }',
    '    .card h2 { font-size: 0.875rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }',
    '    .chart-wrap { position: relative; }',
    '    .table-toolbar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }',
    '    #search { flex: 0 0 280px; background: #0f172a; border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); padding: 0.45rem 0.75rem; font-size: 0.875rem; outline: none; }',
    '    #search:focus { border-color: #3b82f6; }',
    '    .type-filters { display: flex; gap: 0.4rem; flex-wrap: wrap; }',
    '    .filter-btn { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid; cursor: pointer; background: transparent; color: var(--muted); border-color: var(--border); transition: all 0.15s; }',
    '    .count-badge { margin-left: auto; font-size: 0.75rem; color: var(--muted); white-space: nowrap; }',
    '    .table-wrap { overflow-x: auto; }',
    '    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }',
    '    th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--muted); font-weight: 600; white-space: nowrap; }',
    '    td { padding: 0.45rem 0.75rem; border-bottom: 1px solid rgba(51,65,85,0.4); vertical-align: middle; white-space: nowrap; }',
    '    td:last-child { white-space: normal; }',
    '    tr:last-child td { border-bottom: none; }',
    '    tr:hover td { background: rgba(255,255,255,0.03); }',
    '    tr.hidden { display: none; }',
    '    .type-badge { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.5rem; border-radius: 999px; border: 1px solid; }',
    '    .badge-breaking { display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 0.25rem; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); margin-left: 0.35rem; vertical-align: middle; }',
    '    @media (max-width: 768px) {',
    '      .charts-grid { grid-template-columns: 1fr; }',
    '      .card.wide { grid-column: 1; }',
    '      #search { flex: 1 1 100%; }',
    '    }',
  ].join('\n');
}

// ── Client JS ─────────────────────────────────────────────────────────────────

function buildClientJs() {
  return [
    '(async () => {',
    '',
    '  var TYPE_COLORS = {',
    '    feat:"#22c55e", fix:"#ef4444", perf:"#f97316", refactor:"#8b5cf6",',
    '    docs:"#3b82f6", test:"#eab308", style:"#ec4899", chore:"#6b7280",',
    '    ci:"#14b8a6", build:"#a78bfa", revert:"#f43f5e",',
    '  };',
    '  function colorFor(t) { return TYPE_COLORS[t] || "#94a3b8"; }',
    '',
    '  function showError(msg) {',
    '    var el = document.getElementById("error-banner");',
    '    el.style.display = "block";',
    '    el.innerHTML = msg;',
    '  }',
    '',
    '  // ── Fetch data ─────────────────────────────────────────────────────────',
    '  var analysis;',
    '  try {',
    '    analysis = await fetch("./commit-analysis.json").then(function(r) {',
    '      if (!r.ok) throw new Error("commit-analysis.json not found (" + r.status + ")");',
    '      return r.json();',
    '    });',
    '  } catch(e) {',
    '    showError(',
    '      "<strong>&#x26A0;&#xFE0F; Failed to load data:</strong> " + e.message +',
    '      "<br>Start the local server: <code>node serve.mjs</code> then open <code>http://localhost:3000</code>"',
    '    );',
    '    return;',
    '  }',
    '',
    '  var meta    = analysis.meta;',
    '  var summary = analysis.summary;',
    '  var commits = analysis.commits;',
    '  var byType  = analysis.byType;',
    '',
    '  // ── Meta header ────────────────────────────────────────────────────────',
    '  var from  = (meta.timeRange.first  || "").slice(0, 10);',
    '  var until = (meta.timeRange.last   || "").slice(0, 10);',
    '  document.getElementById("meta").innerHTML =',
    '    (meta.repo ? "Repo: <code>" + meta.repo + "</code>" + " \u00a0\u00b7\u00a0 " : "") +',
    '    "Branch: <code>" + meta.branch + "</code>" +',
    '    " \u00a0\u00b7\u00a0 Since: <code>" + meta.since + "</code>" +',
    '    " \u00a0\u00b7\u00a0 Period: <code>" + from + "</code> \u2192 <code>" + until + "</code>" +',
    '    " \u00a0\u00b7\u00a0 Generated: " + new Date(meta.generatedAt).toLocaleString();',
    '',
    '  // ── KPI cards ──────────────────────────────────────────────────────────',
    '  var convPct = summary.total > 0 ? ((summary.conventional / summary.total) * 100).toFixed(1) : "0.0";',
    '  var kpis = [',
    '    { label: "Total commits",    value: summary.total },',
    '    { label: "Conventional",     value: summary.conventional + " <small>(" + convPct + "%)</small>" },',
    '    { label: "Non-conventional", value: summary.nonConventional },',
    '    { label: "Breaking changes", value: summary.breaking, style: summary.breaking > 0 ? "color:#ef4444" : "" },',
    '    { label: "Types detected",   value: Object.keys(byType).length },',
    '    { label: "Active authors",   value: summary.topAuthors.length },',
    '  ];',
    '  document.getElementById("kpis").innerHTML = kpis.map(function(k) {',
    '    return \'<div class="kpi"><div class="kpi-label">\' + k.label +',
    '           \'</div><div class="kpi-value" style="\' + (k.style||"") + \'">\' + k.value + \'</div></div>\';',
    '  }).join("");',
    '',
    '  // ── Derive ordered types ───────────────────────────────────────────────',
    '  var KNOWN = ["feat","fix","perf","refactor","docs","test","style","chore","ci","build","revert"];',
    '  var orderedTypes = KNOWN.filter(function(t) { return byType[t]; })',
    '    .concat(Object.keys(byType).filter(function(t) { return !KNOWN.includes(t); }));',
    '',
    '  Chart.defaults.color = "#94a3b8";',
    '  Chart.defaults.borderColor = "#334155";',
    '  Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";',
    '',
    '  // ── Chart 1: donut ─────────────────────────────────────────────────────',
    '  new Chart(document.getElementById("c-donut"), {',
    '    type: "doughnut",',
    '    data: {',
    '      labels: orderedTypes,',
    '      datasets: [{',
    '        data: orderedTypes.map(function(t) { return byType[t].count; }),',
    '        backgroundColor: orderedTypes.map(colorFor),',
    '        borderWidth: 2, borderColor: "#1e293b",',
    '      }],',
    '    },',
    '    options: {',
    '      responsive: true, maintainAspectRatio: false,',
    '      plugins: {',
    '        legend: { position: "right" },',
    '        tooltip: { callbacks: { label: function(ctx) {',
    '          var total = ctx.dataset.data.reduce(function(a,b){return a+b;},0);',
    '          var pct = total > 0 ? ((ctx.raw/total)*100).toFixed(1) : 0;',
    '          return " " + ctx.label + ": " + ctx.raw + " (" + pct + "%)";',
    '        }}},',
    '      },',
    '    },',
    '  });',
    '',
    '  // ── Chart 2: horizontal bar — top authors ─────────────────────────────',
    '  new Chart(document.getElementById("c-authors"), {',
    '    type: "bar",',
    '    data: {',
    '      labels: summary.topAuthors.map(function(a) { return a.author; }),',
    '      datasets: [{ label: "Commits", backgroundColor: "#3b82f6",',
    '        data: summary.topAuthors.map(function(a) { return a.count; }) }],',
    '    },',
    '    options: {',
    '      indexAxis: "y", responsive: true, maintainAspectRatio: false,',
    '      plugins: { legend: { display: false } },',
    '      scales: { x: { beginAtZero: true, title: { display: true, text: "Commits" } } },',
    '    },',
    '  });',
    '',
    '  // ── Chart 3: stacked bar — commits per week ───────────────────────────',
    '  (function() {',
    '    var weekMap = {};',
    '    commits.forEach(function(c) {',
    '      var d = new Date(c.date);',
    '      var day = d.getUTCDay() || 7;',
    '      var mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));',
    '      var k = mon.toISOString().slice(0, 10);',
    '      if (!weekMap[k]) weekMap[k] = {};',
    '      var t = c.type || "__other__";',
    '      weekMap[k][t] = (weekMap[k][t] || 0) + 1;',
    '    });',
    '    var weekLabels = Object.keys(weekMap).sort();',
    '    var datasets = orderedTypes.map(function(t) {',
    '      return { label: t, backgroundColor: colorFor(t),',
    '               data: weekLabels.map(function(w) { return weekMap[w][t] || 0; }),',
    '               stack: "commits" };',
    '    });',
    '    if (summary.nonConventional > 0) {',
    '      datasets.push({ label: "other", backgroundColor: "#475569",',
    '        data: weekLabels.map(function(w) { return weekMap[w]["__other__"] || 0; }),',
    '        stack: "commits" });',
    '    }',
    '    new Chart(document.getElementById("c-weekly"), {',
    '      type: "bar",',
    '      data: { labels: weekLabels, datasets: datasets },',
    '      options: {',
    '        responsive: true, maintainAspectRatio: false,',
    '        plugins: { legend: { position: "top" } },',
    '        scales: {',
    '          x: { stacked: true, title: { display: true, text: "Week (Monday)" } },',
    '          y: { stacked: true, beginAtZero: true, title: { display: true, text: "Commits" } },',
    '        },',
    '      },',
    '    });',
    '  })();',
    '',
    '  // ── Table: build + search + type filter ───────────────────────────────',
    '  (function() {',
    '    var tbody = document.getElementById("commits-tbody");',
    '    tbody.innerHTML = commits.map(function(c) {',
    '      var color = colorFor(c.type);',
    '      var type  = c.type || "\u2014";',
    '      var scope = c.scope ? "<code>" + esc(c.scope) + "</code>" : "\u2014";',
    '      var desc  = esc(c.description || c.subject);',
    '      var brk   = c.breaking ? " <span class=\'badge-breaking\'>BREAKING</span>" : "";',
    '      return "<tr data-type=\'" + esc(type) + "\'>" +',
    '        "<td><code>" + c.hash.slice(0,7) + "</code></td>" +',
    '        "<td>" + (c.date||"").slice(0,10) + "</td>" +',
    '        "<td>" + esc(c.author) + "</td>" +',
    '        "<td><span class=\'type-badge\' style=\'background:" + color + "22;color:" + color + ";border-color:" + color + "55\'>" + esc(type) + "</span></td>" +',
    '        "<td>" + scope + "</td>" +',
    '        "<td>" + desc + brk + "</td>" +',
    '        "</tr>";',
    '    }).join("");',
    '',
    '    var rows   = Array.from(tbody.querySelectorAll("tr"));',
    '    var badge  = document.getElementById("count-badge");',
    '    var search = document.getElementById("search");',
    '    var activeTypes = new Set();',
    '',
    '    var filtersEl = document.getElementById("type-filters");',
    '    orderedTypes.forEach(function(t) {',
    '      var btn = document.createElement("button");',
    '      btn.className = "filter-btn";',
    '      btn.textContent = t;',
    '      btn.style.borderColor = colorFor(t);',
    '      btn.dataset.type = t;',
    '      btn.addEventListener("click", function() {',
    '        if (activeTypes.has(t)) {',
    '          activeTypes.delete(t);',
    '          btn.classList.remove("active");',
    '          btn.style.backgroundColor = "transparent";',
    '          btn.style.color = "#94a3b8";',
    '        } else {',
    '          activeTypes.add(t);',
    '          btn.classList.add("active");',
    '          btn.style.backgroundColor = colorFor(t);',
    '          btn.style.color = "#fff";',
    '        }',
    '        filterRows();',
    '      });',
    '      filtersEl.appendChild(btn);',
    '    });',
    '',
    '    function filterRows() {',
    '      var q = search.value.toLowerCase().trim();',
    '      var visible = 0;',
    '      rows.forEach(function(row) {',
    '        var typeMatch = activeTypes.size === 0 || activeTypes.has(row.dataset.type);',
    '        var textMatch = q === "" || row.textContent.toLowerCase().includes(q);',
    '        if (typeMatch && textMatch) { row.classList.remove("hidden"); visible++; }',
    '        else { row.classList.add("hidden"); }',
    '      });',
    '      badge.textContent = visible + " / " + rows.length + " commits";',
    '    }',
    '    search.addEventListener("input", filterRows);',
    '    filterRows();',
    '  })();',
    '',
    '  function esc(s) {',
    '    if (!s) return "";',
    '    return String(s)',
    '      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")',
    '      .replace(/"/g,"&quot;").replace(/\'/g,"&#39;");',
    '  }',
    '',
    '})();',
  ].join('\n');
}
