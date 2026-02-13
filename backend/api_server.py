"""
Unified App API Server
Provides high-performance data for the TradingView-mimic charting frontend.
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from logging.config import dictConfig
from typing import Any, Optional, List, Dict
import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote

from config import LOGGING_CONFIG, INITIAL_INSTRUMENTS, SERVER_PORT
from core import data_engine
from core.provider_registry import initialize_default_providers
from core.symbol_mapper import symbol_mapper
from core.options_provider import options_provider
from external.tv_api import tv_api
from db.local_db import db

def calculate_max_pain(chain: List[Dict[str, Any]]) -> float:
    """Calculates the strike price where option buyers lose the most."""
    if not chain: return 0.0

    strikes = [item['strike'] for item in chain]
    min_payout = float('inf')
    max_pain_strike = strikes[0]

    for s in strikes:
        current_payout = 0
        for item in chain:
            strike = item['strike']
            # Call Payout: Buyer wins if price > strike
            current_payout += max(0, s - strike) * item['call']['oi']
            # Put Payout: Buyer wins if price < strike
            current_payout += max(0, strike - s) * item['put']['oi']

        if current_payout < min_payout:
            min_payout = current_payout
            max_pain_strike = s

    return float(max_pain_strike)

async def snapshot_task():
    """Background task to take periodic snapshots of option chains."""
    from config import OPTIONS_UNDERLYINGS, SNAPSHOT_CONFIG
    interval = SNAPSHOT_CONFIG.get("interval_seconds", 180)

    while True:
        logger.info("Starting options snapshot cycle...")
        for symbol in OPTIONS_UNDERLYINGS:
            try:
                # 1. Fetch current spot price
                # Prefer latest price from WSS/ticks, fallback to historical API
                from core.data_engine import latest_prices
                if symbol in latest_prices:
                    spot_price = latest_prices[symbol]
                    logger.debug(f"Using live price for {symbol}: {spot_price}")
                else:
                    try:
                        # Use a shorter count to speed up
                        res = await asyncio.to_thread(tv_api.get_hist_candles, symbol, "1", 1)
                        if res and len(res) > 0:
                            spot_price = float(res[0][4])
                        else:
                            # Fallback to simulation if both fail
                            import random
                            if "BANKNIFTY" in symbol:
                                spot_price = 48000.0 + random.uniform(-100, 100)
                            elif "FINNIFTY" in symbol:
                                spot_price = 23000.0 + random.uniform(-50, 50)
                            elif "NIFTY" in symbol:
                                spot_price = 22000.0 + random.uniform(-50, 50)
                            else:
                                spot_price = 100.0
                    except Exception as e:
                        logger.warning(f"Error fetching spot for {symbol}: {e}")
                        spot_price = 22000.0 if "BANKNIFTY" not in symbol and "NIFTY" in symbol else 48000.0 if "BANK" in symbol else 23000.0

                # 2. Get option chain (includes PCR)
                data = options_provider.get_option_chain(symbol, spot_price)

                # 3. Calculate Max Pain
                max_pain = calculate_max_pain(data['chain'])

                # 4. Prepare PCR History Record
                total_oi = data['total_call_oi'] + data['total_put_oi']

                # Fetch last total_oi for change calculation
                last_res = db.query("SELECT total_oi FROM pcr_history WHERE underlying = ? ORDER BY timestamp DESC LIMIT 1", (symbol,))
                total_oi_change = (total_oi - last_res[0]['total_oi']) if last_res else 0

                record = {
                    "timestamp": datetime.now(timezone.utc),
                    "underlying": symbol,
                    "pcr_oi": data['pcr'],
                    "pcr_vol": round(data['total_put_vol'] / data['total_call_vol'], 3) if data['total_call_vol'] > 0 else 0,
                    "pcr_oi_change": data['pcr_change'],
                    "underlying_price": spot_price,
                    "max_pain": max_pain,
                    "spot_price": spot_price,
                    "total_oi": total_oi,
                    "total_oi_change": total_oi_change
                }

                db.insert_pcr_history(record)

                # 5. Insert full snapshots for detailed analysis
                snapshot_data = []
                for item in data['chain']:
                    for opt_type in ['call', 'put']:
                        leg = item[opt_type]
                        # Intrinsic value calculation
                        intrinsic = max(0, spot_price - item['strike']) if opt_type == 'call' else max(0, item['strike'] - spot_price)

                        snapshot_data.append({
                            "timestamp": record['timestamp'],
                            "underlying": symbol,
                            "symbol": f"{symbol}_{item['strike']}_{opt_type.upper()}",
                            "expiry": data['expiry'],
                            "strike": item['strike'],
                            "option_type": opt_type.upper(),
                            "oi": leg['oi'],
                            "oi_change": int(leg['oi_change']),
                            "volume": leg['volume'],
                            "ltp": leg['ltp'],
                            "iv": leg['iv'],
                            "delta": leg['delta'],
                            "gamma": leg.get('gamma', 0),
                            "theta": leg['theta'],
                            "vega": leg['vega'],
                            "intrinsic_value": intrinsic,
                            "time_value": max(0, leg['ltp'] - intrinsic),
                            "source": "simulated"
                        })
                db.insert_options_snapshot(snapshot_data)

                logger.info(f"PCR snapshot saved for {symbol}")
            except Exception as e:
                logger.error(f"Snapshot Error for {symbol}: {e}")

        await asyncio.sleep(interval)
# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Configure Logging
dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts the trading services on startup."""
    logger.info("Initializing Unified App Backend...")
    global main_loop

    # Initialize Data Providers
    initialize_default_providers()

    try:
        main_loop = asyncio.get_running_loop()
    except RuntimeError:
        main_loop = asyncio.get_event_loop()

    data_engine.set_socketio(sio, loop=main_loop)

    # Start WebSocket Feed
    logger.info("Starting TradingView WebSocket feed...")
    data_engine.start_websocket_thread(None, INITIAL_INSTRUMENTS)

    # Start Snapshot Background Task
    asyncio.create_task(snapshot_task())

    yield

    logger.info("Shutting down Unified App Backend...")
    try:
        data_engine.flush_tick_buffer()
    except Exception as e:
        logger.error(f"Error flushing tick buffers: {e}")

