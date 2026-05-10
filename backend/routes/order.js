const orderSchema = {
  userId: String,
  products: [ { name: String, price: Number } ],
  totalAmount: Number,
  status: "paid"
};