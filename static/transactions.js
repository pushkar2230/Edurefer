// Transaction Types
const TransactionType = {
    PURCHASE: 'purchase',
    REFERRAL_BONUS: 'referral_bonus',
    WITHDRAWAL: 'withdrawal'
};

// Transaction Status
const TransactionStatus = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Products catalog
const PRODUCTS = {
    'digital-marketing': {
        id: 'digital-marketing',
        name: 'Digital Marketing Kit',
        price: 500,
        referralBonus: 300,
        description: 'Complete digital marketing toolkit with templates and guides'
    },
    'social-media': {
        id: 'social-media',
        name: 'Social Media Guide',
        price: 750,
        referralBonus: 400,
        description: 'Comprehensive social media marketing strategies and templates'
    },
    'seo-master': {
        id: 'seo-master',
        name: 'SEO Masterclass',
        price: 1000,
        referralBonus: 600,
        description: 'Advanced SEO techniques and tools for better rankings'
    }
};

// --- Server-aware helpers (use when authenticated) ---
async function fetchTransactionsFromServer() {
    const token = window.getToken ? window.getToken() : null;
    if (!token) return [];
    try {
        const base = window.API_BASE_URL || '';
        const res = await fetch(`${base}/api/transactions`, { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (res.ok && data.ok) return data.transactions;
    } catch (e) {
        console.error('Failed to fetch transactions', e);
    }
    return [];
}

async function createTransactionServer(type, amount, description = '', details = {}) {
    const token = window.getToken ? window.getToken() : null;
    if (!token) throw new Error('Not authenticated');
    const body = { amount: amount, type: type === 'debit' ? 'debit' : type, description };
    try {
        const base = window.API_BASE_URL || '';
        const res = await fetch(`${base}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (e) {
        console.error('Failed to create transaction', e);
        return { ok: false, error: 'network' };
    }
}

async function transferFundsServer(recipientUsername, amount) {
    const token = window.getToken ? window.getToken() : null;
    if (!token) throw new Error('Not authenticated');
    try {
        const base = window.API_BASE_URL || '';
        const res = await fetch(`${base}/api/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ recipient: recipientUsername, amount })
        });
        return await res.json();
    } catch (e) {
        console.error('Transfer failed', e);
        return { ok: false, error: 'network' };
    }
}

async function calculateTotalsFromServer() {
    const tx = await fetchTransactionsFromServer();
    const totalEarnings = tx.filter(t => t.type === 'referral_bonus').reduce((s, t) => s + Number(t.amount), 0);
    const pending = tx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0);
    return { totalEarnings, pending, transactions: tx };
}

// Get all transactions for a user
function getUserTransactions(username) {
    const transactions = JSON.parse(localStorage.getItem('edurefer_transactions') || '[]');
    return transactions.filter(t => t.username === username);
}

