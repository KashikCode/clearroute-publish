"use strict";
// UI controller: four hash-addressed screens share one loaded classifier.
// Rendering escapes user text. Queue and rules stay in sessionStorage.
// Model predictions do not automatically assign or contact a team.
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  pct = (n) => (n * 100).toFixed(1) + "%";
let model,
  metrics,
  current = null,
  queue = [],
  rules = { gap: 0.4, recall: 0.7, coverage: 0.35, teams: {} },
  loading = true;
try {
  queue = JSON.parse(sessionStorage.getItem("clearroute.queue") || "[]");
  const stored = JSON.parse(
    sessionStorage.getItem("clearroute.rules") || "null",
  );
  if (stored) rules = stored;
} catch {
  queue = [];
}
const teamDefaults = [
  "Banking support",
  "Card services",
  "Credit reporting disputes",
  "Collections resolution",
  "Credit counseling",
  "Payments operations",
  "Mortgage servicing",
  "Consumer lending",
  "Prepaid support",
  "Student lending",
  "Auto finance",
];
const examples = [
  "My bank charged me an overdraft fee even though I had enough money in my checking account. I have contacted customer support twice, but the fee has not been reversed.",
  "My credit report shows an account that does not belong to me. I disputed the inaccurate information with the credit bureau, but it is still on my report and hurting my credit score.",
  "A debt collector keeps calling me about a debt I already paid. I sent proof of payment and asked for written validation, but the collection calls continue.",
];
function notify(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").style.display = "none"), 3500);
}
function persist() {
  try {
    sessionStorage.setItem("clearroute.queue", JSON.stringify(queue));
    sessionStorage.setItem("clearroute.rules", JSON.stringify(rules));
  } catch {
    notify(
      "Session storage is full or unavailable. Export the queue to keep your work.",
    );
  }
  $("#queueBadge").textContent = queue.filter(
    (q) => q.status === "review",
  ).length;
}
function tab(name) {
  if (!["route", "queue", "performance", "settings"].includes(name))
    name = "route";
  $$(".page").forEach((el) => el.classList.toggle("active", el.id === name));
  $$("nav button").forEach((el) =>
    el.classList.toggle("active", el.dataset.tab === name),
  );
  $("#pageLabel").textContent = {
    route: "Complaint desk",
    queue: "Review queue",
    performance: "Model performance",
    settings: "Routing rules",
  }[name];
  if (name === "queue") renderQueue();
}
$$("nav button").forEach(
  (b) => (b.onclick = () => (location.hash = b.dataset.tab)),
);
window.addEventListener("hashchange", () => tab(location.hash.slice(1)));
tab(location.hash.slice(1));
$("#complaint").oninput = () => {
  $("#charCount").textContent =
    $("#complaint").value.length.toLocaleString() + " / 20,000";
  current = null;
  $(".result-card .muted").textContent = "AWAITING INPUT";
  $("#analyze").disabled = loading;
  $("#inputError").textContent = "";
  if (!loading)
    $("#result").innerHTML =
      '<div class="empty-result"><span class="empty-index">—</span><h3>Text changed.</h3><p>Classify the updated complaint to see its suggested route.</p></div>';
};
$$("[data-example]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#complaint").value = examples[Number(b.dataset.example)];
      $("#complaint").oninput();
      $("#complaint").focus();
    }),
);
function selectedReport() {
  return metrics.baselines.find((b) => b.name === metrics.selected);
}
function evaluate(text) {
  const p = Clearroute.classify(text, model),
    r = selectedReport().report[p.category].recall;
  let reasons = [];
  if (p.words < 8) reasons.push("Too little context: fewer than 8 words.");
  if (p.gap < rules.gap)
    reasons.push("Top categories have similar decision scores.");
  if (r < rules.recall)
    reasons.push("This category has low recall on the held-out test set.");
  if (p.coverage < rules.coverage)
    reasons.push("Limited overlap with the financial-complaint vocabulary.");
  return {
    ...p,
    recall: r,
    reasons,
    team: rules.teams[p.category] || "General review",
  };
}
$("#analyze").onclick = () => {
  const text = $("#complaint").value.trim();
  if (text.length < 15 || Clearroute.tokenize(text).length < 3) {
    $("#inputError").textContent =
      "Please provide at least three words and 15 characters of complaint context.";
    return;
  }
  $("#inputError").textContent = "";
  try {
    current = { ...evaluate(text), text };
    renderResult();
  } catch (e) {
    $("#inputError").textContent =
      "Classification failed. Reload the page and try again.";
  }
};
function renderResult() {
  const r = current;
  $(".result-card .muted").textContent = "CLASSIFIED";
  $("#result").innerHTML =
    `<span class="badge ${r.reasons.length ? "review" : ""}">${r.reasons.length ? "Additional review needed" : "Review required"}</span><div class="result-eyebrow" style="margin-top:23px">SUGGESTED PRODUCT CATEGORY</div><h3 class="result-category">${esc(r.category)}</h3><div class="team-box"><span>↗</span><div><small>SUGGESTED DESTINATION</small><strong>${esc(r.team)}</strong></div></div><div class="signalrow"><span>Separation from next category</span><b>${r.gap.toFixed(3)} margin</b></div><div class="signalrow"><span>Recall for this category</span><b>${pct(r.recall)}</b></div><div class="signalbar"><span style="width:${r.recall * 100}%"></span></div><div class="signalrow"><span>Input term coverage</span><b>${pct(r.coverage)}</b></div><p class="subnote" style="font-size:9px;margin:8px 0 17px">SVM margins are decision scores, not confidence percentages.</p><div class="result-eyebrow">SUPPORTING TERMS</div><div class="terms">${r.terms.length ? r.terms.map((t) => `<span>${esc(t.term)}</span>`).join("") : "No matching terms"}</div>${r.reasons.length ? `<div class="reviewreasons">${r.reasons.map(esc).join("<br>")}</div>` : ""}<details class="altlist"><summary style="font-size:10px;cursor:pointer;color:#7185a3">Compare top decision scores</summary>${r.ranked
      .slice(0, 3)
      .map(
        (a) =>
          `<div class="signalrow"><span>${esc(a.label)}</span><b>${a.score.toFixed(3)}</b></div>`,
      )
      .join(
        "",
      )}</details><div class="result-actions"><button class="primary" id="addQueue">Add to review queue →</button></div>`;
  $("#addQueue").onclick = () => {
    if (queue.length >= 2000) {
      notify("Queue limit reached. Export and clear it first.");
      return;
    }
    queue.unshift(makeItem(current.text, current));
    persist();
    $("#addQueue").disabled = true;
    $("#addQueue").textContent = "Added to review queue";
    notify("Complaint added. Review and confirm its team in the queue.");
  };
}
function makeItem(text, r) {
  return {
    // Record IDs are local identifiers, not authentication tokens.
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "record-" +
          Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) =>
            value.toString(16),
          ).join("-"),
    text,
    category: r.category,
    predicted: r.category,
    team: r.team,
    gap: r.gap,
    coverage: r.coverage,
    reasons: r.reasons,
    status: "review",
    created: new Date().toISOString(),
  };
}
function renderQueue() {
  const search = $("#queueSearch").value.toLowerCase(),
    filter = $("#queueFilter").value;
  const rows = queue.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      [r.text, r.category, r.team].join(" ").toLowerCase().includes(search),
  );
  $("#queueCount").textContent = rows.length + " of " + queue.length;
  $("#queueList").innerHTML = rows.length
    ? rows
        .map(
          (r) =>
            `<article class="card queue-item" data-id="${esc(r.id)}"><header><span class="badge ${r.status === "review" ? "review" : ""}">${r.status === "review" ? "Needs review" : "Assigned locally"}</span><small>${new Date(r.created).toLocaleString()}</small><button class="textbutton remove">Remove</button></header><p>${esc(r.text)}</p>${r.reasons.length ? `<small>${r.reasons.map(esc).join(" · ")}</small>` : ""}<div class="controls"><select class="category-select" aria-label="Correct product category">${(model?.classes || [r.category]).map((c) => `<option ${c === r.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select><span style="font-size:11px;color:#7186a4">→ ${esc(r.team)}</span><button class="primary assign">${r.status === "assigned" ? "Reopen review" : "Confirm assignment"}</button></div><small style="margin-top:12px">Original model category: ${esc(r.predicted)} · Score gap: ${r.gap.toFixed(3)}</small></article>`,
        )
        .join("")
    : `<div class="card emptyqueue"><h3>${queue.length ? "No matching complaints." : "No complaints in this session."}</h3><p>${queue.length ? "Try another search or filter." : "Analyze a complaint or import a CSV to begin."}</p><a class="primary" href="#route">Route a complaint →</a></div>`;
  $$(".queue-item").forEach((el) => {
    const r = queue.find((x) => x.id === el.dataset.id);
    el.querySelector(".remove").onclick = () => {
      queue = queue.filter((x) => x.id !== r.id);
      persist();
      renderQueue();
    };
    el.querySelector(".assign").onclick = () => {
      r.status = r.status === "assigned" ? "review" : "assigned";
      persist();
      renderQueue();
      notify(
        r.status === "assigned"
          ? "Assignment recorded in this session."
          : "Reopened for review.",
      );
    };
    el.querySelector(".category-select").onchange = (e) => {
      r.category = e.target.value;
      r.team = rules.teams[r.category];
      r.status = "review";
      persist();
      renderQueue();
    };
  });
}
$("#queueSearch").oninput = renderQueue;
$("#queueFilter").onchange = renderQueue;
$("#clearQueue").onclick = () => {
  if (
    queue.length &&
    confirm(
      "Clear all complaints from this browser session? Export a CSV first if you need a copy.",
    )
  ) {
    queue = [];
    persist();
    renderQueue();
  }
};
function csvCell(s) {
  s = String(s ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
$("#exportQueue").onclick = () => {
  if (!queue.length) {
    notify("Add complaints before exporting.");
    return;
  }
  const cols = [
    "id",
    "text",
    "predicted",
    "category",
    "team",
    "status",
    "gap",
    "coverage",
    "reasons",
    "created",
  ];
  const content = [
    cols.join(","),
    ...queue.map((r) =>
      cols
        .map((c) => csvCell(Array.isArray(r[c]) ? r[c].join("; ") : r[c]))
        .join(","),
    ),
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "clearroute-complaints.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#batchOpen").onclick = () => {
  if (loading) {
    notify("Please wait for the classifier to load.");
    return;
  }
  $("#csvFile").click();
};
$("#csvFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = $("#batchStatus");
  try {
    if (file.size > 5 * 1024 * 1024)
      throw Error("Please use a CSV under 5 MB.");
    const rows = Clearroute.parseCSV(await file.text());
    if (rows.length < 2)
      throw Error("Include a header and at least one complaint.");
    const accepted = [
      "complaint",
      "text",
      "narrative",
      "consumer complaint narrative",
    ];
    const col = rows[0].findIndex((h) =>
      accepted.includes(h.trim().toLowerCase()),
    );
    if (col < 0)
      throw Error(
        "Name the complaint column “complaint”, “text”, “narrative”, or “Consumer complaint narrative”.",
      );
    if (rows.length - 1 > 500)
      throw Error("Please limit each import to 500 rows.");
    if (queue.length + rows.length - 1 > 2000)
      throw Error(
        "This import exceeds the 2,000-complaint session limit. Export and clear the queue first.",
      );
    const imported = [];
    let skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const text = (rows[i][col] || "").trim();
      if (
        text.length < 15 ||
        text.length > 20000 ||
        Clearroute.tokenize(text).length < 3
      ) {
        skipped++;
        continue;
      }
      imported.push(makeItem(text, evaluate(text)));
      if (i % 20 === 0) {
        status.textContent = `Classifying ${i} / ${rows.length - 1}…`;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    queue.unshift(...imported);
    persist();
    status.textContent = `${imported.length} complaints added to the review queue.${skipped ? " " + skipped + " blank, too short, or oversized rows skipped." : ""}`;
    notify(
      "CSV import complete. Open the review queue to confirm assignments.",
    );
  } catch (err) {
    status.textContent = err.message;
  } finally {
    e.target.value = "";
  }
};
function renderPerformance() {
  const s = selectedReport(),
    rep = s.report,
    sorted = [...model.classes].sort((a, b) => rep[a].recall - rep[b].recall);
  $("#classCount").textContent = model.classes.length;
  $("#macroScore").textContent = pct(s.macro_f1);
  $("#minRecall").textContent = pct(rep[sorted[0]].recall);
  $("#minLabel").textContent = sorted[0];
  $("#performanceContent").innerHTML = `<div class="metrics-grid">${[
    [pct(s.macro_f1), "Macro-F1", "Equal weight per product"],
    [pct(s.accuracy), "Accuracy", "All test predictions"],
    [
      metrics.test.toLocaleString(),
      "Test complaints",
      "Untouched during model selection",
    ],
    [
      metrics.train.toLocaleString(),
      "Training complaints",
      "Deduplicated public narratives",
    ],
  ]
    .map(
      ([n, l, c]) =>
        `<div class="card metric-card"><span>${l}</span><strong>${n}</strong><small>${c}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="sectiontitle"><h2>Category-level performance</h2><span>Sorted by recall · weakest first</span></div><div class="card tablewrap"><table><thead><tr><th>PRODUCT CATEGORY</th><th>RECALL</th><th>PRECISION</th><th>F1</th><th>TEST SUPPORT</th></tr></thead><tbody>${sorted.map((c) => `<tr class="${rep[c].recall < rules.recall ? "low" : ""}"><td>${esc(c)}</td><td class="recall-cell">${pct(rep[c].recall)}<div class="signalbar"><span style="width:${rep[c].recall * 100}%"></span></div></td><td>${pct(rep[c].precision)}</td><td>${pct(rep[c]["f1-score"])}</td><td>${rep[c].support}</td></tr>`).join("")}</tbody></table></div><p class="subnote">Recall answers: of the real complaints in this category, how many did the model find? Shaded rows fall below your review threshold. Small test counts make estimates less stable. These scores cover all predictions, before human review. A recall warning uses the predicted category; it cannot catch every weak-category complaint misclassified into a stronger one.</p><div class="sectiontitle"><h2>Baseline comparison</h2><span>Selected using validation macro-F1</span></div><div class="card tablewrap"><table><thead><tr><th>MODEL</th><th>VALIDATION MACRO-F1</th><th>TEST MACRO-F1</th><th>TEST ACCURACY</th></tr></thead><tbody>${metrics.baselines.map((b) => `<tr><td>${esc(b.name)} ${b.name === metrics.selected ? '<span class="badge">Selected</span>' : ""}</td><td>${b.validation_macro_f1 === undefined ? "—" : pct(b.validation_macro_f1)}</td><td>${pct(b.macro_f1)}</td><td>${pct(b.accuracy)}</td></tr>`).join("")}</tbody></table></div><div class="sectiontitle"><h2>Where predictions cross categories</h2><span>Confusion matrix · actual rows / predicted columns</span></div><div class="card tablewrap"><table class="matrix"><thead><tr><th>ACTUAL ↓ / PREDICTED →</th>${model.classes.map((c, i) => `<th title="${esc(c)}">${i + 1}</th>`).join("")}</tr></thead><tbody>${metrics.confusion.map((row, i) => `<tr><th>${i + 1}. ${esc(model.classes[i])}</th>${row.map((n, j) => `<td title="Actual: ${esc(model.classes[i])}; predicted: ${esc(model.classes[j])}" style="background:rgba(40,91,193,${n ? 0.07 + (0.6 * n) / Math.max(...row) : 0});color:${n / Math.max(...row) > 0.7 ? "#fff" : "#5b6f8e"}">${n || "·"}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="method-grid"><div class="card method"><h2>Reproducible by design</h2><p>${esc(metrics.split)}</p><p style="margin-top:12px">${metrics.total.toLocaleString()} unique usable narratives · ${metrics.duplicates_removed} duplicate narratives removed · ${metrics.validation.toLocaleString()} validation examples. ${esc(metrics.data_period)} archive, trained ${esc(metrics.trained_at)}.</p><p style="margin-top:12px">${metrics.features.toLocaleString()} TF-IDF features; word unigrams${model.ngram_max === 2 ? " and bigrams" : ""}; sublinear term frequency; L2 normalization; minimum document frequency 2. LinearSVC, C=1; ${metrics.selected.startsWith("Balanced") ? "balanced" : "unweighted"} class weights. Normalized redaction markers are removed.</p><p style="margin-top:14px"><a href="train.py" download>Training script ↓</a> &nbsp; <a href="metrics.json" download>Full metrics ↓</a></p></div><div class="card method"><h2>What these results don’t establish</h2><ul>${metrics.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><a href="${metrics.archive_url}" target="_blank" rel="noopener">CFPB narrative archive ↗</a> · <a href="${metrics.source_url}" target="_blank" rel="noopener">Source CSV archive ↗</a></p><p style="margin-top:12px">July 2026 is a fixed training snapshot, not a live feed. CFPB ceased publishing new narratives on August 14, 2026. No demographic attributes are used or evaluated.</p></div></div>`;
}
function renderRules() {
  $("#gapRule").value = rules.gap;
  $("#recallRule").value = rules.recall;
  $("#coverageRule").value = rules.coverage;
  $("#ruleRows").innerHTML = model.classes
    .map(
      (c, i) =>
        `<div class="rule-row"><label for="team${i}">${esc(c)}</label><input id="team${i}" data-category="${esc(c)}" maxlength="80" value="${esc(rules.teams[c])}"></div>`,
    )
    .join("");
}
$("#saveRules").onclick = () => {
  if (!model) return;
  for (const s of ["#gapRule", "#recallRule", "#coverageRule"])
    if (!$(s).value || !$(s).checkValidity()) {
      $(s).reportValidity();
      return;
    }
  const fields = $$("#ruleRows input");
  if (fields.some((i) => !i.value.trim())) {
    notify("Enter a team for every category.");
    return;
  }
  rules.gap = Number($("#gapRule").value);
  rules.recall = Number($("#recallRule").value);
  rules.coverage = Number($("#coverageRule").value);
  fields.forEach((i) => (rules.teams[i.dataset.category] = i.value.trim()));
  queue
    .filter((r) => r.status === "review")
    .forEach((r) => (r.team = rules.teams[r.category]));
  persist();
  renderPerformance();
  if (current) {
    current = { ...evaluate(current.text), text: current.text };
    renderResult();
  }
  $("#savedStatus").textContent =
    "Saved for this browser session. Pending complaint destinations updated; assigned records kept.";
  notify("Routing rules saved.");
};
(async () => {
  try {
    [model, metrics] = await Promise.all(
      ["model.json", "metrics.json"].map(async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw Error("Unable to load " + url);
        return r.json();
      }),
    );
    model.classes.forEach((c, i) => {
      if (!rules.teams[c]) rules.teams[c] = teamDefaults[i] || "General review";
    });
    loading = false;
    $("#analyze").disabled = false;
    $("#saveRules").disabled = false;
    $("#modelState").textContent =
      "Model ready / " + model.classes.length + " categories";
    renderPerformance();
    renderRules();
    persist();
    renderQueue();
  } catch (e) {
    $("#modelState").textContent = "Model unavailable";
    $("#result").innerHTML =
      '<div class="loading-error">The model could not load. Check your connection and reload this page.</div>';
    $("#inputError").textContent = "Model loading failed. Please reload.";
  }
})();
