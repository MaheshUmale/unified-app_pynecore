import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
from core.interfaces import ILiveStreamProvider, IHistoricalDataProvider
from external.tv_live_wss import TradingViewWSS
from external.tv_api import tv_api

logger = logging.getLogger(__name__)

class TradingViewLiveStreamProvider(ILiveStreamProvider):
    """TradingView WebSocket Implementation."""
    def __init__(self, callback: Callable = None):
        self.wss = TradingViewWSS(callback)
        self.callback = callback

    def subscribe(self, symbols: List[str], interval: str = "1"):
        self.wss.subscribe(symbols, interval)

    def unsubscribe(self, symbol: str, interval: str = "1"):
        self.wss.unsubscribe(symbol, interval)

    def set_callback(self, callback: Callable):
        self.callback = callback
        self.wss.callback = callback

    def start(self):
        self.wss.start()

    def stop(self):
        self.wss.stop()

    def is_connected(self) -> bool:
        return self.wss.ws and self.wss.ws.sock and self.wss.ws.sock.connected

class TradingViewHistoricalProvider(IHistoricalDataProvider):
    """TradingView Historical Data Implementation."""
    async def get_hist_candles(self, symbol: str, interval: str, count: int) -> List[List]:
        return await asyncio.to_thread(tv_api.get_hist_candles, symbol, interval, count)
