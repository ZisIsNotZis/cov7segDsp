/* Minimal i18n for the static lab.  English is the source; Chinese is written. */
(function (root) {
  "use strict";
  const DICT = {
    en: {
      "header.title": "cov7seg lab",
      "header.sub": "one side off — what can you still read?",
      "nav.lab": "Lab",
      "nav.countdown": "Countdown",
      "nav.quiz": "Quiz",
      "nav.math": "Math",
      "lang.switch": "中文",
      "global.font": "Font",
      "font.standard-dec": "Standard 0–9",
      "font.doc-dec": "Source note 0–9",
      "font.opt-dec": "Optimised 0–9 (4 flips)",
      "font.min-flip-dec": "Min-flip 0–9",
      "font.top0-dec": "Topology-only 0–9",
      "font.min-mismatch-dec": "Unreadable 0–9 (counterexample)",
      "font.standard-hex": "Standard 0–F",
      "font.doc-hex": "Source note 0–F",
      "font.min-flip-hex": "Min-flip 0–F",

      "lab.title": "Glyph editor",
      "lab.editor": "Edit glyph",
      "lab.gallery": "All digits",
      "lab.resetDigit": "Reset digit",
      "lab.resetFont": "Reset font",
      "lab.hint": "Click a segment to toggle it. Edits are saved to the selected digit immediately.",
      "lab.ambiguous": "ambiguous",
      "lab.conflict": "conflict",
      "lab.conflictHint": "Click a line to select that glyph and cover.",
      "lab.matrixSummary": "Conflict matrix (optional)",
      "lab.flipsShort": "flips",
      "lab.font": "Font",
      "lab.conflicts": "Conflicts",
      "lab.selected": "Selected conflict",
      "lab.matrix": "Conflict matrix",
      "cover.none": "no cover",
      "cover.top": "top",
      "cover.right": "right",
      "cover.bottom": "bottom",
      "cover.left": "left",
      "lab.visible": "Visible pattern: {pattern}",
      "lab.under": "Under {cover} cover: {pattern} → {readings}",
      "lab.noGlyph": "no glyph",
      "lab.noConflicts": "No conflicts — this set is unambiguous under all four covers.",
      "lab.selectConflict": "Select a conflict (list or matrix) to see the hidden segments.",
      "lab.matrixHint": "Cell = covers where the pair collides (T/R/B/L). Click a cell to inspect.",
      "lab.conflictLine": "{a} ↔ {b} under {cover} · hidden {segments}",
      "lab.detailLine": "{a} and {b} both become {projection} under the {cover} cover. Hidden segments: {segments}.",
      "lab.clickCell": "Click a segment to toggle it. Pick a cover to see what survives. A conflict means two slots become identical under that cover.",

      "score.font": "font",
      "score.glyph": "score",
      "score.conflicts": "conflicts",
      "score.mean": "mean score",
      "score.min": "min score",
      "score.flips": "flips from standard",
      "score.topo": "topology mismatches",
      "score.nearest": "nearest mismatches",
      "score.margin": "min nearest margin",
      "common.none": "none",
      "common.match": "match",
      "common.mismatch": "mismatch",
      "common.unique": "unique",

      "cd.start": "Start",
      "cd.pause": "Pause",
      "cd.reset": "Reset",
      "cd.tens": "Tens",
      "cd.ones": "Ones",
      "cd.hint": "Drag the leaf to a side. The covered side is hidden on both digits; the lists show every digit that could still be read. Try “Standard” vs “Optimised” to see the difference.",
      "cd.noCover": "no occlusion — drag the leaf to a side",
      "cd.leafTitle": "Drag me to a side",
      "cd.coverLabel": "{cover} cover: hiding {segments}",
      "cd.sees": "sees {pattern}",

      "quiz.new": "New glyph",
      "quiz.export": "Export JSON",
      "quiz.clear": "Clear data",
      "quiz.confirmClear": "Clear all quiz responses?",
      "quiz.occlude": "random occlusion",
      "quiz.hint": "Answer; the next glyph appears automatically. Responses are stored in localStorage; export the JSON to fit the weights.",
      "quiz.coverLabel": "{cover} cover",
      "quiz.noCover": "no cover",
      "quiz.what": "What is it? Click a digit.",
      "quiz.correct": "correct",
      "quiz.insufficient": "Reasonable answer — the visible evidence cannot distinguish these digits",
      "quiz.wrong": "wrong — it was {label}",
      "quiz.ambiguous": "ambiguous under this cover: {labels}",
      "quiz.unique": "unique reading",
      "quiz.trials": "trials",
      "quiz.correctCount": "correct",
      "quiz.accuracy": "original-value match rate (includes ambiguous trials)",
      "quiz.shown": "shown",
      "quiz.response": "response",
      "quiz.confusion": "Confusion matrix: rows = shown, columns = response.",

      "math.title": "What the foundation found",
      "math.intro": "Seven-segment display, four possible one-side covers: top removes <code>a</code>, bottom removes <code>d</code>, left removes <code>e,f</code>, right removes <code>b,c</code>; the middle <code>g</code> is never covered.",
      "math.max": "maximum unambiguous set",
      "math.min": "minimum maximal set",
      "math.sizes": "attainable maximal sizes",
      "math.counts": "maximal sets per g / globally",
      "math.capacity": "character capacity",
      "math.construction": "construction",
      "math.wellcovered": "well-covered criterion",
      "math.sizesVal": "16, 19–32 (17 and 18 do not exist)",
      "math.capacityVal": "32 (decimal and hex fit; 36-letter alphanumeric and Base64 do not)",
      "math.constructionVal": "4 cells × a matching of K₄,₄, plus cross-cell disjointness and hole-covering",
      "math.para": "The per-<code>g</code> graph is <code>K₂ □ K₂ □ K₄ □ K₄</code>; the global graph is two disjoint copies because <code>g</code> is never covered. The 9/10 gap is not a periodic sequence: it is the set of feasible cell-size patterns.",
      "math.recog": "Recognisability uses a geometry-based <code>(components, holes)</code> signature and a nearest-standard / segment-fault check. The source note’s hex font fails the nearest check for 6 and 8; no 16-glyph 0–F nearest-preserving font exists. The optimised decimal candidate changes 1, 3, 5, 8 (4 flips) and is the “Optimised 0–9” preset in the Lab.",
      "math.notes": "Full notes: <a href=\"docs/FOUNDATION.md\">docs/FOUNDATION.md</a> · <a href=\"docs/RECOGNITION.md\">docs/RECOGNITION.md</a> · <a href=\"docs/0_ROADMAP.md\">roadmap</a>.",
      "math.fig1": "Global maximal-set counts by size: peak at 26, not at the maximum 32.",
      "math.fig2": "Attainable maximal sizes for K₂ □ K₂ □ K_q □ K_q: the gap moves and can disappear.",
      "footer": "cov7seg · M3 lab · built from the M1/M2 exact results. Everything is static; no server, no build.",
    },
    zh: {
      "header.title": "cov7seg 实验台",
      "header.sub": "遮住一边，你还能读出什么？",
      "nav.lab": "实验台",
      "nav.countdown": "倒计时",
      "nav.quiz": "小测",
      "nav.math": "数学",
      "lang.switch": "EN",
      "global.font": "字库",
      "font.standard-dec": "标准 0–9",
      "font.doc-dec": "原文 0–9",
      "font.opt-dec": "优化 0–9（4 次翻转）",
      "font.min-flip-dec": "最小翻转 0–9",
      "font.top0-dec": "仅保拓扑 0–9",
      "font.min-mismatch-dec": "不可读 0–9（反例）",
      "font.standard-hex": "标准 0–F",
      "font.doc-hex": "原文 0–F",
      "font.min-flip-hex": "最小翻转 0–F",

      "lab.title": "字形编辑器",
      "lab.editor": "编辑字形",
      "lab.gallery": "全部字形",
      "lab.resetDigit": "恢复此字形",
      "lab.resetFont": "恢复字库",
      "lab.hint": "点击线段切换亮灭。修改会立即写入当前选中的数字。",
      "lab.ambiguous": "有歧义",
      "lab.conflict": "冲突",
      "lab.conflictHint": "点击一行，选中对应字形和遮挡边。",
      "lab.matrixSummary": "冲突矩阵（可选）",
      "lab.flipsShort": "翻转",
      "lab.font": "字库",
      "lab.conflicts": "冲突",
      "lab.selected": "选中的冲突",
      "lab.matrix": "冲突矩阵",
      "cover.none": "不遮挡",
      "cover.top": "上边",
      "cover.right": "右边",
      "cover.bottom": "下边",
      "cover.left": "左边",
      "lab.visible": "可见图案：{pattern}",
      "lab.under": "在{cover}遮挡下：{pattern} → {readings}",
      "lab.noGlyph": "没有字形",
      "lab.noConflicts": "没有冲突——这个字库在四种遮挡下都无歧义。",
      "lab.selectConflict": "从列表或矩阵中选择一个冲突，查看被遮住的线段。",
      "lab.matrixHint": "格子 = 发生冲突的遮挡边（T/R/B/L）。点击格子查看。",
      "lab.conflictLine": "{a} ↔ {b}，{cover}遮挡 · 隐藏 {segments}",
      "lab.detailLine": "{a} 和 {b} 在{cover}遮挡下都变成 {projection}。被遮住的线段：{segments}。",
      "lab.clickCell": "点击线段切换亮灭。选择一条遮挡边，看看还剩下什么。冲突表示两个槽位在该遮挡下变得完全相同。",

      "score.font": "字库",
      "score.glyph": "得分",
      "score.conflicts": "冲突数",
      "score.mean": "平均分",
      "score.min": "最低分",
      "score.flips": "相对标准翻转段数",
      "score.topo": "拓扑不匹配",
      "score.nearest": "最近标准不匹配",
      "score.margin": "最小最近标准间距",
      "common.none": "无",
      "common.match": "符合",
      "common.mismatch": "不匹配",
      "common.unique": "唯一",

      "cd.start": "开始",
      "cd.pause": "暂停",
      "cd.reset": "重置",
      "cd.tens": "十位",
      "cd.ones": "个位",
      "cd.hint": "把叶子拖到某一边。被遮住的一边在两个数字上都消失；下面的列表给出所有仍可能读出的数字。试试“标准”和“优化”字库。",
      "cd.noCover": "没有遮挡——把叶子拖到某一边",
      "cd.leafTitle": "把我拖到某一边",
      "cd.coverLabel": "{cover}遮挡：遮住 {segments}",
      "cd.sees": "看到 {pattern}",

      "quiz.new": "新字形",
      "quiz.export": "导出 JSON",
      "quiz.clear": "清空数据",
      "quiz.confirmClear": "清空所有小测回答？",
      "quiz.occlude": "随机遮挡",
      "quiz.hint": "回答后会自动出现下一个字形。回答保存在浏览器 localStorage 中；导出 JSON 后用于拟合权重。",
      "quiz.coverLabel": "{cover}遮挡",
      "quiz.noCover": "无遮挡",
      "quiz.what": "这是什么数字？点击一个数字。",
      "quiz.correct": "正确",
      "quiz.insufficient": "这个判断合理：可见信息无法区分这些数字",
      "quiz.wrong": "错误——正确答案是 {label}",
      "quiz.ambiguous": "在这个遮挡下有歧义：{labels}",
      "quiz.unique": "唯一读数",
      "quiz.trials": "测试数",
      "quiz.correctCount": "正确数",
      "quiz.accuracy": "原值命中率（包含歧义题）",
      "quiz.shown": "显示",
      "quiz.response": "回答",
      "quiz.confusion": "混淆矩阵：行 = 显示的字形，列 = 回答。",

      "math.title": "基础研究得到了什么",
      "math.intro": "七段数码管有四种单边遮挡：上边去掉 <code>a</code>，下边去掉 <code>d</code>，左边去掉 <code>e,f</code>，右边去掉 <code>b,c</code>；中段 <code>g</code> 永远不会被遮住。",
      "math.max": "最大无歧义集合",
      "math.min": "最小极大集合",
      "math.sizes": "可达到的极大集大小",
      "math.counts": "每个 g / 全局的极大集数量",
      "math.capacity": "字符容量",
      "math.construction": "构造规则",
      "math.wellcovered": "well-covered 判据",
      "math.sizesVal": "16，19–32（17 和 18 不存在）",
      "math.capacityVal": "32（十进制和十六进制能放下；36 字母和 Base64 放不下）",
      "math.constructionVal": "4 个格子 × K₄,₄ 的一个匹配，加上跨格不共享边和洞覆盖",
      "math.para": "每个 <code>g</code> 的图是 <code>K₂ □ K₂ □ K₄ □ K₄</code>；因为 <code>g</code> 永不被遮住，全局图是两个不相交的副本。9/10 的缺口不是周期数列，而是可行的格子大小模式集合。",
      "math.recog": "可识别性用几何光栅化的 <code>（连通分量, 洞）</code> 签名，以及“最近标准 / 单段故障”检查。原文的十六进制字库在 6 和 8 上不满足最近标准；不存在让 16 个 0–F 字形都唯一最近的字库。优化后的十进制候选只改 1、3、5、8（4 次翻转），就是实验台里的“优化 0–9”预设。",
      "math.notes": "完整笔记：<a href=\"docs/FOUNDATION.md\">docs/FOUNDATION.md</a> · <a href=\"docs/RECOGNITION.md\">docs/RECOGNITION.md</a> · <a href=\"docs/0_ROADMAP.md\">路线图</a>。",
      "math.fig1": "全局极大集数量按大小分布：峰值在 26，而不是最大值 32。",
      "math.fig2": "K₂ □ K₂ □ K_q □ K_q 的可达极大集大小：缺口会移动，也会消失。",
      "footer": "cov7seg · M3 实验台 · 由 M1/M2 的精确结果驱动。完全静态；无需服务器，无需构建。",
    },
  };

  let lang = "en";

  function t(key, vars = {}) {
    const table = DICT[lang] || DICT.en;
    let s = table[key] ?? DICT.en[key] ?? key;
    return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  }

  function applyI18n(rootEl = document) {
    rootEl.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    rootEl.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    rootEl.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
    rootEl.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });
    const sw = document.getElementById("lang-switch");
    if (sw) sw.textContent = t("lang.switch");
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }

  function init() {
    try {
      const stored = localStorage.getItem("cov7seg_lang");
      if (stored === "zh" || stored === "en") lang = stored;
    } catch (e) {
      /* ignore */
    }
    applyI18n();
  }

  function setLang(next) {
    lang = next === "zh" ? "zh" : "en";
    try {
      localStorage.setItem("cov7seg_lang", lang);
    } catch (e) {
      /* ignore */
    }
    applyI18n();
  }

  root.I18N = { t, applyI18n, init, setLang, get lang() { return lang; }, DICT };
})(typeof globalThis !== "undefined" ? globalThis : this);
