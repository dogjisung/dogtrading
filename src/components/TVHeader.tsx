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
}

const TVHeader: React.FC<TVHeaderProps> = ({ symbol, onSymbolChange, interval, onIntervalChange, theme, onThemeToggle, indicators, onIndicatorsChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [countdown, setCountdown] = useState('00:00')

  useEffect(() => {
    const getSeconds = () => {
      const nowSec = Math.floor(Date.now() / 1000)
      let sec = 60
      switch (interval) {
        case '1m': sec = 60; break
        case '5m': sec = 5 * 60; break
        case '15m': sec = 15 * 60; break
        case '1h': sec = 60 * 60; break
        case '4h': sec = 4 * 60 * 60; break
        case '1d': sec = 24 * 60 * 60; break
        default: sec = 60
      }
      const next = Math.ceil(nowSec / sec) * sec
      return next - nowSec
    }
    const update = () => {
      const s = getSeconds()
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      const formatted = (h > 0 ? `${String(h).padStart(2,'0')}:` : '') + `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      setCountdown(formatted)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [interval])

  return (
    <div className="tv-header">
      <div className="tv-header-left">
        <div className="tv-logo">TV</div>
        <div className="tv-control">
          <label>심볼</label>
          <select value={symbol} onChange={e => onSymbolChange(e.target.value)}>
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
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
      <div className="tv-header-right">
        <div className="tv-control countdown">
          봉 완성 카운트다운 <span>{countdown}</span>
        </div>
        <button className="tv-btn theme-toggle" onClick={onThemeToggle}>
          {theme === 'light' ? '🌞' : '🌙'}
        </button>
      </div>
    </div>
  )
}

export default TVHeader 