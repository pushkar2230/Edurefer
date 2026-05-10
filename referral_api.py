# referral_api.py
from flask import Blueprint, request, jsonify
import sqlite3, os, time, string, random

bp = Blueprint('referral_api', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'edurefer.db')
PRODUCT_PRICE = 500
PAYOUT_PER_REF = 300

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db(); cur = conn.cursor()
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, email TEXT UNIQUE, ref_code TEXT UNIQUE, wallet INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, price INTEGER
    );
    CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER, amount INTEGER, buyer_email TEXT,
      ref_code_used TEXT, created_at INTEGER
    );
    """)
    conn.commit(); conn.close()

def gen_code(n=7):
    import string, random
    return ''.join(random.choice(string.ascii_uppercase+string.digits) for _ in range(n))

@bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(force=True)
    name = (data.get('name') or 'User').strip()
    email = (data.get('email') or '').strip().lower()
    if not email: return jsonify(ok=False, error='Email required'), 400
    conn = db(); cur = conn.cursor()
    code = gen_code()
    for _ in range(5):
        try:
            cur.execute('INSERT INTO users(name,email,ref_code) VALUES (?,?,?)', (name,email,code))
            conn.commit(); break
        except sqlite3.IntegrityError:
            code = gen_code()
    row = cur.execute('SELECT id,name,email,ref_code,wallet FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    return jsonify(ok=True, user=dict(row))

@bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    email = (data.get('email') or '').strip().lower()
    if not email: return jsonify(ok=False, error='Email required'), 400
    conn = db(); cur = conn.cursor()
    row = cur.execute('SELECT id,name,email,ref_code,wallet FROM users WHERE email=?',(email,)).fetchone()
    conn.close()
    if not row: return jsonify(ok=False, error='No account — register first'), 404
    return jsonify(ok=True, user=dict(row))

@bp.route('/api/buy', methods=['POST'])
def buy():
    data = request.get_json(force=True)
    pid = int(data.get('product_id') or 0)
    ref = (data.get('ref_code') or '').strip().upper() or None

    # TODO: Replace with real payment verification (Razorpay webhook)
    amount = PRODUCT_PRICE
    buyer_email = f'buyer{int(time.time())}@demo.local'

    conn = db(); cur = conn.cursor()
    cur.execute('INSERT INTO orders(product_id,amount,buyer_email,ref_code_used,created_at) VALUES (?,?,?,?,?)',
                (pid, amount, buyer_email, ref, int(time.time())))

    if ref:
        u = cur.execute('SELECT id FROM users WHERE ref_code=?',(ref,)).fetchone()
        if u:
            cur.execute('UPDATE users SET wallet = wallet + ? WHERE id=?', (PAYOUT_PER_REF, u['id']))

    conn.commit(); conn.close()
    return jsonify(ok=True)

@bp.route('/api/kpis')
def kpis():
    conn = db(); cur = conn.cursor()
    total_sales = cur.execute('SELECT COUNT(*) c FROM orders').fetchone()['c']
    users = cur.execute('SELECT COUNT(*) c FROM users').fetchone()['c']
    paid = cur.execute('SELECT COALESCE(SUM(wallet),0) s FROM users').fetchone()['s']
    conn.close()
    return jsonify(total_sales=total_sales, users=users, paid=paid)
