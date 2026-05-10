# Deploying EduRefer Backend (Render) with Supabase and Razorpay

This guide shows how to deploy the Flask backend to Render (or Railway) and use Supabase (Postgres) for the database. The frontend can be deployed to Vercel and configured to call the backend API URL.

Required services
- Supabase (Postgres) — create a new project and get the DATABASE_URL/connection string.
- Render (or Railway) — create a new Web Service from this repository and set environment variables.
- (Optional) Razorpay — get `RAZORPAY_KEY_ID` and `RAZORPAY_SECRET` for payments.

Required environment variables (set in Render Dashboard -> Environment):
- DATABASE_URL - Postgres connection string (from Supabase)
- RAZORPAY_KEY_ID - (optional) Razorpay Key ID
- RAZORPAY_SECRET - (optional) Razorpay Secret
- PORT - (Render sets this automatically)

Steps
1. Create Supabase project and database.
   - Create a free project at https://app.supabase.com/
   - Get the `Connection string` (Postgres) from the project settings and copy it.

2. Configure Render
   - Create a new Web Service → Connect your GitHub repo → select this project folder.
   - Runtime: Python 3.x
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`
   - Set the environment variables listed above.

3. Deploy and visit the deployed backend URL.
   - Optionally call `GET /api/init` to ensure the DB tables are created.

4. Frontend (Vercel)
   - Deploy the frontend (root of the repo) on Vercel.
   - Set an environment variable `API_BASE_URL` pointing to the Render service URL, if you prefer absolute URLs.
   - The frontend currently calls relative `/api/*` paths; when hosting separately, update frontend code to prefix the backend URL (we can add a small `config.js` if needed).

Notes
- The backend uses SQLAlchemy to support Postgres (Supabase) and local SQLite for development.
- For payment flows, use the `/api/create-order` and `/api/verify-payment` endpoints. Complete production flow requires mapping orders to users and crediting wallets when payment is verified.

Security
- Never commit secrets to source control. Add them in Render's env var UI.
- Use HTTPS endpoints for production.

If you'd like, I can prepare a `render.yaml` or direct deployment setup and a small `config.js` in the frontend that reads `API_BASE_URL` from env for Vercel. Let me know and I will add those files next.
