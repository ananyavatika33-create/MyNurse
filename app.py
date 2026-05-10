import streamlit as st
import pandas as pd
from datetime import datetime
import os
from typing import Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

st.set_page_config(page_title="MyNurse", layout="wide")

st.title("MyNurse")
st.subheader("Personal Health Companion")

st.write(
    "This app is for health education and tracking only. "
    "It is not a substitute for professional medical care."
)

HISTORY_FILE = "symptom_history.csv"

def load_history():
    if os.path.exists(HISTORY_FILE):
        return pd.read_csv(HISTORY_FILE)
    return pd.DataFrame(columns=[
        "Time", "Name", "Age", "Conditions", "Medications",
        "Allergies", "Symptom", "Severity", "Duration"
    ])

def save_history(df):
    df.to_csv(HISTORY_FILE, index=False)

history_df = load_history()

st.markdown("## Health Check-In")

st.sidebar.header("AI Settings")
use_ai_guidance = st.sidebar.toggle("Use OpenAI guidance", value=True)
api_key_present = bool(os.getenv("OPENAI_API_KEY"))
st.sidebar.caption(f"API key detected: {'Yes' if api_key_present else 'No'}")
st.sidebar.caption(f"OpenAI package available: {'Yes' if OpenAI is not None else 'No'}")
st.sidebar.caption(f"Model: {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")

if st.sidebar.button("Test OpenAI connection"):
    if OpenAI is None:
        st.sidebar.error("OpenAI package is not installed in this environment.")
    elif not api_key_present:
        st.sidebar.error("OPENAI_API_KEY is not set.")
    else:
        try:
            model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            test_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            test_response = test_client.responses.create(
                model=model_name,
                input="Reply with exactly: CONNECTED",
                max_output_tokens=10,
            )
            test_text = (test_response.output_text or "").strip().upper()
            if "CONNECTED" in test_text:
                st.sidebar.success("OpenAI connection successful.")
            else:
                st.sidebar.warning(
                    "OpenAI responded, but test output was unexpected."
                )
        except Exception as exc:
            st.sidebar.error(f"OpenAI connection failed: {exc}")

col_a, col_b = st.columns(2)
with col_a:
    name = st.text_input("Name (optional)")
with col_b:
    age = st.number_input("Age", min_value=0, max_value=120, step=1)

conditions = st.text_area(
    "Known medical conditions (example: asthma, diabetes, migraine)"
)
medications = st.text_area("Current medications (optional)")
allergies = st.text_area("Known allergies (optional)")

symptom = st.text_input(
    "Main symptom today (example: headache, fever, cough, sore throat)"
)

col_c, col_d = st.columns(2)
with col_c:
    severity = st.slider("Symptom severity (1 = mild, 10 = severe)", 1, 10, 5)
with col_d:
    duration = st.text_input("How long have you had this symptom?")

red_flag_terms = [
    "chest pain",
    "shortness of breath",
    "trouble breathing",
    "can't breathe",
    "cannot breathe",
    "severe bleeding",
    "heavy bleeding",
    "stroke",
    "face drooping",
    "weakness on one side",
    "seizure",
    "passed out",
    "fainted",
    "suicidal",
    "suicide",
    "anaphylaxis",
    "allergic reaction",
]

def has_red_flag(text: str) -> bool:
    text = text.lower()
    return any(term in text for term in red_flag_terms)

def emergency_response():
    return """
**Possible concern:** Your symptom could be serious.

**What to do now:** Please seek urgent medical care right away or call emergency services.

**Why:** Trouble breathing, chest pain, and similar symptoms can sometimes need immediate evaluation.

**Important:** Do not wait for an online tool if symptoms are severe or getting worse.
"""

