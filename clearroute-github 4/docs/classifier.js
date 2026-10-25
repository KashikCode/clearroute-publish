(function (root) {
  "use strict";
  function tokenize(text) {
    return (
      text
        .replace(/\b[xX]{2,}\b/g, " ")
        .toLowerCase()
        .match(/(?<![\p{L}\p{N}_])[a-z]{2,}(?![\p{L}\p{N}_])/gu) || []
    );
  }
  function classify(text, model) {
    const tokens = tokenize(text),
      counts = new Map(),
      vocab = model.vocabulary;
    let known = 0;
    const add = (term) => {
      if (Object.hasOwn(vocab, term)) {
        let i = vocab[term];
        counts.set(i, (counts.get(i) || 0) + 1);
      }
    };
    for (let i = 0; i < tokens.length; i++) {
      add(tokens[i]);
      if (Object.hasOwn(vocab, tokens[i])) known++;
      if (model.ngram_max >= 2 && i) add(tokens[i - 1] + " " + tokens[i]);
    }
    let norm = 0;
    const values = [];
    for (const [i, count] of counts) {
      let v = (1 + Math.log(count)) * model.idf[i];
      values.push([i, v]);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (let x of values) x[1] /= norm;
    const scores = model.intercept.map((b, c) =>
      values.reduce((s, [i, v]) => s + model.weights[c][i] * v, b),
    );
    const ranked = scores
      .map((score, i) => ({ score, index: i, label: model.classes[i] }))
      .sort((a, b) => b.score - a.score);
    const inverse =
      model._inverse ||
      (model._inverse = Object.fromEntries(
        Object.entries(vocab).map(([term, i]) => [i, term]),
      ));
    const terms = values
      .map(([i, v]) => ({
        term: inverse[i],
        contribution: v * model.weights[ranked[0].index][i],
      }))
      .filter((x) => x.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 7);
    return {
      category: ranked[0].label,
      scores,
      ranked,
      gap: ranked[0].score - ranked[1].score,
      coverage: tokens.length ? known / tokens.length : 0,
      words: tokens.length,
      terms,
    };
  }
  function parseCSV(str) {
    str = str.replace(/^\uFEFF/, "");
    const rows = [];
    let row = [],
      field = "",
      quoted = false;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '"') {
        if (quoted && str[i + 1] === '"') {
          field += '"';
          i++;
        } else if (quoted || field === "") quoted = !quoted;
        else field += c;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && str[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((s) => s.trim())) rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (quoted) throw new Error("The CSV has an unclosed quoted field.");
    row.push(field);
    if (row.some((s) => s.trim())) rows.push(row);
    return rows;
  }
  root.Clearroute = { classify, tokenize, parseCSV };
  if (typeof module !== "undefined") module.exports = root.Clearroute;
})(typeof window === "undefined" ? globalThis : window);
