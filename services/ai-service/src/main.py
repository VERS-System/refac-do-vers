from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VERS AI Service", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vers-ai"}
