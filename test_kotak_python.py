# Kotak Neo API - Using Official Python SDK
# pip install neo-api-client

from neo_api_client import NeoAPI
import json

# Your credentials
CONSUMER_KEY = '8b8fd30e-a2de-4914-ba8b-795c8ef663cb'
MOBILE = '+918851415822'
UCC = 'Y6QV2'
MPIN = '270108'

print("🔐 Kotak Neo API - Python SDK Test")
print("=" * 50)

# Initialize the client - this is the key step!
# The consumer_key goes here, not in login
try:
    client = NeoAPI(
        environment='prod',
        access_token=None,
        neo_fin_key=None,
        consumer_key=CONSUMER_KEY
    )
    print("✅ Client initialized successfully!")
    
    # Now you need to enter TOTP from your authenticator app
    totp = input("\n🔐 Enter your current TOTP code: ")
    
    # Step 1: TOTP Login
    print(f"\n📲 Logging in with TOTP: {totp}")
    login_result = client.totp_login(
        mobile_number=MOBILE,
        ucc=UCC,
        totp=totp
    )
    print(f"Login Result: {json.dumps(login_result, indent=2)}")
    
    # Step 2: Validate with MPIN
    print(f"\n🔑 Validating with MPIN...")
    validate_result = client.totp_validate(mpin=MPIN)
    print(f"Validate Result: {json.dumps(validate_result, indent=2)}")
    
    # Step 3: Get Scrip Master (instruments list)
    print("\n📋 Fetching Scrip Master...")
    scrip_master = client.scrip_master()
    print(f"Scrip Master: {json.dumps(scrip_master, indent=2)}")
    
    # Step 4: Try to get quotes
    print("\n📊 Getting sample quotes...")
    quotes = client.quotes(
        instrument_tokens=[
            {"instrument_token": "11536", "exchange_segment": "nse_cm"}  # RELIANCE
        ],
        quote_type="ltp"
    )
    print(f"Quotes: {json.dumps(quotes, indent=2)}")
    
    print("\n🎉 SUCCESS! API is working!")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
