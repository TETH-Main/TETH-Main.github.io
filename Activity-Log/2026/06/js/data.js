// ============================================================
// しりとりグラフ データ（本物）
// ============================================================

const shiritoriData = {
  nodes: [
    // スタートノード（開始点）- 赤色で強調
    { id: "関数アート",   label: "関数アート", thumbnail: "", isStart: true },

    // しりとりチェーン
    { id: "とお",        label: "とお（ten）",        thumbnail: "images/pYkdxgAAAAZJREFUAwDvkWb9NASqRwAAAABJRU5ErkJggg.webp" },
    { id: "おんぷ",      label: "おんぷ（note）",     thumbnail: "images/18529ACF-987B-4D20-93CD-927C05B4D60C.webp" },
    { id: "neptune",     label: "neptune（海王星）",   thumbnail: "https://www.desmos.com/calculator/aqydtlnrci" },
    { id: "ウムラウト",   label: "ウムラウト",         thumbnail: "https://www.desmos.com/calculator/t8dtxw1vf0" },
    { id: "トリウム",     label: "トリウム",           thumbnail: "https://www.desmos.com/calculator/qqkvwkj9n1" },
    { id: "えんとつ",     label: "えんとつ",           thumbnail: "https://www.desmos.com/calculator/uhzniae8j0" },
    { id: "紫",          label: "紫",                 thumbnail: "https://www.desmos.com/calculator/zwotzxvbyz" },
    { id: "菊",          label: "菊",                 thumbnail: "images/IwAAAABJRU5ErkJggg.webp" },
    { id: "クッキー",     label: "クッキー",           thumbnail: "https://www.desmos.com/calculator/okvmtxgtcg" },
    { id: "金",          label: "金",                 thumbnail: "https://www.desmos.com/calculator/vwjqeeyjfr" },
  ],

  edges: [
    // スタートからの分岐
    { source: "関数アート",   target: "とお" },
    { source: "とお",   target: "おんぷ" },

    // しりとりチェーン
    { source: "とお",    target: "neptune" },     // とお(ten) → neptune
    { source: "とお",    target: "ウムラウト" },   // とお=十(じゅう) → ウムラウト
    { source: "おんぷ",  target: "えんとつ" },     // おんぷ(note) → えんとつ
    { source: "ウムラウト", target: "トリウム" },  // ウムラウト → トリウム
    { source: "トリウム", target: "紫" },          // トリウム → 紫
    { source: "紫",       target: "菊" },          // 紫 → 菊
    { source: "菊",       target: "クッキー" },    // 菊 → クッキー
    { source: "クッキー", target: "金" },          // クッキー → 金
  ]
};
