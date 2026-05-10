import os
import uuid
from datetime import datetime
import flask
import flask_cors
from sqlalchemy.engine.base import Engine
from sqlalchemy.sql.functions import user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
import razorpay 
import re
import smtplib

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///edurefer.db")

Engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=Engine)

def is_valid_username(username):
    regex = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(regex, username)

def is_valid_email(email):
    regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(regex, email)

# DB Setup
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_URL = os.environ.get('DATABASE_URL') or f"sqlite:///{os.path.join(BASE_DIR, 'db.sqlite3')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

from email.mime.text import MIMEText

EMAIL = "yourgmail@gmail.com"
PASSWORD = "your_app_password"   # ⚠️ not normal password

def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL
        msg["To"] = to_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)
        server.quit()

    except Exception as e:
        print("Email error:", e)

# Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password = Column(String)
    token = Column(String)
    balance = Column(Float, default=0.0)
    referred_by = Column(Integer, ForeignKey("users.id"))

    # 🔥 ADD THESE
    referrals = Column(Integer, default=0)
    hasPurchased = Column(Integer, default=0)  # Boolean bhi use kar sakta

# 🔥 NEW FIELDS
class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    product_id = Column(Integer)

#🔥 NEW MODEL
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    amount = Column(Integer)
    type = Column(String)   # REFERRAL / PURCHASE / WITHDRAW
    note = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base = declarative_base()

Base.metadata.create_all(bind=engine)

RAZORPAY_KEY = os.getenv("RAZORPAY_KEY")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET")

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))
client = razorpay_client

# App
app = flask.Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)
app.config["SECRET_KEY"] = os.environ.get("LLimVI4cTD0tmLYR2tw4O4rL", "secret")
flask_cors.CORS(app)

# Helpers
def get_user(token, db):
    return db.query(User).filter(User.token == token).first()

# Routes
@app.route("/")
def home():
    return flask.render_template("index.html")

@app.route("/<path:path>")
def serve_static_pages(path):
    return flask.send_from_directory("templates", path)

@app.route("/api/me", methods=["GET"])
def get_me():
    token = flask.request.headers.get("Authorization")
    db = SessionLocal()

    user = get_user(token, db)

    if not user:
        return {"error": "Unauthorized"}, 401

    # count referrals
    referrals = db.query(User).filter(User.referred_by == user.id).count()

    return {
        "username": user.username,
        "balance": user.balance,
        "referrals": referrals
    }


@app.route("/api/register", methods=["POST"])
def register():
    data = flask.request.json
    db = SessionLocal()

    username = data.get("username", "").strip().lower()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    ref_username = data.get("referrer")  # 🔥 NEW

    # 🔒 EMPTY CHECK
    if not username or not email or not password:
        return {"error": "All fields required"}, 400

    # 🔤 USERNAME FORMAT CHECK
    if not is_valid_username(username):
        return {"error": "Username must be 3-20 chars"}, 400

    #invalid refer
    ref_user = None
    if ref_username:
        ref_username = ref_username.lower()
        ref_user = db.query(User).filter(User.username == ref_username).first()

        if not ref_user:
            return {"error": "Invalid referral code"}, 400

    # 📧 EMAIL CHECK
    if not is_valid_email(email):
        return {"error": "Invalid email"}, 400

    # 🔑 PASSWORD CHECK
    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400

    # 🚫 DUPLICATE CHECK
    if db.query(User).filter(User.username == username).first():
        return {"error": "Username already taken"}, 400

    if db.query(User).filter(User.email == email).first():
        return {"error": "Email already registered"}, 400

    # 🔥 FIND REFERRER USER
    ref_user = None
    if ref_username:
        ref_username = ref_username.lower()   # 🔥 ADD THIS

        ref_user = db.query(User).filter(User.username == ref_username).first()

        # ❌ self-referral block
        if ref_user and ref_user.username == username:
            ref_user = None

    # ✅ CREATE USER
    user = User(
        username=username,
        email=email,
        password=generate_password_hash(password),
        token=str(uuid.uuid4()),
        balance=0,
        referrals=0,          # 🔥 ADD
        hasPurchased=False,   # 🔥 ADD
        referred_by=ref_user.id if ref_user else None
    )


    try:
        db.add(user)
        db.commit()
    except:
        db.rollback()
        return {"error": "Registration failed"}, 500

    return {"ok": True}

# Razorpay Order Creation
@app.route("/api/create-order", methods=["POST"])
def create_order():
    body = flask.request.json
    amount = body.get("amount")  # frontend se aayega

    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": str(uuid.uuid4())
    })

    return flask.jsonify(order)


@app.route("/api/payout", methods=["POST"])
def payout():
    token = flask.request.headers.get("Authorization")
    db = SessionLocal()
    user = get_user(token, db)

    if user.balance < 600:
        return {"error": "Minimum ₹600 required"}, 400

    try:
        payout = razorpay_client.payout.create({
            "account_number": "YOUR_RAZORPAY_ACCOUNT_NUMBER",
            "fund_account": {
                "account_type": "bank_account",
                "bank_account": {
                    "name": user.username,
                    "ifsc": "IFSC_CODE",
                    "account_number": "USER_BANK_ACCOUNT"
                }
            },
            "amount": int(user.balance * 100),
            "currency": "INR",
            "mode": "IMPS",
            "purpose": "payout"
        })

        user.balance = 0
        db.commit()

        return {"ok": True, "message": "Payout success", "payout_id": payout["id"]}

    except Exception as e:
        return {"error": str(e)}, 500

