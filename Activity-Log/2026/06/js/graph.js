// ============================================================
// しりとりグラフ D3.js 描画ロジック
// ============================================================

class ShiritoriGraph {
  constructor(containerId, data) {
    this.containerId = containerId;
    this.data = data;
    this.svg = null;
    this.simulation = null;
    this.linkGroup = null;
    this.nodeGroup = null;
    this.gridGroup = null;
    this.zoom = null;
    this.width = 0;
    this.height = 0;

    // ノードサイズ設定
    this.cardWidth = 150;
    this.cardHeight = 190;
    this.radius = 10;
    this.titleAreaHeight = 28;
    this.imageAreaY = 0;
    this.thumbSize = 0;

    // スタートノード（正円）のサイズ: 通常ノードの角丸の1辺(cardWidth=150)の60% = 90px
    this.startNodeSize = 90;

    // 斥力の強さ
    this.chargeStrength = -300;

    // Desmos埋め込みiframeを管理するコンテナ
    this.desmosContainer = null;

    // 現在のズーム変換を保持
    this.currentTransform = d3.zoomIdentity;

    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Desmos埋め込みiframe用のコンテナを作成（SVGの上に重ねる）
    this.desmosContainer = d3.select(`#${this.containerId}`)
      .append("div")
      .attr("class", "desmos-embed-container")
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100%")
      .style("height", "100%")
      .style("pointer-events", "none")
      .style("z-index", "5");

    // 画像領域のY位置計算
    this.imageAreaY = -this.cardHeight / 2 + this.titleAreaHeight;

    // SVG作成
    this.svg = d3.select(`#${this.containerId}`)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("background", "#f5f5f5");

    // 背景グリッド用グループ
    this.gridGroup = this.svg.append("g").attr("class", "grid");

    // グリッド描画（パターン方式で無限グリッド）
    this.renderGrid();

    // 矢印マーカーの定義（中点用）※defsは先に作っておく
    this.svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 5)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4a90d9");

    // エッジ用グループ
    this.linkGroup = this.svg.append("g").attr("class", "links");

    // ノード用グループ
    this.nodeGroup = this.svg.append("g").attr("class", "nodes");

