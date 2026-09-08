import os
from groq import AsyncGroq

from .base_adapter import BaseAIAdapter


class GroqAdapter(BaseAIAdapter):
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")

        self.client = AsyncGroq(api_key=api_key)
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    async def generate(self, system_prompt: str, history: list[dict], message: str) -> str:
        # groq uses OpenAI-style chat format: system + history + latest user msg
        messages = [{"role": "system", "content": system_prompt}]
        messages += [{"role": h["role"], "content": h["content"]} for h in history]
        messages.append({"role": "user", "content": message})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
        )
        return response.choices[0].message.content