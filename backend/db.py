from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGO_URL")

client = MongoClient(uri) 
db = client.get_database("ragchatbot")