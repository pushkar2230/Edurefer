# Payment Gateway Test Script
Write-Host "========================================="
Write-Host "Testing Razorpay Payment Gateway"
Write-Host "========================================="
Write-Host ""

Write-Host "Step 1: Check Configuration"
Write-Host "  - Open: http://localhost:5000/payment-test.html"
Write-Host "  - Run tests sequentially"
Write-Host ""

Write-Host "Step 2: Test Order Creation"
Write-Host "  - Click 'Create Test Order (₹500)'"
Write-Host ""

Write-Host "Step 3: Test Payment Processing"
Write-Host "  - Click 'Test Payment Flow'"
Write-Host ""

Write-Host "Expected Results:"
Write-Host "  - All tests should show SUCCESS"
Write-Host "  - If any test fails, check browser console"
Write-Host ""

Write-Host "========================================"
Write-Host "Press any key to exit..."
Write-Host ""

# Wait for user input
$null = $Host.UI.RawUI.ReadKey("Press any key to exit...")
Write-Host ""

Write-Host "Test completed! Opening browser..."
Start-Process "http://localhost:5000/payment-test.html"