def nurse_response(symptom, severity, duration, conditions, medications, allergies):
    symptom_lower = symptom.lower()
    conditions_lower = conditions.lower() if conditions else ""
    medications_lower = medications.lower() if medications else ""
    allergies_lower = allergies.lower() if allergies else ""

    if has_red_flag(symptom_lower):
        return emergency_response()

    extra_notes = []

    if medications_lower.strip():
        extra_notes.append(
            "Because you listed medications, consider whether this symptom started after beginning or changing a medicine."
        )

    if allergies_lower.strip():
        extra_notes.append(
            "Since you listed allergies, be cautious with any new medicine, food, or trigger that may be related."
        )

    if "asthma" in conditions_lower and (
        "cough" in symptom_lower or "shortness of breath" in symptom_lower
    ):
        extra_notes.append(
            "Because you listed asthma, breathing-related symptoms deserve closer attention."
        )

    if "migraine" in conditions_lower and "headache" in symptom_lower:
        extra_notes.append(
            "Because you listed migraine history, this headache may be related to your usual pattern unless it feels different or more severe than normal."
        )

    if "diabetes" in conditions_lower and (
        "dizzy" in symptom_lower or "nausea" in symptom_lower or "fatigue" in symptom_lower
    ):
        extra_notes.append(
            "Because you listed diabetes, symptoms like dizziness, nausea, or fatigue may deserve closer monitoring."
        )

    if "headache" in symptom_lower:
        response = """
**Possible concern:** This may be a mild to moderate headache, depending on the cause.

**What to monitor:** Watch for worsening pain, vomiting, confusion, vision changes, or fever.

**Self-care:** Rest, hydrate, and avoid too much screen time. If you normally use over-the-counter pain relief and it is safe for you, follow the label directions.

**When to get help:** If the headache becomes severe, lasts longer than expected, or you develop new symptoms, contact a clinician.
"""
    elif "nausea" in symptom_lower:
        response = f"""
**Possible concern:** Nausea can happen for many reasons, including infection, food issues, stress, or medication effects.

**What to monitor:** Watch for vomiting, dehydration, dizziness, fever, or worsening pain.

**Self-care:** Try small sips of water, bland foods, and rest.

**When to get help:** If you cannot keep fluids down, symptoms worsen, or it continues for {duration if duration else 'a prolonged period'}, contact a clinician.
"""
    elif "cough" in symptom_lower:
        response = f"""
**Possible concern:** This may be related to irritation, a cold, allergies, or another respiratory issue.

**What to monitor:** Watch for fever, worsening mucus, chest discomfort, or shortness of breath.

**Self-care:** Rest, fluids, and avoiding irritants may help.

**When to get help:** Because your severity is {severity}/10, consider clinician follow-up if this does not improve or worsens.
"""
    elif "fever" in symptom_lower:
        response = """
**Possible concern:** Fever can happen with infections or other inflammatory causes.

**What to monitor:** Check temperature, chills, hydration, body aches, and how long it lasts.

**Self-care:** Rest, fluids, and temperature monitoring can help.

**When to get help:** If fever is high, lasts more than a couple days, or comes with worsening symptoms, contact a clinician.
"""
    elif "sore throat" in symptom_lower:
        response = f"""
**Possible concern:** A sore throat may be caused by a viral infection, irritation, allergies, or sometimes bacterial infection.

**What to monitor:** Watch for high fever, trouble swallowing, white patches in the throat, or worsening pain.

**Self-care:** Hydration, warm fluids, rest, and throat-soothing remedies may help.

**When to get help:** If it lasts beyond {duration if duration else 'a few days'}, worsens, or you have trouble swallowing/breathing, contact a clinician promptly.
"""
    elif "abdominal pain" in symptom_lower or "stomach pain" in symptom_lower:
        response = """
**Possible concern:** Stomach or abdominal pain can have many causes, from mild digestive upset to more serious conditions.

**What to monitor:** Watch for persistent pain, vomiting, fever, blood in stool, or pain that localizes and worsens.

**Self-care:** Try rest, hydration, and bland foods while avoiding triggers.

**When to get help:** Seek urgent care for severe or worsening pain, especially if paired with vomiting, fever, or faintness.
"""
    elif "dizzy" in symptom_lower or "dizziness" in symptom_lower:
        response = """
**Possible concern:** Dizziness can happen with dehydration, low blood pressure, medication effects, inner ear issues, or other causes.

**What to monitor:** Track episodes, balance problems, headache, palpitations, chest pain, or fainting.

**Self-care:** Sit or lie down during episodes, hydrate, and stand up slowly.

**When to get help:** If dizziness is frequent, severe, or associated with fainting, chest pain, weakness, or confusion, seek immediate care.
"""
    elif "rash" in symptom_lower or "hives" in symptom_lower:
        response = """
**Possible concern:** A rash may be due to irritation, allergy, infection, or another inflammatory cause.

**What to monitor:** Watch for spreading rash, fever, swelling of lips/tongue, pain, or skin peeling.

**Self-care:** Avoid potential triggers, keep skin clean/dry, and avoid scratching.

**When to get help:** Get urgent help if you develop facial swelling or trouble breathing. Otherwise, contact a clinician if the rash worsens or does not improve.
"""
    else:
        response = f"""
**Possible concern:** Your symptom needs monitoring, but more detail would help.

**What to monitor:** Keep track of severity, how long it lasts, and whether any new symptoms appear.

**Self-care:** Rest, hydration, and symptom tracking may help depending on the cause.

**When to get help:** Since your symptom severity is {severity}/10, contact a clinician if it worsens, lasts longer, or interferes with daily activity.
"""

    if extra_notes:
        response += "\n\n**Personalized considerations:**\n"
        for note in extra_notes:
            response += f"- {note}\n"

    return response

def _is_ai_output_safe(response_text: str) -> bool:
    """Basic output guardrail to avoid risky medical instructions."""
    text = (response_text or "").lower()
    blocked_phrases = [
        "i diagnose",
        "you have",
        "definitely",
        "guaranteed",
        "ignore emergency",
        "do not seek medical care",
        "take double dose",
        "stop all medications immediately",
    ]
    return not any(phrase in text for phrase in blocked_phrases)

