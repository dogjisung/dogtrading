import React, { useState } from 'react'
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