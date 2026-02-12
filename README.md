# UNIFIED APP - High-Performance Financial Charting

A professional-grade financial charting application replicating TradingView's layout and functionality, built with React, TypeScript, and FastAPI.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Charting**: TradingView `lightweight-charts`
- **Backend**: FastAPI (Python), Socket.IO for real-time data
- **Database**: SQLite/DuckDB for tick history

## Core Features
- **TradingView Mimic UI**: Full-screen layout with top bar, left toolbar, and right sidebar.
- **Advanced Chart Types**:
  - **Candlestick & Line Charts**
  - **Renko Candlesticks**: Price-based movement with 2x brick reversal rule.
  - **Range Bars**: Constant price range bars for noise reduction.
- **Drawing Tools**:
  - Trendlines
  - Fibonacci Retracements
- **Real-time Data**: WebSocket integration for live price updates.
- **Interactive Features**: Smooth zooming, panning, and crosshair tracking.
- **Theme Support**: Integrated Dark/Light mode toggle.

## Project Structure
- `frontend/`: React + Vite project.
- `backend/`: FastAPI server and data processing engine.

## Setup & Running

### 1. Backend Setup
Install Python dependencies:
```bash
pip install -r requirements.txt
```

### 2. Frontend Setup
Install Node dependencies:
```bash
cd frontend
npm install
npm run build
```

### 3. Start the Application
Run the unified server (serves both API and the React Frontend):
```bash
python3 backend/api_server.py
```
The application will be available at `http://localhost:3000`.

> **Note on UI:** The FastAPI backend is configured to serve the production-built React frontend from `frontend/dist`. There is only one unified UI.

## Development Mode
If you are developing and want Hot Module Replacement (HMR):
1. Start the backend: `python3 backend/api_server.py`
2. Start the Vite dev server: `cd frontend && npm run dev`
3. Access the app via `http://localhost:5173`.
