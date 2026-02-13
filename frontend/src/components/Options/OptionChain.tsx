import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

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
            <div className="text-xs">
              <span className="text-gray-400 mr-1">Expiry:</span>
              <span className="text-orange-400 font-bold">{data?.expiry}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4 bg-black/20 px-2 py-1 rounded text-[10px]">
             <span className="text-gray-500">PCR Trend:</span>
             {data?.pcr_change > 0.01 ? <TrendingUp className="w-3 h-3 text-green-500" /> :
              data?.pcr_change < -0.01 ? <TrendingDown className="w-3 h-3 text-red-500" /> :
              <Minus className="w-3 h-3 text-gray-500" />}
          </div>
          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${showGreeks ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 hover:bg-tv-grid'}`}
          >
            {showGreeks ? 'Hide Greeks' : 'Show Greeks'}
          </button>
          <button onClick={fetchData} className="p-1 hover:bg-tv-grid rounded">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse sticky-header">
          <thead className="sticky top-0 bg-[#1e222d] shadow-sm z-10">
            <tr className="border-b border-tv-border text-gray-400 uppercase tracking-wider">
              <th colSpan={showGreeks ? 7 : 4} className="py-2 border-r border-tv-border bg-blue-900/10">CALLS</th>
              <th className="py-2 bg-gray-800/50">STRIKE</th>
              <th colSpan={showGreeks ? 7 : 4} className="py-2 border-l border-tv-border bg-red-900/10">PUTS</th>
            </tr>
            <tr className="border-b border-tv-border text-[10px] text-gray-500">
              {showGreeks && <th className="py-1">Delta</th>}
              {showGreeks && <th className="py-1">Theta</th>}
              <th className="py-1">OI</th>
              <th className="py-1">OI Chg%</th>
              <th className="py-1">IV</th>
              <th className="py-1">Chg%</th>
              <th className="py-1 border-r border-tv-border">LTP</th>

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
                  {/* CALLS */}
                  {showGreeks && <td className="py-2 text-center text-blue-400">{row.call.delta}</td>}
                  {showGreeks && <td className="py-2 text-center text-red-400">{row.call.theta}</td>}
                  <td className={`py-2 text-center ${isCallTopOI ? 'text-blue-400 font-bold underline' : 'text-gray-300'}`}>
                    {row.call.oi.toLocaleString()}
                  </td>
                  <td className={`py-2 text-center ${row.call.oi_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.call.oi_change}%
                  </td>
                  <td className="py-2 text-center text-gray-300">{row.call.iv}%</td>
                  <td className={`py-2 text-center ${row.call.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.call.change}%</td>
                  <td className="py-2 text-center font-bold text-white border-r border-tv-border bg-blue-500/5">{row.call.ltp}</td>

                  {/* STRIKE */}
                  <td className={`py-2 text-center font-bold bg-gray-800/40 border-x border-tv-border ${isATM ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {row.strike}
                  </td>

                  {/* PUTS */}
                  <td className="py-2 text-center font-bold text-white border-l border-tv-border bg-red-500/5">{row.put.ltp}</td>
                  <td className={`py-2 text-center ${row.put.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.put.change}%</td>
                  <td className="py-2 text-center text-gray-300">{row.put.iv}%</td>
                  <td className={`py-2 text-center ${row.put.oi_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.put.oi_change}%
                  </td>
                  <td className={`py-2 text-center ${isPutTopOI ? 'text-red-400 font-bold underline' : 'text-gray-300'}`}>
                    {row.put.oi.toLocaleString()}
                  </td>
                  {showGreeks && <td className="py-2 text-center text-red-400">{row.put.theta}</td>}
                  {showGreeks && <td className="py-2 text-center text-blue-400">{row.put.delta}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionChain;
