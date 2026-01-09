/* Keyword Tool Frontend (v4)
   - index.html  -> collect action + input
   - wait.html   -> POST to webhook, store response (sessionStorage)
   - result.html -> render tables + export XLSX

   Supports response formats:
   1) Already-flattened rows (row_type: keyword / related_keyword / suggested_keyword / site_keyword)
   2) Raw DataForSEO response for:
      - related_keywords
      - keyword_suggestions
      - keywords_for_site (including keyword_data + ranked_serp_element)
   3) Weird wrapped shapes like:
      - [[ { tasks: { result: [...] } } ]]
      - [ { tasks: [ { result: [...] } ] } ]
*/

const STORAGE_KEY = "kw_tool_payload_v4";

function nowMs(){ return Date.now(); }
function minutesToMs(m){ return m * 60 * 1000; }

function savePayload(payload){
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function loadPayload(){
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function clearPayload(){ sessionStorage.removeItem(STORAGE_KEY); }

function isExpired(createdAtMs){
  return (nowMs() - createdAtMs) > minutesToMs(window.MEMORY_MINUTES || 10);
}

function sanitizeDomain(v){
  const s = String(v || "").trim();
  if (!s) return "";
  try {
    if (s.startsWith("http://") || s.startsWith("https://")){
      return new URL(s).hostname.replace(/^www\./, "");
    }
  } catch {}
  return s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

/* ---------- Index UI ---------- */

function setIndexUI(action){
  const inputLabel = document.getElementById("inputLabel");
  const input = document.getElementById("userInput");
  const hint = document.getElementById("hint");
  if (!inputLabel || !input || !hint) return;

  if (action === "site_keywords"){
    inputLabel.textContent = "Enter domain";
    input.placeholder = "e.g. dataforseo.com";
    hint.textContent = "We’ll send { action: \"site_keywords\", input: \"domain\" } to your webhook.";
  } else {
    inputLabel.textContent = "Enter seed keyword";
    input.placeholder = "e.g. robotic";
    hint.textContent = "We’ll send { action: \"keyword_research\", input: \"seed keyword\" } to your webhook.";
  }
}

function initIndexPage(){
  const action = document.getElementById("action");
  const form = document.getElementById("kwForm");
  const input = document.getElementById("userInput");

  if (!action || !form || !input) return;

  setIndexUI(action.value);
  action.addEventListener("change", () => setIndexUI(action.value));

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const act = action.value;
    let userInput = input.value.trim();

    if (act === "site_keywords"){
      userInput = sanitizeDomain(userInput);
    }

    if (!userInput){
      input.focus();
      input.style.borderColor = "rgba(255,71,119,.7)";
      setTimeout(()=> input.style.borderColor = "", 600);
      return;
    }

    const payload = {
      createdAtMs: nowMs(),
      request: { action: act, input: userInput },
      response: null,
      activeTab: null
    };

    savePayload(payload);
    window.location.href = "wait.html";
  });
}

/* ---------- Webhook ---------- */

async function postToWebhook(body){
  if (!window.WEBHOOK_URL || window.WEBHOOK_URL.includes("REPLACE_ME")){
    throw new Error("WEBHOOK_URL is not configured in assets/config.js");
  }

  const res = await fetch(window.WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok){
    const msg = (json && (json.message || json.error || json.status_message))
      ? JSON.stringify(json)
      : text;
    throw new Error(`Webhook error (${res.status}): ${msg || "No body"}`);
  }

  return json ?? { ok: true };
}

/* ---------- Wait page ---------- */

function randomQuotes(){
  return [
    { q: "Asking the internet for keyword ideas is like asking a cat for tax advice.", a: "Still somehow profitable." },
    { q: "Crunching data… because guessing is a lifestyle choice.", a: "And not a good one." },
    { q: "Computers: doing in 2 seconds what humans avoid for 2 weeks.", a: "Respectfully." },
    { q: "If this takes long, blame CORS. It’s always CORS.", a: "The villain with a clipboard." },
    { q: "Generating insights… please pretend this is magic.", a: "It’s mostly JSON." },
    { q: "Loading… the part where you reflect on your life choices.", a: "Keyword: “why”." },
    { q: "Hold tight. We’re negotiating with the API gods.", a: "They’re needy." },
    { q: "Processing… like your brain, but with fewer emotional issues.", a: "Arguably." },
  ];
}

function initWaitPage(){
  const statusLine = document.getElementById("statusLine");
  const quoteEl = document.getElementById("quote");
  const quoteMeta = document.getElementById("quoteMeta");
  const ttlBadge = document.getElementById("ttlBadge");

  const payload = loadPayload();
  if (!payload || !payload.request){
    window.location.href = "index.html";
    return;
  }

  ttlBadge.textContent = `Memory: ${window.MEMORY_MINUTES || 10} minutes`;

  if (isExpired(payload.createdAtMs)){
    clearPayload();
    window.location.href = "index.html";
    return;
  }

  const quotes = randomQuotes();
  let idx = Math.floor(Math.random() * quotes.length);
  function showQuote(){
    const item = quotes[idx % quotes.length];
    quoteEl.textContent = item.q;
    quoteMeta.textContent = item.a;
    idx++;
  }
  showQuote();
  const t = setInterval(showQuote, 2400);

  (async () => {
    try {
      statusLine.textContent = "Sending request to webhook…";
      const body = {
        action: payload.request.action,
        input: payload.request.input
      };

      const response = await postToWebhook(body);

      payload.response = response;
      savePayload(payload);

      statusLine.textContent = "Done. Redirecting…";
      clearInterval(t);
      setTimeout(()=> window.location.href = "result.html", 300);
    } catch (err){
      clearInterval(t);
      statusLine.innerHTML = `<span style="color: rgba(255,71,119,.95)">Failed:</span> ${escapeHtml(String(err.message || err))}`;
    }
  })();
}

/* ---------- Helpers ---------- */

function asArray(v){ return Array.isArray(v) ? v : []; }

function pick(obj, keys){
  for (const k of keys){
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
}

function toNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Row Builders ---------- */

function buildMainRowFromKeywordData(seedKeyword, locationCode, languageCode, depth, kwData){
  const kwInfo = kwData.keyword_info || {};
  const kwProps = kwData.keyword_properties || {};
  const serpInfo = kwData.serp_info || {};
  const avgBacklinks = kwData.avg_backlinks_info || {};
  const intentInfo = kwData.search_intent_info || {};

  return {
    row_type: "keyword",
    seed_keyword: seedKeyword ?? null,
    keyword: kwData.keyword ?? null,
    depth: depth ?? null,
    location_code: locationCode ?? null,
    language_code: languageCode ?? null,

    search_volume: toNum(kwInfo.search_volume),
    cpc: toNum(kwInfo.cpc),
    competition: toNum(kwInfo.competition),
    competition_level: kwInfo.competition_level ?? null,
    low_top_of_page_bid: toNum(kwInfo.low_top_of_page_bid),
    high_top_of_page_bid: toNum(kwInfo.high_top_of_page_bid),

    keyword_difficulty: toNum(kwProps.keyword_difficulty),
    detected_language: kwProps.detected_language ?? null,

    main_intent: intentInfo.main_intent ?? null,

    se_results_count: toNum(serpInfo.se_results_count),
    serp_item_types: serpInfo.serp_item_types ?? null,
    check_url: serpInfo.check_url ?? null,

    avg_backlinks: toNum(avgBacklinks.backlinks),
    avg_ref_domains: toNum(avgBacklinks.referring_domains),

    keyword_last_updated: kwInfo.last_updated_time ?? kwInfo.last_updated ?? null,
    serp_last_updated: serpInfo.last_updated_time ?? null,
  };
}

function buildSuggestedRowFromSuggestionItem(seedKeyword, item){
  const kwInfo = item.keyword_info || {};
  const kwProps = item.keyword_properties || {};
  const avgBacklinks = item.avg_backlinks_info || {};
  const intentInfo = item.search_intent_info || {};

  return {
    row_type: "suggested_keyword",
    seed_keyword: seedKeyword ?? null,

    keyword: item.keyword ?? null,
    location_code: item.location_code ?? null,
    language_code: item.language_code ?? null,

    search_volume: toNum(kwInfo.search_volume),
    cpc: toNum(kwInfo.cpc),
    competition: toNum(kwInfo.competition),
    competition_level: kwInfo.competition_level ?? null,
    low_top_of_page_bid: toNum(kwInfo.low_top_of_page_bid),
    high_top_of_page_bid: toNum(kwInfo.high_top_of_page_bid),
    keyword_last_updated: kwInfo.last_updated_time ?? null,

    keyword_difficulty: toNum(kwProps.keyword_difficulty),
    detected_language: kwProps.detected_language ?? null,
    is_another_language: kwProps.is_another_language ?? null,
    words_count: toNum(kwProps.words_count),
    core_keyword: kwProps.core_keyword ?? null,

    main_intent: intentInfo.main_intent ?? null,
    foreign_intent: intentInfo.foreign_intent ?? null,

    avg_backlinks: toNum(avgBacklinks.backlinks),
    avg_ref_domains: toNum(avgBacklinks.referring_domains),
    avg_backlinks_updated: avgBacklinks.last_updated_time ?? null,

    // Suggestions usually don’t include SERP block. Keep these for schema consistency.
    se_results_count: null,
    serp_item_types: null,
    check_url: null,
    serp_last_updated: null,
  };
}

function buildSiteKeywordRow(target, it){
  // it: { keyword_data: {...}, ranked_serp_element: {...} }
  const kd = it.keyword_data || {};
  const kwInfo = kd.keyword_info || {};
  const kwProps = kd.keyword_properties || {};
  const serpInfo = kd.serp_info || {};
  const avgBacklinks = kd.avg_backlinks_info || {};
  const intentInfo = kd.search_intent_info || {};

  const ranked = it.ranked_serp_element || {};
  const serpItem = ranked.serp_item || {};

  return {
    row_type: "site_keyword",
    target: target ?? null,

    keyword: kd.keyword ?? null,
    location_code: kd.location_code ?? null,
    language_code: kd.language_code ?? null,

    search_volume: toNum(kwInfo.search_volume),
    cpc: toNum(kwInfo.cpc),
    competition: toNum(kwInfo.competition),
    competition_level: kwInfo.competition_level ?? null,
    low_top_of_page_bid: toNum(kwInfo.low_top_of_page_bid),
    high_top_of_page_bid: toNum(kwInfo.high_top_of_page_bid),

    keyword_difficulty: toNum(kwProps.keyword_difficulty),
    detected_language: kwProps.detected_language ?? null,

    main_intent: intentInfo.main_intent ?? null,
    foreign_intent: intentInfo.foreign_intent ?? null,

    avg_backlinks: toNum(avgBacklinks.backlinks),
    avg_ref_domains: toNum(avgBacklinks.referring_domains),

    keyword_last_updated: kwInfo.last_updated_time ?? null,
    serp_last_updated: ranked.last_updated_time ?? serpInfo.last_updated_time ?? null,

    // Ranking info (this is the whole point of keywords_for_site)
    rank_absolute: toNum(serpItem.rank_absolute),
    serp_url: serpItem.url ?? null,
    serp_title: serpItem.title ?? null,
    serp_domain: serpItem.domain ?? serpItem.main_domain ?? null,
    serp_etv: toNum(serpItem.etv),
    serp_paid_traffic_cost: toNum(serpItem.estimated_paid_traffic_cost),

    // sometimes useful to keep check_url around
    check_url: ranked.check_url ?? serpInfo.check_url ?? null,
  };
}

/* ---------- Response Normalizer ---------- */

function unwrapRaw(raw){
  let r = raw;

  // handle [[ ... ]] nonsense
  while (Array.isArray(r) && r.length === 1) r = r[0];

  // handle { rows: [...] }
  if (r && typeof r === "object" && Array.isArray(r.rows)) r = r.rows;

  // handle { tasks: [ { result: ... } ] } or { tasks: { result: ... } }
  if (r && typeof r === "object" && r.tasks){
    if (Array.isArray(r.tasks) && r.tasks[0]) r = r.tasks[0];
    else if (typeof r.tasks === "object") r = r.tasks;
  }

  // handle { result: [...] } wrappers
  if (r && typeof r === "object" && Array.isArray(r.result) && r.path && r.data) {
    return r; // DataForSEO style root
  }

  return r;
}

/**
 * normalizeWebhookResponse(action, rawResponse)
 * Returns:
 *  {
 *    main: [],
 *    related: [],
 *    suggested: [],
 *    site: []
 *  }
 */
function normalizeWebhookResponse(action, raw){
  const out = { main: [], related: [], suggested: [], site: [] };
  if (!raw) return out;

  const r0 = unwrapRaw(raw);

  // 1) If it's already flattened rows array
  if (Array.isArray(r0)){
    for (const row of r0){
      if (!row || typeof row !== "object") continue;
      if (row.row_type === "keyword") out.main.push(row);
      else if (row.row_type === "related_keyword") out.related.push(row);
      else if (row.row_type === "suggested_keyword") out.suggested.push(row);
      else if (row.row_type === "site_keyword") out.site.push(row);
      else out.main.push(row);
    }
    return out;
  }

  // 2) If it's already in combined buckets
  if (r0 && typeof r0 === "object"){
    const hasBuckets =
      Array.isArray(r0.main) || Array.isArray(r0.related) ||
      Array.isArray(r0.suggested) || Array.isArray(r0.site);

    if (hasBuckets){
      out.main = asArray(r0.main);
      out.related = asArray(r0.related);
      out.suggested = asArray(r0.suggested);
      out.site = asArray(r0.site);
      return out;
    }
  }

  // 3) DataForSEO raw single-function response
  const root = r0;
  const fn =
    pick(root?.data, ["function"]) ||
    (Array.isArray(root?.path) ? root.path[root.path.length - 2] : null);

  const result0 = (root?.result && root.result[0]) ? root.result[0] : null;
  const items = result0 ? (result0.items || []) : [];

  if (!fn || !result0) return out;

  if (fn === "related_keywords"){
    const seed = result0.seed_keyword ?? null;
    const locationCode = result0.location_code ?? null;
    const languageCode = result0.language_code ?? null;

    for (const it of items){
      const depth = it.depth ?? null;
      const kwData = it.keyword_data || {};
      out.main.push(buildMainRowFromKeywordData(seed, locationCode, languageCode, depth, kwData));

      const rel = it.related_keywords || [];
      for (const rk of rel){
        out.related.push({
          row_type: "related_keyword",
          seed_keyword: seed,
          parent_keyword: kwData.keyword ?? null,
          related_keyword: rk,
          depth,
          location_code: locationCode,
          language_code: languageCode
        });
      }
    }
    return out;
  }

  if (fn === "keyword_suggestions"){
    const seed = result0.seed_keyword ?? result0.seed ?? root?.data?.keyword ?? null;
    for (const it of items){
      out.suggested.push(buildSuggestedRowFromSuggestionItem(seed, it));
    }
    return out;
  }

  if (fn === "keywords_for_site"){
    const target = result0.target ?? root?.data?.target ?? null;
    for (const it of items){
      out.site.push(buildSiteKeywordRow(target, it));
    }
    return out;
  }

  // fallback: throw items into main so user sees something
  out.main = items;
  return out;
}

/* ---------- Table Columns ---------- */

function colsForTab(tabKey){
  if (tabKey === "related"){
    return [
      ["seed_keyword", "Seed"],
      ["parent_keyword", "Parent"],
      ["related_keyword", "Related"],
      ["depth", "Depth"],
      ["location_code", "Loc"],
      ["language_code", "Lang"],
    ];
  }

  if (tabKey === "suggested"){
    return [
      ["seed_keyword", "Seed"],
      ["keyword", "Keyword"],
      ["search_volume", "Vol"],
      ["cpc", "CPC"],
      ["competition", "Comp"],
      ["competition_level", "Comp Level"],
      ["low_top_of_page_bid", "Low Bid"],
      ["high_top_of_page_bid", "High Bid"],
      ["keyword_difficulty", "KD"],
      ["detected_language", "Lang"],
      ["is_another_language", "Other Lang?"],
      ["words_count", "Words"],
      ["core_keyword", "Core"],
      ["main_intent", "Intent"],
      ["foreign_intent", "Foreign Intent"],
      ["avg_ref_domains", "Avg Ref Domains"],
      ["avg_backlinks", "Avg Backlinks"],
      ["avg_backlinks_updated", "BL Updated"],
      ["keyword_last_updated", "KW Updated"],
    ];
  }

  if (tabKey === "site"){
    return [
      ["target", "Target (Domain)"],
      ["keyword", "Keyword"],
      ["search_volume", "Vol"],
      ["cpc", "CPC"],
      ["competition_level", "Comp Level"],
      ["keyword_difficulty", "KD"],
      ["main_intent", "Intent"],

      ["rank_absolute", "Rank"],
      ["serp_url", "Ranking URL"],
      ["serp_title", "Title"],
      ["serp_domain", "Domain"],

      ["serp_etv", "ETV"],
      ["serp_paid_traffic_cost", "Paid Cost"],

      ["avg_ref_domains", "Avg Ref Domains"],
      ["avg_backlinks", "Avg Backlinks"],
      ["keyword_last_updated", "KW Updated"],
      ["serp_last_updated", "SERP Updated"],
    ];
  }

  // main tab
  return [
    ["seed_keyword", "Seed"],
    ["keyword", "Keyword"],
    ["depth", "Depth"],
    ["search_volume", "Vol"],
    ["cpc", "CPC"],
    ["competition", "Comp"],
    ["competition_level", "Comp Level"],
    ["low_top_of_page_bid", "Low Bid"],
    ["high_top_of_page_bid", "High Bid"],
    ["keyword_difficulty", "KD"],
    ["detected_language", "Lang"],
    ["main_intent", "Intent"],
    ["se_results_count", "Results"],
    ["serp_item_types", "SERP Types"],
    ["check_url", "Check URL"],
    ["avg_ref_domains", "Avg Ref Domains"],
    ["avg_backlinks", "Avg Backlinks"],
    ["keyword_last_updated", "KW Updated"],
    ["serp_last_updated", "SERP Updated"],
  ];
}

/* ---------- Render ---------- */

function renderTable(el, rows, tabKey, filterText){
  const cols = colsForTab(tabKey);

  const f = (filterText || "").toLowerCase().trim();
  const filtered = !f ? rows : rows.filter(r => JSON.stringify(r).toLowerCase().includes(f));

  let thead = "<thead><tr>" + cols.map(c=>`<th>${c[1]}</th>`).join("") + "</tr></thead>";

  let tbody = "<tbody>";
  for (const r of filtered){
    tbody += "<tr>" + cols.map(([key])=>{
      let v = r ? r[key] : "";
      if (v === null || v === undefined) v = "";
      if (Array.isArray(v)) v = v.join(", ");
      if (typeof v === "object" && v) v = JSON.stringify(v);

      const linkKeys = new Set(["check_url", "serp_url", "url"]);
      if (linkKeys.has(key) && v){
        const safe = String(v);
        return `<td><a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">open</a></td>`;
      }

      return `<td>${escapeHtml(String(v))}</td>`;
    }).join("") + "</tr>";
  }
  tbody += "</tbody>";

  el.innerHTML = thead + tbody;
  return { filteredCount: filtered.length, total: rows.length };
}

function makeWorkbookForDownload(tabs, dataByTab){
  if (!window.XLSX){
    throw new Error("XLSX library failed to load (CDN blocked).");
  }
  const wb = window.XLSX.utils.book_new();

  for (const tab of tabs){
    const key = tab.key;
    const rows = dataByTab[key] || [];
    const cols = colsForTab(key);
    const aoa = [cols.map(c=>c[1])];

    for (const r of rows){
      aoa.push(cols.map(([k])=>{
        let v = r?.[k];
        if (v === null || v === undefined) return "";
        if (Array.isArray(v)) return v.join(", ");
        if (typeof v === "object" && v) return JSON.stringify(v);
        return String(v);
      }));
    }

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    window.XLSX.utils.book_append_sheet(wb, ws, tab.label.substring(0, 31));
  }

  return wb;
}

/* ---------- Result Page ---------- */

function initResultPage(){
  const payload = loadPayload();
  if (!payload || !payload.request){
    window.location.href = "index.html";
    return;
  }

  if (isExpired(payload.createdAtMs)){
    clearPayload();
    window.location.href = "index.html";
    return;
  }

  const action = payload.request.action;
  const input = payload.request.input;
  const raw = payload.response;

  const summary = document.getElementById("summary");
  const tabsEl = document.getElementById("tabs");
  const tableEl = document.getElementById("table");
  const filterInput = document.getElementById("filterInput");
  const countLine = document.getElementById("countLine");
  const downloadBtn = document.getElementById("downloadBtn");
  const backBtn = document.getElementById("backBtn");

  const normalized = normalizeWebhookResponse(action, raw);

  const tabs = (action === "site_keywords")
    ? [{ key: "site", label: "Website Keywords" }]
    : [
        { key: "main", label: "Main Keywords" },
        { key: "related", label: "Related Keywords" },
        { key: "suggested", label: "Suggested Keywords" },
      ];

  const actionLabel = action === "site_keywords"
    ? "Get website keyword (domain)"
    : "Get keyword (seed keyword)";

  summary.textContent = `${actionLabel} • Input: "${input}"`;

  let activeKey = payload.activeTab || tabs[0].key;
  if (!tabs.some(t => t.key === activeKey)) activeKey = tabs[0].key;

  function setActiveTab(key){
    activeKey = key;
    payload.activeTab = key;
    savePayload(payload);
    render();
  }

  function renderTabs(){
    tabsEl.innerHTML = tabs.map(t =>
      `<button class="tab" data-tab="${t.key}" aria-selected="${t.key === activeKey}">${escapeHtml(t.label)}</button>`
    ).join("");

    tabsEl.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=> setActiveTab(btn.getAttribute("data-tab")));
    });
  }

  function getRowsByKey(key){
    if (key === "main") return normalized.main;
    if (key === "related") return normalized.related;
    if (key === "suggested") return normalized.suggested;
    if (key === "site") return normalized.site;
    return [];
  }

  function render(){
    renderTabs();
    const rows = getRowsByKey(activeKey);
    const res = renderTable(tableEl, rows, activeKey, filterInput.value);
    countLine.textContent = `${res.filteredCount} shown • ${res.total} total`;
  }

  filterInput.addEventListener("input", render);

  downloadBtn.addEventListener("click", () => {
    try{
      const dataByTab = {
        main: normalized.main,
        related: normalized.related,
        suggested: normalized.suggested,
        site: normalized.site,
      };
      const wb = makeWorkbookForDownload(tabs, dataByTab);
      const fileNameBase =
        (action === "site_keywords" ? "site_keywords" : "keyword_research") +
        "_" + input.replace(/\s+/g, "_").replace(/[^\w\-\.]/g, "");
      window.XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
    } catch (e){
      alert(String(e.message || e));
    }
  });

  backBtn.addEventListener("click", () => {
    clearPayload();
    window.location.href = "index.html";
  });

  render();
}

/* ---------- expose init functions ---------- */
window.initIndexPage = initIndexPage;
window.initWaitPage = initWaitPage;
window.initResultPage = initResultPage;
