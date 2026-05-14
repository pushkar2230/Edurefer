import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# DB Setup
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_URL = os.environ.get('DATABASE_URL') or f"sqlite:///{os.path.join(BASE_DIR, 'db.sqlite3')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

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

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    amount = Column(Float)
    type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# App
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "secret")
CORS(app)

# Helpers
def get_user(token, db):
    return db.query(User).filter(User.token == token).first()

# Routes

@app.route("/")
def home():
    return "Edurefer Running 🚀"

# Register
@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    db = SessionLocal()

    if db.query(User).filter(User.username == data["username"]).first():
        return {"error": "Username exists"}, 400

    user = User(
        username=data["username"],
        email=data["email"],
        password=generate_password_hash(data["password"]),
        token=str(uuid.uuid4()),
        balance=0
    )

    db.add(user)
    db.commit()
    return {"ok": True}

# Login
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    db = SessionLocal()

    user = db.query(User).filter(User.username == data["username"]).first()
    if not user or not check_password_hash(user.password, data["password"]):
        return {"error": "Invalid"}, 401

    return {"token": user.token, "balance": user.balance}

# Purchase (simulate)
@app.route("/api/purchase", methods=["POST"])
def purchase():
    token = request.headers.get("Authorization")
    db = SessionLocal()
    user = get_user(token, db)

    if not user:
        return {"error": "Invalid"}, 401

    # simulate purchase
    user.balance += 250  # referral logic placeholder

    db.commit()
    return {"ok": True, "balance": user.balance}

# Withdraw
@app.route("/api/withdraw", methods=["POST"])
def withdraw():
    token = request.headers.get("Authorization")
    db = SessionLocal()
    user = get_user(token, db)

    if user.balance < 600:
        return {"error": "Minimum ₹600 required"}, 400

    user.balance = 0
    db.commit()

    return {"ok": True, "message": "Withdraw success"}

if __name__ == "__main__":
    app.run()