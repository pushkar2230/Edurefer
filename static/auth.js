// ===== CONFIG =====
const API_BASE = window.API_BASE_URL || "";

// ===== TOKEN HELPERS =====
function getToken() {
  return localStorage.getItem("edurefer_token");  // ✅ FIXED
}

function setToken(token) {
  if (!token) return;
  localStorage.setItem("edurefer_token", token);  // ✅ FIXED
}

function clearAuth() {
  localStorage.removeItem("edurefer_token");
  localStorage.removeItem("currentUser");
}

// ===== USER =====
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

// ===== CHECK AUTH =====
async function checkAuth() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`/api/me`, {
      headers: { Authorization: token }
    });

    const data = await res.json();

    // ❌ OLD
    // if (res.ok && data.ok)

    // ✅ NEW FIX
    if (res.ok) {
      setCurrentUser(data);
      return data;
    } else {
      clearAuth();
      return null;
    }

  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

// ===== LOGIN CHECK =====
async function isLoggedIn() {
  const user = await checkAuth();
  return !!user;
}

// ===== WALLET =====
async function getWallet() {
  const token = getToken();

  const res = await fetch(`${API_BASE}/api/wallet`, {
    headers: { Authorization: token }
  });

  const data = await res.json();
  return data.balance || 0;
}

// ===== REFERRAL LINK =====
function getReferralLink() {
  const user = getCurrentUser();
  if (!user) return "";

  return `${location.origin}/?ref=${user.username}`;
}

// ===== LOGOUT =====
async function logout() {
  const token = getToken();

  try {
    await fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      headers: { Authorization: token }
    });
  } catch (e) {}

  clearAuth();
  window.location.href = "login.html";
}

// ===== GLOBAL EXPORT =====
window.getToken = getToken;
window.setToken = setToken;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.checkAuth = checkAuth;
window.isLoggedIn = isLoggedIn;
window.getWallet = getWallet;
window.getReferralLink = getReferralLink;
window.logout = logout;