# **OBJECTIVE**

Upgrade ONLY the Simulation Mode of the existing Spanish Medical Speech Learning Activity into a highly polished instructional-design-driven conversational learning experience.

IMPORTANT:  
DO NOT redesign or refactor the entire application.  
DO NOT touch the Words or Sentences modules unless absolutely necessary.  
DO NOT introduce frameworks, npm packages, TypeScript, build systems, or external APIs.

The existing project is already functioning correctly.  
We only want to intelligently upgrade the Simulation experience while preserving:

* current architecture  
* current styling system  
* current SCORM compatibility  
* current vanilla HTML/CSS/JS approach

The goal is to make the simulation feel:

* conversational  
* adaptive  
* immersive  
* professionally instructionally designed  
* almost AI-like  
  WITHOUT actually using AI or LLMs.

The learner should feel:  
"I am participating in a realistic guided medical conversation."

NOT:  
"I am repeating disconnected vocabulary words."

---

## **CURRENT PROJECT STATUS**

The current simulation already includes:

* deterministic branching  
* STT  
* TTS  
* pronunciation scoring  
* progress tracking  
* replay controls  
* retry/fallback handling  
* simulation tab integration

DO NOT rebuild these systems.

Existing files already work:

* simulation-engine.js  
* simulation-ui.js  
* simulation-tts.js  
* simulation-stt.js  
* simulation-utils.js  
* simulation-data.js

Your job is to ENHANCE the instructional flow and conversational realism.

---

## **VERY IMPORTANT ARCHITECTURAL RULES**

1. KEEP VANILLA JS ONLY  
   NO:  
* React  
* Vue  
* Angular  
* TypeScript  
* npm dependencies  
* external libraries  
2. DO NOT BREAK SCORM  
   Everything must remain:  
* lightweight  
* static  
* browser-based  
* SCORM-safe  
3. DO NOT CHANGE EXISTING GLOBAL ARCHITECTURE  
   Only improve simulation-related logic and content structure.  
4. MAINTAIN EXISTING UI DESIGN SYSTEM  
   The simulation must continue feeling like part of the same application.

Reuse:

* existing cards  
* existing spacing  
* existing typography  
* existing button styles  
* existing CSS variables  
* existing color palette

DO NOT redesign the app visually.

---

## **PRIMARY EXPERIENCE GOAL**

The current simulation feels:  
"step-by-step vocabulary repetition"

We want it to feel:  
"real guided medical interaction"

The learner should:

* hear mixed English \+ Spanish  
* respond contextually  
* feel immersed in a medical scenario  
* receive adaptive coaching  
* experience realistic branching  
* feel conversational continuity

---

## **INSTRUCTIONAL DESIGN REQUIREMENTS**

This must feel like a professional Instructional Designer created it.

Implement these instructional design principles:

1. SCAFFOLDING  
   Start easy.  
   Gradually increase complexity.

Example progression:

* single words  
* short phrases  
* guided responses  
* contextual responses  
* conversational exchanges  
2. CONTEXTUAL LEARNING  
   Every phrase must belong to a medical scenario.

DO NOT teach isolated vocabulary unless introducing a concept.

BAD:  
"Say: fiebre"

GOOD:  
"The patient says they feel warm.  
Ask the patient if they have fever.  
Say: ¿Tiene fiebre?"

3. MULTILINGUAL COACHING  
   Use mixed English \+ Spanish naturally.

Examples:  
"The patient says: 'Tengo dolor en el pecho.'  
That means: 'I have chest pain.'  
Now respond in Spanish: 'Voy a llamar al médico.'"

4. ADAPTIVE FEEDBACK  
   Feedback should feel intelligent and contextual.

DO NOT repeatedly say:  
"Try again."

Instead:

* explain what was missing  
* explain pronunciation issue  
* encourage continuation  
* provide coaching

Examples:  
"I understood 'dolor', but the sentence was incomplete."  
"Good pronunciation of médico. Try slowing down the beginning of necesito."

5. CONVERSATIONAL CONTINUITY  
   The scenario must feel connected.

The patient should:

* continue the same conversation  
* build symptoms progressively  
* escalate medically when needed  
6. CONTROLLED BRANCHING  
   We do NOT want random branching.

We want:

* believable branching  
* instructional branching  
* confidence-based adaptation

---

## **NEW SIMULATION EXPERIENCE STRUCTURE**

Transform the simulation into a mini medical scenario.

Scenario:  
A patient arrives at a clinic and progressively describes symptoms.

Conversation flow should evolve naturally.

Recommended flow:

1. Greeting  
2. Patient reports pain  
3. Learner identifies symptom  
4. Patient mentions fever  
5. Learner asks follow-up question  
6. Patient reports headache  
7. Learner escalates care  
8. Breathing issue emerges  
9. Learner identifies emergency  
10. Learner provides support/help

---

## **VERY IMPORTANT:**

## **DO NOT MAKE THIS FEEL LIKE QUIZ NODES**

The current simulation feels node-based.

We want:

* dialogue flow  
* emotional continuity  
* contextual progression

The learner should feel:  
"I am helping a patient."

---

## **UPGRADE simulation-data.js SIGNIFICANTLY**

Expand node structure.

Each node should support:

