-- Seed instruments. Crypto quotes are live & executable-grade (Binance public market data).
-- Forex quotes are indicative only (Frankfurter.app daily ECB reference rates, no API key) —
-- marked is_executable = false until a real licensed forex liquidity provider is connected.
-- See the repository README "Market data providers" section for how to upgrade forex to real-time.

INSERT INTO instruments (symbol, class, base_asset, quote_asset, provider, provider_symbol, is_executable, contract_size, min_volume, max_volume, volume_step, max_leverage) VALUES
  ('EUR/USD', 'FOREX', 'EUR', 'USD', 'frankfurter', 'EUR_USD', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('GBP/USD', 'FOREX', 'GBP', 'USD', 'frankfurter', 'GBP_USD', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('USD/JPY', 'FOREX', 'USD', 'JPY', 'frankfurter', 'USD_JPY', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('USD/CHF', 'FOREX', 'USD', 'CHF', 'frankfurter', 'USD_CHF', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('AUD/USD', 'FOREX', 'AUD', 'USD', 'frankfurter', 'AUD_USD', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('USD/CAD', 'FOREX', 'USD', 'CAD', 'frankfurter', 'USD_CAD', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('NZD/USD', 'FOREX', 'NZD', 'USD', 'frankfurter', 'NZD_USD', FALSE, 100000, 0.01, 50, 0.01, 100),
  ('BTC/USD', 'CRYPTO', 'BTC', 'USDT', 'binance', 'BTCUSDT', TRUE, 1, 0.0001, 10, 0.0001, 20),
  ('ETH/USD', 'CRYPTO', 'ETH', 'USDT', 'binance', 'ETHUSDT', TRUE, 1, 0.001, 100, 0.001, 20),
  ('SOL/USD', 'CRYPTO', 'SOL', 'USDT', 'binance', 'SOLUSDT', TRUE, 1, 0.01, 1000, 0.01, 20),
  ('XRP/USD', 'CRYPTO', 'XRP', 'USDT', 'binance', 'XRPUSDT', TRUE, 1, 1,    100000, 1, 20),
  ('LTC/USD', 'CRYPTO', 'LTC', 'USDT', 'binance', 'LTCUSDT', TRUE, 1, 0.01, 1000, 0.01, 20)
ON DUPLICATE KEY UPDATE symbol = symbol;
