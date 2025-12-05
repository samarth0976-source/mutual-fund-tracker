from flask import Flask, request, jsonify
from flask_cors import CORS
from yahooquery import Ticker, search
import os

app = Flask(__name__)
CORS(app)

# Health check
@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'python-holdings-service'})

# Search for mutual fund by name and get Yahoo ticker
@app.route('/search')
def search_fund():
    name = request.args.get('name', '')
    if not name:
        return jsonify({'error': 'Name parameter required'}), 400
    
    try:
        # Search for mutual fund
        results = search(f"{name} India mutual fund")
        
        # Filter for India mutual funds (.BO or .NS suffix)
        india_funds = []
        if 'quotes' in results:
            for quote in results['quotes']:
                symbol = quote.get('symbol', '')
                if '.BO' in symbol or '.NS' in symbol or symbol.startswith('0P'):
                    india_funds.append({
                        'symbol': symbol,
                        'name': quote.get('longname', quote.get('shortname', '')),
                        'exchange': quote.get('exchange', ''),
                        'type': quote.get('quoteType', '')
                    })
        
        return jsonify({
            'query': name,
            'results': india_funds[:10],  # Top 10 results
            'total': len(india_funds)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get holdings for a specific fund
@app.route('/holdings')
def get_holdings():
    symbol = request.args.get('symbol', '')
    if not symbol:
        return jsonify({'error': 'Symbol parameter required'}), 400
    
    try:
        ticker = Ticker(symbol)
        
        # Get fund profile with holdings
        fund_holding_info = ticker.fund_holding_info
        fund_top_holdings = ticker.fund_top_holdings
        fund_sector_weightings = ticker.fund_sector_weightings
        
        holdings = []
        
        # Process top holdings
        if isinstance(fund_top_holdings, dict) and symbol in fund_top_holdings:
            holdings_data = fund_top_holdings[symbol]
            if isinstance(holdings_data, list):
                for holding in holdings_data:
                    holdings.append({
                        'name': holding.get('holdingName', 'Unknown'),
                        'symbol': holding.get('symbol', ''),
                        'allocation': round(holding.get('holdingPercent', 0) * 100, 2),
                        'sector': ''  # Sector not available in top holdings
                    })
        
        # Get sector weightings
        sectors = []
        if isinstance(fund_sector_weightings, dict) and symbol in fund_sector_weightings:
            sector_data = fund_sector_weightings[symbol]
            if isinstance(sector_data, list):
                for sector in sector_data:
                    sectors.append({
                        'sector': sector.get('sector', 'Unknown'),
                        'weight': round(sector.get('realtimeValue', 0) * 100, 2)
                    })
        
        return jsonify({
            'symbol': symbol,
            'holdings': holdings,
            'sectors': sectors,
            'totalHoldings': len(holdings),
            'source': 'Yahoo Finance via yahooquery'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'symbol': symbol}), 500

# Combined search and holdings
@app.route('/fund-holdings')
def fund_holdings():
    name = request.args.get('name', '')
    if not name:
        return jsonify({'error': 'Name parameter required'}), 400
    
    try:
        # First search for the fund
        results = search(f"{name} India mutual fund")
        
        symbol = None
        fund_name = name
        
        # Find first valid India fund
        if 'quotes' in results:
            for quote in results['quotes']:
                sym = quote.get('symbol', '')
                if '.BO' in sym or '.NS' in sym or sym.startswith('0P'):
                    symbol = sym
                    fund_name = quote.get('longname', quote.get('shortname', name))
                    break
        
        if not symbol:
            return jsonify({
                'error': 'No matching fund found',
                'query': name,
                'holdings': [],
                'sectors': []
            }), 404
        
        # Get holdings
        ticker = Ticker(symbol)
        fund_top_holdings = ticker.fund_top_holdings
        fund_sector_weightings = ticker.fund_sector_weightings
        
        holdings = []
        if isinstance(fund_top_holdings, dict) and symbol in fund_top_holdings:
            holdings_data = fund_top_holdings[symbol]
            if isinstance(holdings_data, list):
                for holding in holdings_data:
                    holdings.append({
                        'name': holding.get('holdingName', 'Unknown'),
                        'symbol': holding.get('symbol', ''),
                        'allocation': round(holding.get('holdingPercent', 0) * 100, 2)
                    })
        
        sectors = []
        if isinstance(fund_sector_weightings, dict) and symbol in fund_sector_weightings:
            sector_data = fund_sector_weightings[symbol]
            if isinstance(sector_data, list):
                for sector in sector_data:
                    sectors.append({
                        'sector': sector.get('sector', 'Unknown'),
                        'weight': round(sector.get('realtimeValue', 0) * 100, 2)
                    })
        
        return jsonify({
            'query': name,
            'symbol': symbol,
            'fundName': fund_name,
            'holdings': holdings,
            'sectors': sectors,
            'totalHoldings': len(holdings),
            'source': 'Yahoo Finance'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'query': name}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