def generate_openai_guidance(
    symptom: str,
    severity: int,
    duration: str,
    conditions: str,
    medications: str,
    allergies: str,
    fallback_text: str,
) -> tuple[str, str, Optional[str]]:
    """
    Returns (guidance, source_label, debug_reason).
    source_label is used to show whether guidance came from AI or fallback logic.
    debug_reason explains fallback cause for troubleshooting.
    """
    if has_red_flag(symptom):
        return emergency_response(), "safety-emergency", "Red-flag symptom bypassed AI."

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        if not api_key:
            return fallback_text, "rule-based-fallback", "Missing OPENAI_API_KEY."
        return fallback_text, "rule-based-fallback", "OpenAI package not installed."

    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    system_prompt = (
        "You are a cautious health-education assistant for a non-diagnostic symptom tracker. "
        "Never diagnose, never prescribe, and never claim certainty. "
        "Always include: Possible concern, What to monitor, Self-care, and When to get help. "
        "If severity is high (>=8), strongly suggest prompt clinician follow-up. "
        "If symptom appears urgent, advise emergency care immediately."
    )
    user_prompt = f"""
User context:
- Symptom: {symptom}
- Severity (1-10): {severity}
- Duration: {duration if duration else 'Not entered'}
- Conditions: {conditions if conditions else 'None entered'}
- Medications: {medications if medications else 'None entered'}
- Allergies: {allergies if allergies else 'None entered'}

Use this style exactly with markdown headings:
**Possible concern:**
**What to monitor:**
**Self-care:**
**When to get help:**
Keep total response concise and supportive.
"""

    try:
        completion = client.responses.create(
            model=model_name,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_output_tokens=350,
        )
        ai_text = completion.output_text.strip() if completion.output_text else ""
        if not ai_text or not _is_ai_output_safe(ai_text):
            return fallback_text, "rule-based-fallback", "AI output blocked or empty."
        return ai_text, "openai-generated", None
    except Exception as exc:
        return fallback_text, "rule-based-fallback", f"OpenAI call failed: {exc}"

if st.button("Get nurse guidance"):
    if symptom:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        new_entry = pd.DataFrame([{
            "Time": timestamp,
            "Name": name if name else "Unknown",
            "Age": age,
            "Conditions": conditions if conditions else "None entered",
            "Medications": medications if medications else "None entered",
            "Allergies": allergies if allergies else "None entered",
            "Symptom": symptom,
            "Severity": severity,
            "Duration": duration if duration else "Not entered"
        }])

        history_df = pd.concat([history_df, new_entry], ignore_index=True)
        save_history(history_df)

        st.success(f"Hi {name if name else 'there'} — I understand you're dealing with {symptom}.")

        st.write("### Check-In Summary")
        st.write(f"**Age:** {age}")
        st.write(f"**Conditions:** {conditions if conditions else 'None entered'}")
        st.write(f"**Medications:** {medications if medications else 'None entered'}")
        st.write(f"**Allergies:** {allergies if allergies else 'None entered'}")
        st.write(f"**Symptom:** {symptom}")
        st.write(f"**Severity:** {severity}/10")
        st.write(f"**Duration:** {duration if duration else 'Not entered'}")

        if has_red_flag(symptom):
            st.error(
                "This symptom may need urgent medical attention. "
                "Please contact emergency services or seek immediate care right away."
            )
        elif severity >= 8:
            st.warning(
                "Your symptom severity is high. You should consider contacting a clinician or urgent care as soon as possible."
            )
        else:
            st.info(
                "This does not appear to be an emergency based on the information entered, but monitor your symptoms and contact a clinician if things worsen."
            )

        st.write("### MyNurse Guidance")
        fallback_guidance = nurse_response(
            symptom, severity, duration, conditions, medications, allergies
        )
        if use_ai_guidance:
            final_guidance, source_label, debug_reason = generate_openai_guidance(
                symptom=symptom,
                severity=severity,
                duration=duration,
                conditions=conditions,
                medications=medications,
                allergies=allergies,
                fallback_text=fallback_guidance,
            )
        else:
            final_guidance, source_label, debug_reason = (
                fallback_guidance,
                "rule-based-fallback",
                "AI toggle is turned off.",
            )
        st.markdown(final_guidance)

        if source_label == "openai-generated":
            st.caption("Guidance source: OpenAI-generated response with safety wrapper.")
        elif source_label == "safety-emergency":
            st.caption("Guidance source: Safety wrapper emergency path.")
        else:
            st.caption("Guidance source: Rule-based fallback.")

        if debug_reason:
            st.info(f"AI status: {debug_reason}")
    else:
        st.warning("Please enter your main symptom first.")

st.write("### Symptom History")
history_df = load_history()

if not history_df.empty:
    st.dataframe(history_df, use_container_width=True)

    history_col_1, history_col_2 = st.columns([2, 1])
    with history_col_1:
        csv = history_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="Download history as CSV",
            data=csv,
            file_name="symptom_history.csv",
            mime="text/csv"
        )
    with history_col_2:
        if st.button("Clear History", type="secondary"):
            save_history(pd.DataFrame(columns=history_df.columns))
            st.success("Symptom history was cleared.")
            st.rerun()
else:
    st.write("No symptom history yet.")