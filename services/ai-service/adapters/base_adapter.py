from abc import ABC, abstractmethod


class BaseAIAdapter(ABC):
    """
    Common interface every AI provider adapter must implement.
    main.py only ever talks to this contract — swap Gemini for
    OpenAI/Anthropic/Groq later by adding a new adapter class,
    zero changes needed elsewhere.
    """

    @abstractmethod
    async def generate(self, system_prompt: str, history: list[dict], message: str) -> str:
        """
        system_prompt: weather context + instructions
        history: [{"role": "user"|"assistant", "content": str}, ...]
        message: latest user query
        returns: plain text reply
        """
        raise NotImplementedError