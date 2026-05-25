# **Spanish Medical Simulation Mode — Requirements Document for Cursor**

## **Project Goal**

Add a new **Simulation Mode** to the existing SCORM-based Spanish medical learning application.

The application already has:

* Sentence learning mode  
* Word learning mode

We need to add:

* A new CTA/tab/button called **Simulation**  
* A branching conversational learning flow  
* English \+ Spanish guided learning  
* Browser-based STT (Speech-to-Text)  
* Browser-based TTS (Text-to-Speech)  
* Pronunciation feedback  
* Stateful branching conversation engine  
* All implemented in:  
  * Vanilla HTML  
  * Vanilla CSS  
  * Vanilla JavaScript

NO frameworks.  
NO React/Vue/Angular.  
NO external APIs.  
NO paid services.  
NO server calls.  
Everything must work locally inside the SCORM package.

---

# **Core Functional Requirements**

## **1\. Simulation CTA**

Add a new CTA/button beside:

* Words  
* Sentences

New button:

```
Simulation
```

When clicked:

* Launch the simulation experience  
* Do NOT navigate to a new webpage  
* Do NOT reload the page  
* Open simulation inside current application shell/layout

IMPORTANT:  
The simulation must visually feel like:

```
part of the same existing application
```

Cursor must:

* follow current styling system  
* reuse existing typography  
* reuse existing spacing  
* reuse existing color palette  
* reuse existing buttons/cards/layout patterns

DO NOT redesign the UI.

---

# **Technical Constraints**

## **Must Use**

* Vanilla HTML  
* Vanilla CSS  
* Vanilla JS

## **Must NOT Use**

* React  
* Vue  
* Angular  
* TypeScript  
* Node backend  
* External APIs  
* OpenAI APIs  
* LangChain  
* Heavy LLMs  
* External inference servers

---

# **Existing Project Compatibility**

The current project already works in SCORM.

Cursor MUST:

* preserve current project structure  
* avoid introducing build complexity  
* avoid npm-heavy architecture  
* avoid breaking SCORM compatibility

Simulation mode must:

* integrate safely  
* remain lightweight  
* remain bundle-friendly

---

# **Simulation Experience Overview**

The simulation is a:

```
guided medical Spanish conversation trainer
```

Bot behavior:

* speaks in English and Spanish  
* teaches medical Spanish vocabulary  
* asks learner to repeat words/sentences  
* evaluates learner responses  
* branches conversation accordingly

Learner behavior:

* listens  
* repeats Spanish phrases  
* speaks through browser microphone  
* receives pronunciation feedback  
* progresses through conversation branches

---

# **STT/TTS Requirements**

## **Text-To-Speech (TTS)**

Use browser-native:

```javascript
speechSynthesis
```

Support:

* English narration  
* Spanish pronunciation

Preferred voices:

```javascript
en-US
es-ES
```

Fallback:

```javascript
es-MX
```

Must support:

* slow pronunciation mode  
* repeat phrase mode

---

## **Speech-To-Text (STT)**

Use browser-native:

```javascript
webkitSpeechRecognition
```

or:

```javascript
SpeechRecognition
```

Language modes:

```javascript
es-ES
```

Fallback:

```javascript
es-MX
```

---

# **Simulation Architecture**

## **Use Deterministic Branching**

DO NOT implement AI chatbot behavior.

Simulation should use:

```
state machine + branching rules
```

Each node contains:

* bot prompt  
* expected learner response  
* pronunciation rules  
* branching rules  
* success/failure paths

---

# **Required Folder Structure**

Cursor should create:

```
/simulation
    simulation-engine.js
    simulation-ui.js
    simulation-data.js
    simulation-stt.js
    simulation-tts.js
    simulation-utils.js
    simulation.css
```

---

# **Required Core Modules**

# **1\. simulation-data.js**

Contains:

* all conversation nodes  
* branching structure  
* expected phrases  
* feedback messages

Use JSON structure.

Example:

```javascript
const simulationNodes = {
  intro_1: {
    id: "intro_1",
    type: "repeat-after-me",

    botTextEnglish: "The Spanish word for pain is Dolor.",
    botTextSpanish: "Dolor",

    expectedResponses: [
      "dolor"
    ],

    acceptedVariants: [
      "dolo"
    ],

    pronunciationHints: [
      "Try rolling the final R sound."
    ],

    successNode: "intro_2",
    retryNode: "retry_dolor",

    maxAttempts: 3
  }
};
```

---

# **2\. simulation-engine.js**

Responsible for:

* simulation state  
* current node tracking  
* branching logic  
* confidence scoring  
* attempt counting  
* session completion

Required methods:

```javascript
startSimulation()
loadNode(nodeId)
evaluateResponse(transcript)
goToNextNode()
restartSimulation()
endSimulation()
```

---

# **3\. simulation-stt.js**

Responsible for:

* microphone handling  
* speech recognition  
* transcript cleanup

