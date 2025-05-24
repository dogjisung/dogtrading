import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, UTCTimestamp, CandlestickData } from 'lightweight-charts';

interface ChartProps {
  exchange: string;
  interval: string;
  symbol: string;
  theme: 'light' | 'dark';
  indicators: string[];
}

const getTradingViewSymbol = (exchange: string, symbol: string) => {
  if (exchange === 'BINANCE') return `BINANCE:${symbol}`;
  if (exchange === 'BITGET') return `BITGET:${symbol}`;
  // Default to Binance
  return `BINANCE:${symbol}`;
};

const Chart: React.FC<ChartProps> = ({ exchange, interval, symbol, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    if (exchange === 'UPBIT') {
      // Create chart instance
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { type: ColorType.Solid, color: theme === 'light' ? '#ffffff' : '#131722' },
          textColor: theme === 'light' ? '#000000' : '#d1d4dc',
        },
        grid: {
          vertLines: { color: theme === 'light' ? '#eee' : '#333' },
          horzLines: { color: theme === 'light' ? '#eee' : '#333' },
        },
        timeScale: { timeVisible: true, secondsVisible: false },
      });
      const candleSeries = chart.addCandlestickSeries();

      // Determine market code (KRW-BASE)
      const base = symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
      const market = `KRW-${base}`;

      // Map interval
      let apiInterval = 'minutes/1';
      if (interval === '5m') apiInterval = 'minutes/5';
      if (interval === '15m') apiInterval = 'minutes/15';
      if (interval === '1h') apiInterval = 'minutes/60';
      if (interval === '4h') apiInterval = 'minutes/240';
      if (interval === '1d') apiInterval = 'days';

      // Fetch candles from Upbit API
      fetch(`https://api.upbit.com/v1/candles/${apiInterval}?market=${market}&count=200`)
        .then(res => res.json())
        .then((data: any[]) => {
          const candles: CandlestickData<UTCTimestamp>[] = data
            .reverse()
            .map(d => ({
              time: (new Date(d.candle_date_time_utc + 'Z').getTime() / 1000) as UTCTimestamp,
            open: d.opening_price,
            high: d.high_price,
            low: d.low_price,
            close: d.trade_price,
          }));
          candleSeries.setData(candles);
        })
        .catch(err => {
          console.error('Upbit API error:', err);
        });

      return () => {
        chart.remove();
      };
    } else {
      // TradingView Advanced Chart Widget for other exchanges
      const config = {
        autosize: true,
            symbol: getTradingViewSymbol(exchange, symbol),
            interval: interval.replace('m', ''),
            timezone: 'Asia/Seoul',
            theme: theme,
            style: '1',
            locale: 'kr',
            toolbar_bg: theme === 'light' ? '#f1f3f6' : '#131722',
            allow_symbol_change: true,
      };
      const wrapper = document.createElement('div');
      wrapper.className = 'tradingview-widget-container';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      wrapper.appendChild(widgetDiv);
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.text = JSON.stringify(config);
      wrapper.appendChild(script);
      containerRef.current.appendChild(wrapper);
      return () => {
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }
  }, [exchange, interval, symbol, theme]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Chart; 