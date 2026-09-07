from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from adapters.factory import get_adapter
from core.prompt_builder import build_system_prompt

app = FastAPI(title="WeatherGPT AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to Node API's origin in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    weather: dict
    history: list[ChatMessage] = []
    now: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        adapter = get_adapter()
        system_prompt = build_system_prompt(req.weather, req.now)
        history = [h.model_dump() for h in req.history]

        reply = await adapter.generate(system_prompt, history, req.message)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))