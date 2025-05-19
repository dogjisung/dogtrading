import React, { useRef, useEffect, useState } from 'react'
import { createChart, createSeriesMarkers, CandlestickSeries, HistogramSeries, LineSeries, CrosshairMode, LineStyle, ColorType, Time, TickMarkType, IChartApi, SeriesMarker, PriceScaleMode } from 'lightweight-charts'
import './Chart.css'

interface ChartProps { interval: string; symbol: string; theme: 'light' | 'dark'; indicators: string[] }

const Chart: React.FC<ChartProps> = ({ interval, symbol, theme, indicators }) => {
  const priceRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  // refs for Bollinger Bands toggling
  const bbUpperSeriesRef = useRef<any>(null)
  const bbLowerSeriesRef = useRef<any>(null)
  // chart & series refs
  const priceChartRef = useRef<IChartApi|null>(null)
  const volumeChartRef = useRef<IChartApi|null>(null)
  const rsiChartRef = useRef<IChartApi|null>(null)
  const macdChartRef = useRef<IChartApi|null>(null)
  const priceSeriesRef = useRef<any>(null)
  const markersApiRef = useRef<any>(null)
  const vwapSeriesRef = useRef<any>(null)
  const markersRef = useRef<SeriesMarker<Time>[]>([])
  const drawPointsRef = useRef<{ time: Time; value: number }[]>([])
  // ref for countdown price line on axis
  const countdownLineRef = useRef<any>(null)
  // ref for last price
  const lastPriceRef = useRef<number>(0)
  // countdown timer state for candle completion
  const [countdown, setCountdown] = useState('00:00')
  // context menu state
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  // scale options state
  const [autoScale, setAutoScale] = useState(true)
  const [priceLock, setPriceLock] = useState(false)
  const [scalePriceChartOnly, setScalePriceChartOnly] = useState(false)
  const [invertScale, setInvertScale] = useState(false)
  const [scaleType, setScaleType] = useState<'regular'|'percent'|'index100'|'log'>('regular')
  // toggle options state
  const [showSymbolNameLabel, setShowSymbolNameLabel] = useState(true)
  const [showSymbolPriceLabel, setShowSymbolPriceLabel] = useState(true)
  const [showSymbolPrevCloseLabel, setShowSymbolPrevCloseLabel] = useState(true)
  const [showCountdown, setShowCountdown] = useState(true)

  useEffect(() => {
    const getSecondsLeft = () => {
      const now = Math.floor(Date.now() / 1000)
      let period = 60
      switch (interval) {
        case '1m': period = 60; break
        case '5m': period = 5 * 60; break
        case '15m': period = 15 * 60; break
        case '1h': period = 60 * 60; break
        case '4h': period = 4 * 60 * 60; break
        case '1d': period = 24 * 60 * 60; break
        default: period = 60
      }
      const next = Math.ceil(now / period) * period
      return next - now
    }
    const updateTimer = () => {
      const s = getSecondsLeft()
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      const formatted = (h > 0 ? `${String(h).padStart(2,'0')}:` : '') +
        `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      setCountdown(formatted)
      // update countdown axis label
      if (countdownLineRef.current) {
        countdownLineRef.current.applyOptions({ price: lastPriceRef.current, title: formatted } as any)
      }
    }
    updateTimer()
    const id = setInterval(updateTimer, 1000)
    return () => clearInterval(id)
  }, [interval])

  useEffect(() => {
    if (!priceRef.current || !volumeRef.current || !rsiRef.current || !macdRef.current) return
    // VWAP accumulators
    let cumPV = 0, cumVol = 0, lastClose = 0, lastVwap = 0

    // Price + Volume + Bollinger Bands Chart
    const priceChart = createChart(priceRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: theme === 'light' ? '#ffffff' : '#131722' },
        textColor: theme === 'light' ? '#333333' : '#D1D4DC',
      },
      grid: { vertLines: { color: theme === 'light' ? '#e0e0e0' : '#2a2e39' }, horzLines: { color: theme === 'light' ? '#e0e0e0' : '#2a2e39' } },
    })
    priceChartRef.current = priceChart
    priceChart.applyOptions({
      rightPriceScale: { borderColor: '#cccccc', visible: true },
      timeScale: {
        borderColor: '#cccccc', timeVisible: true, secondsVisible: false,
        tickMarkFormatter: (time: Time, tickType: TickMarkType, locale: string) => {
          const date = new Date((time as number) * 1000)
          return `${date.getMonth() + 1}/${date.getDate()}`
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#757575', style: LineStyle.Solid, width: 1, visible: true, labelVisible: true, labelBackgroundColor: '#4c525e' },
        horzLine: { color: '#757575', style: LineStyle.Dotted, width: 1, visible: true, labelVisible: false, labelBackgroundColor: '#4c525e' },
      },
    })
    const priceSeries = priceChart.addSeries(CandlestickSeries)
    priceSeriesRef.current = priceSeries
    // create countdown axis label
    countdownLineRef.current = priceSeries.createPriceLine({
      price: lastPriceRef.current,
      color: 'transparent',
      lineWidth: 0,
      axisLabelVisible: true,
      axisLabelBackgroundColor: '#0097A7',
      axisLabelTextColor: '#FFFFFF',
      title: countdown,
    } as any)
    // initialize markers plugin
    markersApiRef.current = createSeriesMarkers(priceSeries, [], { zOrder: 'top' })
    // VWAP series
    const vwapSeries = priceChart.addSeries(LineSeries, { color: '#ff00ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    vwapSeriesRef.current = vwapSeries
    const priceVolumeSeries = priceChart.addSeries(HistogramSeries, { color: '#26a69a', base: 0, priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false })
    const bbUpperSeries = priceChart.addSeries(LineSeries, { color: '#00ff00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    bbUpperSeriesRef.current = bbUpperSeries
    const bbLowerSeries = priceChart.addSeries(LineSeries, { color: '#00ff00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    bbLowerSeriesRef.current = bbLowerSeries

    // Volume Chart
    const volumeChart = createChart(volumeRef.current, {
      autoSize: true,
      height: 120,
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333333' },
      grid: { vertLines: { color: '#e0e0e0' }, horzLines: { color: '#e0e0e0' } },
    })
    volumeChartRef.current = volumeChart
    const volumeSeries = volumeChart.addSeries(HistogramSeries, { color: '#26a69a', base: 0, priceLineVisible: false, lastValueVisible: false })

    // RSI Chart
    const rsiChart = createChart(rsiRef.current, { autoSize: true, height: 100, layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333333' } })
    rsiChartRef.current = rsiChart
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#ffa500', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })

    // MACD Chart
    const macdChart = createChart(macdRef.current, { autoSize: true, height: 100, layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333333' } })
    macdChartRef.current = macdChart
    const macdLine = macdChart.addSeries(LineSeries, { color: '#0000ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
    const signalLine = macdChart.addSeries(LineSeries, { color: '#ff0000', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
    const macdHist = macdChart.addSeries(HistogramSeries, { color: '#555555', base: 0 })

    // Fetch data and compute indicators
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`)
      .then(res => res.json())
      .then((rawData: any[]) => {
        // Historical VWAP data & markers
        const vwapData: { time: Time; value: number }[] = []
        rawData.forEach((d: any) => {
          const time = (d[0] / 1000) as Time
          const typical = (parseFloat(d[2]) + parseFloat(d[3]) + parseFloat(d[4])) / 3
          const vol = parseFloat(d[5])
          cumPV += typical * vol
          cumVol += vol
          vwapData.push({ time, value: cumPV / cumVol })
        })
        vwapSeriesRef.current?.setData(vwapData)
        const markers: SeriesMarker<Time>[] = []
        for (let i = 1; i < rawData.length; i++) {
          const prevC = parseFloat(rawData[i - 1][4]); const prevV = vwapData[i - 1].value
          const currC = parseFloat(rawData[i][4]); const currV = vwapData[i].value
          if (prevC < prevV && currC > currV) markers.push({ time: vwapData[i].time, position: 'belowBar', color: 'green', shape: 'arrowUp' })
          else if (prevC > prevV && currC < currV) markers.push({ time: vwapData[i].time, position: 'aboveBar', color: 'red', shape: 'arrowDown' })
        }
        markersRef.current = markers
        markersApiRef.current?.setMarkers(markers)
        // price & volume
        const candleData = rawData.map((d: any) => ({ time: (d[0] / 1000) as Time, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) }))
        priceSeries.setData(candleData)
        const volumeData = rawData.map((d: any) => ({ time: (d[0] / 1000) as Time, value: parseFloat(d[5]), color: parseFloat(d[4]) > parseFloat(d[1]) ? '#26a69a' : '#ef5350' }))
        volumeSeries.setData(volumeData)
        // Bollinger Bands (20,2)
        const closes = rawData.map((d: any) => parseFloat(d[4]))
        const bbPeriod = 20, bbMult = 2
        const bbUpper: { time: Time; value: number }[] = []
        const bbLower: { time: Time; value: number }[] = []
        for (let i = bbPeriod - 1; i < closes.length; i++) {
          const window = closes.slice(i - bbPeriod + 1, i + 1)
          const avg = window.reduce((a, b) => a + b, 0) / bbPeriod
          const variance = window.reduce((sum, v) => sum + (v - avg) ** 2, 0) / bbPeriod
          const sd = Math.sqrt(variance)
          const t = (rawData[i][0] / 1000) as Time
          bbUpper.push({ time: t, value: avg + bbMult * sd })
          bbLower.push({ time: t, value: avg - bbMult * sd })
        }
        bbUpperSeries.setData(bbUpper)
        bbLowerSeries.setData(bbLower)
        // RSI (14)
        const period = 14
        let gains = 0, losses = 0
        for (let i = 1; i <= period; i++) {
          const change = closes[i] - closes[i - 1]
          if (change >= 0) gains += change; else losses -= change
        }
        let avgGain = gains / period, avgLoss = losses / period
        const rsiData: { time: Time; value: number }[] = []
        for (let i = period + 1; i < closes.length; i++) {
          const change = closes[i] - closes[i - 1]
          avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
          avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
          const rs = avgGain / avgLoss
          const rsi = 100 - 100 / (1 + rs)
          rsiData.push({ time: (rawData[i][0] / 1000) as Time, value: rsi })
        }
        rsiSeries.setData(rsiData)
        // MACD (12,26,9)
        const ema = (arr: number[], len: number) => {
          const k = 2 / (len + 1)
          const result: number[] = [arr.slice(0, len).reduce((a, b) => a + b, 0) / len]
          for (let i = len; i < arr.length; i++) result.push(arr[i] * k + result[result.length - 1] * (1 - k))
          return result
        }
        const fast = ema(closes, 12)
        const slow = ema(closes, 26)
        const macdVals = fast.slice(26 - 12).map((v, i) => v - slow[i])
        const signalLineArr = ema(macdVals, 9)
        const macdHistArr = macdVals.slice(9).map((v, i) => v - signalLineArr[i])
        const macdTime: Time[] = rawData.slice(26).map((d: any) => (d[0] / 1000) as Time)
        macdLine.setData(macdTime.slice(9).map((t, i) => ({ time: t, value: macdVals[i + (26 - 12) - 9] })))
        signalLine.setData(macdTime.slice(9).map((t, i) => ({ time: t, value: signalLineArr[i] })))
        macdHist.setData(macdTime.slice(9).map((t, i) => ({ time: t, value: macdHistArr[i] })))
        // track last price and position overlay
        lastPriceRef.current = candleData[candleData.length - 1].close
        if (countdownLineRef.current) {
          countdownLineRef.current.applyOptions({ price: lastPriceRef.current, title: countdown } as any)
        }
      })

    // WebSocket for real-time updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`)
    ws.onmessage = event => {
      const msg: any = JSON.parse(event.data)
      const k = msg.k
      const time = (k.t / 1000) as Time
      const open = parseFloat(k.o), high = parseFloat(k.h), low = parseFloat(k.l), close = parseFloat(k.c), vol = parseFloat(k.v)
      // update VWAP
      const typical = (high + low + close) / 3
      cumPV += typical * vol; cumVol += vol
      const newVwap = cumPV / cumVol
      vwapSeriesRef.current?.update({ time, value: newVwap })
      // detect live cross
      if (lastClose < lastVwap && close > newVwap) markersRef.current.push({ time, position: 'belowBar', color: 'green', shape: 'arrowUp' })
      else if (lastClose > lastVwap && close < newVwap) markersRef.current.push({ time, position: 'aboveBar', color: 'red', shape: 'arrowDown' })
      lastClose = close; lastVwap = newVwap
      markersApiRef.current?.setMarkers(markersRef.current)
      // update price & volume
      priceSeriesRef.current?.update({ time, open, high, low, close })
      volumeSeries.update({ time, value: vol, color: close > open ? '#26a69a' : '#ef5350' })
      // update last price and countdown label
      lastPriceRef.current = close
      if (countdownLineRef.current) {
        countdownLineRef.current.applyOptions({ price: lastPriceRef.current, title: countdown } as any)
      }
    }

    return () => {
      ws.close()
      priceChart.remove()
      volumeChart.remove()
      rsiChart.remove()
      macdChart.remove()
    }
  }, [interval, theme, symbol])

  // theme toggle effect
  useEffect(() => {
    if (priceChartRef.current) {
      const bg = theme === 'light' ? '#ffffff' : '#131722'
      const text = theme === 'light' ? '#333333' : '#D1D4DC'
      const gridColor = theme === 'light' ? '#e0e0e0' : '#2a2e39'
      priceChartRef.current.applyOptions({
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        rightPriceScale: { borderColor: gridColor, visible: true },
        timeScale: { borderColor: gridColor, timeVisible: true, secondsVisible: false },
      })
      const commonOpts = {
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        timeScale: { borderColor: gridColor }
      }
      volumeChartRef.current?.applyOptions(commonOpts)
      rsiChartRef.current?.applyOptions(commonOpts)
      macdChartRef.current?.applyOptions(commonOpts)
    }
  }, [theme])

  // indicator toggle effect (show/hide RSI, Bollinger Bands, Volume, and MACD)
  useEffect(() => {
    // show or hide RSI chart pane
    if (rsiRef.current) {
      rsiRef.current.style.display = indicators.includes('RSI') ? 'block' : 'none'
    }
    // show or hide Bollinger Bands series on price chart
    const showBB = indicators.includes('볼린저 밴드')
    if (bbUpperSeriesRef.current) {
      bbUpperSeriesRef.current.applyOptions({ visible: showBB })
      bbLowerSeriesRef.current.applyOptions({ visible: showBB })
    }
    // show or hide Volume chart pane
    if (volumeRef.current) {
      volumeRef.current.style.display = indicators.includes('거래량') ? 'block' : 'none'
    }
    // show or hide MACD chart pane
    if (macdRef.current) {
      macdRef.current.style.display = indicators.includes('MACD') ? 'block' : 'none'
    }
    // show or hide 이동 평균선 series on price chart
    const showMA = indicators.includes('이동 평균선')
    if (vwapSeriesRef.current) {
      vwapSeriesRef.current.applyOptions({ visible: showMA })
    }
    // adjust price container height to fill remaining space when no subcharts are visible
    if (priceRef.current) {
      const noSubcharts = !indicators.includes('거래량') && !indicators.includes('RSI') && !indicators.includes('MACD')
      priceRef.current.style.height = noSubcharts ? '100%' : '60vh'
    }
  }, [indicators])

  // context menu handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!priceRef.current) return
    const rect = priceRef.current.getBoundingClientRect()
    setMenuPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setMenuVisible(true)
  }
  useEffect(() => {
    const handleClick = () => setMenuVisible(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // apply scale options when changed
  useEffect(() => {
    if (priceChartRef.current) {
      let mode = PriceScaleMode.Normal
      if (scaleType === 'percent') mode = PriceScaleMode.Percentage
      else if (scaleType === 'index100') mode = PriceScaleMode.IndexedTo100
      else if (scaleType === 'log') mode = PriceScaleMode.Logarithmic
      priceChartRef.current.applyOptions({
        rightPriceScale: { autoScale, invertScale, mode }
      })
    }
  }, [autoScale, invertScale, scaleType])

  return (
    <div className="chart-container">
      <div ref={priceRef} className="price-container" onContextMenu={handleContextMenu}>
        {menuVisible && (
          <div className="axis-context-menu" style={{ top: menuPosition.y, left: menuPosition.x }}>
            <ul>
              <li onClick={() => setAutoScale(prev => !prev)}>{autoScale ? '✓ ' : ''}오토</li>
              <li onClick={() => setPriceLock(prev => !prev)}>{priceLock ? '✓ ' : ''}바 레이소에 프라이스 잠금</li>
              <li onClick={() => setScalePriceChartOnly(prev => !prev)}>{scalePriceChartOnly ? '✓ ' : ''}가격차트만 스케일</li>
              <li onClick={() => setInvertScale(prev => !prev)}>{invertScale ? '✓ ' : ''}인버트 스케일</li>
              <li className="separator" />
              <li onClick={() => setScaleType('regular')}>{scaleType === 'regular' ? '✓ ' : ''}레귤러</li>
              <li onClick={() => setScaleType('percent')}>{scaleType === 'percent' ? '✓ ' : ''}퍼센트</li>
              <li onClick={() => setScaleType('index100')}>{scaleType === 'index100' ? '✓ ' : ''}처음을 100으로 잡기</li>
              <li onClick={() => setScaleType('log')}>{scaleType === 'log' ? '✓ ' : ''}로그</li>
              <li className="separator" />
              <li onClick={() => setShowSymbolNameLabel(prev => !prev)}>{showSymbolNameLabel ? '✓ ' : ''}심볼네임 라벨</li>
              <li onClick={() => setShowSymbolPriceLabel(prev => !prev)}>{showSymbolPriceLabel ? '✓ ' : ''}심볼 현재가 라벨</li>
              <li onClick={() => setShowSymbolPrevCloseLabel(prev => !prev)}>{showSymbolPrevCloseLabel ? '✓ ' : ''}심볼 전일종가 라벨</li>
              <li onClick={() => setShowCountdown(prev => !prev)}>{showCountdown ? '✓ ' : ''}볼린저 카운트다운</li>
            </ul>
          </div>
        )}
      </div>
      <div ref={volumeRef} className="volume-container" />
      <div ref={rsiRef} className="indicator-container" />
      <div ref={macdRef} className="indicator-container" />
    </div>
  )
}

export default Chart 