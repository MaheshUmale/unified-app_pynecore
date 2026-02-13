"""
Open Interest (OI) Buildup Analyzer Module
Detects Long Buildup, Short Buildup, Long Unwinding, Short Covering
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class OIBuildupType(Enum):
    """Types of OI buildup patterns."""
    LONG_BUILDUP = "Long Buildup"
    SHORT_BUILDUP = "Short Buildup"
    LONG_UNWINDING = "Long Unwinding"
    SHORT_COVERING = "Short Covering"
    NEUTRAL = "Neutral"


@dataclass
class OIBuildupSignal:
    """OI Buildup signal for a strike."""
    strike: float
    option_type: str
    buildup_type: OIBuildupType
    strength: str  # 'strong', 'moderate', 'weak'
    oi_change_pct: float
    price_change_pct: float
    interpretation: str


class OIBuildupAnalyzer:
    """
    Analyze Open Interest buildup patterns.

    Key Patterns:
    - Long Buildup: OI increases + Price increases (Bullish)
    - Short Buildup: OI increases + Price decreases (Bearish)
    - Long Unwinding: OI decreases + Price decreases (Bearish)
    - Short Covering: OI decreases + Price increases (Bullish)
    """

    def __init__(self):
        self.threshold_oi_change = 2.0  # 2% OI change threshold
        self.threshold_price_change = 0.5  # 0.5% price change threshold

    def analyze_buildup(
        self,
        current_data: Dict[str, Any],
        previous_data: Optional[Dict[str, Any]] = None,
        oi_change: Optional[float] = None,
        price_change: Optional[float] = None
    ) -> OIBuildupSignal:
        """
        Analyze buildup pattern for a single strike.
        """
        strike = current_data.get('strike', 0)
        option_type = current_data.get('option_type', 'call')

        # Calculate changes if previous data provided
        if previous_data and oi_change is None:
            oi_change = self._calculate_change(
                current_data.get('oi', 0),
                previous_data.get('oi', 0)
            )

        if previous_data and price_change is None:
            price_change = self._calculate_change(
                current_data.get('ltp', 0),
                previous_data.get('ltp', 0)
            )

        oi_change = oi_change or 0
        price_change = price_change or 0

        # Determine buildup type
        buildup_type, strength = self._classify_buildup(oi_change, price_change)

        # Generate interpretation
        interpretation = self._generate_interpretation(
            buildup_type, option_type, strike, oi_change, price_change
        )

        return OIBuildupSignal(
            strike=strike,
            option_type=option_type,
            buildup_type=buildup_type,
            strength=strength,
            oi_change_pct=round(oi_change, 2),
            price_change_pct=round(price_change, 2),
            interpretation=interpretation
        )

    def _calculate_change(self, current: float, previous: float) -> float:
        """Calculate percentage change."""
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100

    def _classify_buildup(
        self,
        oi_change: float,
        price_change: float
    ) -> Tuple[OIBuildupType, str]:
        """
        Classify buildup pattern based on OI and price changes.
        """
        abs_oi_change = abs(oi_change)
        abs_price_change = abs(price_change)

        if abs_oi_change >= 10 and abs_price_change >= 2:
            strength = 'strong'
        elif abs_oi_change >= 5 and abs_price_change >= 1:
            strength = 'moderate'
        else:
            strength = 'weak'

        if oi_change > self.threshold_oi_change:
            if price_change > self.threshold_price_change:
                return OIBuildupType.LONG_BUILDUP, strength
            elif price_change < -self.threshold_price_change:
                return OIBuildupType.SHORT_BUILDUP, strength

        elif oi_change < -self.threshold_oi_change:
            if price_change < -self.threshold_price_change:
                return OIBuildupType.LONG_UNWINDING, strength
            elif price_change > self.threshold_price_change:
                return OIBuildupType.SHORT_COVERING, strength

        return OIBuildupType.NEUTRAL, 'weak'

    def _generate_interpretation(
        self,
        buildup_type: OIBuildupType,
        option_type: str,
        strike: float,
        oi_change: float,
        price_change: float
    ) -> str:
        """Generate human-readable interpretation."""
        interpretations = {
            OIBuildupType.LONG_BUILDUP: {
                'call': f"Fresh long positions building at {strike} CE - Bullish",
                'put': f"Fresh long positions building at {strike} PE - Bearish"
            },
            OIBuildupType.SHORT_BUILDUP: {
                'call': f"Fresh short positions building at {strike} CE - Bearish resistance",
                'put': f"Fresh short positions building at {strike} PE - Bullish support"
            },
            OIBuildupType.LONG_UNWINDING: {
                'call': f"Longs exiting at {strike} CE - Bearish",
                'put': f"Longs exiting at {strike} PE - Bullish"
            },
            OIBuildupType.SHORT_COVERING: {
                'call': f"Shorts covering at {strike} CE - Bullish breakout",
                'put': f"Shorts covering at {strike} PE - Bearish breakdown"
            },
            OIBuildupType.NEUTRAL: {
                'call': f"No significant activity at {strike} CE",
                'put': f"No significant activity at {strike} PE"
            }
        }

        return interpretations.get(buildup_type, {}).get(option_type, "Unknown pattern")

# Global instance
oi_buildup_analyzer = OIBuildupAnalyzer()