fastapi_app = FastAPI(title="Unified App API", lifespan=lifespan)

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=60,
    ping_interval=25
)

main_loop = None

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    data_engine.handle_disconnect(sid)

@sio.on('subscribe')
async def handle_subscribe(sid, data):
    instrument_keys = data.get('instrumentKeys', [])
    interval = data.get('interval', '1')

    for key in instrument_keys:
        logger.info(f"Client {sid} subscribing to: {key} ({interval}m)")
        try:
            await sio.enter_room(sid, key.upper())
            data_engine.subscribe_instrument(key.upper(), sid, interval=str(interval))
        except Exception as e:
            logger.error(f"Subscription error for {key}: {e}")

@sio.on('unsubscribe')
async def handle_unsubscribe(sid, data):
    instrument_keys = data.get('instrumentKeys', [])
    interval = data.get('interval', '1')

    for key in instrument_keys:
        logger.info(f"Client {sid} unsubscribing from: {key}")
        try:
            data_engine.unsubscribe_instrument(key.upper(), sid, interval=str(interval))
            if not data_engine.is_sid_using_instrument(sid, key.upper()):
                await sio.leave_room(sid, key.upper())
        except Exception as e:
            logger.error(f"Unsubscription error for {key}: {e}")

# Health Check
@fastapi_app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# TradingView Search Proxy
@fastapi_app.get("/api/tv/search")
async def tv_search(text: str = Query(..., min_length=1)):
    import httpx

    exchange = ""
    search_text = text
    if ":" in text:
        parts = text.split(":", 1)
        exchange = parts[0]
        search_text = parts[1]

    url = f"https://symbol-search.tradingview.com/symbol_search/v3/?text={search_text}&hl=1&exchange={exchange}&lang=en&search_type=&domain=production&sort_by_country=IN"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tradingview.com/',
        'Origin': 'https://www.tradingview.com'
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.error(f"Search proxy error: {e}")

    return {"symbols": []}

