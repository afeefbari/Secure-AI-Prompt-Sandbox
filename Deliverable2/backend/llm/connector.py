"""
Groq LLM Connector.
API key is loaded server-side from .env — NEVER sent to the client.
Only sanitized, policy-approved prompts reach this module.
"""
from groq import Groq
from config import get_settings
from security.context import get_system_prompt

settings = get_settings()
_client = Groq(api_key=settings.GROQ_API_KEY)

MODEL = "llama-3.3-70b-versatile"


def query_llm(user_prompt: str, history: list[dict] | None = None) -> str:
    """
    Send an approved prompt to Groq and return the response text.
    System prompt is injected server-side — invisible to the user.
    """
    messages = [{"role": "system", "content": get_system_prompt()}]

    if history:
        # Include last 40 messages to give a large context window
        messages.extend(history[-40:])

    messages.append({"role": "user", "content": user_prompt})

    response = _client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return response.choices[0].message.content
