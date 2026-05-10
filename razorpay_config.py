# Razorpay Configuration
import os

# Razorpay Test Keys (Replace with your actual keys in production)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_1DP5mmOlF5G6Tf')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '1DP5mmOlF5G6Tf1DP5mmOlF5G6Tf')

# Webhook secret for payment verification
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', 'webhook_secret_123456')

# Initialize Razorpay client
try:
    import razorpay
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    print("Razorpay client initialized successfully")
except ImportError as e:
    print("Warning: Razorpay not installed. Install with: pip install razorpay")
    client = None
except Exception as e:
    print(f"Error initializing Razorpay client: {e}")
    client = None

# Export the client for import in other modules
razorpay_client = client