# Login
@app.route("/api/login", methods=["POST"])
def login():
    data = flask.request.json
    db = SessionLocal()

    user = db.query(User).filter(User.username == data["username"]).first()
    if not user or not check_password_hash(user.password, data["password"]):
        return {"error": "Invalid"}, 401

    return {"token": user.token, "balance": user.balance}

# Wallet Info
@app.route("/api/wallet", methods=["GET"])
def wallet():
    token = flask.request.headers.get("Authorization")

    if not token:
        return {"error": "Unauthorized"}, 401

    db = SessionLocal()

    user = db.query(User).filter(User.token == token).first()

    if not user:
        return {"error": "Invalid token"}, 401

    return {
        "balance": user.balance,
        "referrals": user.referrals if hasattr(user, "referrals") else 0,
        "username": user.username
    }

# Download PDF (only if purchased)
@app.route("/api/download")
def download_pdf():
    token = flask.request.headers.get("Authorization")
    db = SessionLocal()

    user = get_user(token, db)

    if not user:
        return {"error": "Unauthorized"}, 401

    if not user.hasPurchased:
        return {"error": "Buy product first"}, 403

    return flask.send_file("pdfs/Career Starter Kit.pdf", as_attachment=True)

# Transaction History
@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    token = flask.request.headers.get("Authorization")
    db = SessionLocal()

    user = get_user(token, db)

    if not user:
        return {"error": "Unauthorized"}, 401

    txns = db.query(Transaction)\
        .filter(Transaction.user_id == user.id)\
        .order_by(Transaction.id.desc())\
        .limit(10)\
        .all()

    result = []
    for t in txns:
        result.append({
            "amount": f"+₹{t.amount}" if t.amount > 0 else f"-₹{abs(t.amount)}",
            "type": t.type,
            "note": t.note,
            "date": t.created_at.strftime("%d %b %Y")
        })

    db.close()

    return result

# Recent Activity (for dashboard)
@app.route("/api/activity")
def activity():
    token = flask.request.headers.get("Authorization")
    db = SessionLocal()

    user = get_user(token, db)

    txns = db.query(Transaction)\
        .filter(Transaction.user_id == user.id)\
        .order_by(Transaction.id.desc())\
        .limit(5)\
        .all()

    result = []
    for t in txns:
        result.append({
            "text": t.note,
            "time": t.created_at.strftime("%d %b"),
            "type": t.type
        })

    return result

# Withdraw via UPI
client = razorpay.Client(auth=("rzp_test_Si41deSJCQSby2", "LLimVI4cTD0tmLYR2tw4O4rL"))

# Verify Payment and Reward
@app.route("/api/verify-payment", methods=["POST"])
def verify_payment():
    data = flask.request.json
    db = SessionLocal()   # 🔥 STEP 1: yaha

    try:
        # 🔐 STEP 2: verify payment
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature']
        })

        # 🔥 STEP 3: user nikaal
        token = flask.request.headers.get("Authorization")
        user = db.query(User).filter(User.token == token).first()

        if not user:
            return {"error": "User not found"}, 401

        # 🔥 STEP 4: double reward block
        if user.hasPurchased:
            return {"status": "success"}

        # 🔥 STEP 5: mark purchase
        user.hasPurchased = True

        # 🔥 STEP 6: referral reward
        if user.referred_by:
            referrer = db.query(User).filter(User.id == user.referred_by).first()

            if referrer:
                referrer.balance += 300
                referrer.referrals += 1

        # 🔥 STEP 7: save
        db.commit()

        # ✅ FINAL RETURN (ab yaha hona chahiye)
        return {"status": "success"}

    except razorpay.errors.SignatureVerificationError:
        db.rollback()
        return {"error": "Payment verification failed"}, 400

    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    
# Withdraw via UPI
@app.route("/api/withdraw", methods=["POST"])
def withdraw():
    data = flask.request.json
    token = flask.request.headers.get("Authorization")

    db = SessionLocal()

    user = db.query(User).filter(User.token == token).first()

    if not user:
        return {"error": "Unauthorized"}, 401

    if user.balance < 600:
        return {"error": "Minimum ₹600 required"}, 400

    upi = data.get("upi")

    if not upi:
        return {"error": "UPI required"}, 400

    try:
        # 🔥 1. Create Contact
        contact = client.contact.create({
            "name": user.username,
            "email": user.email,
            "type": "customer"
        })

        # 🔥 2. Create Fund Account
        fund_account = client.fund_account.create({
            "contact_id": contact["id"],
            "account_type": "vpa",
            "vpa": {
                "address": upi
            }
        })

        # 🔥 3. Create Payout
        payout = client.payout.create({
            "account_number": "YOUR_RAZORPAYX_ACCOUNT_NUMBER",
            "fund_account_id": fund_account["id"],
            "amount": int(user.balance * 100),
            "currency": "INR",
            "mode": "UPI",
            "purpose": "payout",
            "queue_if_low_balance": True,
            "reference_id": str(user.id),
            "narration": "EduRefer Withdrawal"
        })

        # 🔥 4. Save transaction (VERY IMPORTANT)
        txn = Transaction(
            user_id=user.id,
            amount=user.balance,
            type="withdraw",
        )
        db.add(txn)

        # 🔥 5. Reset balance
        user.balance = 0
        db.commit()

        return {
            "message": "Money sent successfully 🚀",
            "payout_id": payout["id"]
        }

    except Exception as e:
        return {"error": str(e)}, 500    
    
if __name__ == "__main__":
    app.run(debug=True)