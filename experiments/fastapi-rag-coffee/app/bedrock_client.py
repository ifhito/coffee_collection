import httpx
from .settings import settings


class BedrockProxy:
    def __init__(self, base_url: str):
        if not base_url:
            raise ValueError("LAMBDA_API_URL is required")
        self.base_url = base_url

    def embed(self, text: str) -> list[float]:
        """Calls Lambda proxy with action=embed and returns embedding array."""
        payload = {"action": "embed", "text": text}
        r = httpx.post(
            self.base_url,
            json=payload,
            headers={"accept": "application/json"},
            timeout=60,
        )
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Lambda embed failed: {r.status_code} {r.text[:400]}") from e
        ct = r.headers.get("content-type", "")
        text_body = r.text or ""
        if "application/json" not in ct:
            raise RuntimeError(f"Lambda embed returned non-JSON ({ct}): {text_body[:400]}")
        try:
            data = r.json()
        except Exception as e:  # pragma: no cover
            raise RuntimeError(f"Lambda embed returned invalid JSON: {text_body[:400]}") from e
        emb = data.get("embedding")
        if not isinstance(emb, list):
            raise RuntimeError("Invalid embedding response: missing 'embedding' list")
        return [float(x) for x in emb]

    def generate(self, system: str, user_text: str, max_tokens: int) -> str:
        payload = {
            "action": "generate",
            "system": system,
            "userText": user_text,
            "maxTokens": max_tokens,
            # Ask Lambda to return JSON explicitly
            "json": True,
        }
        r = httpx.post(
            self.base_url,
            json=payload,
            headers={"accept": "application/json"},
            timeout=120,
        )
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Lambda generate failed: {r.status_code} {r.text[:400]}") from e
        ct = r.headers.get("content-type", "")
        text_body = r.text or ""
        if "application/json" not in ct:
            raise RuntimeError(f"Lambda generate returned non-JSON ({ct}): {text_body[:400]}")
        try:
            data = r.json()
        except Exception as e:  # pragma: no cover
            raise RuntimeError(f"Lambda generate returned invalid JSON: {text_body[:400]}") from e
        return data.get("text", "")


bedrock = BedrockProxy(settings.lambda_api_url) if settings.lambda_api_url else None
