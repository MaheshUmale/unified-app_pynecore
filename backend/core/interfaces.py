from typing import List, Dict, Any, Optional, Callable
from abc import ABC, abstractmethod

class ILiveStreamProvider(ABC):
    @abstractmethod
    def subscribe(self, symbols: List[str], interval: str = "1"):
        pass

    @abstractmethod
    def unsubscribe(self, symbol: str, interval: str = "1"):
        pass

    @abstractmethod
    def set_callback(self, callback: Callable):
        pass

    @abstractmethod
    def start(self):
        pass

    @abstractmethod
    def stop(self):
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        pass

class IHistoricalDataProvider(ABC):
    @abstractmethod
    async def get_hist_candles(self, symbol: str, interval: str, count: int) -> List[List]:
        pass
