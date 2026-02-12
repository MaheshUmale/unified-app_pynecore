import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header/Header';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';
import LightweightChart from './components/Chart/LightweightChart';
import type { ChartType, OHLC } from './types/chart';
import { calculateRenko } from './utils/renko';
import { calculateRangeBars } from './utils/rangeBar';
import { socketService } from './services/socket';
import type { CandlestickData, HistogramData } from 'lightweight-charts';

const App: React.FC = () => {
  const [symbol, setSymbol] = useState(localStorage.getItem('tv-symbol') || 'NSE:NIFTY');
  const [interval, setInterval] = useState(localStorage.getItem('tv-interval') || '1');
  const [chartType, setChartType] = useState<ChartType>((localStorage.getItem('tv-chart-type') as ChartType) || 'candle');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('tv-theme') !== 'light');
  const [activeTool, setActiveTool] = useState('cursor');
  const [rawOHLC, setRawOHLC] = useState<OHLC[]>([]);
  const [clearDrawingsToggle, setClearDrawingsToggle] = useState(false);
  const [showSMA, setShowSMA] = useState(false);

  useEffect(() => {
    localStorage.setItem('tv-symbol', symbol);
    localStorage.setItem('tv-interval', interval);
    localStorage.setItem('tv-chart-type', chartType);
    localStorage.setItem('tv-theme', isDarkMode ? 'dark' : 'light');
  }, [symbol, interval, chartType, isDarkMode]);

  useEffect(() => {
    socketService.connect();
    socketService.subscribe(symbol, interval);

    const fetchData = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';
      try {
        const res = await fetch(`${backendUrl}/api/tv/intraday/${encodeURIComponent(symbol)}?interval=${interval}`);
        if (!res.ok) throw new Error('Backend unvailable');
        const data = await res.json();
        if (data && data.candles && data.candles.length > 0) {
          const formatted = data.candles.map((c: any) => ({
            time: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
          })).sort((a: any, b: any) => a.time - b.time);
          setRawOHLC(formatted);
          return;
        }
      } catch (err) {
        console.warn("Using mock data fallback", err);
      }

      // Mock data fallback
      const mockData: OHLC[] = [];
      let time = Math.floor(Date.now() / 1000) - 500 * 60;
      let price = symbol.includes('BTC') ? 43000 : 22000;
      for (let i = 0; i < 500; i++) {
        const volatility = price * 0.001;
        const open = price;
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = low + Math.random() * (high - low);
        mockData.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 1000) });
        time += 60;
        price = close;
      }
      setRawOHLC(mockData);
    };

    fetchData();

    socketService.onTick((data) => {
      const quote = data[symbol.toUpperCase()];
      if (!quote) return;

      const price = Number(quote.last_price);
      if (isNaN(price) || price <= 0) return;

      const ts = Math.floor(quote.ts_ms / 1000);
      const intervalInSeconds = interval === 'D' ? 86400 : parseInt(interval) * 60;
      const candleTime = ts - (ts % intervalInSeconds);

      setRawOHLC(prev => {
        const lastCandle = prev[prev.length - 1];
        if (!lastCandle || candleTime > lastCandle.time) {
          return [...prev, {
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: Number(quote.ltq || 0)
          }];
        } else if (candleTime === lastCandle.time) {
          const updated = [...prev];
          const candle = { ...updated[updated.length - 1] };
          candle.close = price;
          candle.high = Math.max(candle.high, price);
          candle.low = Math.min(candle.low, price);
          candle.volume = (candle.volume || 0) + Number(quote.ltq || 0);
          updated[updated.length - 1] = candle;
          return updated;
        }
        return prev;
      });
    });

    return () => {
      socketService.unsubscribe(symbol, interval);
    };
  }, [symbol, interval]);

  const transformedData = useMemo(() => {
    if (rawOHLC.length === 0) return [];

    const basePrice = rawOHLC[0].close;
    const renkoSize = basePrice > 1000 ? 10 : 2;
    const rangeSize = basePrice > 1000 ? 15 : 3;

    if (chartType === 'renko') {
      return calculateRenko(rawOHLC, renkoSize);
    } else if (chartType === 'range') {
      return calculateRangeBars(rawOHLC, rangeSize);
    }
    return rawOHLC;
  }, [rawOHLC, chartType]);

  const chartData: CandlestickData[] = transformedData.map(d => ({
    time: d.time as any,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }));

  const volumeData: HistogramData[] = transformedData.map(d => ({
    time: d.time as any,
    value: d.volume || 0,
    color: d.close >= d.open ? '#26a69a' : '#ef5350',
  }));

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Header
        symbol={symbol}
        onSymbolChange={setSymbol}
        interval={interval}
        onIntervalChange={setInterval}
        chartType={chartType}
        onChartTypeChange={setChartType}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        showSMA={showSMA}
        onToggleSMA={() => setShowSMA(!showSMA)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onClearAll={() => {
            setClearDrawingsToggle(true);
            setTimeout(() => setClearDrawingsToggle(false), 100);
          }}
        />

        <main className="flex-1 bg-tv-bg relative">
          <LightweightChart
            data={chartData}
            volumeData={volumeData}
            type={chartType}
            isDarkMode={isDarkMode}
            activeTool={activeTool}
            clearDrawings={clearDrawingsToggle}
            showSMA={showSMA}
          />
        </main>

        <Sidebar onSymbolSelect={setSymbol} />
      </div>
    </div>
  );
};

export default App;
