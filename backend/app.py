from flask import Flask
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
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "https://koshin.vercel.app"  # ← Replace with your actual Vercel URL after deploying frontend
])
from datetime import timedelta
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_COOKIE_SAMESITE'] = 'None'
jwt = JWTManager(app)

app.register_blueprint(query_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(chats_bp)

if __name__ == "__main__":
    app.run(debug=True)