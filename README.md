# Daily Crypto — live BTC / ETH price bar

OBS Browser Source overlay for the Daily Crypto 24/7 stream. It is a transparent 1920x1080 page that shows live BTC and ETH prices in USD with the 24h change.

- OBS: Browser Source → URL `https://deveeeeesh.github.io/daily-crypto-live-ticker/`, Width 1920, Height 1080, position 0,0, top layer.
- Data sources, tried in this order: Binance WebSocket, then Coinbase WebSocket, then CoinGecko every 30 s. It reconnects on its own.
- Test: `?demo=1` shows sample numbers for a layout check. `?source=coinbase` forces one feed.

## News strip (`news.html`)
Second OBS Browser Source: `https://deveeeeesh.github.io/daily-crypto-live-ticker/news.html` (1920x1080, position 0,0). It shows one BTC/ETH headline at a time on the golden-line lane, above the CRYPTO LIVE ticker. Each headline stays 8 s.
- A headline younger than 30 min gets a red BREAKING chip. A newly arrived headline flashes: red backdrop, gold sweep, "NEW".
- `.github/workflows/news.yml` runs `scripts/fetch-news.mjs` every 10 min. It reads Cointelegraph (BTC + ETH tags), Decrypt, The Block and Bitcoin Magazine RSS, keeps only BTC/ETH headlines (title, source, link, time; no article text), and commits `news.json` when there is something new.
- The page reads news.json every 2 min, from raw.githubusercontent.com first and then the Pages copy. It keeps the last list in localStorage, so the strip is never empty.
- Test: `?demo=1` (a breaking item arrives after 5 s), `?demo=flash`, `?demo=long`, `?hold=3000` (faster rotation), `?bg=...` (background image).

Fonts: Anton and Inter (SIL Open Font License).
