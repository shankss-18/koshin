from flask_jwt_extended.utils import create_access_token, set_access_cookies, unset_jwt_cookies
import bcrypt
from flask import Blueprint, request, jsonify
import bcrypt
from db import db 
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    if not len(password) >= 3:
        return jsonify({"error": "Password must be at least 3 characters"}), 400
    
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 409
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    })

    return jsonify({"success": True, "message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data["email"]
    password = data["password"]

    user = db.users.find_one({"email": email})

    if not user or not bcrypt.checkpw(password.encode('utf-8'), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    
    access_token = create_access_token(identity=str(user["_id"]))
    response = jsonify({"success":True, "message":"Logged in", "token": access_token})
    set_access_cookies(response, access_token)

    return response, 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({"success":True, "message":"Logged out"})
    unset_jwt_cookies(response)

    return response, 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    return jsonify({"user_id": user_id}), 200