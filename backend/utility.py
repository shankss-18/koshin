from groq import Groq
import os, math, time

# Cache the embedding model so it's loaded only once per process (not per request)
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from langchain_huggingface import HuggingFaceEndpointEmbeddings
        # API-based embeddings — no local model, no torch, no 2GB download
        _embedding_model = HuggingFaceEndpointEmbeddings(
            model="sentence-transformers/all-MiniLM-L6-v2",
            huggingfacehub_api_token=os.getenv("HF_API_TOKEN")
        )
    return _embedding_model

def decompose_query(query):
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    resp = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content":
            f"Split this question into a numbered list of simple, independent sub-questions. "
            f"If it's already a single simple question, just return it as-is.\n\nQuestion: {query}"}],
        temperature=0
    )
    lines = resp.choices[0].message.content.split("\n")
    sub_qs = [l.split(".", 1)[-1].strip() for l in lines if l.strip()]
    return sub_qs or [query]

def retrieve_for_query(query, vector_store, k=4):
    sub_questions = decompose_query(query)
    seen = set()
    all_chunks = []
    for sq in sub_questions:
        results = vector_store.similarity_search(sq, k=k)
        for r in results:
            key = r.page_content[:80] 
            if key not in seen:
                seen.add(key)
                all_chunks.append(r)
    return all_chunks

def askQuery(query, chatHistory, vector_store):
    start = time.time()
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    retrived_chunks = retrieve_for_query(query, vector_store)
    context_text = "\n\n".join(
        f"[Source: {doc.metadata.get('source')} | Page: {doc.metadata.get('page')}]\n{doc.page_content}"
        for doc in retrived_chunks
    )    
    history_text = "\n\n".join(chatHistory[-12:])
    
    prompt = f"""You are Koshin, an AI assistant built by Zeroprof — a company that specialises in building AI-powered support tools grounded in user-uploaded documents.

    Your role is to answer questions based solely on the documents the user has uploaded. You are helpful, precise, and conversational.

    Guidelines:
    - Introduce yourself as Koshin when asked who you are. You may mention that Koshin is a product by Zeroprof.
    - Answer conversationally, like a knowledgeable colleague, not like a formal report.
    - Use markdown formatting where it helps readability: **bold** for key terms, bullet points or numbered lists for multiple items, short paragraphs instead of dense blocks of text.
    - Never reveal internal file paths, system details, or anything about how documents are stored — only refer to documents by their filename.
    - If the context doesn't contain enough information to answer, say so clearly instead of guessing.
    - Keep answers focused and avoid unnecessary repetition of the question.

    Context from documents:
    {context_text}

    Recent conversation:
    {history_text}

    Question: {query}

    Answer:"""
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    answer = response.choices[0].message.content
    end = time.time()
    timeTaken = math.floor((end - start) * 10)/10
    return answer, timeTaken