// Add a new transaction
function addTransaction(username, type, amount, details = {}) {
    const transactions = JSON.parse(localStorage.getItem('edurefer_transactions') || '[]');
    const newTransaction = {
        id: Date.now().toString(),
        username,
        type,
        amount,
        status: TransactionStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    transactions.push(newTransaction);
    localStorage.setItem('edurefer_transactions', JSON.stringify(transactions));
    
    // Update wallet balance
    if (type !== TransactionType.WITHDRAWAL) {
        updateWalletBalance(amount);
    } else {
        updateWalletBalance(-amount);
    }
    
    // Send notification
    sendNotification(username, type, amount, details);
    
    return newTransaction;
}

// Purchase a product
function purchaseProduct(username, productId) {
    const product = PRODUCTS[productId];
    if (!product) return null;
    // If authenticated with backend, call server purchase endpoint
    const token = window.getToken ? window.getToken() : null;
    if (token) {
        const base = window.API_BASE_URL || '';
        return fetch(`${base}/api/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ product_id: productId })
        }).then(r => r.json()).then(res => {
            if (!res.ok) {
                alert(res.error || 'Purchase failed');
                return null;
            }
            // refresh client-side wallet balance
            if (window.refreshWalletBalance) window.refreshWalletBalance();
            return res;
        }).catch(e => { console.error(e); alert('Purchase error'); return null; });
    }

    // Fallback to localStorage-only purchase
    const balance = getWalletBalance();
    if (balance < product.price) {
        alert('Insufficient balance to purchase this product');
        return null;
    }

    const transaction = addTransaction(username, TransactionType.PURCHASE, -product.price, {
        productId,
        productName: product.name
    });

    // Add product to user's purchases
    const purchases = JSON.parse(localStorage.getItem('edurefer_purchases') || '{}');
    if (!purchases[username]) purchases[username] = [];
    purchases[username].push({
        productId,
        purchaseDate: new Date().toISOString(),
        transactionId: transaction.id
    });
    localStorage.setItem('edurefer_purchases', JSON.stringify(purchases));

    return transaction;
}

// Process a referral
function processReferral(referrerUsername, productId) {
    const product = PRODUCTS[productId];
    if (!product) return null;

    const transaction = addTransaction(referrerUsername, TransactionType.REFERRAL_BONUS, product.referralBonus, {
        productId,
        productName: product.name
    });

    // Update referral stats
    const referrals = JSON.parse(localStorage.getItem('edurefer_referrals') || '{}');
    if (!referrals[referrerUsername]) referrals[referrerUsername] = [];
    referrals[referrerUsername].push({
        productId,
        amount: product.referralBonus,
        date: new Date().toISOString(),
        transactionId: transaction.id
    });
    localStorage.setItem('edurefer_referrals', JSON.stringify(referrals));

    return transaction;
}

// Request a withdrawal
function requestWithdrawal(username, amount) {
    const balance = getWalletBalance();
    if (amount > balance) {
        alert('Insufficient balance for withdrawal');
        return null;
    }

    if (amount < 100) {
        alert('Minimum withdrawal amount is ₹100');
        return null;
    }

    const transaction = addTransaction(username, TransactionType.WITHDRAWAL, amount, {
        status: TransactionStatus.PENDING,
        paymentMethod: 'bank_transfer'
    });

    return transaction;
}

// Get user's purchased products
function getUserPurchases(username) {
    const purchases = JSON.parse(localStorage.getItem('edurefer_purchases') || '{}');
    return purchases[username] || [];
}

// Get user's referral stats
function getUserReferrals(username) {
    const referrals = JSON.parse(localStorage.getItem('edurefer_referrals') || '{}');
    return referrals[username] || [];
}

// Calculate user's total earnings
function calculateTotalEarnings(username) {
    const transactions = getUserTransactions(username);
    return transactions
        .filter(t => t.type === TransactionType.REFERRAL_BONUS && t.status === TransactionStatus.COMPLETED)
        .reduce((sum, t) => sum + t.amount, 0);
}

// Calculate pending earnings
function calculatePendingEarnings(username) {
    const transactions = getUserTransactions(username);
    return transactions
        .filter(t => t.status === TransactionStatus.PENDING)
        .reduce((sum, t) => sum + t.amount, 0);
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

// Send notification (simulated)
function sendNotification(username, type, amount, details = {}) {
    const notifications = JSON.parse(localStorage.getItem('edurefer_notifications') || '{}');
    if (!notifications[username]) notifications[username] = [];
    
    let message = '';
    switch(type) {
        case TransactionType.PURCHASE:
            message = `Purchase successful: ${details.productName} for ₹${Math.abs(amount)}`;
            break;
        case TransactionType.REFERRAL_BONUS:
            message = `Referral bonus received: ₹${amount} for ${details.productName}`;
            break;
        case TransactionType.WITHDRAWAL:
            message = `Withdrawal requested: ₹${amount}`;
            break;
    }

    notifications[username].unshift({
        id: Date.now(),
        type,
        message,
        read: false,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem('edurefer_notifications', JSON.stringify(notifications));
}

// Get user's notifications
function getUserNotifications(username) {
    const notifications = JSON.parse(localStorage.getItem('edurefer_notifications') || '{}');
    return notifications[username] || [];
}

// Mark notification as read
function markNotificationAsRead(username, notificationId) {
    const notifications = JSON.parse(localStorage.getItem('edurefer_notifications') || '{}');
    if (!notifications[username]) return;

    const notification = notifications[username].find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        localStorage.setItem('edurefer_notifications', JSON.stringify(notifications));
    }
}

// Get referral leaderboard
function getReferralLeaderboard() {
    const referrals = JSON.parse(localStorage.getItem('edurefer_referrals') || '{}');
    return Object.entries(referrals)
        .map(([username, refs]) => ({
            username,
            totalReferrals: refs.length,
            totalEarnings: refs.reduce((sum, r) => sum + r.amount, 0)
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10); // Top 10
}