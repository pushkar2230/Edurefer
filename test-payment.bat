@echo off
echo ========================================
echo Testing Razorpay Payment Gateway
echo ========================================
echo.
echo 1. Starting server...
echo.

cd /d "%~dp0" && cd c:\Users\Admin\Desktop\EduRefer

python start_server.py

echo.
echo 2. Open browser to: http://localhost:5000/payment-test.html
echo.
echo 3. Test each step:
echo    - Step 1: Check Configuration
echo    - Step 2: Test Order Creation  
echo    - Step 3: Test Payment Processing
echo.
echo ========================================
echo.
echo If all tests pass, the payment gateway is ready!
echo ========================================
pause
