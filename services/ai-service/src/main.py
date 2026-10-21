# Ponto de entrada do serviço de IA da Viber (FastAPI).
# A configuração vem do ambiente do processo; este módulo não carrega .env
# automaticamente (regra do repositório — ver etapa 2 do roadmap Viber).
from fastapi import FastAPI

from src.api.viber import router as viber_router

app = FastAPI(title="VERS AI Service", version="0.1.0")

# Rota interna de streaming da Viber (etapa 3); autenticada por token
# entre serviços, sem CORS de navegador.
app.include_router(viber_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vers-ai"}
