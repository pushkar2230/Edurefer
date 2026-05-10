// simple-cart.js - A minimal, working cart implementation
console.log('Simple cart loaded');

// Initialize cart if it doesn't exist
if (!localStorage.getItem('edurefer_cart')) {
    localStorage.setItem('edurefer_cart', JSON.stringify([]));
}

// Cart functions
const cart = {
    // Get current cart from localStorage
    getCart() {
        try {
            return JSON.parse(localStorage.getItem('edurefer_cart') || '[]');
        } catch (e) {
            console.error('Error getting cart:', e);
            return [];
        }
    },

    // Save cart to localStorage
    saveCart(cartItems) {
        try {
            localStorage.setItem('edurefer_cart', JSON.stringify(cartItems));
            this.updateCartCount();
            return true;
        } catch (e) {
            console.error('Error saving cart:', e);
            return false;
        }
    },

    // Add item to cart
    addToCart(product) {
        if (!product || !product.id) {
            console.error('Invalid product');
            return false;
        }

        const cart = this.getCart();
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }

        return this.saveCart(cart);
    },

    // Update cart count in the UI
    updateCartCount() {
        try {
            const cart = this.getCart();
            const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelectorAll('.cart-badge').forEach(badge => {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            });
            return count;
        } catch (e) {
            console.error('Error updating cart count:', e);
            return 0;
        }
    },

    // Show notification
    showNotification(message) {
        // Remove any existing notifications
        const existing = document.getElementById('cart-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'cart-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Initialize cart functionality
    initCart() {
        console.log('Initializing cart...');
        this.updateCartCount();
        
        // Add click handler for add-to-cart buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-cart-btn');
            if (!btn) return;

            e.preventDefault();
            
            const product = {
                id: btn.dataset.productId,
                name: btn.dataset.productName,
                price: parseFloat(btn.dataset.productPrice || '0')
            };

            if (this.addToCart(product)) {
                this.showNotification('Added to cart!');
            }
        });
    }
};

// Make cart available globally
window.cart = cart;

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cart.initCart());
} else {
    cart.initCart();
}

// Add styles for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('Simple cart initialized');