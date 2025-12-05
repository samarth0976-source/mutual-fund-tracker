# Python Holdings Service

Flask API using `yahooquery` to fetch Indian mutual fund holdings from Yahoo Finance.

## Endpoints

- `GET /health` - Health check
- `GET /search?name=ICICI` - Search for fund and get Yahoo ticker
- `GET /holdings?symbol=0P000XYZ.BO` - Get holdings for a specific symbol
- `GET /fund-holdings?name=ICICI Bluechip` - Combined search + holdings

## Local Development

```bash
cd python-holdings-service
pip install -r requirements.txt
python app.py
```

## Deploy on Render

1. Create new Web Service
2. Runtime: Python 3
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn app:app`
