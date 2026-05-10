#!/usr/bin/env python3
"""
EduRefer Server Startup Script
This script starts the Flask backend server for EduRefer
"""

import os
import sys

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import and run the Flask app
from app import app

if __name__ == '__main__':
    print("=" * 50)
    print("Starting EduRefer Server...")
    print("=" * 50)
    print("Server will run on: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=True
    )
