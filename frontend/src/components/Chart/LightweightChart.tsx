import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type { CandlestickData, HistogramData, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';

interface Drawing {
  type: 'trendline' | 'fibonacci' | 'horizontal' | 'vertical';
  points: { time: number; price: number }[];
}

interface LightweightChartProps {
  data: CandlestickData[];
  volumeData?: HistogramData[];
  type?: 'candle' | 'line' | 'renko' | 'range';
  isDarkMode?: boolean;
  onCrosshairMove?: (param: any) => void;
  activeTool?: string;
  clearDrawings?: boolean;
  showSMA?: boolean;
}

const LightweightChart: React.FC<LightweightChartProps> = ({
  data,
  volumeData,
  type = 'candle',
  isDarkMode = true,
  onCrosshairMove,
  activeTool,
  clearDrawings,
  showSMA = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  useEffect(() => {
    if (clearDrawings) {
      setDrawings([]);
      setCurrentDrawing(null);
    }
  }, [clearDrawings]);

  // Initial Chart Creation & Theme update
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const colors = isDarkMode ? {
      background: '#131722',
      text: '#D1D4DC',
      grid: '#2B2B43',
    } : {
      background: '#ffffff',
      text: '#333333',
      grid: '#f0f0f0',
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: 0,
        vertLine: { labelBackgroundColor: colors.grid },
        horzLine: { labelBackgroundColor: colors.grid },
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: colors.grid,
      },
    });

    chartRef.current = chart;

    if (type === 'line') {
      seriesRef.current = chart.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
      });
    } else {
      // candle, renko, and range all use CandlestickSeries
      seriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    }

    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    smaSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      visible: showSMA,
      title: 'SMA 20',
    });

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
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
    handleResize();

    setIsChartReady(true);

    return () => {
      setIsChartReady(false);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [type, onCrosshairMove, isDarkMode]);

  // Data Updates
  useEffect(() => {
    if (isChartReady && seriesRef.current && data.length > 0) {
      if (type === 'line') {
        const lineData: LineData[] = data.map(d => ({
          time: d.time,
          value: d.close,
        }));
        seriesRef.current.setData(lineData);
      } else {
        seriesRef.current.setData(data);
      }
      chartRef.current?.timeScale().fitContent();

      // Update SMA
      if (smaSeriesRef.current) {
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

  // Handle Drawing Logic
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderDrawings = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      renderDrawings();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [drawings, currentDrawing, activeTool, isDarkMode]);

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
