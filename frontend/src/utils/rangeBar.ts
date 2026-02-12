import type { OHLC } from '../types/chart';

export function calculateRangeBars(data: OHLC[], rangeSize: number): OHLC[] {
  if (data.length === 0 || rangeSize <= 0) return [];

  const rangeData: OHLC[] = [];
  let open = data[0].open;
  let high = data[0].high;
  let low = data[0].low;
  let volume = 0;
  const baseTime = data[0].time;

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    high = Math.max(high, candle.high);
    low = Math.min(low, candle.low);
    volume += candle.volume || 0;

    if (high - low >= rangeSize) {
      rangeData.push({
        time: (baseTime + rangeData.length * 60) as any,
        open,
        high,
        low,
        close: candle.close,
        volume,
      });

      // Start next bar from the current close
      open = candle.close;
      high = candle.close;
      low = candle.close;
      volume = 0;
    }
  }

  return rangeData;
}
