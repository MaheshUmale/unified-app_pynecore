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
  const [symbol, setSymbol] = useState('NSE:NIFTY');
  const [interval, setInterval] = useState('1');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTool, setActiveTool] = useState('cursor');
  const [rawOHLC, setRawOHLC] = useState<OHLC[]>([]);

  useEffect(() => {
    socketService.connect();
    socketService.subscribe(symbol, interval);

    const fetchData = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';
      try {
        const res = await fetch(`${backendUrl}/api/tv/intraday/${encodeURIComponent(symbol)}?interval=${interval}`);
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
        } else {
          // Fallback to mock data for demonstration if backend has no data
          const mockData: OHLC[] = [];
          let time = Math.floor(Date.now() / 1000) - 500 * 60;
          let price = 22000;
          for (let i = 0; i < 500; i++) {
            const open = price;
            const high = open + Math.random() * 20;
            const low = open - Math.random() * 20;
            const close = low + Math.random() * (high - low);
            mockData.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 1000) });
            time += 60;
            price = close;
          }
          setRawOHLC(mockData);
        }
      } catch (err) {
        console.error("Fetch failed", err);
      }
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

    // Simple dynamic brick size: ~0.1% of price
    const basePrice = rawOHLC[0].close;
    const renkoSize = basePrice > 1000 ? 50 : 5;
    const rangeSize = basePrice > 1000 ? 75 : 7.5;

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
      />

      <div className="flex-1 flex overflow-hidden">
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <main className="flex-1 bg-tv-bg relative">
          <LightweightChart
            data={chartData}
            volumeData={volumeData}
            type={chartType === 'line' ? 'line' : 'candle'}
            activeTool={activeTool}
          />
        </main>

        <Sidebar />
      </div>
    </div>
  );
};

export default App;
