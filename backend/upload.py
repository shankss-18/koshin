from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
import os, shutil, tempfile
from db import db
from bson import ObjectId

upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/chats/<chat_id>/upload", methods=["POST"])
@jwt_required()
def upload(chat_id):
    user_id = get_jwt_identity()

    chat = db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({'message':'Chat not found'}), 404 

    persist_dir = f"./vectorstores/{chat_id}"

    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)

    temp_dir = tempfile.mkdtemp()
    files = request.files.getlist("files")
    pdf_paths = []
    
    for file in files:
        path = os.path.join(temp_dir, file.filename)
        file.save(path)
        pdf_paths.append(path)
        
    all_pages = []
    for pdf, file in zip(pdf_paths, files):
        loader = PyPDFLoader(pdf)
        pages = loader.load()
        for page in pages:
            page.metadata["source"] = file.filename
        all_pages.extend(pages)
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size = 1200,
        chunk_overlap = 400,
        separators=["\n\n", "\n", ". ", " "]
    )
    chunks = text_splitter.split_documents(all_pages)
    embedding_model = HuggingFaceEmbeddings(model_name = 'BAAI/bge-base-en-v1.5')
    Chroma.from_documents(
            embedding=embedding_model,
            documents=chunks,
            persist_directory=persist_dir,
            collection_name=f"chat_{chat_id}"
        )

    filenames = [file.filename for file in files]
    db.chats.update_one(
        {"_id" : ObjectId(chat_id)},
        {"$set" : {"files" : filenames}}
    )
    shutil.rmtree(temp_dir)
    return jsonify({'message':'success'}), 200
