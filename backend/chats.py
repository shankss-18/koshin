from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db
from datetime import datetime
from bson import ObjectId

chats_bp = Blueprint("chats", __name__)

@chats_bp.route("/chats", methods=["POST"])
@jwt_required()
def create_chat():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get("title", "New Chat")

    chat = {
        "user_id": user_id,
        "title": title,
        "created_at": datetime.utcnow()
    }
    result = db.chats.insert_one(chat)

    return jsonify({
        "chat_id": str(result.inserted_id),
        "title": title
    }), 201


@chats_bp.route("/chats", methods=["GET"])
@jwt_required()
def get_chats():
    user_id = get_jwt_identity()
    chats = db.chats.find({"user_id": user_id}).sort("created_at", -1)

    result = [
        {
            "chat_id": str(chat["_id"]),
            "title": chat["title"],
            "created_at": chat["created_at"].isoformat()
        }
        for chat in chats
    ]
    return jsonify(result), 200


@chats_bp.route("/chats/<chat_id>/messages", methods=["GET"])
@jwt_required()
def get_messages(chat_id):
    user_id = get_jwt_identity()

    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    messages = db.messages.find({"chat_id": chat_id}).sort("created_at", 1)
    result = [
        {
            "role": m["role"],
            "content": m["content"],
            "created_at": m["created_at"].isoformat()
        }
        for m in messages
    ]
    return jsonify(result), 200

@chats_bp.route("/chats/<chat_id>", methods=["GET"])
@jwt_required()
def get_chat(chat_id):
    user_id = get_jwt_identity()
    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    import os
    persist_dir = f"./vectorstores/{chat_id}"
    has_documents = os.path.exists(persist_dir) and len(os.listdir(persist_dir)) > 0

    return jsonify({
        "chat_id": str(chat["_id"]),
        "title": chat["title"],
        "has_documents": has_documents,
        "files": chat.get("files", [])
    }), 200

@chats_bp.route("/chats/<chat_id>", methods=["DELETE"])
@jwt_required()
def delete_chat(chat_id):
    user_id = get_jwt_identity()
    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    db.chats.delete_one({"_id": ObjectId(chat_id)})
    db.messages.delete_many({"chat_id": chat_id})

    import shutil, os
    persist_dir = f"./vectorstores/{chat_id}"
    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)

    return jsonify({"message": "Chat deleted"}), 200

@chats_bp.route("/chats/<chat_id>", methods=["PATCH"])
@jwt_required()
def rename_chat(chat_id):
    user_id = get_jwt_identity()
    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    data = request.get_json()
    new_title = data.get("title", "").strip()
    if not new_title:
        return jsonify({"error": "Title cannot be empty"}), 400

    db.chats.update_one({"_id": ObjectId(chat_id)}, {"$set": {"title": new_title}})
    return jsonify({"message": "Title updated", "title": new_title}), 200