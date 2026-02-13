import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type {
  CandlestickData,
  HistogramData,
  IChartApi,
  ISeriesApi,
  LineData,
  MouseEventParams,
  UTCTimestamp
} from 'lightweight-charts';
import { useChartSync } from '../../hooks/useChartSync';
import type { FootprintData } from '../../types/chart';

interface Drawing {
  type: 'trendline' | 'fibonacci' | 'horizontal' | 'vertical';
  points: { time: number; price: number }[];
}

interface LightweightChartProps {
  chartId: string;
  isSyncEnabled?: boolean;
  data: CandlestickData[];
  volumeData?: HistogramData[];
  type?: 'candle' | 'line' | 'renko' | 'range' | 'footprint' | 'tick';
  footprint?: FootprintData;
  isDarkMode?: boolean;
  onCrosshairMove?: (chartId: string, param: MouseEventParams) => void;
  onClick?: (chartId: string, param: MouseEventParams) => void;
  activeTool?: string;
  clearDrawings?: boolean;
  showSMA?: boolean;
  timezone?: string;
}

const LightweightChart: React.FC<LightweightChartProps> = ({
  chartId,
  isSyncEnabled = false,
  data,
  volumeData,
  type = 'candle',
  footprint,
  isDarkMode = true,
  onCrosshairMove,
  onClick,
  activeTool,
  clearDrawings,
  showSMA = false,
  timezone = 'Asia/Kolkata'
}) => {
  const { handleSync, broadcast } = useChartSync(chartId);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  // Stable references for handlers
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onCrosshairMoveRef.current = onCrosshairMove;
  }, [onCrosshairMove]);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (clearDrawings) {
      setDrawings([]);
      setCurrentDrawing(null);
    }
  }, [clearDrawings]);

  // Initial Chart Creation (Only once)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true },
      localization: {
        locale: 'en-IN',
      }
    });

    chartRef.current = chart;

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (onCrosshairMoveRef.current) onCrosshairMoveRef.current(chartId, param);

      if (isSyncEnabled && param.time && param.point) {
        broadcast({
          crosshair: {
            time: param.time as any,
            price: seriesRef.current?.coordinateToPrice(param.point.y) ?? undefined,
          }
        });
      }
    };

    const handleClick = (param: MouseEventParams) => {
      if (onClickRef.current) onClickRef.current(chartId, param);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncEnabled && range) {
        broadcast({ logicalRange: range });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        if (canvasRef.current) {
          canvasRef.current.width = chartContainerRef.current.clientWidth;
          canvasRef.current.height = chartContainerRef.current.clientHeight;
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    setIsChartReady(true);

    return () => {
      setIsChartReady(false);
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
    };
  }, [chartId]); // Only recreate if chartId changes

  // Update Theme & Localization
  useEffect(() => {
    if (!chartRef.current) return;

    const colors = isDarkMode ? {
      background: '#131722',
      text: '#D1D4DC',
      grid: '#2B2B43',
    } : {
      background: '#ffffff',
      text: '#333333',
      grid: '#f0f0f0',
    };

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      localization: {
        timeFormatter: (time: UTCTimestamp) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleTimeString('en-IN', {
            timeZone: timezone === 'UTC' ? 'UTC' : 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }
      }
    });
  }, [isDarkMode, timezone]);

  // Update Series Type
  useEffect(() => {
    if (!isChartReady || !chartRef.current) return;

    // Clear existing series
    if (seriesRef.current) chartRef.current.removeSeries(seriesRef.current);
    if (volumeSeriesRef.current) chartRef.current.removeSeries(volumeSeriesRef.current);
    if (smaSeriesRef.current) chartRef.current.removeSeries(smaSeriesRef.current);

    if (type === 'line' || type === 'tick') {
      seriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: type === 'tick' ? '#2962FF' : '#2196F3',
        lineWidth: 2,
      });
    } else {
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        visible: type !== 'footprint',
      });
    }

    volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      visible: type !== 'footprint',
    });

    chartRef.current.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    smaSeriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      visible: showSMA && type !== 'tick',
      title: 'SMA 20',
    });

  }, [isChartReady, type, showSMA]);

  // Sync Listener
  useEffect(() => {
    if (!isSyncEnabled || !chartRef.current || !seriesRef.current) return;

    return handleSync((state) => {
      if (state.logicalRange) {
        chartRef.current?.timeScale().setVisibleLogicalRange(state.logicalRange);
      }
      if (state.crosshair && state.crosshair.time) {
        chartRef.current?.setCrosshairPosition(0, state.crosshair.time as any, seriesRef.current!);
      }
    });
  }, [isSyncEnabled, isChartReady, handleSync]);

  // Data Updates
  useEffect(() => {
    if (isChartReady && seriesRef.current) {
      if (type === 'line' || type === 'tick') {
        const lineData: LineData[] = data.map(d => ({
          time: d.time,
          value: d.close,
        }));
        seriesRef.current.setData(lineData);
      } else {
        seriesRef.current.setData(data);
      }

      // Update SMA
      if (smaSeriesRef.current && type !== 'tick') {
        const period = 20;
        const smaData: LineData[] = [];
        for (let i = period - 1; i < data.length; i++) {
          const slice = data.slice(i - period + 1, i + 1);
          const sum = slice.reduce((acc, val) => acc + val.close, 0);
          smaData.push({
            time: data[i].time,
            value: sum / period,
          });
        }
        smaSeriesRef.current.setData(smaData);
        smaSeriesRef.current.applyOptions({ visible: showSMA });
      }
    }
  }, [data, type, showSMA, isChartReady]);

  useEffect(() => {
    if (volumeSeriesRef.current && volumeData) {
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [volumeData]);

  // Handle Drawing & Footprint Logic
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Footprint
      if (type === 'footprint' && footprint) {
        const timeScale = chart.timeScale();
        const barWidth = timeScale.options().barSpacing * 0.8;

        Object.entries(footprint).forEach(([bucketStr, levels]) => {
          const bucket = parseInt(bucketStr);
          const x = timeScale.timeToCoordinate(bucket as any);
          if (x === null || x < 0 || x > canvas.width) return;

          const candle = data.find(d => d.time === bucket);
          if (candle) {
             const yOpen = series.priceToCoordinate(candle.open);
             const yClose = series.priceToCoordinate(candle.close);
             if (yOpen !== null && yClose !== null) {
                ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(x - barWidth/2, Math.min(yOpen, yClose), barWidth, Math.abs(yOpen - yClose) || 1);
             }
          }

          levels.forEach(level => {
            const y = series.priceToCoordinate(level.price);
            if (y === null || y < 0 || y > canvas.height) return;
            const total = level.buy + level.sell;
            if (total === 0) return;
            const h = Math.max(timeScale.options().barSpacing / 10, 2);
            const buyW = (level.buy / total) * (barWidth / 2);
            ctx.fillStyle = 'rgba(38, 166, 154, 0.6)';
            ctx.fillRect(x, y - h/2, buyW, h);
            const sellW = (level.sell / total) * (barWidth / 2);
            ctx.fillStyle = 'rgba(239, 83, 80, 0.6)';
            ctx.fillRect(x - sellW, y - h/2, sellW, h);
            if (timeScale.options().barSpacing > 50) {
                ctx.fillStyle = isDarkMode ? '#fff' : '#000';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(level.sell.toString(), x - 2, y + 3);
                ctx.textAlign = 'left';
                ctx.fillText(level.buy.toString(), x + 2, y + 3);
            }
          });
        });
      }

      // 2. Drawings
      const allDrawings = [...drawings, ...(currentDrawing ? [currentDrawing] : [])];

      allDrawings.forEach(drawing => {
        if (drawing.points.length < 1) return;

        const p1 = drawing.points[0];
        const x1 = chart.timeScale().timeToCoordinate(p1.time as any);
        const y1 = series.priceToCoordinate(p1.price);

        if (drawing.type === 'horizontal') {
          if (y1 === null) return;
          ctx.beginPath();
          ctx.moveTo(0, y1);
          ctx.lineTo(canvas.width, y1);
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }

        if (drawing.type === 'vertical') {
          if (x1 === null) return;
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, canvas.height);
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }

        if (drawing.points.length < 2) return;
        const p2 = drawing.points[1];
        const x2 = chart.timeScale().timeToCoordinate(p2.time as any);
        const y2 = series.priceToCoordinate(p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return;

        if (drawing.type === 'trendline') {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (drawing.type === 'fibonacci') {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const diff = p2.price - p1.price;

          levels.forEach(level => {
            const price = p1.price + diff * level;
            const y = series.priceToCoordinate(price);
            if (y === null) return;

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.strokeStyle = isDarkMode ? `rgba(209, 212, 220, ${0.5 - level * 0.3})` : `rgba(0, 0, 0, ${0.5 - level * 0.3})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = isDarkMode ? '#D1D4DC' : '#333333';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${(level * 100).toFixed(1)}% (${price.toFixed(2)})`, 10, y - 5);
          });

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(33, 150, 243, 0.5)';
          ctx.stroke();
        }
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const tools = ['trendline', 'fibonacci', 'horizontal', 'vertical'];
      if (!tools.includes(activeTool || '')) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return;

      if (activeTool === 'horizontal' || activeTool === 'vertical') {
        setDrawings([...drawings, { type: activeTool as any, points: [{ time: time as any, price }] }]);
        return;
      }

      if (!currentDrawing) {
        setCurrentDrawing({
          type: activeTool as any,
          points: [{ time: time as any, price }]
        });
      } else {
        setDrawings([...drawings, { ...currentDrawing, points: [...currentDrawing.points, { time: time as any, price }] }]);
        setCurrentDrawing(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!currentDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return;

      setCurrentDrawing({
        ...currentDrawing,
        points: [currentDrawing.points[0], { time: time as any, price }]
      });
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);

    let animationId: number;
    const loop = () => {
      render();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [drawings, currentDrawing, activeTool, isDarkMode, type, footprint, data]);

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="absolute inset-0 tv-chart-container" />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 ${activeTool === 'cursor' || activeTool === 'eraser' ? 'pointer-events-none' : 'cursor-crosshair'}`}
      />
    </div>
  );
};

export default LightweightChart;
