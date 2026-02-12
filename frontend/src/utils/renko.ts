import type { OHLC } from '../types/chart';

export function calculateRenko(data: OHLC[], brickSize: number): OHLC[] {
  if (data.length === 0) return [];

  const renkoData: OHLC[] = [];
  let prevClose = data[0].close;

  data.forEach((candle) => {
    let diff = candle.close - prevClose;

    while (Math.abs(diff) >= brickSize) {
      const direction = diff > 0 ? 1 : -1;
      const newOpen = prevClose;
      const newClose = prevClose + direction * brickSize;

      renkoData.push({
        time: candle.time,
        open: newOpen,
        high: Math.max(newOpen, newClose),
        low: Math.min(newOpen, newClose),
        close: newClose,
      });

      prevClose = newClose;
      diff = candle.close - prevClose;
    }
  });

  return renkoData.map((d, i) => ({
    ...d,
    time: (data[0].time + i * 60) as any,
  }));
}
