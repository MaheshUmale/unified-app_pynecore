"""
Unified App API Server
Provides high-performance data for the TradingView-mimic charting frontend.
"""

import os
import asyncio
import logging
from logging.config import dictConfig
from typing import Any, Optional, List
import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote

from config import LOGGING_CONFIG, INITIAL_INSTRUMENTS
from core import data_engine
from core.provider_registry import initialize_default_providers
from core.symbol_mapper import symbol_mapper
from external.tv_api import tv_api
from db.local_db import db

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

@fastapi_app.get("/api/tv/intraday/{instrument_key}")
async def get_intraday(instrument_key: str, interval: str = '1'):
    """Fetch intraday candles for the charting library."""
    try:
        clean_key = unquote(instrument_key)
        hrn = symbol_mapper.get_hrn(clean_key)

        # Use ThreadPoolExecutor for blocking network call
        tv_candles = await asyncio.to_thread(tv_api.get_hist_candles, clean_key, interval, 1000)

        return {
            "instrumentKey": clean_key,
            "hrn": hrn,
            "candles": tv_candles or []
        }
    except Exception as e:
        logger.error(f"Error in intraday fetch: {e}")
        return {"candles": []}

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
    # Use port 3000 for serving the app
    port = int(os.getenv("PORT", 3000))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
