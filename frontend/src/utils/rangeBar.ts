import type { OHLC } from '../types/chart';

/**
 * Standard Range Bars implementation
 * Each bar has a fixed price range.
 */
export function calculateRangeBars(data: OHLC[], rangeSize: number): OHLC[] {
  if (data.length === 0 || rangeSize <= 0) return [];

  const rangeData: OHLC[] = [];
  let open = data[0].open;
  let high = open;
  let low = open;
  let volume = 0;
  const baseTime = data[0].time;

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    // Process high and low to see if they break the range
    // To be more accurate we should look at high/low sequence but we only have OHLC
    // We'll check if high or low breaks the range from open

    volume += candle.volume || 0;

    const potentialHigh = Math.max(high, candle.high);
    const potentialLow = Math.min(low, candle.low);

    if (potentialHigh - potentialLow >= rangeSize) {
      // We have enough movement for at least one bar
      // In a real implementation we would split this into multiple bars if movement > rangeSize
      const isUp = candle.close > open;

      const close = isUp ? low + rangeSize : high - rangeSize;

      rangeData.push({
        time: (baseTime + rangeData.length * 60) as any,
        open,
        high: Math.max(open, close),
        low: Math.min(open, close),
        close,
        volume,
      });

      // Reset for next bar
      open = close;
      high = open;
      low = open;
      volume = 0;

      // Check again with the rest of the current candle's movement if needed
      // (Simplified: we just move to the next candle)
    } else {
      high = potentialHigh;
      low = potentialLow;
    }
  }

  return rangeData;
}
