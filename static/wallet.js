document.addEventListener("DOMContentLoaded", async () => {

  const user = await checkAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const balance = await refreshWalletBalance() || 0;

  // Update UI
  document.getElementById("walletBalance").textContent = formatINR(balance);
  document.getElementById("totalEarned").textContent = formatINR(balance);
  document.getElementById("withdrawableBalance").textContent = formatINR(balance);

  // Progress bar
  const percent = Math.min((balance / 600) * 100, 100);
  document.getElementById("progressBar").style.width = percent + "%";

  // Status
  if(balance >= 600){
    document.getElementById("status").innerText = "Ready ✅";
  } else {
    document.getElementById("status").innerText = "Locked 🔒";
  }

});

/* WITHDRAW */
async function handleWithdraw(){
  const token = localStorage.getItem("edurefer_token");

  const res = await fetch("/api/withdraw", {
    method: "POST",
    headers: {
      "Authorization": token
    }
  });

  const data = await res.json();

  if(res.ok){
    alert("Withdrawal successful 💸");
    location.reload();
  } else {
    alert(data.error || "Withdrawal failed");
  }
}

async function refreshWalletBalance(){
  const res = await fetch("/api/wallet", {
    headers: {
      Authorization: localStorage.getItem("edurefer_token")
    }
  });

  const data = await res.json();
  return data.balance;
}

/* FORMAT */
function formatINR(n) {
  return Number(n).toLocaleString('en-IN');
}