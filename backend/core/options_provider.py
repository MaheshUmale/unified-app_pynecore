import math
import time
import random
from typing import List, Dict, Any
from datetime import datetime, timedelta

class OptionsProvider:
    def __init__(self):
        # Track history for charts per symbol
        # Format: {symbol: [{"time": ts, "pcr": val, "spot": val, "total_oi": val}]}
        self.histories = {}
        self._generate_initial_history("NSE:NIFTY", 22000.0)
        self._generate_initial_history("NSE:BANKNIFTY", 48000.0)
        self._generate_initial_history("NSE:FINNIFTY", 23000.0)

    def _generate_initial_history(self, symbol: str, base_spot: float):
        now = int(time.time())
        spot = base_spot
        history = []
        for i in range(50):
            ts = now - (50 - i) * 60 # 1 minute intervals
            spot += random.uniform(-20, 20)
            pcr = round(random.uniform(0.7, 1.3), 2)
            history.append({
                "time": ts,
                "pcr": pcr,
                "spot": round(spot, 2),
                "total_oi": random.randint(1000000, 2000000)
            })
        self.histories[symbol] = history

    def get_option_chain(self, symbol: str, spot_price: float) -> Dict[str, Any]:
        """
        Generates an enhanced option chain with OI and PCR analysis, including history.
        """
        if spot_price > 5000:
            interval = 100
        elif spot_price > 1000:
            interval = 50
        else:
            interval = 5

        atm_strike = round(spot_price / interval) * interval
        strikes = [atm_strike + (i * interval) for i in range(-12, 13)]

        today = datetime.now()
        days_until_thursday = (3 - today.weekday()) % 7
        if days_until_thursday == 0: days_until_thursday = 7
        expiry_date = (today + timedelta(days=days_until_thursday)).strftime("%Y-%m-%d")

        chain = []
        iv_base = 15.0 + random.uniform(-1, 1)

        total_call_oi = 0
        total_put_oi = 0
        total_call_vol = 0
        total_put_vol = 0

        for strike in strikes:
            dte = max(days_until_thursday, 0.5) / 365.0
            r = 0.07
            sigma = (iv_base + abs(strike - spot_price) * 0.1) / 100.0

            d1 = (math.log(spot_price / strike) + (r + 0.5 * sigma**2) * dte) / (sigma * math.sqrt(dte))
            d2 = d1 - sigma * math.sqrt(dte)

            def norm_cdf(x):
                return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

            call_price = spot_price * norm_cdf(d1) - strike * math.exp(-r * dte) * norm_cdf(d2)
            put_price = strike * math.exp(-r * dte) * norm_cdf(-d2) - spot_price * norm_cdf(-d1)

            call_delta = norm_cdf(d1)
            put_delta = call_delta - 1

            # Simulate OI: Higher near ATM
            dist_from_atm = abs(strike - atm_strike) / interval
            oi_base = 100000 / (1 + dist_from_atm)

            call_oi = int(oi_base * random.uniform(0.8, 1.2))
            put_oi = int(oi_base * random.uniform(0.8, 1.2))

            call_vol = int(oi_base * random.uniform(2, 5))
            put_vol = int(oi_base * random.uniform(2, 5))

            total_call_oi += call_oi
            total_put_oi += put_oi
            total_call_vol += call_vol
            total_put_vol += put_vol

            chain.append({
                "strike": strike,
                "call": {
                    "ltp": round(max(call_price, 0.05), 2),
                    "change": round(random.uniform(-5, 5), 2),
                    "iv": round(sigma * 100, 2),
                    "oi": call_oi,
                    "oi_change": round(random.uniform(-10, 10), 2),
                    "volume": call_vol,
                    "delta": round(call_delta, 3),
                    "theta": round(-random.uniform(1, 10), 2),
                    "vega": round(random.uniform(0.1, 2), 2),
                    "gamma": round(random.uniform(0.001, 0.01), 4)
                },
                "put": {
                    "ltp": round(max(put_price, 0.05), 2),
                    "change": round(random.uniform(-5, 5), 2),
                    "iv": round(sigma * 100, 2),
                    "oi": put_oi,
                    "oi_change": round(random.uniform(-10, 10), 2),
                    "volume": put_vol,
                    "delta": round(put_delta, 3),
                    "theta": round(-random.uniform(1, 10), 2),
                    "vega": round(random.uniform(0.1, 2), 2),
                    "gamma": round(random.uniform(0.001, 0.01), 4)
                }
            })

        pcr = round(total_put_oi / total_call_oi, 3) if total_call_oi > 0 else 0

        # Update history for specific symbol
        if symbol not in self.histories:
            self.histories[symbol] = []

        symbol_history = self.histories[symbol]

        new_entry = {
            "time": int(time.time()),
            "pcr": pcr,
            "spot": round(spot_price, 2),
            "total_oi": total_call_oi + total_put_oi,
            "total_vol": total_call_vol + total_put_vol
        }

        if not symbol_history or new_entry["time"] > symbol_history[-1]["time"] + 10:
            symbol_history.append(new_entry)
            if len(symbol_history) > 100: symbol_history.pop(0)

        return {
            "symbol": symbol,
            "spot": spot_price,
            "expiry": expiry_date,
            "pcr": pcr,
            "pcr_change": round(pcr - symbol_history[-2]["pcr"], 3) if len(symbol_history) > 1 else 0,
            "total_call_oi": total_call_oi,
            "total_put_oi": total_put_oi,
            "total_call_vol": total_call_vol,
            "total_put_vol": total_put_vol,
            "chain": chain,
            "history": symbol_history
        }

options_provider = OptionsProvider()
