print("Testing import...")

try:
    import razorpay
    print("✓ Razorpay imported successfully")
except ImportError as e:
    print(f"✗ Import failed: {e}")

try:
    from razorpay_config import RAZORPAY_KEY_ID
    print(f"✓ razorpay_config imported, key: {RAZORPAY_KEY_ID}")
except ImportError as e:
    print(f"✗ razorpay_config import failed: {e}")