Required features:

* start listening  
* stop listening  
* return transcript  
* confidence handling

Must normalize:

* lowercase  
* accents  
* punctuation

---

# **4\. simulation-tts.js**

Responsible for:

* English narration  
* Spanish pronunciation  
* slow mode  
* repeat mode

Required methods:

```javascript
speakEnglish(text)
speakSpanish(text)
stopSpeaking()
```

---

# **5\. simulation-utils.js**

Utility functions:

* fuzzy matching  
* similarity scoring  
* normalization  
* pronunciation scoring

Required algorithm:

* Levenshtein distance OR simple phonetic similarity

NO external libraries.

Required function:

```javascript
calculateSimilarity(expected, actual)
```

Return:

```javascript
0-100 score
```

---

# **Pronunciation Evaluation Rules**

## **Success Threshold**

```
>= 80 → success
60-79 → partial success with correction
< 60 → retry
```

---

# **Feedback Examples**

## **Success**

```
Excellent pronunciation!
Great job saying "Dolor".
```

## **Partial**

```
Almost correct.
Try emphasizing the final R sound.
```

## **Failure**

```
Let's try again slowly.
Repeat after me: Dolor.
```

---

# **UI Requirements**

## **Simulation Layout**

Must feel integrated into existing app.

Required sections:

```
-----------------------------------
| Header / existing navigation    |
-----------------------------------
| Simulation title                |
| Progress indicator              |
-----------------------------------
| Bot message area                |
| Spanish phrase highlight        |
-----------------------------------
| Microphone CTA                  |
| Listen Again CTA                |
-----------------------------------
| Feedback area                   |
-----------------------------------
```

---

# **Required UI Features**

## **1\. Progress Indicator**

Show:

```
Step 3 of 10
```

---

## **2\. Active Listening State**

When microphone is active:

* animated mic icon  
* pulse effect

---

## **3\. Spanish Phrase Highlighting**

Spanish terms must:

* visually stand out  
* larger font  
* highlighted color

Example:

```
Dolor
```

---

# **Session Flow Requirements**

## **Total Nodes**

Create:

```
10-node branching simulation
```

---

# **Learning Theme**

Theme:

```
Basic medical interaction
```

Scenario:

```
Patient describing symptoms
```

---

# **Required Vocabulary**

Include:

* Dolor  
* Fiebre  
* Cabeza  
* Médico  
* Hospital  
* Ayuda  
* Respirar  
* Emergencia  
* Mareado  
* Agua

---

# **Example Simulation Flow**

## **Node 1**

Bot:

```
The Spanish word for pain is Dolor.
Please repeat: Dolor.
```

Expected:

```
dolor
```

Success:  
→ Node 2

Failure:  
→ Retry Node

---

## **Node 2**

Bot:

```
How do you say fever in Spanish?
```

Expected:

```
fiebre
```

---

## **Node 3**

Bot:

```
Say: I have pain.
```

Expected:

```
tengo dolor
```

---

## **Node 4**

Bot:

```
Say: I need a doctor.
```

Expected:

```
necesito un médico
```

---

# **Branching Requirements**

Must support:

* success branches  
* retry branches  
* clarification branches  
* fallback branches

---

# **Performance Requirements**

## **SCORM Optimization**

Simulation must:

* load fast  
* avoid large assets  
* avoid memory leaks  
* clean speech listeners properly

---

# **Accessibility Requirements**

Must support:

* keyboard navigation  
* captions/subtitles  
* replay audio  
* visible feedback

---

# **Error Handling**

Handle:

* microphone denied  
* unsupported browser  
* no speech detected  
* STT timeout  
* speech synthesis unavailable

Provide graceful UI messages.

---

# **Browser Compatibility**

Must work on:

* Chrome  
* Edge

Primary target:

```
desktop LMS environments
```

---

# **SCORM Safety**

Cursor must ensure:

* no async behavior breaks SCORM  
* simulation state survives screen changes if needed  
* no external dependencies

---

# **Future Scalability**

Architecture must support:

* additional simulations  
* additional languages  
* additional node packs  
* JSON-driven conversations

---

# **Important Instruction for Cursor**

DO NOT:

* redesign the application  
* change existing architecture unnecessarily  
* introduce frameworks  
* introduce build systems

DO:

* integrate carefully  
* keep code modular  
* keep everything lightweight  
* follow current styling patterns exactly

---

# **Deliverables**

Cursor must produce:

## **Functional Deliverables**

* Working Simulation tab  
* 10-node branching flow  
* STT integration  
* TTS integration  
* Pronunciation scoring  
* Retry logic  
* Progress tracking

---

# **Code Quality Deliverables**

* Modular JS files  
* Clear comments  
* Reusable node structure  
* Maintainable branching engine

---

# **Final Goal**

The learner should experience:

```
a guided conversational Spanish medical simulation
inside the current SCORM package
without realizing it is a separate module
```

