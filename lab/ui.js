/* cov7seg lab UI.  Requires lab/i18n.js, lab/data.js and lab/core.js. */
(function () {
  "use strict";
  const C = globalThis.COV;
  const I = globalThis.I18N;
  const t = I.t;
  const fontName = (key) => t("font." + key);
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

  const state = {
    fontKey: "opt-dec",
    font: cloneFont(C.FONTS["opt-dec"]),
    selected: "0",
    labCover: null,
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

  function badge(text, cls = "", title = "") {
    const s = document.createElement("span");
    s.className = "badge " + cls;
    s.textContent = text;
    if (title) s.title = title;
    return s;
  }

  // ---------------------------------------------------------------- tabs
  function initTabs() {
    $$(".tabs button[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tabs button[data-tab]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        $$(".tab").forEach((tab) =>
          tab.classList.toggle("active", tab.id === "tab-" + btn.dataset.tab)
        );
        if (btn.dataset.tab === "quiz" && quiz.dirty) {
          newQuestion();
          quiz.dirty = false;
        }
      });
    });
  }

  // ---------------------------------------------------------- global font
  function initGlobalFont() {
    fillSelect(
      $("#global-font"),
      Object.keys(C.FONTS).map((k) => [k, fontName(k)]),
      state.fontKey
    );
    $("#global-font").addEventListener("change", () => {
      state.fontKey = $("#global-font").value;
      state.font = cloneFont(C.FONTS[state.fontKey]);
      state.selected = Object.keys(state.font.glyphs)[0];
      renderLab();
      renderCd();
      newQuestion();
      quiz.dirty = false;
    });
  }

  function refreshGlobalFont() {
    const sel = $("#global-font");
    for (const opt of sel.options) {
      if (opt.value) opt.textContent = fontName(opt.value);
    }
  }

  // ---------------------------------------------------------------- lab
  function initLab() {
    $("#lab-reset-font").addEventListener("click", () => {
      state.font = cloneFont(C.FONTS[state.fontKey]);
      state.selected = Object.keys(state.font.glyphs)[0];
      afterFontEdit();
    });
    $("#lab-reset-digit").addEventListener("click", () => {
      state.font.glyphs[state.selected] =
        C.FONTS[state.fontKey].glyphs[state.selected];
      afterFontEdit();
    });
    renderLab();
  }

  function afterFontEdit() {
    renderLab();
    renderCd();
    quiz.dirty = true;
  }

  function renderCoverButtons() {
    const box = $("#lab-covers");
    box.innerHTML = "";
    const choices = [
      [null, t("cover.none")],
      ...C.COVER_ORDER.map((c) => [c, t("cover." + c)]),
    ];
    for (const [value, label] of choices) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.className = "small" + (state.labCover === value ? " active" : "");
      b.addEventListener("click", () => {
        state.labCover = value;
        renderLab();
      });
      box.appendChild(b);
    }
  }

  function renderSummary(info) {
    const host = $("#lab-summary");
    host.innerHTML = "";
    const topo = info.topologyMismatches.length
      ? info.topologyMismatches.join(", ")
      : t("common.none");
    const near = info.nearestMismatches.length
      ? info.nearestMismatches.join(", ")
      : t("common.none");
    host.append(
      chip(fontName(state.fontKey), "accent"),
      chip(`${t("score.conflicts")} ${info.conflicts.length}`, info.conflicts.length ? "warn" : "ok"),
      chip(`${t("score.mean")} ${info.meanScore.toFixed(3)}`),
      chip(`${t("score.flips")} ${info.totalFlips}`),
      chip(`${t("score.topo")} ${topo}`, info.topologyMismatches.length ? "warn" : ""),
      chip(`${t("score.nearest")} ${near}`, info.nearestMismatches.length ? "warn" : "")
    );
  }

  function renderGlyphScore(gi) {
    const host = $("#lab-glyph-score");
    host.innerHTML = "";
    const rows = [
      [t("score.glyph"), gi.score.toFixed(3)],
      [t("score.flips"), gi.flips],
      [
        t("score.topo"),
        `${C.topoString(gi.topology)} ${
          gi.topologyMatch ? t("common.match") : t("common.mismatch")
        }`,
      ],
      [
        t("score.nearest"),
        `${
          gi.nearest.unique ? t("common.unique") : t("lab.ambiguous")
        } · ${t("score.margin")} ${gi.nearest.margin.toFixed(2)}`,
      ],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("span");
      kk.textContent = k;
      const vv = document.createElement("span");
      vv.textContent = String(v);
      row.append(kk, vv);
      host.appendChild(row);
    }
  }

  function renderGallery(info) {
    const host = $("#lab-gallery");
    host.innerHTML = "";
    for (const label of info.labels) {
      const gi = info.glyphs.find((g) => g.label === label);
      const p = gi.mask;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "digit-card" + (label === state.selected ? " selected" : "");
      card.addEventListener("click", () => {
        state.selected = label;
        renderLab();
      });

      const head = document.createElement("div");
      head.className = "digit-card-head";
      const lab = document.createElement("span");
      lab.className = "digit-card-label";
      lab.textContent = label;
      const badges = document.createElement("span");
      badges.className = "badges";
      const covers = [
        ...new Set(
          info.conflicts
            .filter((d) => d.a === label || d.b === label)
            .map((d) => d.cover)
        ),
      ];
      if (covers.length) {
        badges.appendChild(
          badge(
            covers.map((c) => c[0].toUpperCase()).join(" "),
            "red",
            t("lab.conflict")
          )
        );
      }
      if (state.labCover) {
        const rs = C.readings(
          state.font,
          C.projected(p, state.labCover),
          state.labCover
        );
        if (rs.length > 1) badges.appendChild(badge(t("lab.ambiguous"), "red"));
      }
      if (gi.topologyMatch === false) {
        badges.appendChild(badge("T", "amber", t("score.topo")));
      }
      if (!gi.nearest.unique) {
        badges.appendChild(badge("N", "amber", t("score.nearest")));
      }
      head.append(lab, badges);

      const holder = document.createElement("div");
      holder.className = "mini";
      renderGlyph(holder, p, { cover: state.labCover });

      const meta = document.createElement("div");
      meta.className = "digit-meta";
      meta.textContent = `${gi.flips} ${t("lab.flipsShort")} · ${gi.score.toFixed(2)}`;

      card.append(head, holder, meta);
      host.appendChild(card);
    }
  }

  function renderConflictList(info) {
    const host = $("#lab-conflicts");
    host.innerHTML = "";
    if (!info.conflicts.length) {
      host.appendChild(chip(t("lab.noConflicts"), "ok"));
      return;
    }
    for (const d of info.conflicts) {
      const line = document.createElement("button");
      line.type = "button";
      line.className = "conflict-line";
      line.textContent = t("lab.conflictLine", {
        a: d.a,
        b: d.b,
        cover: t("cover." + d.cover),
        segments: segmentNames(d.hidden).join(", "),
      });
      line.addEventListener("click", () => {
        state.labCover = d.cover;
        state.selected = d.a;
        renderLab();
      });
      host.appendChild(line);
    }
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
    const pats = Object.fromEntries(info.glyphs.map((g) => [g.label, g.mask]));
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
            td.title = `${rowLabel} / ${colLabel}: ${covers.map((c) => t("cover." + c)).join(", ")}`;
            td.addEventListener("click", () => {
              state.labCover = covers[0];
              state.selected = rowLabel;
              renderLab();
            });
          }
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    host.appendChild(table);
    host.appendChild(chip(t("lab.matrixHint"), "hint"));
  }

  function renderLab() {
    renderCoverButtons();
    const label = state.selected;
    $("#lab-selected-label").textContent = label;
    renderGlyph($("#lab-display"), C.maskOf(state.font.glyphs[label]), {
      cover: state.labCover,
      interactive: true,
      onToggle: (i) => {
        state.font.glyphs[label] = C.bitsOf(
          C.maskOf(state.font.glyphs[label]) ^ (1 << i)
        );
        afterFontEdit();
      },
    });

    const readingsBox = $("#lab-readings");
    readingsBox.innerHTML = "";
    if (!state.labCover) {
      readingsBox.appendChild(
        chip(t("lab.visible", { pattern: C.bitsOf(C.maskOf(state.font.glyphs[label])) }))
      );
    } else {
      const masked = C.projected(C.maskOf(state.font.glyphs[label]), state.labCover);
      const rs = C.readings(state.font, masked, state.labCover);
      readingsBox.appendChild(
        chip(
          t("lab.under", {
            cover: t("cover." + state.labCover),
            pattern: C.bitsOf(masked),
            readings: rs.length ? rs.join(" / ") : t("lab.noGlyph"),
          }),
          rs.length > 1 ? "warn" : ""
        )
      );
    }

    const gi = C.glyphInfo(state.font, label);
    renderGlyphScore(gi);
    const info = C.setInfo(state.font);
    renderSummary(info);
    renderGallery(info);
    renderConflictList(info);
    renderMatrix(info);
  }

  // ---------------------------------------------------------------- countdown
  const cd = {
    count: 99,
    cover: null,
    running: false,
    timer: null,
    leaf: { x: 0.5, y: 0.5 },
  };

  function initCd() {
    $("#cd-start").addEventListener("click", () => {
      cd.running = !cd.running;
      $("#cd-start").textContent = cd.running ? t("cd.pause") : t("cd.start");
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
    leaf.addEventListener("pointerup", () => {
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

  function renderDigitReadings(host, digit, cover) {
    host.innerHTML = "";
    const label = String(digit);
    const p = C.maskOf(state.font.glyphs[label]);
    if (!cover) {
      host.appendChild(chip(label, "ok"));
      return;
    }
    const masked = C.projected(p, cover);
    const rs = C.readings(state.font, masked, cover);
    host.appendChild(chip(t("cd.sees", { pattern: C.bitsOf(masked) }), "hint"));
    host.appendChild(chip(rs.length ? rs.join(" / ") : "—", rs.length > 1 ? "warn" : "ok"));
  }

  function renderCd() {
    $("#cd-font-name").textContent = fontName(state.fontKey);
    const stage = $("#cd-display");
    stage.innerHTML = "";
    const tens = Math.floor(cd.count / 10);
    const ones = cd.count % 10;
    for (const d of [tens, ones]) {
      const wrap = document.createElement("div");
      wrap.className = "cd-digit";
      renderGlyph(wrap, C.maskOf(state.font.glyphs[String(d)]), {
        cover: cd.cover,
        big: true,
      });
      stage.appendChild(wrap);
    }
    positionLeaf();
    $("#cd-cover-label").textContent = cd.cover
      ? t("cd.coverLabel", {
          cover: t("cover." + cd.cover),
          segments: C.COVERS[cd.cover].join(", "),
        })
      : t("cd.noCover");
    $("#cd-start").textContent = cd.running ? t("cd.pause") : t("cd.start");
    renderDigitReadings($("#cd-tens"), tens, cd.cover);
    renderDigitReadings($("#cd-ones"), ones, cd.cover);
  }

  // ---------------------------------------------------------------- quiz
  const QUIZ_KEY = "cov7seg_quiz_v1";
  const quiz = {
    data: [],
    current: null,
    dirty: false,
    timer: null,
    answered: false,
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
    $("#quiz-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(quiz.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cov7seg-quiz.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("#quiz-reset").addEventListener("click", () => {
      if (!confirm(t("quiz.confirmClear"))) return;
      quiz.data = [];
      saveQuiz();
      renderQuizStats();
    });
    loadQuiz();
    renderQuizStats();
    newQuestion();
  }

  function newQuestion() {
    clearTimeout(quiz.timer);
    quiz.answered = false;
    const labels = Object.keys(state.font.glyphs);
    const label = labels[Math.floor(Math.random() * labels.length)];
    const opts = [null, ...C.COVER_ORDER];
    const cover = opts[Math.floor(Math.random() * opts.length)];
    quiz.current = { label, cover, fontKey: state.fontKey };
    $("#quiz-cover").textContent = cover
      ? t("quiz.coverLabel", { cover: t("cover." + cover) })
      : t("quiz.noCover");
    renderGlyph($("#quiz-display"), C.maskOf(state.font.glyphs[label]), {
      cover,
      big: true,
    });
    const choices = $("#quiz-choices");
    choices.innerHTML = "";
    for (const l of labels) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = l;
      b.className = "choice";
      b.addEventListener("click", () => answer(l));
      choices.appendChild(b);
    }
    const fb = $("#quiz-feedback");
    fb.innerHTML = "";
    fb.appendChild(chip(t("quiz.what"), "hint"));
  }

  function answer(response) {
    if (!quiz.current || quiz.answered) return;
    quiz.answered = true;
    const cur = quiz.current;
    const p = C.maskOf(state.font.glyphs[cur.label]);
    const masked = cur.cover ? C.projected(p, cur.cover) : p;
    const possible = cur.cover
      ? C.readings(state.font, masked, cur.cover)
      : [cur.label];
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
    fb.appendChild(
      chip(correct ? t("quiz.correct") : t("quiz.wrong", { label: cur.label }), correct ? "ok" : "warn")
    );
    if (possible.length > 1) {
      fb.appendChild(chip(t("quiz.ambiguous", { labels: possible.join(" / ") }), "warn"));
    } else {
      fb.appendChild(chip(t("quiz.unique"), "ok"));
    }
    $$("#quiz-choices button").forEach((b) => (b.disabled = true));
    quiz.timer = setTimeout(newQuestion, 1500);
  }

  function renderQuizStats() {
    const host = $("#quiz-stats");
    host.innerHTML = "";
    const rows = quiz.data.filter((d) => d.font === state.fontKey);
    const n = rows.length;
    const ok = rows.filter((d) => d.correct).length;
    const top = document.createElement("div");
    top.className = "row";
    top.append(
      chip(`${t("quiz.trials")} ${n}`, "hint"),
      chip(`${t("quiz.correctCount")} ${ok}`, "ok"),
      chip(`${t("quiz.accuracy")} ${n ? ((ok / n) * 100).toFixed(1) + "%" : "—"}`, n ? "ok" : "hint")
    );
    host.appendChild(top);
    if (!n) return;
    const byShown = {};
    for (const d of rows) {
      byShown[d.shown] = byShown[d.shown] || { n: 0, ok: 0 };
      byShown[d.shown].n++;
      if (d.correct) byShown[d.shown].ok++;
    }
    const table = document.createElement("table");
    table.className = "stats-table";
    const head = document.createElement("tr");
    for (const h of [t("quiz.shown"), t("quiz.trials"), t("quiz.correctCount")]) {
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

    const labels = Object.keys(state.font.glyphs);
    const matrixRows = rows.filter(
      (d) => labels.includes(d.shown) && labels.includes(d.response)
    );
    if (!matrixRows.length) return;
    const m = document.createElement("table");
    m.className = "stats-table matrix-lite";
    const mhead = document.createElement("tr");
    mhead.appendChild(document.createElement("th"));
    for (const l of labels) {
      const th = document.createElement("th");
      th.textContent = l;
      mhead.appendChild(th);
    }
    m.appendChild(mhead);
    for (const shown of labels) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = shown;
      tr.appendChild(th);
      for (const response of labels) {
        const td = document.createElement("td");
        const c = matrixRows.filter(
          (d) => d.shown === shown && d.response === response
        ).length;
        td.textContent = c ? String(c) : "";
        if (shown === response) td.className = "diag";
        tr.appendChild(td);
      }
      m.appendChild(tr);
    }
    const cap = document.createElement("p");
    cap.className = "hint";
    cap.textContent = t("quiz.confusion");
    host.appendChild(cap);
    host.appendChild(m);
  }

  // ---------------------------------------------------------------- language
  function initLang() {
    $("#lang-switch").addEventListener("click", () => {
      I.setLang(I.lang === "en" ? "zh" : "en");
      refreshGlobalFont();
      renderLab();
      renderCd();
      renderQuizStats();
      newQuestion();
    });
  }

  // ---------------------------------------------------------------- boot
  I.init();
  initGlobalFont();
  initTabs();
  initLab();
  initCd();
  initQuiz();
  initLang();
})();
