import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, FlaskConical } from 'lucide-react';
import { createChart, ColorType } from 'lightweight-charts';

interface OptionChainProps {
  symbol: string;
  onClose: () => void;
  isDarkMode: boolean;
}

interface OptionLeg {
  ltp: number;
  change: number;
  iv: number;
  oi: number;
  oi_change: number;
  volume: number;
  delta: number;
  theta: number;
  vega: number;
  gamma: number;
}

interface OptionData {
  strike: number;
  call: OptionLeg;
  put: OptionLeg;
}

const OptionChain: React.FC<OptionChainProps> = ({ symbol, onClose, isDarkMode }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGreeks, setShowGreeks] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'analysis'>('chain');

  const pcrChartRef = useRef<HTMLDivElement>(null);
  const oiChartRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';
    try {
      const res = await fetch(`${backendUrl}/api/options-chain?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  // MARKET INTERPRETATION RULES
  const interpretations = useMemo(() => {
    if (!data || !data.history || data.history.length < 2) return [];
    const current = data.history[data.history.length - 1];
    const prev = data.history[data.history.length - 2];

    const priceRising = current.spot > prev.spot;
    const pcr = current.pcr;
    const pcrPrev = prev.pcr;

    const signals = [];

    // 1. PCR Absolute Levels
    if (pcr < 0.7) {
      signals.push({ type: 'caution', title: 'Overconfident Bulls', desc: 'PCR < 0.7 - Potential Reversal Caution', icon: AlertTriangle, color: 'text-yellow-500' });
    } else if (pcr > 1.3) {
      signals.push({ type: 'buy', title: 'Contrarian Buy', desc: 'PCR > 1.3 - Extreme Fear (Bottom Signal)', icon: ShieldCheck, color: 'text-green-500' });
    }

    // 2. OI & Price
    const callOIIncreased = data.total_call_oi > (prev.total_call_oi || 0);
    const putOIIncreased = data.total_put_oi > (prev.total_put_oi || 0);

    if (priceRising && callOIIncreased) {
      signals.push({ type: 'resistance', title: 'Resistance Building', desc: 'Price ↑ + Call OI ↑ - Strong Resistance ahead', icon: TrendingUp, color: 'text-red-400' });
    } else if (!priceRising && putOIIncreased) {
      signals.push({ type: 'support', title: 'Support Building', desc: 'Price ↓ + Put OI ↑ - Strong Support building', icon: TrendingDown, color: 'text-green-400' });
    }

    // 3. PCR & Price Divergence
    if (priceRising && pcr < pcrPrev) {
      signals.push({ type: 'top', title: 'Potential Top', desc: 'Price ↑ + PCR ↓ - Traders aggressively adding calls', icon: AlertTriangle, color: 'text-orange-500' });
    } else if (!priceRising && pcr > pcrPrev) {
      signals.push({ type: 'bottom', title: 'Potential Bottom', desc: 'Price ↓ + PCR ↑ - Panic selling / Heavy put buying', icon: ShieldCheck, color: 'text-blue-400' });
    }

    return signals;
  }, [data]);

  // Charts implementation
  useEffect(() => {
    if (activeTab !== 'analysis' || !pcrChartRef.current || !data?.history) return;
    const chart = createChart(pcrChartRef.current, {
      width: pcrChartRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#d1d4dc' : '#333'
      },
      grid: {
        vertLines: { color: isDarkMode ? '#2b2b43' : '#eee' },
        horzLines: { color: isDarkMode ? '#2b2b43' : '#eee' }
      },
      rightPriceScale: { borderColor: isDarkMode ? '#2b2b43' : '#eee' },
      timeScale: { borderColor: isDarkMode ? '#2b2b43' : '#eee', timeVisible: true }
    });
    const spotSeries = chart.addAreaSeries({ lineColor: '#2196f3', topColor: 'rgba(33, 150, 243, 0.4)', bottomColor: 'rgba(33, 150, 243, 0.0)', lineWidth: 2, priceFormat: { type: 'price', precision: 1 }, title: 'Spot' });
    const pcrSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 2, priceFormat: { type: 'price', precision: 3 }, priceScaleId: 'left', title: 'PCR' });
    chart.priceScale('left').applyOptions({ visible: true, borderColor: '#2b2b43' });
    spotSeries.setData(data.history.map((h: any) => ({ time: h.time as any, value: h.spot })));
    pcrSeries.setData(data.history.map((h: any) => ({ time: h.time as any, value: h.pcr })));
    chart.timeScale().fitContent();
    const hr = () => pcrChartRef.current && chart.applyOptions({ width: pcrChartRef.current.clientWidth });
    window.addEventListener('resize', hr);
    return () => { window.removeEventListener('resize', hr); chart.remove(); };
  }, [activeTab, data]);

  useEffect(() => {
    if (activeTab !== 'analysis' || !oiChartRef.current || !data?.history) return;
    const chart = createChart(oiChartRef.current, {
      width: oiChartRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#d1d4dc' : '#333'
      },
      grid: {
        vertLines: { color: isDarkMode ? '#2b2b43' : '#eee' },
        horzLines: { color: isDarkMode ? '#2b2b43' : '#eee' }
      },
      timeScale: { borderColor: isDarkMode ? '#2b2b43' : '#eee', timeVisible: true }
    });
    const oiSeries = chart.addAreaSeries({ lineColor: '#26a69a', topColor: 'rgba(38, 166, 154, 0.4)', bottomColor: 'rgba(38, 166, 154, 0.0)', lineWidth: 2, title: 'Total OI' });
    oiSeries.setData(data.history.map((h: any) => ({ time: h.time as any, value: h.total_oi })));
    chart.timeScale().fitContent();
    const hr = () => oiChartRef.current && chart.applyOptions({ width: oiChartRef.current.clientWidth });
    window.addEventListener('resize', hr);
    return () => { window.removeEventListener('resize', hr); chart.remove(); };
  }, [activeTab, data]);

  const topOI = useMemo(() => {
    if (!data?.chain) return { calls: [], puts: [] };
    const sortedCalls = [...data.chain].sort((a, b) => b.call.oi - a.call.oi).slice(0, 3).map(r => r.strike);
    const sortedPuts = [...data.chain].sort((a, b) => b.put.oi - a.put.oi).slice(0, 3).map(r => r.strike);
    return { calls: sortedCalls, puts: sortedPuts };
  }, [data]);

  if (!data && loading) return (
    <div className="absolute inset-0 z-[100] bg-[#131722]/80 flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1/2 z-[100] bg-[#1e222d] border-t border-tv-border flex flex-col text-tv-text font-sans shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2e39] border-b border-tv-border">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            Option Chain: <span className="text-blue-400">{symbol}</span>
          </h2>
          <div className="flex items-center gap-4 border-l border-gray-600 pl-4">
            <div className="text-xs">
              <span className="text-gray-400 mr-1">Spot:</span>
              <span className="text-green-400 font-bold">{data?.spot?.toFixed(2)}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400 mr-1">PCR:</span>
              <span className={`font-bold ${data?.pcr > 1 ? 'text-green-400' : 'text-red-400'}`}>{data?.pcr}</span>
              <span className={`ml-1 text-[10px] ${data?.pcr_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ({data?.pcr_change >= 0 ? '+' : ''}{data?.pcr_change})
              </span>
            </div>
          </div>

          <div className="flex bg-black/30 rounded p-1 gap-1">
             <button onClick={() => setActiveTab('chain')} className={`px-3 py-1 text-[10px] rounded transition-colors ${activeTab === 'chain' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>Chain Table</button>
             <button onClick={() => setActiveTab('analysis')} className={`px-3 py-1 text-[10px] rounded transition-colors ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>Analysis & Signals</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowGreeks(!showGreeks)} className={`px-3 py-1 text-xs rounded border transition-colors ${showGreeks ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 hover:bg-tv-grid'}`}>{showGreeks ? 'Hide Greeks' : 'Show Greeks'}</button>
          <button onClick={fetchData} className="p-1 hover:bg-tv-grid rounded"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chain' ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-[#1e222d] shadow-sm z-10 text-gray-500 text-[10px]">
                <tr className="border-b border-tv-border uppercase">
                  <th colSpan={showGreeks ? 7 : 4} className="py-2 border-r border-tv-border bg-blue-900/10">CALLS</th>
                  <th className="py-2 bg-gray-800/50">STRIKE</th>
                  <th colSpan={showGreeks ? 7 : 4} className="py-2 border-l border-tv-border bg-red-900/10">PUTS</th>
                </tr>
                <tr className="border-b border-tv-border">
                  {showGreeks && <th className="py-1">Delta</th>}
                  {showGreeks && <th className="py-1">Theta</th>}
                  <th className="py-1">OI</th>
                  <th className="py-1">OI Chg%</th>
                  <th className="py-1">IV</th>
                  <th className="py-1">LTP</th>
                  <th className="py-1 border-r border-tv-border">Chg%</th>
                  <th className="py-1 bg-gray-800/30">Price</th>
                  <th className="py-1 border-l border-tv-border">LTP</th>
                  <th className="py-1">Chg%</th>
                  <th className="py-1">IV</th>
                  <th className="py-1">OI Chg%</th>
                  <th className="py-1">OI</th>
                  {showGreeks && <th className="py-1">Theta</th>}
                  {showGreeks && <th className="py-1">Delta</th>}
                </tr>
              </thead>
              <tbody>
                {data?.chain?.map((row: OptionData, i: number) => {
                  const isATM = row.strike === Math.round(data.spot/50)*50;
                  const isCallTopOI = topOI.calls.includes(row.strike);
                  const isPutTopOI = topOI.puts.includes(row.strike);
                  return (
                    <tr key={i} className={`border-b border-tv-border/50 hover:bg-tv-grid/50 transition-colors ${isATM ? 'bg-yellow-500/5' : ''}`}>
                      {showGreeks && <td className="py-2 text-center text-blue-400">{row.call.delta}</td>}
                      {showGreeks && <td className="py-2 text-center text-red-400">{row.call.theta}</td>}
                      <td className={`py-2 text-center ${isCallTopOI ? 'text-blue-400 font-bold underline' : 'text-gray-300'}`}>{row.call.oi.toLocaleString()}</td>
                      <td className={`py-2 text-center ${row.call.oi_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.call.oi_change}%</td>
                      <td className="py-2 text-center text-gray-300">{row.call.iv}%</td>
                      <td className="py-2 text-center font-bold text-white bg-blue-500/5">{row.call.ltp}</td>
                      <td className={`py-2 text-center border-r border-tv-border ${row.call.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.call.change}%</td>
                      <td className={`py-2 text-center font-bold bg-gray-800/40 border-x border-tv-border ${isATM ? 'text-yellow-400' : 'text-gray-400'}`}>{row.strike}</td>
                      <td className="py-2 text-center font-bold text-white bg-red-500/5 border-l border-tv-border">{row.put.ltp}</td>
                      <td className={`py-2 text-center ${row.put.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.put.change}%</td>
                      <td className="py-2 text-center text-gray-300">{row.put.iv}%</td>
                      <td className={`py-2 text-center ${row.put.oi_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.put.oi_change}%</td>
                      <td className={`py-2 text-center ${isPutTopOI ? 'text-red-400 font-bold underline' : 'text-gray-300'}`}>{row.put.oi.toLocaleString()}</td>
                      {showGreeks && <td className="py-2 text-center text-red-400">{row.put.theta}</td>}
                      {showGreeks && <td className="py-2 text-center text-blue-400">{row.put.delta}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 p-4 overflow-auto">
            <div className="flex-[3] flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#131722] p-2 rounded border border-tv-border">
                  <h3 className="text-xs font-bold mb-2 text-gray-400">Spot Price & PCR Trend</h3>
                  <div ref={pcrChartRef} className="w-full h-[250px]" />
                </div>
                <div className="bg-[#131722] p-2 rounded border border-tv-border">
                  <h3 className="text-xs font-bold mb-2 text-gray-400">Total Open Interest</h3>
                  <div ref={oiChartRef} className="w-full h-[250px]" />
                </div>
              </div>
            </div>
            <div className="flex-[1] flex flex-col gap-2">
               <h3 className="text-sm font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                 <FlaskConical className="w-4 h-4 text-blue-500" /> Options Buyer Signals
               </h3>
               <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                 {interpretations.map((sig, idx) => {
                   const Icon = sig.icon;
                   return (
                    <div key={idx} className="bg-[#2a2e39] p-3 rounded border border-white/5 shadow-sm">
                      <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${sig.color}`}>
                        <Icon className="w-4 h-4" /> {sig.title}
                      </div>
                      <div className="text-[10px] text-gray-400 leading-relaxed">{sig.desc}</div>
                    </div>
                   );
                 })}
                 {interpretations.length === 0 && <div className="text-gray-500 text-xs text-center py-10 italic">Collecting historical data for signals...</div>}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionChain;
