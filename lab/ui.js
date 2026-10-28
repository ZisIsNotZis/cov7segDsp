/* cov7seg lab UI.  Requires lab/data.js and lab/core.js. */
(function () {
  "use strict";
  const C = globalThis.COV;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const SEG_GEOM = {
    a: [12, 8, 88, 8],
    b: [92, 14, 92, 48],
    c: [92, 52, 92, 86],
    d: [12, 92, 88, 92],
    e: [8, 52, 8, 86],
    f: [8, 14, 8, 48],
    g: [12, 50, 88, 50],
  };

  function cloneFont(font) {
    return { ...font, glyphs: { ...font.glyphs } };
  }

  function segmentNames(mask) {
    return C.SEGMENTS.filter((s, i) => (mask >> i) & 1);
  }

  function makeGlyph(pattern, opts = {}) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "glyph" + (opts.big ? " big" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "seven-segment glyph");
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("x", "1");
    bg.setAttribute("y", "1");
    bg.setAttribute("width", "98");
    bg.setAttribute("height", "98");
    bg.setAttribute("rx", "10");
    bg.setAttribute("class", "glyph-bg");
    svg.appendChild(bg);
    for (let i = 0; i < 7; i++) {
      const name = C.SEGMENTS[i];
      const [x1, y1, x2, y2] = SEG_GEOM[name];
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      const on = (pattern >> i) & 1;
      const covered = opts.cover && (C.COVER_MASKS[opts.cover] >> i) & 1;
      let cls = on ? "seg on" : "seg off";
      if (covered) {
        if (opts.highlightMask && (opts.highlightMask >> i) & 1) cls = "seg conflict";
        else if (on) cls = "seg hidden";
        else cls = "seg covered";
      }
      line.setAttribute("class", cls);
      line.dataset.seg = name;
      if (opts.interactive) {
        line.classList.add("clickable");
        line.addEventListener("click", () => opts.onToggle && opts.onToggle(i));
      }
      svg.appendChild(line);
    }
    return svg;
  }

  function renderGlyph(el, pattern, opts = {}) {
    el.innerHTML = "";
    el.appendChild(makeGlyph(pattern, opts));
  }

  function fillSelect(select, entries, value) {
    select.innerHTML = "";
    for (const [key, label] of entries) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      if (key === value) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function chip(text, cls = "") {
    const s = document.createElement("span");
    s.className = "chip " + cls;
    s.textContent = text;
    return s;
  }

  // ---------------------------------------------------------------- tabs
  function initTabs() {
    $$(".tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tabs button").forEach((b) => b.classList.toggle("active", b === btn));
        $$(".tab").forEach((tab) =>
          tab.classList.toggle("active", tab.id === "tab-" + btn.dataset.tab)
        );
      });
    });
  }

  // ---------------------------------------------------------------- lab
  const lab = {
    fontKey: "opt-dec",
    font: cloneFont(C.FONTS["opt-dec"]),
    pattern: C.maskOf(C.FONTS["opt-dec"].glyphs["0"]),
    cover: null,
    slot: "0",
    pair: null,
  };

  function initLab() {
    fillSelect(
      $("#lab-font"),
      Object.entries(C.FONTS).map(([k, f]) => [k, f.name]),
      lab.fontKey
    );
    fillSelect(
      $("#lab-slot"),
      Object.keys(lab.font.glyphs).map((k) => [k, k]),
      lab.slot
    );
    $("#lab-font").addEventListener("change", () => {
      lab.fontKey = $("#lab-font").value;
      lab.font = cloneFont(C.FONTS[lab.fontKey]);
      lab.slot = Object.keys(lab.font.glyphs)[0];
      fillSelect(
        $("#lab-slot"),
        Object.keys(lab.font.glyphs).map((k) => [k, k]),
        lab.slot
      );
      lab.pattern = C.maskOf(lab.font.glyphs[lab.slot]);
      lab.pair = null;
      renderLab();
    });
    $("#lab-slot").addEventListener("change", () => {
      lab.slot = $("#lab-slot").value;
      lab.pattern = C.maskOf(lab.font.glyphs[lab.slot]);
      lab.pair = null;
      renderLab();
    });
    $("#lab-apply").addEventListener("click", () => {
      lab.font.glyphs[lab.slot] = C.bitsOf(lab.pattern);
      renderLab();
    });
    $("#lab-random").addEventListener("click", () => {
      lab.pattern = 1 + Math.floor(Math.random() * 127);
      renderLab();
    });
    $("#lab-reset").addEventListener("click", () => {
      lab.font = cloneFont(C.FONTS[lab.fontKey]);
      lab.pattern = C.maskOf(lab.font.glyphs[lab.slot]);
      lab.pair = null;
      renderLab();
    });
    renderLab();
  }

  function renderCoverButtons() {
    const box = $("#lab-covers");
    box.innerHTML = "";
    const choices = [[null, "no cover"], ...C.COVER_ORDER.map((c) => [c, c + " cover"])];
    for (const [value, label] of choices) {
      const b = document.createElement("button");
      b.textContent = label;
      b.className = "small" + (lab.cover === value ? " active" : "");
      b.addEventListener("click", () => {
        lab.cover = value;
        renderLab();
      });
      box.appendChild(b);
    }
  }

  function renderLab() {
    renderCoverButtons();
    renderGlyph($("#lab-display"), lab.pattern, {
      cover: lab.cover,
      interactive: true,
      onToggle: (i) => {
        lab.pattern ^= 1 << i;
        renderLab();
      },
    });
    const readingsBox = $("#lab-readings");
    readingsBox.innerHTML = "";
    if (!lab.cover) {
      readingsBox.appendChild(chip("Visible pattern: " + C.bitsOf(lab.pattern)));
    } else {
      const masked = C.projected(lab.pattern, lab.cover);
      const rs = C.readings(lab.font, masked, lab.cover);
      readingsBox.appendChild(
        chip(`Under ${lab.cover} cover: ${C.bitsOf(masked)} → ` + (rs.length ? rs.join(" / ") : "no glyph"), rs.length > 1 ? "warn" : "")
      );
    }

    // scorecard
    const info = C.setInfo(lab.font);
    const card = $("#lab-scorecard");
    card.innerHTML = "";
    const rows = [
      ["font", info.name],
      ["conflicts", info.conflicts.length],
      ["mean score", info.meanScore.toFixed(3)],
      ["min score", info.minScore.toFixed(3)],
      ["flips from standard", info.totalFlips],
      ["topology mismatches", info.topologyMismatches.join(", ") || "none"],
      ["nearest mismatches", info.nearestMismatches.join(", ") || "none"],
      ["min nearest margin", info.minNearestMargin.toFixed(2)],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("span");
      kk.textContent = k;
      const vv = document.createElement("span");
      vv.textContent = String(v);
      vv.className = k === "conflicts" && info.conflicts.length ? "bad" : "";
      row.append(kk, vv);
      card.appendChild(row);
    }

    // conflict list
    const list = $("#lab-conflicts");
    list.innerHTML = "";
    if (!info.conflicts.length) {
      list.appendChild(chip("No conflicts — this set is unambiguous under all four covers.", "ok"));
    } else {
      for (const d of info.conflicts) {
        const item = document.createElement("button");
        item.className = "conflict-item";
        item.innerHTML = `<b>${d.a}</b> ↔ <b>${d.b}</b> under <b>${d.cover}</b> · hidden ${segmentNames(d.hidden).join(",")}`;
        item.addEventListener("click", () => {
          lab.pair = d;
          renderLabDetail();
        });
        list.appendChild(item);
      }
    }

    // matrix
    renderMatrix(info);

    renderLabDetail();
  }

  function renderMatrix(info) {
    const host = $("#lab-matrix");
    host.innerHTML = "";
    const labels = info.labels;
    const table = document.createElement("table");
    table.className = "matrix";
    const head = document.createElement("tr");
    head.appendChild(document.createElement("th"));
    for (const l of labels) {
      const th = document.createElement("th");
      th.textContent = l;
      head.appendChild(th);
    }
    table.appendChild(head);
    const pats = Object.fromEntries(labels.map((l) => [l, C.maskOf(info.glyphs.find((g) => g.label === l).pattern)]));
    for (const rowLabel of labels) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = rowLabel;
      tr.appendChild(th);
      for (const colLabel of labels) {
        const td = document.createElement("td");
        if (rowLabel === colLabel) {
          td.textContent = "·";
          td.className = "diag";
        } else {
          const covers = C.conflictCovers(pats[rowLabel], pats[colLabel]);
          if (covers.length) {
            td.textContent = covers.map((c) => c[0].toUpperCase()).join("");
            td.className = "conflict";
            td.title = `${rowLabel} / ${colLabel}: ${covers.join(", ")}`;
            td.addEventListener("click", () => {
              lab.pair = {
                a: rowLabel,
                b: colLabel,
                cover: covers[0],
                hidden: (pats[rowLabel] ^ pats[colLabel]) & C.COVER_MASKS[covers[0]],
                projection: C.bitsOf(C.projected(pats[rowLabel], covers[0])),
              };
              renderLabDetail();
            });
          } else {
            td.textContent = "";
          }
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    host.appendChild(table);
    host.appendChild(
      chip("Cell = covers where the pair collides (T/R/B/L). Click a cell to inspect.", "hint")
    );
  }

  function renderLabDetail() {
    const host = $("#lab-detail");
    host.innerHTML = "";
    if (!lab.pair) {
      host.appendChild(chip("Select a conflict (list or matrix) to see the hidden segments.", "hint"));
      return;
    }
    const d = lab.pair;
    const info = C.setInfo(lab.font);
    const pa = C.maskOf(info.glyphs.find((g) => g.label === d.a).pattern);
    const pb = C.maskOf(info.glyphs.find((g) => g.label === d.b).pattern);
    const row = document.createElement("div");
    row.className = "pair";
    for (const [label, p] of [[d.a, pa], [d.b, pb]]) {
      const cell = document.createElement("div");
      cell.className = "pair-cell";
      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = label;
      renderGlyph(cell, p, { cover: d.cover, highlightMask: d.hidden });
      cell.prepend(cap);
      row.appendChild(cell);
    }
    host.appendChild(row);
    const text = document.createElement("p");
    text.className = "hint";
    text.textContent = `${d.a} and ${d.b} both become ${d.projection} under the ${d.cover} cover. Hidden segments: ${segmentNames(d.hidden).join(", ")}.`;
    host.appendChild(text);
  }

  // ---------------------------------------------------------------- countdown
  const cd = {
    fontKey: "opt-dec",
    font: cloneFont(C.FONTS["opt-dec"]),
    count: 99,
    cover: null,
    running: false,
    timer: null,
    leaf: { x: 0.5, y: 0.5 },
  };

  function initCd() {
    fillSelect(
      $("#cd-font"),
      Object.entries(C.FONTS)
        .filter(([, f]) => f.charset === "dec")
        .map(([k, f]) => [k, f.name]),
      cd.fontKey
    );
    $("#cd-font").addEventListener("change", () => {
      cd.fontKey = $("#cd-font").value;
      cd.font = cloneFont(C.FONTS[cd.fontKey]);
      renderCd();
    });
    $("#cd-start").addEventListener("click", () => {
      cd.running = !cd.running;
      $("#cd-start").textContent = cd.running ? "Pause" : "Start";
      if (cd.running) {
        cd.timer = setInterval(() => {
          cd.count = cd.count <= 0 ? 99 : cd.count - 1;
          renderCd();
        }, 1000);
      } else {
        clearInterval(cd.timer);
        cd.timer = null;
      }
    });
    $("#cd-reset").addEventListener("click", () => {
      cd.count = 99;
      renderCd();
    });
    const leaf = $("#cd-leaf");
    let drag = false;
    leaf.addEventListener("pointerdown", (e) => {
      drag = true;
      leaf.setPointerCapture(e.pointerId);
      leaf.classList.add("dragging");
    });
    leaf.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const rect = $("#cd-stage").getBoundingClientRect();
      cd.leaf.x = Math.min(0.94, Math.max(0.06, (e.clientX - rect.left) / rect.width));
      cd.leaf.y = Math.min(0.9, Math.max(0.1, (e.clientY - rect.top) / rect.height));
      positionLeaf();
    });
    leaf.addEventListener("pointerup", (e) => {
      drag = false;
      leaf.classList.remove("dragging");
      snapLeaf();
    });
    renderCd();
  }

  function positionLeaf() {
    const leaf = $("#cd-leaf");
    leaf.style.left = cd.leaf.x * 100 + "%";
    leaf.style.top = cd.leaf.y * 100 + "%";
    const horizontal = cd.cover === "top" || cd.cover === "bottom";
    leaf.style.width = horizontal ? "150px" : "54px";
    leaf.style.height = horizontal ? "54px" : "150px";
    leaf.style.transform = "translate(-50%, -50%)";
    leaf.style.opacity = cd.cover ? "0.92" : "0.35";
    leaf.dataset.cover = cd.cover || "none";
  }

  function snapLeaf() {
    const x = cd.leaf.x, y = cd.leaf.y;
    const dists = [
      ["left", x],
      ["right", 1 - x],
      ["top", y],
      ["bottom", 1 - y],
    ].sort((a, b) => a[1] - b[1]);
    const [side, d] = dists[0];
    if (d < 0.33) {
      cd.cover = side;
      if (side === "left") cd.leaf = { x: 0.07, y: 0.5 };
      if (side === "right") cd.leaf = { x: 0.93, y: 0.5 };
      if (side === "top") cd.leaf = { x: 0.5, y: 0.1 };
      if (side === "bottom") cd.leaf = { x: 0.5, y: 0.9 };
    } else {
      cd.cover = null;
      cd.leaf = { x: 0.5, y: 0.5 };
    }
    renderCd();
  }

  function renderDigitReadings(host, digit, font, cover) {
    host.innerHTML = "";
    const label = String(digit);
    const p = C.maskOf(font.glyphs[label]);
    if (!cover) {
      host.appendChild(chip(label, "ok"));
      return;
    }
    const masked = C.projected(p, cover);
    const rs = C.readings(font, masked, cover);
    host.appendChild(chip("sees " + C.bitsOf(masked), "hint"));
    host.appendChild(chip(rs.length ? rs.join(" / ") : "—", rs.length > 1 ? "warn" : "ok"));
  }

  function renderCd() {
    const stage = $("#cd-display");
    stage.innerHTML = "";
    const tens = Math.floor(cd.count / 10);
    const ones = cd.count % 10;
    for (const d of [tens, ones]) {
      const wrap = document.createElement("div");
      wrap.className = "cd-digit";
      renderGlyph(wrap, C.maskOf(cd.font.glyphs[String(d)]), { cover: cd.cover, big: true });
      stage.appendChild(wrap);
    }
    positionLeaf();
    $("#cd-cover-label").textContent = cd.cover
      ? `${cd.cover} cover: hiding ${C.COVER_ORDER.includes(cd.cover) ? C.COVERS[cd.cover].join(", ") : ""}`
      : "no occlusion — drag the leaf to a side";
    renderDigitReadings($("#cd-tens"), tens, cd.font, cd.cover);
    renderDigitReadings($("#cd-ones"), ones, cd.font, cd.cover);
  }

  // ---------------------------------------------------------------- quiz
  const QUIZ_KEY = "cov7seg_quiz_v1";
  const quiz = {
    fontKey: "opt-dec",
    font: cloneFont(C.FONTS["opt-dec"]),
    current: null,
    data: [],
  };

  function loadQuiz() {
    try {
      quiz.data = JSON.parse(localStorage.getItem(QUIZ_KEY) || "[]");
      if (!Array.isArray(quiz.data)) quiz.data = [];
    } catch (e) {
      quiz.data = [];
    }
  }

  function saveQuiz() {
    try {
      localStorage.setItem(QUIZ_KEY, JSON.stringify(quiz.data));
    } catch (e) {
      /* private mode / file:// can reject storage; the session still works */
    }
  }

  function initQuiz() {
    fillSelect(
      $("#quiz-font"),
      Object.entries(C.FONTS).map(([k, f]) => [k, f.name]),
      quiz.fontKey
    );
    $("#quiz-font").addEventListener("change", () => {
      quiz.fontKey = $("#quiz-font").value;
      quiz.font = cloneFont(C.FONTS[quiz.fontKey]);
      newQuestion();
    });
    $("#quiz-next").addEventListener("click", newQuestion);
    $("#quiz-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(quiz.data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cov7seg-quiz.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("#quiz-reset").addEventListener("click", () => {
      if (!confirm("Clear all quiz responses?")) return;
      quiz.data = [];
      saveQuiz();
      renderQuizStats();
    });
    loadQuiz();
    renderQuizStats();
    newQuestion();
  }

  function newQuestion() {
    const labels = Object.keys(quiz.font.glyphs);
    const label = labels[Math.floor(Math.random() * labels.length)];
    const occlude = $("#quiz-occlude").checked;
    const cover = occlude
      ? [null, ...C.COVER_ORDER][Math.floor(Math.random() * 5)]
      : null;
    quiz.current = { label, cover, fontKey: quiz.fontKey, fontName: quiz.font.name };
    renderGlyph($("#quiz-display"), C.maskOf(quiz.font.glyphs[label]), { cover, big: true });
    const choices = $("#quiz-choices");
    choices.innerHTML = "";
    for (const l of labels) {
      const b = document.createElement("button");
      b.textContent = l;
      b.className = "choice";
      b.addEventListener("click", () => answer(l));
      choices.appendChild(b);
    }
    $("#quiz-feedback").innerHTML = "";
    $("#quiz-feedback").appendChild(chip("What is it? Click a digit.", "hint"));
  }

  function answer(response) {
    const cur = quiz.current;
    if (!cur) return;
    const p = C.maskOf(quiz.font.glyphs[cur.label]);
    const masked = cur.cover ? C.projected(p, cur.cover) : p;
    const possible = cur.cover ? C.readings(quiz.font, masked, cur.cover) : [cur.label];
    const correct = response === cur.label;
    quiz.data.push({
      font: cur.fontKey,
      shown: cur.label,
      cover: cur.cover,
      response,
      correct,
      possible,
      ts: new Date().toISOString(),
    });
    saveQuiz();
    renderQuizStats();
    const fb = $("#quiz-feedback");
    fb.innerHTML = "";
    fb.appendChild(chip(correct ? "correct" : `wrong — it was ${cur.label}`, correct ? "ok" : "warn"));
    if (possible.length > 1) {
      fb.appendChild(chip("ambiguous under this cover: " + possible.join(" / "), "warn"));
    } else {
      fb.appendChild(chip("unique reading", "ok"));
    }
    $$("#quiz-choices button").forEach((b) => (b.disabled = true));
  }

  function renderQuizStats() {
    const host = $("#quiz-stats");
    host.innerHTML = "";
    const n = quiz.data.length;
    const ok = quiz.data.filter((d) => d.correct).length;
    const top = document.createElement("div");
    top.className = "row";
    top.append(
      chip(`trials ${n}`, "hint"),
      chip(`correct ${ok}`, "ok"),
      chip(`accuracy ${n ? ((ok / n) * 100).toFixed(1) + "%" : "—"}`, n ? "ok" : "hint")
    );
    host.appendChild(top);
    if (!n) return;
    const byShown = {};
    for (const d of quiz.data) {
      byShown[d.shown] = byShown[d.shown] || { n: 0, ok: 0 };
      byShown[d.shown].n++;
      if (d.correct) byShown[d.shown].ok++;
    }
    const table = document.createElement("table");
    table.className = "stats-table";
    const head = document.createElement("tr");
    for (const h of ["shown", "trials", "correct"]) {
      const th = document.createElement("th");
      th.textContent = h;
      head.appendChild(th);
    }
    table.appendChild(head);
    for (const [label, v] of Object.entries(byShown).sort()) {
      const tr = document.createElement("tr");
      for (const value of [label, v.n, v.ok]) {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    host.appendChild(table);

    // Confusion matrix for the current font (raw data is exported too).
    const labels = Object.keys(quiz.font.glyphs);
    const rows = quiz.data.filter(
      (d) => d.font === quiz.fontKey && labels.includes(d.shown) && labels.includes(d.response)
    );
    if (rows.length) {
      const m = document.createElement("table");
      m.className = "stats-table matrix-lite";
      const head = document.createElement("tr");
      head.appendChild(document.createElement("th"));
      for (const l of labels) {
        const th = document.createElement("th");
        th.textContent = l;
        head.appendChild(th);
      }
      m.appendChild(head);
      for (const shown of labels) {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = shown;
        tr.appendChild(th);
        for (const response of labels) {
          const td = document.createElement("td");
          const n = rows.filter((d) => d.shown === shown && d.response === response).length;
          td.textContent = n ? String(n) : "";
          if (shown === response) td.className = "diag";
          tr.appendChild(td);
        }
        m.appendChild(tr);
      }
      const cap = document.createElement("p");
      cap.className = "hint";
      cap.textContent = "Confusion matrix: rows = shown, columns = response.";
      host.appendChild(cap);
      host.appendChild(m);
    }
  }

  // ---------------------------------------------------------------- boot
  initTabs();
  initLab();
  initCd();
  initQuiz();
})();
