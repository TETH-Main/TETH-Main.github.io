// ============================================================
// しりとりグラフサイト メインエントリーポイント
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // グラフの初期化
  const graph = new ShiritoriGraph("graph-container", shiritoriData);

  // ---- 斥力スライダー ----
  const chargeSlider = document.getElementById("charge-slider");
  const chargeValue = document.getElementById("charge-value");

  chargeSlider.addEventListener("input", () => {
    const val = parseInt(chargeSlider.value);
    chargeValue.textContent = val;
    // スライダーの値（1〜100）を斥力（-50〜-800）にマッピング
    const strength = -50 - (val / 100) * 750;
    graph.setCharge(strength);
  });

  // ---- リセットボタン ----
  document.getElementById("reset-btn").addEventListener("click", () => {
    graph.resetLayout();
  });
});
