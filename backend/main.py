from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

app = FastAPI(title="MyNurse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Safety ────────────────────────────────────────────────────────────────────

EMERGENCY_TERMS = [
    "chest pain", "chest pressure", "shortness of breath", "trouble breathing",
    "can't breathe", "cannot breathe", "severe bleeding", "heavy bleeding",
    "stroke", "face drooping", "weakness on one side", "seizure",
    "passed out", "fainted", "fainting", "suicidal", "suicide", "self-harm",
    "anaphylaxis", "severe allergic reaction", "throat swelling", "blue lips",
    "worst headache", "severe abdominal pain",
]

BLOCKED_PHRASES = [
    "i diagnose", "you have", "definitely", "guaranteed",
    "ignore emergency", "do not seek medical care",
    "take double dose", "stop all medications immediately",
    "no need to see a doctor",
]

EMERGENCY_RESPONSE = (
    "This sounds like it could be a medical emergency.\n\n"
    "Please call 911 (or your local emergency number) or go to the nearest emergency room immediately.\n\n"
    "Do not wait — symptoms like chest pain, difficulty breathing, stroke signs, "
    "severe bleeding, or severe allergic reactions need immediate in-person evaluation.\n\n"
    "This app cannot handle emergencies. Please get help now."
)


def has_emergency_flag(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in EMERGENCY_TERMS)


def is_safe_output(text: str) -> bool:
    lower = text.lower()
    return not any(phrase in lower for phrase in BLOCKED_PHRASES)


# ── System prompt ─────────────────────────────────────────────────────────────

def build_system_prompt(profile: Optional[dict]) -> str:
    profile_lines = []
    if profile:
        if profile.get("firstName"):
            profile_lines.append(f"Name: {profile['firstName']}")
        if profile.get("age"):
            profile_lines.append(f"Age: {profile['age']}")
        if profile.get("sex"):
            profile_lines.append(f"Sex: {profile['sex']}")
        if profile.get("weight"):
            unit = profile.get("weightUnit", "lbs")
            profile_lines.append(f"Weight: {profile['weight']} {unit}")
        if profile.get("diet") and profile["diet"] != "No preference":
            profile_lines.append(f"Diet: {profile['diet']}")
        if profile.get("conditions"):
            profile_lines.append(f"Known conditions: {profile['conditions']}")
        if profile.get("medications"):
            profile_lines.append(f"Current medications: {profile['medications']}")
        if profile.get("allergies"):
            profile_lines.append(f"Known allergies: {profile['allergies']}")

    profile_section = (
        "\n\nUser profile:\n" + "\n".join(f"- {l}" for l in profile_lines)
        if profile_lines else ""
    )

    return f"""You are MyNurse, a friendly and empathetic health education assistant built into a personal health app. Your role is to help users understand their symptoms, suggest appropriate remedies, and know when to seek professional care.{profile_section}

Your personality and approach:
- Warm, conversational, and empathetic — like a knowledgeable friend, not a clinical checklist
- Ask thoughtful follow-up questions before jumping to conclusions
- Give specific, actionable guidance including relevant OTC medications by name (brand + generic) when helpful
- Personalise responses using the user's profile — factor in their age, medications, allergies, conditions, and diet
- Flag potential medication interactions when the user is already taking something
- Keep responses concise and readable — avoid long walls of text

Safety rules (non-negotiable):
- For ANY emergency symptom (chest pain, difficulty breathing, stroke symptoms, severe allergic reaction, suicidal thoughts, heavy bleeding), immediately tell the user to call 911 or go to the ER — do not continue with advice
- For high severity (8–10/10), strongly recommend seeing a doctor or urgent care the same day
- NEVER diagnose a specific condition — use "may", "could", "often", "sometimes"
- NEVER recommend changing or stopping prescription medications
- Always clarify you are not a replacement for professional medical advice

Format:
- Write conversationally, not in bullet lists (OTC options are an exception)
- End most responses with a follow-up question or invitation to share more
- Keep responses under 200 words unless the situation genuinely warrants more"""


# ── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    profile: Optional[dict] = None


class ChatResponse(BaseModel):
    content: str
    source: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    api_key = os.getenv("OPENAI_API_KEY")
    return {
        "status": "ok",
        "ai_available": bool(api_key and OpenAI),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Emergency check — bypass AI entirely
    last_user = next(
        (m for m in reversed(req.messages) if m.role == "user"), None
    )
    if last_user and has_emergency_flag(last_user.content):
        return ChatResponse(content=EMERGENCY_RESPONSE, source="emergency_template")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        raise HTTPException(status_code=503, detail="AI not configured on server")

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    system_prompt = build_system_prompt(req.profile)
    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        text = (completion.choices[0].message.content or "").strip()

        if not text or not is_safe_output(text):
            raise HTTPException(status_code=422, detail="AI output blocked by safety filter")

        return ChatResponse(content=text, source="ai_generated")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI call failed: {e}")