{  
id,  
sceneTitle,  
sceneContext,  
speaker,  
emotionalTone,

botTextEnglish,  
botTextSpanish,

patientLineEnglish,  
patientLineSpanish,

learnerInstruction,

expectedResponses,  
acceptedVariants,

pronunciationFocus,  
coachingTip,

successFeedback,  
partialFeedback,  
failureFeedback,

remediationPrompt,

successNode,  
clarificationNode,  
retryNode,  
fallbackNode,

maxAttempts,

difficultyLevel  
}

---

## **IMPORTANT:**

## **MIX ENGLISH \+ SPANISH NATURALLY**

Do NOT separate languages mechanically.

BAD:  
English sentence.  
Spanish sentence.

GOOD:  
"The patient says: 'Me duele la cabeza.'  
This means: 'My head hurts.'  
Ask the patient if they also have fever."

This creates immersion.

---

## **UPGRADE BRANCHING STRATEGY**

Current branching is too linear.

Enhance it with:

* adaptive remediation  
* contextual retries  
* guided corrections  
* confidence-sensitive responses

Examples:

HIGH SCORE:  
"Excellent. The patient understood you clearly."

MEDIUM SCORE:  
"Good attempt. Your pronunciation of 'médico' was strong, but the full sentence needs more clarity."

LOW SCORE:  
"Let's slow it down together. Repeat after me:  
Necesito un médico."

---

## **IMPORTANT:**

## **MAKE THE SYSTEM FEEL SMART**

## **WITHOUT AI**

The learner should feel:

* remembered  
* coached  
* guided

Implement lightweight learner-state memory.

Track:

* repeated pronunciation struggles  
* common missing words  
* confidence trend  
* retry frequency

Then adapt feedback.

Example:  
If learner repeatedly misses final R sounds:  
"Remember to emphasize the final R sound in respirar."

---

## **TTS IMPROVEMENT REQUIREMENTS**

VERY IMPORTANT ISSUE:

Currently:

* English voice pace sounds normal  
* Spanish voice sounds too fast  
* pitch and cadence differ significantly

This breaks immersion in multilingual mixed sentences.

Fix this carefully.

---

## **IMPORTANT TTS REQUIREMENTS**

1. NORMALIZE SPEECH RHYTHM

English and Spanish speech pacing must feel coherent.

DO NOT allow Spanish playback to feel rushed.

2. IMPLEMENT SMART RATE CALIBRATION

Current:  
English and Spanish use different voice engines and rates.

Required:  
Calibrate rate dynamically per language so perceived pacing feels consistent.

3. CREATE NATURAL MULTILINGUAL DELIVERY

When a sentence contains:

* English explanation  
* Spanish phrase

The transition should feel smooth.

4. IMPLEMENT SPEECH CHUNKING

Do NOT dump long multilingual text into a single utterance.

Split intelligently:

* English coaching  
* slight pause  
* Spanish pronunciation  
* slight pause  
* learner instruction  
5. USE CONTROLLED PAUSES

Implement small pauses between:

* English narration  
* Spanish medical terms  
* learner response instructions

This dramatically improves realism.

6. SLOW DOWN SPANISH SLIGHTLY

Spanish should sound:

* instructional  
* coach-like  
* clear  
* medically articulate

NOT:

* robotic  
* rushed  
* machine-gunned

---

## **UPDATE simulation-tts.js**

Implement:

* phrase chunking  
* pause management  
* multilingual pacing normalization  
* smoother multilingual narration

Add helper methods like:

speakMultilingualSequence()

Example sequence:  
\[  
{ lang: "en", text: "The patient says" },  
{ pause: 300 },  
{ lang: "es", text: "Tengo dolor en el pecho" },  
{ pause: 400 },  
{ lang: "en", text: "Now respond in Spanish" }  
\]

---

## **UI IMPROVEMENT REQUIREMENTS**

DO NOT redesign.

Only improve immersion.

Add:

* patient speaking area  
* conversational transcript feel  
* speaker labels  
* coaching feel  
* subtle conversational hierarchy

The UI should feel:

* like a guided medical simulation  
* NOT like a quiz card

---

## **IMPORTANT:**

## **KEEP PERFORMANCE LIGHTWEIGHT**

DO NOT:

* add heavy animations  
* add audio libraries  
* add waveform libraries  
* add external assets

Keep:

* lightweight  
* smooth  
* SCORM-friendly

---

## **DO NOT BREAK EXISTING FEATURES**

Must continue working:

* simulation tab  
* STT  
* TTS  
* replay  
* progress  
* pronunciation scoring  
* fallback handling  
* browser compatibility

---

## **FINAL EXPERIENCE GOAL**

The learner should experience:

"A realistic guided multilingual medical interaction that feels conversational, adaptive, immersive, and intelligently coached — while still being fully deterministic and SCORM-safe."

The learner should NOT feel:

* robotic repetition  
* disconnected nodes  
* quiz flow  
* static branching

The learner SHOULD feel:

* immersed  
* guided  
* coached  
* progressively challenged  
* contextually supported

---

## **IMPORTANT IMPLEMENTATION STRATEGY**

Do NOT rewrite everything.

Upgrade carefully.

Focus mainly on:

* simulation-data.js  
* simulation-ui.js  
* simulation-engine.js  
* simulation-tts.js

Preserve existing structure as much as possible.

