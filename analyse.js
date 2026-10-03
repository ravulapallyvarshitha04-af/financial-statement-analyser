// Serverless function for Vercel.
// All ratios, comparisons and data checks are calculated HERE in code, not by the AI.
// Claude only writes the narrative, using the rules in skill/SKILL.md.

const fs = require("fs");
const path = require("path");

const UNITS = ["Rs", "Rs thousands", "Rs lakhs", "Rs crore", "Rs millions"];

// nonNeg: the figure cannot be negative. Profits, equity and cash flows may be negative.
const FIELDS = [
  { key: "revenue", label: "Revenue", group: "Income statement", nonNeg: true },
  { key: "operatingExpenses", label: "Operating expenses", group: "Income statement", nonNeg: true },
  { key: "operatingProfit", label: "Operating profit", group: "Income statement" },
  { key: "profitBeforeTax", label: "Profit before tax", group: "Income statement" },
  { key: "taxExpense", label: "Tax expense", group: "Income statement", nonNeg: true },
  { key: "netProfit", label: "Net profit", group: "Income statement" },
  { key: "currentAssets", label: "Current assets", group: "Balance sheet", nonNeg: true },
  { key: "totalAssets", label: "Total assets", group: "Balance sheet", nonNeg: true },
  { key: "currentLiabilities", label: "Current liabilities", group: "Balance sheet", nonNeg: true },
  { key: "totalLiabilities", label: "Total liabilities", group: "Balance sheet", nonNeg: true },
  { key: "equity", label: "Shareholders' equity", group: "Balance sheet" },
  { key: "debt", label: "Total debt", group: "Balance sheet", nonNeg: true },
  { key: "cash", label: "Cash and cash equivalents", group: "Balance sheet", nonNeg: true },
  { key: "cfo", label: "Operating cash flow", group: "Cash flow statement" },
  { key: "cfi", label: "Investing cash flow", group: "Cash flow statement" },
  { key: "cff", label: "Financing cash flow", group: "Cash flow statement" },
];
const LABEL = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function loadSkill() {
  try {
    return fs.readFileSync(path.join(process.cwd(), "skill", "SKILL.md"), "utf8");
  } catch (e) {
    return "Write a short, factual, neutral commentary on the financial statement figures. Use only the numbers given. Never state causes as fact.";
  }
}

function parsePeriod(obj, name, required) {
  const out = {};
  let any = false;
  for (const f of FIELDS) {
    const raw = obj ? obj[f.key] : undefined;
    if (raw === undefined || raw === null || String(raw).trim() === "") { out[f.key] = null; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: name + ": " + f.label + " must be a number." };
    if (f.nonNeg && n < 0) return { error: name + ": " + f.label + " cannot be negative." };
    out[f.key] = n;
    any = true;
  }
  if (required && (out.revenue === null || out.netProfit === null)) {
    return { error: name + ": Revenue and Net profit are required." };
  }
  return { values: any ? out : null };
}

function validate(body) {
  if (!body || typeof body !== "object") return { error: "Send the figures as JSON." };
  if (!UNITS.includes(body.unit)) return { error: "Choose a valid unit." };
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 80) : "";
  const cur = parsePeriod(body.current, "Current year", true);
  if (cur.error) return cur;
  const prev = parsePeriod(body.previous, "Previous year", false);
  if (prev.error) return prev;
  return { unit: body.unit, company, current: cur.values, previous: prev.values };
}

function ratio(p, numKey, denKey, mult, positiveDen) {
  if (!p) return { value: null, reason: "No data for this period" };
  const n = p[numKey], d = p[denKey];
  if (n === null || d === null) {
    const missing = [n === null ? LABEL[numKey] : null, d === null ? LABEL[denKey] : null].filter(Boolean);
    return { value: null, reason: "Missing: " + missing.join(" and ") };
  }
  if (d === 0) return { value: null, reason: LABEL[denKey] + " is zero" };
  if (positiveDen && d < 0) return { value: null, reason: LABEL[denKey] + " is negative, so the ratio is not meaningful" };
  return { value: round2((n / d) * mult), reason: null };
}

function buildRatios(prev, cur) {
  const defs = [
    ["Operating profit margin", "Operating profit / Revenue x 100", "%", "operatingProfit", "revenue", 100, false],
    ["Net profit margin", "Net profit / Revenue x 100", "%", "netProfit", "revenue", 100, false],
    ["Current ratio", "Current assets / Current liabilities", "x", "currentAssets", "currentLiabilities", 1, false],
    ["Debt-to-equity ratio", "Total debt / Shareholders' equity", "x", "debt", "equity", 1, true],
    ["Return on equity (ROE)", "Net profit / Shareholders' equity x 100", "%", "netProfit", "equity", 100, true],
  ];
  return defs.map(([name, formula, unit, n, d, m, pos]) => ({
    name, formula, unit,
    previous: ratio(prev, n, d, m, pos),
    current: ratio(cur, n, d, m, pos),
  }));
}

