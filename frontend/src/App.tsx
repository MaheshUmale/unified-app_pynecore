import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header/Header';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';
import ChartGrid from './components/Chart/ChartGrid';
import type { LayoutType } from './components/Chart/ChartGrid';
import ReplayBar from './components/Controls/ReplayBar';
import OptionChain from './components/Options/OptionChain';
import type { ChartType, OHLC } from './types/chart';
import { calculateRenko } from './utils/renko';
import { calculateRangeBars } from './utils/rangeBar';
import { socketService } from './services/socket';

interface PaneConfig {
  id: string;
  symbol: string;
  interval: string;
  chartType: ChartType;
  ticksPerCandle?: number;
  renkoSize?: number;
  rangeValue?: number;
}

const App: React.FC = () => {
  const [layout, setLayout] = useState<LayoutType>(() => {
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout') as LayoutType;
    if (layoutParam && ['1x1', '1x2', '2x1', '2x2'].includes(layoutParam)) return layoutParam;
    return (localStorage.getItem('tv-layout') as LayoutType) || '1x1';
  });

  const [paneConfigs, setPaneConfigs] = useState<PaneConfig[]>(() => {
    const saved = localStorage.getItem('tv-panes');
    let panes: PaneConfig[] = saved ? JSON.parse(saved) : [
      { id: 'pane-1', symbol: 'NSE:NIFTY', interval: '1', chartType: 'candle', ticksPerCandle: 1, renkoSize: 10, rangeValue: 15 },
      { id: 'pane-2', symbol: 'NSE:BANKNIFTY', interval: '5', chartType: 'candle', ticksPerCandle: 1, renkoSize: 10, rangeValue: 15 },
      { id: 'pane-3', symbol: 'NSE:FINNIFTY', interval: '15', chartType: 'candle', ticksPerCandle: 1, renkoSize: 10, rangeValue: 15 },
      { id: 'pane-4', symbol: 'NSE:INDIAVIX', interval: '60', chartType: 'candle', ticksPerCandle: 1, renkoSize: 10, rangeValue: 15 },
    ];
    return panes.map(p => ({
      ...p,
      ticksPerCandle: p.ticksPerCandle || 1,
      renkoSize: p.renkoSize || 10,
      rangeValue: p.rangeValue || 15
    }));
  });
  const [activePaneId, setActivePaneId] = useState('pane-1');
  const tickCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbolParam = params.get('symbol');
    const intervalParam = params.get('interval');

    if (symbolParam) {
      setPaneConfigs(prev => prev.map(p => p.id === 'pane-1' ? { ...p, symbol: symbolParam, interval: intervalParam || p.interval } : p));
    }
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('tv-theme') !== 'light');
  const [activeTool, setActiveTool] = useState('cursor');
  const [paneData, setPaneData] = useState<Record<string, OHLC[]>>({});
  const [footprintData, setFootprintData] = useState<Record<string, any>>({});
  const [clearDrawingsToggle, setClearDrawingsToggle] = useState(false);
  const [showSMA, setShowSMA] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [timezone, setTimezone] = useState(localStorage.getItem('tv-timezone') || 'Asia/Kolkata');

  useEffect(() => {
    localStorage.setItem('tv-layout', layout);
    localStorage.setItem('tv-panes', JSON.stringify(paneConfigs));
    localStorage.setItem('tv-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('tv-timezone', timezone);
  }, [layout, paneConfigs, isDarkMode, timezone]);

  const activePane = useMemo(() => paneConfigs.find(p => p.id === activePaneId) || paneConfigs[0], [paneConfigs, activePaneId]);

  const fetchFootprint = useCallback(async (paneId: string, symbol: string, interval: string) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';
    try {
      const res = await fetch(`${backendUrl}/api/tv/footprint/${encodeURIComponent(symbol)}?interval=${interval}`);
      if (res.ok) {
        const data = await res.json();
        setFootprintData(prev => ({ ...prev, [paneId]: data }));
      }
    } catch (e) {
      console.error("Footprint fetch error", e);
    }
  }, []);

  const fetchPaneData = useCallback(async (paneId: string, symbol: string, interval: string) => {
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

        setPaneData(prev => ({ ...prev, [paneId]: formatted }));
        return;
      }
    } catch (err) {
      console.warn(`Fallback for ${symbol}`, err);
    }

    // Mock Fallback
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
    setPaneData(prev => ({ ...prev, [paneId]: mockData }));
  }, []);

  useEffect(() => {
    if (isReplayActive) return; // Disable live feed during replay mode

    socketService.connect();

    // Subscribe only to visible panes
    const visibleCount = layout === '2x2' ? 4 : layout === '1x1' ? 1 : 2;
    const visiblePanes = paneConfigs.slice(0, visibleCount);

    visiblePanes.forEach(pane => {
      socketService.subscribe(pane.symbol, pane.interval);
      fetchPaneData(pane.id, pane.symbol, pane.interval);
      if (pane.chartType === 'footprint') {
        fetchFootprint(pane.id, pane.symbol, pane.interval);
      }
    });

    const handleTick = (data: any) => {
      setPaneData(prev => {
        const next = { ...prev };
        visiblePanes.forEach(pane => {
          const quote = data[pane.symbol.toUpperCase()];
          if (!quote) return;

          const price = Number(quote.last_price);
          const ts = Math.floor(quote.ts_ms / 1000);
          const intervalInSeconds = pane.interval === 'D' ? 86400 : parseInt(pane.interval) * 60;
          const candleTime = ts - (ts % intervalInSeconds);

          const currentOHLC = next[pane.id] || [];
          const lastCandle = currentOHLC[currentOHLC.length - 1];

          if (pane.chartType === 'tick') {
            const ticksPerCandle = pane.ticksPerCandle || 1;
            const currentCount = tickCountsRef.current[pane.id] || 0;

            if (!lastCandle || currentCount >= ticksPerCandle) {
              // Start new candle
              let tickTime = ts;
              if (lastCandle && tickTime <= lastCandle.time) {
                tickTime = lastCandle.time + 1;
              }
              next[pane.id] = [...currentOHLC, {
                time: tickTime, open: price, high: price, low: price, close: price, volume: Number(quote.ltq || 0)
              }].slice(-2000);
              tickCountsRef.current[pane.id] = 1;
            } else {
              // Update existing candle
              const updated = [...currentOHLC];
              const candle = { ...updated[updated.length - 1] };
              candle.close = price;
              candle.high = Math.max(candle.high, price);
              candle.low = Math.min(candle.low, price);
              candle.volume = (candle.volume || 0) + Number(quote.ltq || 0);
              updated[updated.length - 1] = candle;
              next[pane.id] = updated;
              tickCountsRef.current[pane.id] = currentCount + 1;
            }
          } else {
            if (!lastCandle || candleTime > lastCandle.time) {
              next[pane.id] = [...currentOHLC, {
                time: candleTime, open: price, high: price, low: price, close: price, volume: Number(quote.ltq || 0)
              }];
            } else if (candleTime === lastCandle.time) {
              const updated = [...currentOHLC];
              const candle = { ...updated[updated.length - 1] };
              candle.close = price;
              candle.high = Math.max(candle.high, price);
              candle.low = Math.min(candle.low, price);
              candle.volume = (candle.volume || 0) + Number(quote.ltq || 0);
              updated[updated.length - 1] = candle;
              next[pane.id] = updated;
            }

            if (pane.chartType === 'footprint') {
              setFootprintData(prevFp => {
                const paneFp = { ...(prevFp[pane.id] || {}) };
                const levels = [...(paneFp[candleTime] || [])];

                const side = lastCandle && price > lastCandle.close ? 'buy' : 'sell'; // Simplified Tick Rule
                const qty = Number(quote.ltq || 1);

                const idx = levels.findIndex(l => l.price === price);
                if (idx === -1) {
                  levels.push({ price, buy: side === 'buy' ? qty : 0, sell: side === 'sell' ? qty : 0 });
                } else {
                  const level = { ...levels[idx] };
                  if (side === 'buy') level.buy += qty;
                  else level.sell += qty;
                  levels[idx] = level;
                }

                return { ...prevFp, [pane.id]: { ...paneFp, [candleTime]: levels } };
              });
            }
          }
        });
        return next;
      });
    };

    socketService.onTick(handleTick);

    return () => {
       visiblePanes.forEach(pane => socketService.unsubscribe(pane.symbol, pane.interval));
       socketService.offTick(handleTick);
    };
  }, [layout, paneConfigs, fetchPaneData, isReplayActive]);

  const gridConfigs = useMemo(() => {
    return paneConfigs.map(pane => {
      const raw = paneData[pane.id] || [];

      let transformed = raw;
      if (pane.chartType === 'renko') {
        transformed = calculateRenko(raw, pane.renkoSize || 10);
      } else if (pane.chartType === 'range') {
        transformed = calculateRangeBars(raw, pane.rangeValue || 15);
      }

      return {
        id: pane.id,
        symbol: pane.symbol,
        interval: pane.interval,
        type: pane.chartType,
        footprint: footprintData[pane.id],
        data: transformed.map(d => ({
          time: d.time as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })),
        volumeData: transformed.map(d => ({
          time: d.time as any,
          value: d.volume || 0,
          color: d.close >= d.open ? '#26a69a' : '#ef5350',
        }))
      };
    });
  }, [paneConfigs, paneData]);

  const updateActivePane = (updates: Partial<PaneConfig>) => {
    setPaneConfigs(prev => prev.map(p => {
      if (p.id === activePaneId) {
        if (updates.chartType !== undefined && updates.chartType !== p.chartType) {
          tickCountsRef.current[p.id] = 0;
          setPaneData(pd => ({ ...pd, [p.id]: [] }));
        } else if (updates.interval !== undefined && updates.interval !== p.interval) {
          tickCountsRef.current[p.id] = 0;
        } else if (updates.ticksPerCandle !== undefined && updates.ticksPerCandle !== p.ticksPerCandle) {
          tickCountsRef.current[p.id] = 0;
        }
        return { ...p, ...updates };
      }
      return p;
    }));
  };

  // Replay State
  const [isCutMode, setIsCutMode] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);
  const [replayBuffer, setReplayBuffer] = useState<OHLC[]>([]);

  const handleReplayCut = useCallback(async (timestamp: number) => {
    if (!isCutMode) return;
    setIsCutMode(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';
    try {
      const res = await fetch(`${backendUrl}/api/tv/intraday/${encodeURIComponent(activePane.symbol)}?interval=${activePane.interval}`);
      const data = await res.json();
      if (data && data.candles) {
        const full = data.candles.map((c: any) => ({
          time: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5]
        })).sort((a: any, b: any) => a.time - b.time);

        const before = full.filter((c: any) => c.time <= timestamp);
        const after = full.filter((c: any) => c.time > timestamp);

        setPaneData(prev => ({ ...prev, [activePaneId]: before }));
        setReplayBuffer(after);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isCutMode, activePane, activePaneId]);

  useEffect(() => {
    if (!isReplayPlaying || replayBuffer.length === 0) return;

    const intervalId = setInterval(() => {
      setReplayBuffer(prev => {
        if (prev.length === 0) {
          setIsReplayPlaying(false);
          return [];
        }
        const [nextBar, ...rest] = prev;
        setPaneData(pd => ({
          ...pd,
          [activePaneId]: [...(pd[activePaneId] || []), nextBar]
        }));
        return rest;
      });
    }, replaySpeed);

    return () => clearInterval(intervalId);
  }, [isReplayPlaying, replayBuffer, replaySpeed, activePaneId]);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Header
        symbol={activePane.symbol}
        onSymbolChange={(s) => updateActivePane({ symbol: s })}
        interval={activePane.interval}
        onIntervalChange={(i) => updateActivePane({ interval: i })}
        chartType={activePane.chartType}
        onChartTypeChange={(t) => updateActivePane({ chartType: t })}
        ticksPerCandle={activePane.ticksPerCandle || 1}
        onTicksPerCandleChange={(t) => updateActivePane({ ticksPerCandle: t })}
        renkoSize={activePane.renkoSize || 10}
        onRenkoSizeChange={(s) => updateActivePane({ renkoSize: s })}
        rangeValue={activePane.rangeValue || 15}
        onRangeValueChange={(v) => updateActivePane({ rangeValue: v })}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        showSMA={showSMA}
        onToggleSMA={() => setShowSMA(!showSMA)}
        layout={layout}
        onLayoutChange={setLayout}
        isSyncEnabled={isSyncEnabled}
        onToggleSync={() => setIsSyncEnabled(!isSyncEnabled)}
        isReplayActive={isReplayActive}
        onToggleReplay={() => setIsReplayActive(!isReplayActive)}
        showOptions={showOptions}
        onToggleOptions={() => setShowOptions(!showOptions)}
        timezone={timezone}
        onTimezoneChange={setTimezone}
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

        <main className="flex-1 bg-tv-bg relative overflow-hidden flex flex-col">
          {isReplayActive && (
            <ReplayBar
              onCut={() => setIsCutMode(true)}
              onPlay={() => setIsReplayPlaying(true)}
              onPause={() => setIsReplayPlaying(false)}
              onStop={() => {
                setIsReplayActive(false);
                setIsReplayPlaying(false);
                fetchPaneData(activePane.id, activePane.symbol, activePane.interval);
              }}
              onStep={() => {
                 if (replayBuffer.length > 0) {
                   const [nextBar, ...rest] = replayBuffer;
                   setPaneData(pd => ({ ...pd, [activePaneId]: [...(pd[activePaneId] || []), nextBar] }));
                   setReplayBuffer(rest);
                 }
              }}
              onSpeedChange={setReplaySpeed}
              speed={replaySpeed}
              isPlaying={isReplayPlaying}
              isCutMode={isCutMode}
              onClose={() => setIsReplayActive(false)}
            />
          )}

          <div className="flex-1 relative">
            <ChartGrid
               layout={layout}
               configs={gridConfigs as any}
               isDarkMode={isDarkMode}
               activeTool={activeTool}
               clearDrawings={clearDrawingsToggle}
               isSyncEnabled={isSyncEnabled}
               showSMA={showSMA}
               timezone={timezone}
               onCrosshairMove={useCallback((id: string) => {
                 setActivePaneId(id);
               }, [])}
               onClick={useCallback((id: string, param: any) => {
                 setActivePaneId(id);
                 if (isCutMode && param.time) {
                   handleReplayCut(param.time);
                 }
               }, [isCutMode, handleReplayCut])}
            />
          </div>

          {showOptions && (
            <OptionChain
              symbol={activePane.symbol}
              isDarkMode={isDarkMode}
              onClose={() => setShowOptions(false)}
            />
          )}
        </main>

        <Sidebar onSymbolSelect={(s) => updateActivePane({ symbol: s })} />
      </div>
    </div>
  );
};

export default App;
