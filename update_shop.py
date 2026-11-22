#!/usr/bin/env python3
"""BASE / BOOTH の商品情報を index.html のグッズ欄に反映する（GitHub Actionsで毎日実行）。

- BASE: ショップトップから商品IDと並び順を取り、各商品ページのJSON-LDで
  名前・価格・画像・在庫を再生成する。新商品も自動で載る。
- BOOTH: ショップトップはbot対策でプログラムから開けないため、商品IDの一覧
  （BOOTH_IDS）をこのファイルに固定で持ち、各商品ページのJSON-LD/OG情報で
  名前・価格・画像・在庫を最新化する。新商品をBOOTHに出したら、その商品IDを
  BOOTH_IDS に1行追加すること（並びはこのリストの順）。
- 取得に失敗したショップはブロックを変更しない（古い表示のまま安全側）。
  失敗があった場合は終了コード1で知らせる。
"""
import html
import re
import sys
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}

BASE_TOP = "https://mathgraphart.base.shop/"
BOOTH_TOP = "https://mathgraphart.booth.pm/"
BOOTH_IDS = [5687433, 5687415, 5674681, 5670728, 5667525,
             5667197, 5667167, 5667161, 5480226, 5447453]


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def card(url, store, name, price_text, img, stock):
    name = html.escape(name)
    return ('      <a class="product reveal" href="%s" target="_blank" rel="noopener">\n'
            '        <span class="pimg"><img src="%s" alt="%s" loading="lazy"></span>\n'
            '        <span class="store">%s</span><h3>%s</h3>\n'
            '        <p class="price">%s<small>%s</small></p>\n'
            '      </a>') % (url, img, name, store, name, price_text, stock)


def yen(n, tilde=False):
    return "¥" + format(n, ",") + ("〜" if tilde else "")


def ld_name(page):
    m = re.search(r'"@type":"Product","name":"([^"]*)"', page)
    return m.group(1).replace("\\/", "/") if m else None


def og(page, prop):
    m = re.search(r'property="%s" content="([^"]*)"' % re.escape(prop), page)
    return html.unescape(m.group(1)) if m else None


def base_cards():
    top = fetch(BASE_TOP)
    ids = []
    for m in re.finditer(r"/items/(\d+)", top):
        if m.group(1) not in ids:
            ids.append(m.group(1))
    if not ids:
        raise RuntimeError("BASE: 商品が見つからない")
    out = []
    for i in ids:
        url = BASE_TOP + "items/" + i
        p = fetch(url)
        name = ld_name(p)
        if name and name.startswith("関数アート・"):
            name = name[len("関数アート・"):]
        price = re.search(r'"price":"(\d+)"', p)
        img = og(p, "og:image")
        if not (name and price and img):
            raise RuntimeError("BASE: 解析失敗 items/" + i)
        stock = "在庫あり" if "InStock" in p else "売り切れ"
        out.append(card(url, "BASE", name, yen(int(price.group(1))),
                        img.split("?")[0], stock))
    return out


def booth_cards():
    out = []
    for i in BOOTH_IDS:
        url = BOOTH_TOP + "items/" + str(i)
        p = fetch(url)
        name = ld_name(p)
        if not name:
            t = og(p, "og:title") or ""
            name = t.replace(" - 関数アートサーバ - BOOTH", "").strip()
        prices = sorted({int(x) for x in re.findall(r'"price":"(\d+)"', p)})
        lo = re.search(r'"lowPrice":"(\d+)"', p)
        hi = re.search(r'"highPrice":"(\d+)"', p)
        if lo:
            prices = sorted(set(prices) | {int(lo.group(1))} |
                            ({int(hi.group(1))} if hi else set()))
        img = og(p, "og:image")
        if not (name and prices and img):
            raise RuntimeError("BOOTH: 解析失敗 items/" + str(i))
        stock = "在庫あり" if "InStock" in p else "売り切れ"
        out.append(card(url, "BOOTH", name,
                        yen(prices[0], tilde=len(prices) > 1), img, stock))
    return out


def replace_block(src, tag, cards):
    pat = re.compile(r"(<!-- %s:START -->).*?(<!-- %s:END -->)" % (tag, tag), re.S)
    if not pat.search(src):
        raise RuntimeError(tag + " のマーカーが index.html にない")
    return pat.sub(lambda m: m.group(1) + "\n" + "\n".join(cards) + "\n      " + m.group(2),
                   src, count=1)


def main():
    with open("index.html", encoding="utf-8") as f:
        src = f.read()
    failed = False
    for tag, fn in (("SHOP-BASE", base_cards), ("SHOP-BOOTH", booth_cards)):
        try:
            cards = fn()
            src = replace_block(src, tag, cards)
            print(tag, "updated:", len(cards), "items")
        except Exception as e:
            failed = True
            print(tag, "FAILED (ブロックは変更しない):", e, file=sys.stderr)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(src)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
