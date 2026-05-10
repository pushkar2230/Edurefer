async function buyProduct() {

  const res = await fetch("/api/create-order", {
    method: "POST"
  });

  const order = await res.json();

  const options = {
    key: "YOUR_KEY_ID", 
    amount: order.amount,
    currency: "INR",
    name: "EduRefer",
    description: "Buy Digital Kit",
    order_id: order.id,

    handler: async function (response) {

      alert("Payment Successful ✅");

      // 👉 CALL YOUR BACKEND TO ADD REFERRAL / ACCESS
      await fetch("/api/purchase", {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("edurefer_token")
        }
      });

      location.reload();
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}