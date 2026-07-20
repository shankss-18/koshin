from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from langchain_chroma import Chroma
from utility import askQuery, get_embedding_model
from db import db
from bson import ObjectId
from datetime import datetime
import os

query_bp = Blueprint("query", __name__)

@query_bp.route("/chats/<chat_id>/query", methods = ["POST"])
@jwt_required()
def query(chat_id):
    user_id = get_jwt_identity()

    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"message":"Chat not found"}), 404
    
    data = request.json
    user_query = data.get("query")

    persist_dir = f"./vectorstores/{chat_id}"
    if not os.path.exists(persist_dir):
        return jsonify({"message":"No documents uploaded"}), 404
    
    embedding_model = get_embedding_model()
    vector_store = Chroma(
        embedding_function=embedding_model,
        persist_directory=persist_dir,
        collection_name=f"chat_{chat_id}"
    )
    
    past_messages = list(
        db.messages.find({"chat_id": chat_id}).sort("created_at", -1).limit(12)
    )
    past_messages.reverse()
    chat_history = [f"{m['role']}: {m['content']}\n" for m in past_messages]
    try:
        answer, time_taken = askQuery(user_query, chat_history, vector_store)

        db.messages.insert_many([
            {"chat_id": chat_id, "role": "user", "content": user_query, "created_at": datetime.utcnow()},
            {"chat_id": chat_id, "role": "assistant", "content": answer, "created_at": datetime.utcnow()}
        ])
        return jsonify({"answer": answer}), 200
    except Exception as e:
        print(e)
        return jsonify({"error":str(e)}), 500