# Daily Crypto — live BTC / ETH price bar

OBS Browser Source overlay for the Daily Crypto 24/7 stream. It is a transparent 1920x1080 page that shows live BTC and ETH prices in USD with the 24h change.

- OBS: Browser Source → URL `https://deveeeeesh.github.io/daily-crypto-live-ticker/`, Width 1920, Height 1080, position 0,0, top layer.
- Data sources, tried in this order: Binance WebSocket, then Coinbase WebSocket, then CoinGecko every 30 s. It reconnects on its own.
- Test: `?demo=1` shows sample numbers for a layout check. `?source=coinbase` forces one feed.

Fonts: Anton and Inter (SIL Open Font License).
