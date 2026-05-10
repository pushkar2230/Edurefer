@echo off
echo Setting up Razorpay test environment variables...
echo.
set RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
set RAZORPAY_KEY_SECRET=1234567890abcdef1234567890abcdef
set RAZORPAY_WEBHOOK_SECRET=webhook_secret_123456
echo.
echo Environment variables set for testing!
echo.
echo You can now run: python backend\app.py
echo.
pause
