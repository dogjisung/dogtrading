import React, { useState, useEffect } from 'react'
import './TVHeader.css'

interface TVHeaderProps {
  symbol: string
  onSymbolChange: (symbol: string) => void
  interval: string
  onIntervalChange: (interval: string) => void
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  indicators: string[]
  onIndicatorsChange: (indicators: string[]) => void
  exchange: string
  onExchangeChange: (exchange: string) => void
}

const TVHeader: React.FC<TVHeaderProps> = ({ exchange, onExchangeChange, interval, onIntervalChange, symbol, onSymbolChange, theme, onThemeToggle, indicators, onIndicatorsChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [ticker, setTicker] = useState<{ lastPrice: string; priceChangePercent: string } | null>(null)

  useEffect(() => {
    const fetchTicker = async () => {
      let url: string
      let parseData: (d: any) => { lastPrice: string; priceChangePercent: string }
      if (exchange === 'BINANCE') {
        // daily close percent change: prev day close vs current price
        try {
          const kRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=2`)
          const kData = await kRes.json()
          const prevClose = Number(kData[0][4])
          const pRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
          const pData = await pRes.json()
          const lastPriceNum = Number(pData.price)
          const percentStr = ((lastPriceNum - prevClose) / prevClose * 100).toFixed(2)
          setTicker({ lastPrice: lastPriceNum.toString(), priceChangePercent: percentStr })
          // format document title symbol for USDT pair on Binance
          const base = symbol.slice(0, symbol.length - 4)
          const suffix = symbol.slice(-4)
          const symTitle = `${base}/${suffix}`
          const priceStr = lastPriceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          const pctNum = Number(percentStr)
          const sign = pctNum >= 0 ? '+' : ''
          document.title = `${symTitle} ${priceStr} ${sign}${pctNum.toFixed(2)}% - 멍멍 트레이딩`
        } catch {
          // ignore
        }
        return
      } else if (exchange === 'BITGET') {
        url = `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${symbol}`
        parseData = d => {
          const dd = Array.isArray(d.data) ? d.data[0] : d.data
          return { lastPrice: dd.last, priceChangePercent: (Number(dd.changeRate) * 100).toFixed(2) }
        }
      } else if (exchange === 'UPBIT') {
        const market = `KRW-${symbol.slice(0, -4)}`
        url = `https://api.upbit.com/v1/ticker?markets=${market}`
        parseData = d => {
          const dd = d[0]
          return { lastPrice: dd.trade_price.toString(), priceChangePercent: (dd.change_rate * 100).toFixed(2) }
        }
      } else {
        return
      }
      // fetch for Bitget and Upbit
      try {
        const res = await fetch(url)
        const data = await res.json()
        const { lastPrice, priceChangePercent } = parseData(data)
        setTicker({ lastPrice, priceChangePercent })
        // format document title symbol based on exchange
        const base = symbol.slice(0, symbol.length - 4)
        const suffix = exchange === 'UPBIT' ? 'KRW' : symbol.slice(-4)
        const symTitle = `${base}/${suffix}`
        const priceStr = Number(lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const pctNum = Number(priceChangePercent)
        const sign = pctNum >= 0 ? '+' : ''
        document.title = `${symTitle} ${priceStr} ${sign}${pctNum.toFixed(2)}% - 멍멍 트레이딩`
      } catch {
        // ignore errors
      }
    }
    fetchTicker()
  }, [symbol, exchange])

  return (
    <div className="tv-header">
      <div className="tv-header-left">
        <div className="tv-logo">TV</div>
        <div className="tv-control">
          <label>거래소</label>
          <select value={exchange} onChange={e => onExchangeChange(e.target.value)}>
            <option value="UPBIT">업비트</option>
            <option value="BINANCE">바이낸스</option>
            <option value="BITGET">비트겟</option>
          </select>
        </div>
        <div className="tv-control">
          <label>심볼</label>
          <select value={symbol} onChange={e => onSymbolChange(e.target.value)}>
            {['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT'].map(sym => {
              const base = sym.slice(0, sym.length - 4)
              const suffix = exchange === 'UPBIT' ? 'KRW' : sym.slice(-4)
              return (
                <option key={sym} value={sym}>{`${base}/${suffix}`}</option>
              )
            })}
          </select>
        </div>
        <div className="tv-control">
          <label>시간</label>
          <select value={interval} onChange={e => onIntervalChange(e.target.value)}>
            <option value="1m">1분</option>
            <option value="5m">5분</option>
            <option value="15m">15분</option>
            <option value="1h">1시간</option>
            <option value="4h">4시간</option>
            <option value="1d">1일</option>
          </select>
        </div>
        <div className="tv-control indicator-control">
          <label onClick={() => setDropdownOpen(!dropdownOpen)}>지표 ▾</label>
          <button className="tv-btn theme-toggle" onClick={onThemeToggle}>
            {theme === 'light' ? '🌞' : '🌙'}
          </button>
          {dropdownOpen && (
            <ul className="tv-dropdown">
              {['이동 평균선', 'RSI', '볼린저 밴드', '거래량', 'MACD'].map(option => (
                <li key={option}>
                  <label>
                    <input
                      type="checkbox"
                      checked={indicators.includes(option)}
                      onChange={() => {
                        if (indicators.includes(option)) {
                          onIndicatorsChange(indicators.filter(i => i !== option))
                        } else {
                          onIndicatorsChange([...indicators, option])
                        }
                      }}
                    /> {option}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default TVHeader 