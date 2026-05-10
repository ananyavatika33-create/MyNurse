import { SafetyOutcome, UserProfile } from './types';
import { hasEmergencyRedFlag, EMERGENCY_GUIDANCE } from './safety';

export type ChatStep =
  | 'ask_symptom'
  | 'ask_severity'
  | 'ask_followup'
  | 'guidance_given'
  | 'emergency';

export interface ChatState {
  step: ChatStep;
  symptom: string;
  severity: number;
  followupContext: string;
  safetyOutcome: SafetyOutcome;
}

export function getInitialState(): ChatState {
  return {
    step: 'ask_symptom',
    symptom: '',
    severity: 0,
    followupContext: '',
    safetyOutcome: 'unknown',
  };
}

export function getGreeting(profile: UserProfile | null): string {
  const name = profile?.firstName ? `, ${profile.firstName}` : '';
  return `Hi${name}! I'm your MyNurse assistant — here to help you understand symptoms, find remedies, and know when to seek care.\n\nI'm not a substitute for professional medical advice, but I can help you figure out next steps.\n\nWhat's going on today?`;
}

function parseSeverity(text: string): number | null {
  const match = text.match(/\b([1-9]|10)\b/);
  if (match) return parseInt(match[1]);
  const words: Record<string, number> = {
    mild: 3, slight: 2, minor: 2, moderate: 5, medium: 5,
    bad: 7, severe: 8, terrible: 9, worst: 10, extreme: 9, unbearable: 10,
  };
  for (const [word, val] of Object.entries(words)) {
    if (text.toLowerCase().includes(word)) return val;
  }
  return null;
}

function getFollowUpQuestion(symptom: string): string {
  const s = symptom.toLowerCase();
  if (s.includes('headache') || s.includes('head')) {
    return `Got it. A few quick questions to help me give you better guidance:\n\nHow long have you had the headache? And did anything seem to trigger it — screens, stress, skipping meals, dehydration, or something else?`;
  }
  if (s.includes('nausea') || s.includes('vomit') || s.includes('sick to my stomach')) {
    return `Understood. How long have you been feeling nauseous? And have you eaten anything unusual recently, or could this be related to a medication you're taking?`;
  }
  if (s.includes('cough')) {
    return `How long have you had the cough? Is it dry or producing mucus — and do you have any other symptoms like fever, sore throat, or shortness of breath?`;
  }
  if (s.includes('fever') || s.includes('temperature')) {
    return `How high is your temperature if you've checked it? And how long have you had the fever? Any other symptoms like chills, body aches, or sore throat?`;
  }
  if (s.includes('sore throat') || s.includes('throat')) {
    return `How long has your throat been sore? Any fever, trouble swallowing, or white patches you can see? Have you been around anyone who was sick recently?`;
  }
  if (s.includes('stomach') || s.includes('abdominal') || s.includes('belly') || s.includes('tummy')) {
    return `How long have you had the stomach pain? Is it constant or comes and goes? Any nausea, vomiting, diarrhea, or fever alongside it?`;
  }
  if (s.includes('dizzy') || s.includes('dizziness') || s.includes('lightheaded')) {
    return `How long have you been feeling dizzy? Does it happen when you stand up, or is it constant? Have you eaten and had enough water today?`;
  }
  if (s.includes('rash') || s.includes('hives') || s.includes('itch')) {
    return `Where on your body is the rash, and how long have you had it? Is it spreading? Any new soaps, detergents, foods, or medications in the last few days?`;
  }
  if (s.includes('cold') || s.includes('runny nose') || s.includes('congestion') || s.includes('sneezing')) {
    return `How many days have you been feeling this way? Any fever, sore throat, or body aches alongside the cold symptoms?`;
  }
  if (s.includes('back') || s.includes('back pain')) {
    return `Is the back pain in your upper, middle, or lower back? Did it come on suddenly or gradually? Does it get worse when you move, sit, or stand?`;
  }
  if (s.includes('sleep') || s.includes('insomnia') || s.includes('tired') || s.includes('fatigue')) {
    return `How long have you been struggling with this? Is it trouble falling asleep, staying asleep, or feeling tired even after sleeping? Any stress, lifestyle changes, or medications that may have started around the same time?`;
  }
  return `How long have you been experiencing this? And are there any other symptoms alongside it — like fever, fatigue, or pain elsewhere?`;
}

