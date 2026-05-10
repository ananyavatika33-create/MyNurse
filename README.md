# MyNurse

MyNurse is a Streamlit-based personalized health companion MVP that collects user-entered medical history, symptoms, medications, and allergies to generate safe nurse-style guidance.

## Features

- Collects patient profile information
- Tracks symptoms and severity
- Detects red-flag symptoms
- Generates personalized OpenAI-powered responses with a safety wrapper
- Falls back to rule-based responses if OpenAI is unavailable or blocked by safety checks
- Saves symptom history to CSV
- Allows CSV download of symptom history

## Tech Stack

- Python
- Streamlit
- Pandas
- OpenAI API

## How to Run

1. Clone the repository
2. Create and activate a virtual environment
3. Install dependencies:
   pip install -r requirements.txt
4. Run the app:
   streamlit run app.py

## OpenAI Setup (Optional but Recommended)

Set your API key before running:

- macOS/Linux:
  `export OPENAI_API_KEY="your_api_key_here"`
- Optional model override:
  `export OPENAI_MODEL="gpt-4o-mini"`

If no API key is set, the app automatically uses rule-based guidance.

## Example Use Cases

- Headache + migraine history
- Cough + asthma history
- Nausea + medication review context

## Disclaimer

This app is for educational and tracking purposes only. It is not a substitute for professional medical care.
