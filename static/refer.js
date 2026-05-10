// refer.js - dynamic referral link + copy helper
// Requires auth.js to be loaded first (checkAuth, getReferralLink, refreshWalletBalance)

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("refLink");
  const usernameEl = document.getElementById("username");

  // Guard: element must exist
  if (!input) {
    console.warn("refer.js: #refLink element not found.");
    return;
  }

  // show placeholder while we check auth
  input.value = "Checking sign-in status...";

  // Check if user is signed in
  const user = await checkAuth();
  if (!user) {
    input.value = "Sign in to get your link...";
    if (usernameEl) usernameEl.textContent = "Guest";
    return;
  }

  // update username if present
  if (usernameEl) usernameEl.textContent = user.username || user.id || "User";

  // refresh wallet (optional, keeps UI in sync)
  await refreshWalletBalance();

  // set referral link
  const link = getReferralLink();
  input.value = link || "No referral code available";

  // attach copy to input's sibling button if needed (or keep global copyLink)
  const copyBtn = input.nextElementSibling;
  if (copyBtn && copyBtn.tagName.toLowerCase() === "button") {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        alert("Referral link copied!");
      } catch (e) {
        // fallback: select & copy
        input.select();
        document.execCommand("copy");
        alert("Referral link copied (fallback)!");
      }
    });
  }
});

// export function in case other scripts call it
async function copyReferralLink() {
  const input = document.getElementById("refLink");
  if (!input || !input.value || input.value.startsWith("Sign in")) {
    return alert("No referral link available. Please sign in.");
  }
  try {
    await navigator.clipboard.writeText(input.value);
    alert("Referral link copied!");
  } catch (e) {
    input.select();
    document.execCommand("copy");
    alert("Referral link copied (fallback)!");
  }
}

// Logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof logout === 'function') {
      logout();
    } else {
      localStorage.clear();
      window.location.href = 'login.html';
    }
  });
}

// Initialize cart count
if (window.cart && typeof window.cart.updateCartCount === 'function') {
  window.cart.updateCartCount();
}

// expose globally if some pages call copyLink() or similar
window.copyReferralLink = copyReferralLink;