function buildProfileContext(profile: UserProfile | null): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.age) parts.push(`age ${profile.age}`);
  if (profile.sex) parts.push(profile.sex);
  if (profile.weight) parts.push(`${profile.weight}${profile.weightUnit}`);
  if (profile.diet && profile.diet !== 'no preference') parts.push(`${profile.diet} diet`);
  if (profile.conditions) parts.push(`known conditions: ${profile.conditions}`);
  if (profile.medications) parts.push(`current medications: ${profile.medications}`);
  if (profile.allergies) parts.push(`allergies: ${profile.allergies}`);
  return parts.length > 0 ? `\n\nPersonal context: ${parts.join(', ')}.` : '';
}

function generateGuidance(state: ChatState, profile: UserProfile | null): string {
  const { symptom, severity, followupContext } = state;
  const s = symptom.toLowerCase();
  const ctx = followupContext.toLowerCase();
  const profileCtx = buildProfileContext(profile);
  const hasMeds = !!(profile?.medications?.trim());
  const hasAllergies = !!(profile?.allergies?.trim());

  const medWarning = hasMeds
    ? `\n• You mentioned taking ${profile!.medications} — check with your pharmacist or doctor before combining with any OTC medication.`
    : '';
  const allergyWarning = hasAllergies
    ? `\n• Given your allergy to ${profile!.allergies}, double-check ingredients on any OTC product before using it.`
    : '';

  let guidance = '';

  if (s.includes('headache') || s.includes('head pain')) {
    const isScreen = ctx.includes('screen') || ctx.includes('computer') || ctx.includes('phone');
    const isStress = ctx.includes('stress') || ctx.includes('anxious') || ctx.includes('worried');
    const isDehydrated = ctx.includes('water') || ctx.includes('dehydrat') || ctx.includes('drink');
    const trigger = isScreen ? 'screen-related eye strain' : isStress ? 'tension or stress' : isDehydrated ? 'dehydration' : 'tension';

    guidance = `Here's my guidance for your headache (${severity}/10 severity):

What might be going on:
This sounds like it could be a ${trigger} headache. These are very common and usually respond well to simple measures.

What to try at home:
• Drink a large glass of water right now — dehydration is the most common overlooked trigger
${isScreen ? '• Take a 20–30 minute break from all screens\n• Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds' : ''}
• Rest in a quiet, dimly lit room if possible
• OTC options (if not contraindicated for you):
  — Acetaminophen (Tylenol) — gentle on the stomach, good first choice
  — Ibuprofen (Advil/Motrin) — also reduces inflammation, take with food
  — Aspirin — works well for adults but avoid if you have stomach issues${medWarning}${allergyWarning}
• A cool or warm compress on your forehead or the back of your neck
• Gentle neck and shoulder stretches

When to see a doctor:
Seek care if the headache is the worst of your life, came on suddenly like a "thunderclap," is paired with fever/stiff neck/confusion/vision changes, or doesn't improve with OTC medication.${profileCtx}`;
  } else if (s.includes('nausea') || s.includes('vomit') || s.includes('sick to my stomach')) {
    guidance = `Here's my guidance for your nausea (${severity}/10 severity):

What might be going on:
Nausea can come from many sources — a stomach bug, food that didn't agree with you, stress, motion, or sometimes a medication side effect.

What to try at home:
• Sip small amounts of clear fluids often — water, clear broth, or diluted apple juice
• Eat bland foods when you feel ready: crackers, toast, bananas, rice, or plain boiled potato
• OTC options that may help:
  — Pepto-Bismol (bismuth subsalicylate) — helps with nausea and upset stomach
  — Dramamine (dimenhydrinate) — good if there's a motion/dizziness component
  — Ginger — ginger tea, ginger chews, or ginger ale (real ginger) can ease nausea naturally
  — Emetrol — OTC option specifically for nausea${medWarning}${allergyWarning}
• Avoid strong smells, fatty or spicy food, and lying flat right after eating
• Rest sitting up slightly rather than lying completely flat

When to see a doctor:
If you can't keep any fluids down for more than 8 hours, you're showing signs of dehydration (very dark urine, dry mouth, dizziness), or you have severe abdominal pain or fever, seek medical care.${profileCtx}`;
  } else if (s.includes('cough')) {
    const isDry = ctx.includes('dry');
    const hasFever = ctx.includes('fever');
    guidance = `Here's my guidance for your cough (${severity}/10 severity):

What might be going on:
A ${isDry ? 'dry ' : ''}cough is often caused by a viral infection (cold, flu), allergies, or irritation. ${hasFever ? 'The presence of fever suggests a possible infection.' : ''}

What to try at home:
• Stay well hydrated — fluids help thin mucus and soothe the throat
• Honey in warm water or tea — shown to be as effective as some cough suppressants (not for children under 1)
• OTC options:
  — Dextromethorphan (Robitussin DM, NyQuil) — suppresses a dry cough
  — Guaifenesin (Mucinex) — thins and loosens mucus for a productive cough
  — Throat lozenges or hard candy — can soothe irritation${medWarning}${allergyWarning}
• Use a humidifier if the air is dry
• Avoid smoke and strong chemical smells
• Elevate your head slightly when sleeping

When to see a doctor:
If you have difficulty breathing, cough up blood, have a high fever, or the cough lasts more than 3 weeks, see a doctor.${profileCtx}`;
  } else if (s.includes('fever') || s.includes('temperature')) {
    guidance = `Here's my guidance for your fever (${severity}/10 severity):

What might be going on:
Fever is your body's natural defense — it usually signals your immune system is fighting an infection.

What to try at home:
• OTC fever reducers:
  — Acetaminophen (Tylenol) — reduces fever and discomfort, gentle on the stomach
  — Ibuprofen (Advil/Motrin) — also reduces fever and inflammation, take with food
  — Alternate between the two every few hours if one isn't bringing it down (ask a pharmacist first)${medWarning}${allergyWarning}
• Drink plenty of fluids — fever causes fluid loss; water, broth, and electrolyte drinks help
• Rest — your body needs energy to fight the infection
• Lightweight clothing and a light blanket; avoid heavy layers that trap heat
• A lukewarm (not cold) damp cloth on the forehead can provide comfort

When to see a doctor:
Go to urgent care or the ER if fever is above 103°F (39.4°C), lasts more than 3 days, or comes with severe headache, stiff neck, rash, difficulty breathing, or confusion.${profileCtx}`;
  } else if (s.includes('sore throat') || s.includes('throat')) {
    guidance = `Here's my guidance for your sore throat (${severity}/10 severity):

What might be going on:
Most sore throats are viral — caused by a cold or flu — and resolve on their own. Bacterial infections like strep need a doctor's assessment.

What to try at home:
• OTC options:
  — Throat lozenges (Halls, Cepacol, Chloraseptic) — numb and soothe the throat
  — Acetaminophen (Tylenol) or ibuprofen (Advil) — reduce pain and inflammation
  — Chloraseptic spray — fast-acting numbing relief${medWarning}${allergyWarning}
• Gargle with warm salt water (1/4 to 1/2 tsp salt in 8 oz warm water) — genuinely helps
• Warm tea with honey — soothing and honey has mild antimicrobial properties
• Cold foods like ice cream or popsicles can temporarily numb the throat
• Stay hydrated and rest your voice

When to see a doctor:
If you have a fever above 101°F, severe difficulty swallowing, visible white patches on your tonsils, or symptoms lasting more than a week, see a doctor — you may need a strep test.${profileCtx}`;
  } else if (s.includes('stomach') || s.includes('abdominal') || s.includes('belly') || s.includes('tummy')) {
    guidance = `Here's my guidance for your stomach pain (${severity}/10 severity):

What might be going on:
Stomach pain has many causes — indigestion, gas, a stomach bug, stress, or food intolerance. Most mild cases resolve with rest and simple measures.

What to try at home:
• OTC options:
  — Antacids (Tums, Rolaids) — if it feels like heartburn or indigestion
  — Pepto-Bismol — helps with nausea, diarrhea, and upset stomach
  — Gas-X (simethicone) — if bloating or gas is part of it
  — Ibuprofen (Advil) — for cramping, but take with food; avoid if you have stomach ulcers${medWarning}${allergyWarning}
• Eat bland foods: bananas, rice, applesauce, toast (the BRAT diet)
• Avoid alcohol, caffeine, fatty or spicy foods
• Apply a warm compress or heating pad to your abdomen — relieves muscle cramps
• Rest and stay hydrated

When to see a doctor:
Seek urgent care for severe or worsening pain, pain in the lower right abdomen (possible appendix), blood in stool, fever with abdominal pain, or pain that doesn't resolve.${profileCtx}`;
  } else if (s.includes('dizzy') || s.includes('dizziness') || s.includes('lightheaded')) {
    guidance = `Here's my guidance for your dizziness (${severity}/10 severity):

What might be going on:
Dizziness is often caused by dehydration, low blood sugar, standing up too quickly (orthostatic hypotension), or inner ear issues. It can also be a medication side effect.

What to try at home:
• Sit or lie down immediately when dizzy — this prevents falls
• Drink water or an electrolyte drink — dehydration is a very common cause
• Eat something if you haven't eaten recently — low blood sugar can cause lightheadedness
• OTC options:
  — Meclizine (Bonine, Antivert) — helps with vertigo and dizziness from inner ear issues
  — Dramamine — also useful for dizziness with nausea${medWarning}${allergyWarning}
• Stand up slowly from sitting or lying positions
• Avoid caffeine and alcohol, which can worsen dizziness

When to see a doctor:
Seek immediate care if dizziness comes with chest pain, severe headache, difficulty speaking, weakness on one side, or you lose consciousness.${profileCtx}`;
  } else if (s.includes('rash') || s.includes('hives') || s.includes('itch')) {
    guidance = `Here's my guidance for your rash/skin irritation (${severity}/10 severity):

What might be going on:
Rashes can be from allergies, contact irritants, eczema, heat, or viral infections. Most mild rashes respond well to home treatment.

What to try at home:
• OTC options:
  — Hydrocortisone cream (1%) — reduces itching and inflammation for mild rashes
  — Antihistamines: Benadryl (diphenhydramine) for fast relief — note it causes drowsiness; Claritin or Zyrtec for non-drowsy options — great if it's allergy-related
  — Calamine lotion — soothes itching from many types of rashes${medWarning}${allergyWarning}
• Keep the area clean and dry
• Avoid scratching — it can introduce bacteria and worsen the rash
• Wear loose, breathable clothing over the area
• Avoid potential triggers: new soaps, detergents, lotions, or foods

When to see a doctor:
Seek urgent care if the rash spreads rapidly, comes with facial swelling, difficulty breathing, or fever, or if it looks infected (warm, swollen, oozing).${profileCtx}`;
  } else if (s.includes('cold') || s.includes('runny nose') || s.includes('congestion')) {
    guidance = `Here's my guidance for your cold symptoms (${severity}/10 severity):

What might be going on:
Common cold symptoms are almost always viral — antibiotics won't help, but there's plenty you can do to feel better faster.

What to try at home:
• OTC options:
  — Decongestants: Sudafed (pseudoephedrine) — most effective for congestion
  — Antihistamines: Benadryl, Claritin — help with runny nose and sneezing
  — Combo cold medicines: DayQuil/NyQuil cover multiple symptoms
  — Nasal saline spray — drug-free, helps clear congestion safely
  — Throat lozenges, cough drops if needed${medWarning}${allergyWarning}
• Rest as much as possible — sleep is when your immune system does its best work
• Stay very well hydrated — warm liquids especially (broth, herbal tea, hot water with lemon and honey)
• Use a humidifier to keep airways moist
• Zinc lozenges taken early in a cold may reduce its duration

When to see a doctor:
See a doctor if symptoms worsen after day 7-10, you develop a high fever, severe sinus pain, difficulty breathing, or ear pain.${profileCtx}`;
  } else {
    guidance = `Here's my guidance for what you're experiencing (${severity}/10 severity):

What might be going on:
Without more specific information, it's difficult to pinpoint a cause — but I can offer some general guidance based on what you've described.

General steps to take:
• Rest and allow your body to recover
• Stay well hydrated — water helps almost everything
• For general pain or discomfort, OTC options like acetaminophen (Tylenol) or ibuprofen (Advil/Motrin) may help — always follow label directions and check for contraindications${medWarning}${allergyWarning}
• Monitor your symptoms: note whether they're getting better, worse, or staying the same

When to see a doctor:
If your symptoms are severe (you rated them ${severity}/10), worsening, lasting more than a few days, or interfering with daily life, it's worth speaking to a clinician. They can give you a proper assessment.${profileCtx}

Is there a specific aspect you'd like more detail on?`;
  }

  return guidance;
}

