# Backend (Flask) for EduRefer

This is a minimal Flask backend intended to serve the existing static frontend files in the project root and provide simple JSON APIs for login, wallet, transactions, and referrals.

Quick start (Windows PowerShell):

```powershell
# Create a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend\requirements.txt

# Start the server
python backend\app.py
```

Server runs on http://localhost:5000 and serves static files from the project root. API endpoints live under `/api/*`.

Notes:
- This is a demo/simple backend. Passwords are stored in plain text for convenience — do not use in production.
- The DB file `backend_data.db` is created in the project root.
- If you want, I can wire the frontend to call these endpoints and update JS files.
