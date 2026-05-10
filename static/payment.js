// payment.js - Razorpay payment integration
class PaymentHandler {
    constructor() {
        this.razorpayLoaded = false;
        this.loadRazorpay();
    }

    loadRazorpay() {
        if (window.Razorpay) {
            this.razorpayLoaded = true;
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
            this.razorpayLoaded = true;
            console.log('Razorpay loaded');
        };
        script.onerror = () => {
            console.error('Failed to load Razorpay');
            alert('Payment gateway is currently unavailable. Please try again later.');
        };
        document.head.appendChild(script);
    }

    async createOrder(amount) {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${window.API_BASE_URL || ''}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount })
            });

            const data = await response.json();
            if (!data.ok) {
                throw new Error(data.error || 'Failed to create order');
            }

            return data;
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    async verifyPayment(paymentData) {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${window.API_BASE_URL || ''}/api/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(paymentData)
            });

            const data = await response.json();
            if (!data.ok) {
                throw new Error(data.error || 'Payment verification failed');
            }

            return data;
        } catch (error) {
            console.error('Verify payment error:', error);
            throw error;
        }
    }

    async initiatePayment(amount, options = {}) {
        if (!this.razorpayLoaded) {
            alert('Payment gateway is loading. Please wait...');
            return;
        }

        try {
            // Create order first
            const orderData = await this.createOrder(amount);
            
            // Get user info
            const user = getCurrentUser();
            const userEmail = user?.email || '';
            const userName = user?.username || '';

            // Razorpay options
            const razorpayOptions = {
                key: orderData.key,
                amount: orderData.amount * 100, // Convert to paise
                currency: orderData.currency,
                name: 'EduRefer',
                description: 'Purchase Digital Products',
                order_id: orderData.razorpay_order_id,
                handler: async (response) => {
                    try {
                        // Show processing
                        this.showProcessingModal();
                        
                        // Verify payment
                        const verifyData = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        };
                        
                        await this.verifyPayment(verifyData);
                        
                        // Hide processing
                        this.hideProcessingModal();
                        
                        // Show success
                        this.showSuccessModal();
                        
                        // Clear cart
                        if (window.cart && window.cart.clearCart) {
                            window.cart.clearCart();
                        }
                        
                        // Redirect after delay
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                        
                    } catch (error) {
                        this.hideProcessingModal();
                        this.showErrorModal(error.message);
                    }
                },
                modal: {
                    ondismiss: () => {
                        console.log('Payment modal dismissed');
                    }
                },
                prefill: {
                    email: userEmail,
                    name: userName
                },
                theme: {
                    color: '#008080'
                },
                ...options
            };

            const rzp = new Razorpay(razorpayOptions);
            rzp.open();
            
        } catch (error) {
            console.error('Payment initiation error:', error);
            this.showErrorModal(error.message);
        }
    }

    showProcessingModal() {
        const modal = document.createElement('div');
        modal.className = 'payment-modal processing';
        modal.innerHTML = `
            <div class="payment-modal-content">
                <div class="payment-spinner"></div>
                <h3>Processing Payment...</h3>
                <p>Please wait while we verify your payment.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    hideProcessingModal() {
        const modal = document.querySelector('.payment-modal.processing');
        if (modal) {
            modal.remove();
        }
    }

    showSuccessModal() {
        const modal = document.createElement('div');
        modal.className = 'payment-modal success';
        modal.innerHTML = `
            <div class="payment-modal-content">
                <div class="payment-icon success">✓</div>
                <h3>Payment Successful!</h3>
                <p>Your payment has been verified successfully.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showErrorModal(message) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal error';
        modal.innerHTML = `
            <div class="payment-modal-content">
                <div class="payment-icon error">✗</div>
                <h3>Payment Failed</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Initialize payment handler
window.paymentHandler = new PaymentHandler();

// Add payment modal styles
const paymentStyles = `
<style>
.payment-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.payment-modal-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    max-width: 400px;
    width: 90%;
}

.payment-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #008080;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.payment-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 24px;
    font-weight: bold;
}

.payment-icon.success {
    background: #4caf50;
    color: white;
}

.payment-icon.error {
    background: #f44336;
    color: white;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
}

.btn:hover {
    background: #1d4ed8;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', paymentStyles);