function buildChanges(prev, cur) {
  const rows = [];
  for (const f of FIELDS) {
    const c = cur[f.key];
    const p = prev ? prev[f.key] : null;
    if (c === null && p === null) continue;
    let change = null, changePct = null, note = null;
    if (c !== null && p !== null) {
      change = round2(c - p);
      if (p > 0) changePct = round2(((c - p) / p) * 100);
      else note = "Previous value is zero or negative, so the percentage change is not meaningful";
    } else if (!prev) {
      note = "No previous-year figure";
    } else {
      note = "Figure missing for one of the years";
    }
    rows.push({ key: f.key, label: f.label, group: f.group, previous: p, current: c, change, changePct, note });
  }
  return rows;
}

function tolerance(a, b) { return Math.max(1, 0.001 * Math.max(Math.abs(a), Math.abs(b))); }

function buildChecks(prev, cur) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, status: ok ? "ok" : "mismatch", detail });
  const periods = [["Current year", cur], ["Previous year", prev]];
  for (const [pn, p] of periods) {
    if (!p) continue;
    if (p.totalAssets !== null && p.totalLiabilities !== null && p.equity !== null) {
      const rhs = p.totalLiabilities + p.equity;
      const diff = round2(p.totalAssets - rhs);
      add(pn + ": Total assets = Total liabilities + Equity", Math.abs(diff) <= tolerance(p.totalAssets, rhs),
        "Total assets " + p.totalAssets + ", liabilities plus equity " + round2(rhs) + ", difference " + diff);
    }
    if (p.profitBeforeTax !== null && p.taxExpense !== null && p.netProfit !== null) {
      const calc = round2(p.profitBeforeTax - p.taxExpense);
      add(pn + ": Profit before tax - Tax = Net profit", Math.abs(calc - p.netProfit) <= tolerance(calc, p.netProfit),
        "Profit before tax less tax is " + calc + ", net profit entered is " + p.netProfit);
    }
    if (p.currentAssets !== null && p.totalAssets !== null) {
      add(pn + ": Current assets not above total assets", p.currentAssets <= p.totalAssets,
        "Current assets " + p.currentAssets + ", total assets " + p.totalAssets);
    }
    if (p.currentLiabilities !== null && p.totalLiabilities !== null) {
      add(pn + ": Current liabilities not above total liabilities", p.currentLiabilities <= p.totalLiabilities,
        "Current liabilities " + p.currentLiabilities + ", total liabilities " + p.totalLiabilities);
    }
  }
  if (prev && prev.cash !== null && cur.cash !== null && cur.cfo !== null && cur.cfi !== null && cur.cff !== null) {
    const net = cur.cfo + cur.cfi + cur.cff;
    const expected = round2(prev.cash + net);
    add("Cash reconciliation: Previous cash + Net cash flow = Current cash", Math.abs(expected - cur.cash) <= tolerance(expected, cur.cash),
      "Previous cash " + prev.cash + " plus net cash flow " + round2(net) + " is " + expected + ", current cash entered is " + cur.cash);
  }
  return checks;
}

function buildCashFlow(cur) {
  const dir = (v) => (v === null ? null : v > 0 ? "generated cash" : v < 0 ? "used cash" : "nil");
  const hasAll = cur.cfo !== null && cur.cfi !== null && cur.cff !== null;
  return {
    operating: cur.cfo === null ? null : { value: cur.cfo, direction: dir(cur.cfo) },
    investing: cur.cfi === null ? null : { value: cur.cfi, direction: dir(cur.cfi) },
    financing: cur.cff === null ? null : { value: cur.cff, direction: dir(cur.cff) },
    netChange: hasAll ? round2(cur.cfo + cur.cfi + cur.cff) : null,
  };
}

function analyse(input) {
  const { current, previous } = input;
  return {
    unit: input.unit,
    company: input.company,
    hasPrevious: !!previous,
    changes: buildChanges(previous, current),
    ratios: buildRatios(previous, current),
    cashFlow: buildCashFlow(current),
    checks: buildChecks(previous, current),
  };
}

async function getCommentary(result) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
  const userMessage =
    "Unit: " + result.unit + ". Company: " + (result.company || "not named") + ".\n" +
    "Previous-year figures provided: " + (result.hasPrevious ? "yes" : "no") + ".\n" +
    "The tables, ratios and checks below are already calculated and displayed to the user. Do not recalculate or change any number. " +
    "Use application mode from the skill.\n\n" + JSON.stringify(result, null, 2) +
    "\n\nWrite the analysis now.";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: loadSkill() + "\n\nReply in plain text only.",
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error((data && data.error && data.error.message) || "Claude API request failed.");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }
  const input = validate(req.body);
  if (input.error) { res.status(400).json({ error: input.error }); return; }
  const result = analyse(input);
  try {
    const commentary = await getCommentary(result);
    res.status(200).json({ ...result, commentary });
  } catch (e) {
    // Tables and checks stay correct even if the AI narrative fails.
    res.status(200).json({ ...result, commentary: null, commentaryError: e.message });
  }
};

module.exports.analyse = analyse;
module.exports.validate = validate;
