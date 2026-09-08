from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from adapters.factory import get_adapter
from core.prompt_builder import build_system_prompt
from core.explain_prompt_builder import build_explain_prompt

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


class ExplainRequest(BaseModel):
    questionType: str  # "rain" | "temperature" | "forecast_change" | "storm_warning"
    weather: dict
    rainIntelligence: dict = {}
    forecastIntelligence: dict = {}
    now: str


class ExplainResponse(BaseModel):
    explanation: str


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


@app.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    try:
        adapter = get_adapter()
        prompt = build_explain_prompt(
            req.questionType, req.weather, req.rainIntelligence, req.forecastIntelligence, req.now
        )

        # single-shot explanation — no conversation history needed
        explanation = await adapter.generate(prompt, [], "Explain this forecast.")
        return ExplainResponse(explanation=explanation)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))