    // ズーム設定
    this.zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        this.currentTransform = event.transform;
        this.nodeGroup.attr("transform", event.transform);
        this.linkGroup.attr("transform", event.transform);
        this.gridGroup.attr("transform", event.transform);
        // ズームに合わせてDesmos埋め込みの位置も更新
        this.updateDesmosEmbeds(event.transform);
      });

    this.svg.call(this.zoom);

    // フォースシミュレーション設定
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force("link", d3.forceLink(this.data.edges)
        .id(d => d.id)
        .distance(220)
        .strength(0.3))
      .force("charge", d3.forceManyBody()
        .strength(this.chargeStrength))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide()
        .radius(d => d.isStart ? this.startNodeSize * 0.6 : Math.max(this.cardWidth, this.cardHeight) * 0.55))
      .on("tick", () => this.ticked());

    // 描画
    this.renderLinks();
    this.renderNodes();

    // ウィンドウリサイズ対応
    window.addEventListener("resize", () => this.resize());
  }

  // ---- Desmos埋め込みiframeの位置を更新 ----
  updateDesmosEmbeds(transform) {
    const self = this;
    const t = transform || this.currentTransform;
    this.data.nodes.forEach(d => {
      if (d._desmosEmbed) {
        const nodeLeft = d.x - self.cardWidth / 2;
        const nodeTop = d.y - self.cardHeight / 2 + self.titleAreaHeight;
        const x = nodeLeft * t.k + t.x;
        const y = nodeTop * t.k + t.y;
        const w = self.cardWidth * t.k;
        const h = self.thumbSize * t.k;
        d._desmosEmbed
          .style("left", x + "px")
          .style("top", y + "px")
          .style("width", w + "px")
          .style("height", h + "px");
      }
    });
  }

  // ---- Desmos風グリッド背景（SVGパターン方式で無限グリッド） ----
  renderGrid() {
    const gridSize = 40;
    const minorGridSize = gridSize / 5;

    // defsにパターンを定義
    const defs = this.svg.select("defs");
    if (defs.empty()) {
      this.svg.append("defs");
    }

    // メイングリッド用パターン
    const patternMain = this.svg.select("defs")
      .append("pattern")
      .attr("id", "grid-pattern-main")
      .attr("width", gridSize)
      .attr("height", gridSize)
      .attr("patternUnits", "userSpaceOnUse");

    patternMain.append("line")
      .attr("class", "grid-line")
      .attr("x1", gridSize).attr("y1", 0)
      .attr("x2", gridSize).attr("y2", gridSize);

    patternMain.append("line")
      .attr("class", "grid-line")
      .attr("x1", 0).attr("y1", gridSize)
      .attr("x2", gridSize).attr("y2", gridSize);

    // マイナーグリッド用パターン
    const patternMinor = this.svg.select("defs")
      .append("pattern")
      .attr("id", "grid-pattern-minor")
      .attr("width", minorGridSize)
      .attr("height", minorGridSize)
      .attr("patternUnits", "userSpaceOnUse");

    patternMinor.append("line")
      .attr("class", "grid-line-minor")
      .attr("x1", minorGridSize).attr("y1", 0)
      .attr("x2", minorGridSize).attr("y2", minorGridSize);

    patternMinor.append("line")
      .attr("class", "grid-line-minor")
      .attr("x1", 0).attr("y1", minorGridSize)
      .attr("x2", minorGridSize).attr("y2", minorGridSize);

    // パターンで塗りつぶした矩形を配置（ズーム/パンしても無限に表示される）
    this.gridGroup.append("rect")
      .attr("class", "grid-bg-minor")
      .attr("x", -50000).attr("y", -50000)
      .attr("width", 100000).attr("height", 100000)
      .attr("fill", "url(#grid-pattern-minor)");

    this.gridGroup.append("rect")
      .attr("class", "grid-bg-main")
      .attr("x", -50000).attr("y", -50000)
      .attr("width", 100000).attr("height", 100000)
      .attr("fill", "url(#grid-pattern-main)");
  }

  // ---- エッジ描画（中点に矢印） ----
  renderLinks() {
    const self = this;

    // 前半の線（source → 中点）+ 矢印
    this.linkGroup.selectAll("line.edge-line-first")
      .data(this.data.edges)
      .join("line")
      .attr("class", "edge-line-first")
      .attr("marker-end", "url(#arrowhead)")
      // 初期位置を設定（ticked()が初回実行される前に表示されるように）
      .attr("x1", d => d.source && d.source.x !== undefined ? d.source.x : 0)
      .attr("y1", d => d.source && d.source.y !== undefined ? d.source.y : 0)
      .attr("x2", d => {
        const sx = d.source && d.source.x !== undefined ? d.source.x : 0;
        const tx = d.target && d.target.x !== undefined ? d.target.x : 0;
        return (sx + tx) / 2;
      })
      .attr("y2", d => {
        const sy = d.source && d.source.y !== undefined ? d.source.y : 0;
        const ty = d.target && d.target.y !== undefined ? d.target.y : 0;
        return (sy + ty) / 2;
      });

    // 後半の線（中点 → target）
    this.linkGroup.selectAll("line.edge-line-second")
      .data(this.data.edges)
      .join("line")
      .attr("class", "edge-line-second")
      // 初期位置を設定
      .attr("x1", d => {
        const sx = d.source && d.source.x !== undefined ? d.source.x : 0;
        const tx = d.target && d.target.x !== undefined ? d.target.x : 0;
        return (sx + tx) / 2;
      })
      .attr("y1", d => {
        const sy = d.source && d.source.y !== undefined ? d.source.y : 0;
        const ty = d.target && d.target.y !== undefined ? d.target.y : 0;
        return (sy + ty) / 2;
      })
      .attr("x2", d => d.target && d.target.x !== undefined ? d.target.x : 0)
      .attr("y2", d => d.target && d.target.y !== undefined ? d.target.y : 0);
  }

  // ---- ノード描画 ----
  renderNodes() {
    const self = this;

    const imageAreaHeight = this.cardHeight - this.titleAreaHeight;
    this.thumbSize = imageAreaHeight;

    const nodeEnter = this.nodeGroup.selectAll("g.node-card")
      .data(this.data.nodes)
      .join("g")
      .attr("class", "node-card")
      .call(this.dragBehavior());

    // 通常ノードとスタートノードで分けて描画
    nodeEnter.each(function(d) {
      const g = d3.select(this);

      if (d.isStart) {
        // === スタートノード：正円 ===
        const s = self.startNodeSize;

        // 円の背景
        g.append("circle")
          .attr("class", "node-card-bg-start")
          .attr("r", s / 2)
          .attr("cx", 0)
          .attr("cy", 0);

        // タイトルテキスト（中央配置）
        g.append("text")
          .attr("class", "node-title node-title-start")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .text(d.label);

        // プレースホルダーアイコン（下部に小さく）
        g.append("text")
          .attr("class", "thumbnail-placeholder-text")
          .attr("x", 0)
          .attr("y", s * 0.25)
          .attr("font-size", "18px")
          .text("🚀");

      } else {
        // === 通常ノード：角丸カード ===

        // カード背景
        g.append("rect")
          .attr("class", "node-card-bg")
          .attr("width", self.cardWidth)
          .attr("height", self.cardHeight)
          .attr("x", -self.cardWidth / 2)
          .attr("y", -self.cardHeight / 2)
          .attr("rx", self.radius)
          .attr("ry", self.radius);

        // タイトル背景領域
        g.append("rect")
          .attr("class", "node-title-bg")
          .attr("width", self.cardWidth)
          .attr("height", self.titleAreaHeight)
          .attr("x", -self.cardWidth / 2)
          .attr("y", -self.cardHeight / 2)
          .attr("rx", self.radius)
          .attr("ry", self.radius);

        // タイトルテキスト
        g.append("text")
          .attr("class", "node-title")
          .attr("y", -self.cardHeight / 2 + self.titleAreaHeight / 2)
          .text(d.label);

        // 画像領域の背景
        g.append("rect")
          .attr("class", "node-image-bg")
          .attr("width", self.cardWidth)
          .attr("height", imageAreaHeight)
          .attr("x", -self.cardWidth / 2)
          .attr("y", self.imageAreaY)
          .attr("rx", self.radius)
          .attr("ry", self.radius);

        // サムネイル画像 or プレースホルダー
        const thumbW = self.cardWidth;
        const thumbH = imageAreaHeight;
        const thumbX = -self.cardWidth / 2;
        const thumbY = self.imageAreaY;

        if (d.thumbnail) {
          const isDesmosUrl = d.thumbnail.startsWith("https://www.desmos.com/");
          const isLocalImage = d.thumbnail.startsWith("images/");

          if (isDesmosUrl) {
            const embedUrl = d.thumbnail + "?embed";

            // 「Desmos」テキスト
            g.append("text")
              .attr("class", "thumbnail-placeholder-text")
              .attr("x", 0)
              .attr("y", thumbY + thumbH / 2)
              .text("Desmos");

            // HTMLのdiv要素としてDesmos埋め込みiframeを作成
            const iframe = document.createElement("iframe");
            iframe.src = embedUrl;
            iframe.className = "desmos-embed";
            iframe.style.position = "absolute";
            iframe.style.width = thumbW + "px";
            iframe.style.height = thumbH + "px";
            iframe.style.border = "none";
            iframe.style.borderRadius = "0 0 " + self.radius + "px " + self.radius + "px";
            iframe.style.overflow = "hidden";
            iframe.style.pointerEvents = "none";
            iframe.loading = "lazy";

            d._desmosEmbed = d3.select(self.desmosContainer.node().appendChild(iframe));

            g.style("cursor", "pointer")
              .on("click", (event) => {
                event.stopPropagation();
                window.open(embedUrl, "_blank");
              });
          } else {
            // 画像
            g.append("image")
              .attr("class", "thumbnail-image")
              .attr("href", d.thumbnail)
              .attr("width", thumbW)
              .attr("height", thumbH)
              .attr("x", thumbX)
              .attr("y", thumbY)
              .attr("preserveAspectRatio", "xMidYMid slice");
          }
        } else {
          // プレースホルダー
          g.append("text")
            .attr("class", "thumbnail-placeholder-text")
            .attr("x", 0)
            .attr("y", thumbY + thumbH / 2)
            .text("🚀");
        }
      }
    });

    // クリックイベント
    nodeEnter.on("click", (event, d) => {
      if (d.isStart) {
        d3.select(event.currentTarget).select("circle")
          .transition()
          .duration(200)
          .attr("stroke-width", 3)
          .attr("stroke", "#c0392b")
          .transition()
          .duration(800)
          .delay(1000)
          .attr("stroke-width", 2.5)
          .attr("stroke", "#e74c3c");
      } else {
        d3.select(event.currentTarget).select(".node-card-bg")
          .transition()
          .duration(200)
          .attr("stroke-width", 3)
          .attr("stroke", "#4a90d9")
          .transition()
          .duration(800)
          .delay(1000)
          .attr("stroke-width", 1.5)
          .attr("stroke", "#e0e0e0");
      }
    });
  }

  // ---- ドラッグ挙動（スマホ対応） ----
  dragBehavior() {
    const self = this;
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) self.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) self.simulation.alphaTarget(0);
      });
  }

  // ---- 毎フレームの更新 ----
  ticked() {
    // 前半の線（source → 中点）+ 矢印
    this.linkGroup.selectAll("line.edge-line-first")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => (d.source.x + d.target.x) / 2)
      .attr("y2", d => (d.source.y + d.target.y) / 2);

    // 後半の線（中点 → target）
    this.linkGroup.selectAll("line.edge-line-second")
      .attr("x1", d => (d.source.x + d.target.x) / 2)
      .attr("y1", d => (d.source.y + d.target.y) / 2)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // ノードの位置更新
    this.nodeGroup.selectAll("g.node-card")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    // Desmos埋め込みの位置も更新
    this.updateDesmosEmbeds();
  }

  // ---- リサイズ対応 ----
  resize() {
    const container = document.getElementById(this.containerId);
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.svg.attr("width", this.width).attr("height", this.height);
    this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
    this.simulation.alpha(0.3).restart();
  }

  // ---- 斥力の強さ変更 ----
  setCharge(strength) {
    this.chargeStrength = strength;
    this.simulation.force("charge", d3.forceManyBody().strength(strength));
    this.simulation.alpha(0.3).restart();
  }

  // ---- レイアウトリセット ----
  resetLayout() {
    this.data.nodes.forEach(d => {
      d.fx = null;
      d.fy = null;
    });
    this.simulation.alpha(1).restart();
  }

  // ---- データ更新 ----
  updateData(newData) {
    this.data = newData;
    this.simulation.nodes(this.data.nodes);
    this.simulation.force("link", d3.forceLink(this.data.edges)
      .id(d => d.id)
      .distance(220)
      .strength(0.3));
    this.simulation.alpha(1).restart();
    this.renderLinks();
    this.renderNodes();
  }
}