@fastapi_app.get("/api/options/pcr-trend/{underlying}")
async def get_pcr_trend(underlying: str):
    """Returns historical PCR data for current trading day."""
    try:
        clean_key = unquote(underlying)
        # Query pcr_history for the current day (UTC based)
        sql = """
            SELECT * FROM pcr_history
            WHERE underlying = ?
            AND timestamp >= CURRENT_DATE
            ORDER BY timestamp ASC
        """
        res = db.query(sql, (clean_key,), json_serialize=True)
        return res
    except Exception as e:
        logger.error(f"Error fetching PCR trend for {underlying}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@fastapi_app.get("/api/options-chain")
async def get_options_chain(symbol: str = "NSE:NIFTY"):
    """Fetch option chain for a given symbol."""
    try:
        # First get the last price of the symbol to center the chain
        res = await asyncio.to_thread(tv_api.get_hist_candles, symbol, "1", 1)
        spot_price = 25000.0 # Default fallback
        if res and len(res) > 0:
            spot_price = res[0][4] # Last close

        chain = options_provider.get_option_chain(symbol, spot_price)
        return chain
    except Exception as e:
        logger.error(f"Error in options chain fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@fastapi_app.get("/api/tv/intraday/{instrument_key}")
async def get_intraday(instrument_key: str, interval: str = '1', to_ts: Optional[int] = None):
    """Fetch intraday candles for the charting library."""
    try:
        clean_key = unquote(instrument_key)
        hrn = symbol_mapper.get_hrn(clean_key)

        # Use ThreadPoolExecutor for blocking network call
        tv_candles = await asyncio.to_thread(tv_api.get_hist_candles, clean_key, interval, 1000, to_ts)

        return {
            "instrumentKey": clean_key,
            "hrn": hrn,
            "candles": tv_candles or []
        }
    except Exception as e:
        logger.error(f"Error in intraday fetch: {e}")
        return {"candles": []}

@fastapi_app.get("/api/tv/footprint/{instrument_key}")
async def get_footprint(instrument_key: str, interval: str = '1', n_candles: int = 10):
    """Fetch volume footprint (buy/sell at price) for recent candles."""
    try:
        clean_key = unquote(instrument_key)

        interval_map = {'1': 60, '5': 300, '15': 900, '30': 1800, '60': 3600, 'D': 86400}
        duration = interval_map.get(interval, 60)

        # SQL to aggregate footprint using the Tick Rule
        # We look at ticks in the range of the last n_candles
        sql = f"""
            WITH raw_ticks AS (
                SELECT ts_ms, price, qty
                FROM ticks
                WHERE instrumentKey = ?
                ORDER BY ts_ms ASC
            ),
            tick_sides AS (
                SELECT
                    ts_ms,
                    price,
                    qty,
                    LAG(price) OVER (ORDER BY ts_ms) as prev_price
                FROM raw_ticks
            ),
            classified AS (
                SELECT
                    (ts_ms / 1000 / {duration}) * {duration} as bucket,
                    price,
                    qty,
                    CASE
                        WHEN price > prev_price THEN 'buy'
                        WHEN price < prev_price THEN 'sell'
                        ELSE 'buy' -- Default to buy or use previous side if we wanted to be complex
                    END as side
                FROM tick_sides
            )
            SELECT
                bucket,
                price,
                SUM(CASE WHEN side = 'buy' THEN qty ELSE 0 END) as buy_vol,
                SUM(CASE WHEN side = 'sell' THEN qty ELSE 0 END) as sell_vol
            FROM classified
            GROUP BY bucket, price
            ORDER BY bucket DESC, price DESC
        """

        # For performance, we might want to limit the raw_ticks first by time
        # but let's try this for now.
        res = db.query(sql, (clean_key,))

        # Group by bucket for easier frontend consumption
        footprint = {}
        for r in res:
            b = int(r['bucket'])
            if b not in footprint: footprint[b] = []
            footprint[b].append({
                "price": float(r['price']),
                "buy": int(r['buy_vol']),
                "sell": int(r['sell_vol'])
            })

        return footprint
    except Exception as e:
        logger.error(f"Error in footprint fetch: {e}")
        return {}

# Serve the React frontend from the frontend/dist directory
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist_path):
    # Important: mount at the end so it doesn't shadow API routes
    fastapi_app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
else:
    logger.warning(f"Frontend dist directory not found at {frontend_dist_path}")

# Create ASGI app
app = socketio.ASGIApp(sio, fastapi_app)

if __name__ == "__main__":
    import uvicorn
    # Use port from config
    port = int(os.getenv("PORT", SERVER_PORT))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
