import React, { useState, useEffect } from 'react'
import './App.css'
import Chart from './components/Chart'

function App() {
  // remove trailing slash from root URL
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', window.location.origin)
    }
  }, [])
  // persistence for symbol, interval, and theme
  const [symbol, setSymbol] = useState<string>(() => {
    const saved = localStorage.getItem('symbol')
    return saved ?? 'BTCUSDT'
  })
  useEffect(() => {
    localStorage.setItem('symbol', symbol)
  }, [symbol])

  const [interval, setInterval] = useState<string>(() => {
    const saved = localStorage.getItem('interval')
    return saved ?? '1m'
  })
  useEffect(() => {
    localStorage.setItem('interval', interval)
  }, [interval])

  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  // indicator selection state
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(() => {
    const saved = localStorage.getItem('indicators')
    return saved ? JSON.parse(saved) : ['RSI', '볼린저 밴드']
  })

  useEffect(() => {
    localStorage.setItem('indicators', JSON.stringify(selectedIndicators))
  }, [selectedIndicators])

  // add exchange selection state
  const [exchange, setExchange] = useState<string>(() => {
    const saved = localStorage.getItem('exchange')
    return saved ?? 'BINANCE'
  })
  useEffect(() => {
    localStorage.setItem('exchange', exchange)
  }, [exchange])

  return (
    <div className="app-container">
      <div className="chart-wrapper">
        <Chart exchange={exchange} symbol={symbol} interval={interval} theme={theme} indicators={selectedIndicators} />
      </div>
    </div>
  )
}

export default App
