from flask import Flask, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from query import query_bp
from upload import upload_bp
from auth import auth_bp
from chats import chats_bp

load_dotenv()

app = Flask(__name__)

# Allow all Vercel preview deployments + production + localhost
def get_cors_origin(origin):
    allowed = [
        "http://localhost:5173",
        "https://koshin.vercel.app",
    ]
    if origin and (origin in allowed or "vercel.app" in origin):
        return origin
    return None

CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    r"https://.*\.vercel\.app",
    "https://koshin.vercel.app"
])

from datetime import timedelta
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
# Accept JWT from both cookies AND Authorization header for cross-origin compatibility
app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_COOKIE_SAMESITE'] = 'None'
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
jwt = JWTManager(app)

app.register_blueprint(query_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(chats_bp)

if __name__ == "__main__":
    app.run(debug=True)