import os

from .groq_adapter import GroqAdapter
from .base_adapter import BaseAIAdapter

_adapter: BaseAIAdapter | None = None


def get_adapter() -> BaseAIAdapter:
    """
    Singleton adapter instance, picked by AI_PROVIDER env var.
    Add a new provider: write AdapterClass(BaseAIAdapter), import it,
    add one elif branch. Nothing else in the codebase changes.
    """
    global _adapter
    if _adapter is not None:
        return _adapter

    provider = os.getenv("AI_PROVIDER", "groq").lower()

    if provider == "groq":
        _adapter = GroqAdapter()
    # elif provider == "gemini":
    #     _adapter = GeminiAdapter()
    # elif provider == "openai":
    #     _adapter = OpenAIAdapter()
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")

    return _adapter