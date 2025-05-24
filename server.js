const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Upbit candles endpoint
app.get('/api/candles', async (req, res) => {
  const market = req.query.market;
  const interval = req.query.interval;
  const intervalMap = { '1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 'days' };
  if (!market || !intervalMap[interval]) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  const unit = intervalMap[interval];
  let url;
  if (interval === '1d') {
    url = `https://api.upbit.com/v1/candles/days?market=${market}&count=200`;
  } else {
    url = `https://api.upbit.com/v1/candles/minutes/${unit}?market=${market}&count=200`;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`)); 