export interface BotResponse {
  content: string;
  newState: ChatState;
}

export function processMessage(
  userMessage: string,
  state: ChatState,
  profile: UserProfile | null
): BotResponse {
  const msg = userMessage.trim();

  if (state.step === 'ask_symptom') {
    const combined = msg;
    if (hasEmergencyRedFlag(combined)) {
      return {
        content: EMERGENCY_GUIDANCE,
        newState: { ...state, step: 'emergency', safetyOutcome: 'emergency' },
      };
    }
    const newState: ChatState = {
      ...state,
      step: 'ask_severity',
      symptom: msg,
      safetyOutcome: 'unknown',
    };
    return {
      content: `Got it — ${msg}. On a scale of 1 to 10, how severe would you say it is right now? (1 = barely noticeable, 10 = worst pain imaginable)`,
      newState,
    };
  }

  if (state.step === 'ask_severity') {
    const severity = parseSeverity(msg);
    if (severity === null) {
      return {
        content: `I just need a number from 1 to 10 to gauge how severe it is — 1 being very mild and 10 being the most severe. What would you say?`,
        newState: state,
      };
    }
    if (severity >= 8 && hasEmergencyRedFlag(state.symptom)) {
      return {
        content: EMERGENCY_GUIDANCE,
        newState: { ...state, step: 'emergency', severity, safetyOutcome: 'emergency' },
      };
    }
    const newState: ChatState = {
      ...state,
      step: 'ask_followup',
      severity,
      safetyOutcome: severity >= 8 ? 'high_severity' : severity >= 5 ? 'monitor' : 'unknown',
    };
    const followUp = getFollowUpQuestion(state.symptom);
    const severityNote =
      severity >= 8
        ? `\n\nWith a severity of ${severity}/10, I want to make sure you get the right help. `
        : '';
    return {
      content: `${severityNote}${followUp}`,
      newState,
    };
  }

  if (state.step === 'ask_followup') {
    const newState: ChatState = { ...state, step: 'guidance_given', followupContext: msg };
    const guidance = generateGuidance(newState, profile);
    return {
      content:
        guidance +
        `\n\n---\nIs there anything specific you'd like more detail on? Or do you have a different concern to discuss?`,
      newState,
    };
  }

  if (state.step === 'guidance_given') {
    const lower = msg.toLowerCase();
    const isNewTopic =
      lower.includes('new topic') ||
      lower.includes('different') ||
      lower.includes('another') ||
      lower.includes('something else') ||
      lower.includes('other question');

    if (isNewTopic) {
      return {
        content: `Of course! What else can I help you with?`,
        newState: getInitialState(),
      };
    }
    if (lower.includes('doctor') || lower.includes('see a') || lower.includes('appointment')) {
      return {
        content: `If you'd like to find a doctor or clinic nearby, head over to the Doctors tab — it uses your location to find GPs, urgent care, and pharmacies near you.\n\nIs there anything else I can help with?`,
        newState: state,
      };
    }
    if (lower.includes('medication') || lower.includes('medic') || lower.includes('meds')) {
      return {
        content: `You can track your medications in the Medications tab. It's a good idea to keep that list up to date so I can factor them into my guidance.\n\nAnything else I can help with?`,
        newState: state,
      };
    }
    return {
      content: `I'm glad to help further. If you have a new symptom or concern, just tell me what's going on. For a proper diagnosis or prescription, please speak with a healthcare professional.\n\nWhat else would you like to know?`,
      newState: state,
    };
  }

  if (state.step === 'emergency') {
    return {
      content: `Please focus on getting emergency help right now. If you have a different concern once you're safe, I'm here.\n\n${EMERGENCY_GUIDANCE}`,
      newState: state,
    };
  }

  return {
    content: `What's going on today? Tell me your symptom or concern and I'll do my best to help.`,
    newState: getInitialState(),
  };
}
