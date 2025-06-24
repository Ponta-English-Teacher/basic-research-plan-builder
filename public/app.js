// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [], yesNoQuestions: [], chat: [] },
  step4: { hypothesis: "" },
  step5: { slidePlan: [] },
  step6: { exportSummary: "" }
};

// ===== DOM Elements =====
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stepButtons = document.querySelectorAll(".step-btn");
const summaryText = document.getElementById("summary-text");
const outputContent = document.getElementById("output-content");
const exportBtn = document.getElementById("export-btn");

const fixedProfileQuestions = [
  "What is your age?",
  "What grade are you in?",
  "What is your gender?",
  "How many hours do you study per week?",
  "Do you have a part-time job?",
  "How often do you use your smartphone?",
  "What are your hobbies?",
  "How do you usually commute to school?",
  "How many people are in your household?",
  "Do you participate in any school clubs?"
];

// ===== Step Button Switching =====
stepButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const stepNumber = btn.dataset.step;
    const stepKey = `step${stepNumber}`;
    researchState.currentStep = stepKey;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(stepKey));

    // Show profile questions immediately in step3
    if (stepKey === "step3") {
      const numberedList = fixedProfileQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
      appendMessage("gpt", `Here are 10 profile questions. Choose 5–7 by number:\n${numberedList}`);
    }
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const step = researchState.currentStep;
  researchState[step].chat.push({ role: "user", content: input });

  appendMessage("gpt", "Thinking...");

  try {
    let reply = "";

    if (step === "step3" && /^[0-9,\s]+$/.test(input)) {
      const numbers = input.match(/\d+/g).map(Number).filter(n => n >= 1 && n <= 10);
      const selected = [...new Set(numbers)].map(n => fixedProfileQuestions[n - 1]);
      researchState.step3.profileQuestions = selected;
      reply = `Great! You chose:\n- ${selected.join("\n- ")}`;
      replaceLastGPTMessage(reply);

      const topic = researchState.step1.theme;
      const question = researchState.step2.question;
      const systemPrompt = getSystemPrompt("step3");
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `My topic is: ${topic}. My question is: ${question}` }
      ];

      const response = await sendToOpenAI(messages);
      reply = response.content;
      researchState.step3.chat.push({ role: "assistant", content: reply });
      appendMessage("gpt", reply);
    } else {
      const systemPrompt = getSystemPrompt(step);
      const messages = [
        { role: "system", content: systemPrompt },
        ...researchState[step].chat
      ];

      const response = await sendToOpenAI(messages);
      reply = response.content;
      replaceLastGPTMessage(reply);
      researchState[step].chat.push({ role: "assistant", content: reply });
      updateStateFromResponse(step, input, reply);
    }
  } catch (err) {
    replaceLastGPTMessage("Sorry, something went wrong.");
  }
});

// ===== Helper Functions =====
function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function replaceLastGPTMessage(text) {
  const last = chatLog.querySelector(".message.gpt:last-child");
  if (last) last.textContent = text;
}

function resetChat() {
  chatLog.innerHTML = "";
  userInput.value = "";
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., money, time, family, future)";
    case "step2":
      return "Let’s narrow it down. What do you want to know about this topic?";
    case "step3":
      return "Now let’s build your questionnaire. Would you like some examples?";
    case "step4":
      return "Let’s write a simple hypothesis. What do you expect based on your question?";
    case "step5":
      return "Let’s create a slide plan. How would you present your research in 5–6 slides?";
    case "step6":
      return "Here is your summary. You can copy it below.";
    default:
      return "Let’s get started.";
  }
}

function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You are helping a student choose a broad topic for a basic research project. Accept vague ideas like 'money' or 'family'.";
    case "step2":
      return "You are helping a student focus their theme into a specific, surveyable research question. Offer encouragement and end with 'Great — we can use that as your research question! Let’s move on to building your questionnaire.'";
    case "step3":
      return "Based on the student’s topic and question, suggest 3–5 Likert scale questions and 2–3 Yes/No questions. Keep it simple and related to their research question.";
    case "step4":
      return "Help the student write a simple hypothesis based on their question. Ask what they expect and suggest one sentence.";
    case "step5":
      return "Create a slide plan (5–6 slides) for a student presentation. Each slide should have a title and 2–3 bullet points.";
    case "step6":
      return "Summarize the entire research plan clearly and concisely for the student to copy and submit.";
    default:
      return "Act as a helpful research guide.";
  }
}

function updateStateFromResponse(step, userInput, gptReply) {
  if (step === "step1") {
    researchState.step1.theme = userInput;
  } else if (step === "step2") {
    researchState.step2.question = userInput;
  } else if (step === "step4") {
    researchState.step4.hypothesis = userInput;
  } else if (step === "step5") {
    researchState.step5.slidePlan = gptReply;
  } else if (step === "step6") {
    researchState.step6.exportSummary = gptReply;
    summaryText.textContent = gptReply;
  }
}

// ===== Export Summary Button =====
exportBtn.addEventListener("click", () => {
  researchState.currentStep = "step6";
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step6"));
  const messages = [
    { role: "system", content: getSystemPrompt("step6") },
    { role: "user", content: "Please summarize all my research project so far." },
    { role: "assistant", content: "Generating..." }
  ];
  sendToOpenAI(messages).then((response) => {
    replaceLastGPTMessage(response.content);
    researchState.step6.exportSummary = response.content;
    summaryText.textContent = response.content;
  }).catch(() => {
    replaceLastGPTMessage("Sorry, something went wrong while exporting.");
  });
});

// ===== API Call to OpenAI =====
async function sendToOpenAI(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: "gpt-4o", messages })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

// ===== Initial Message on Load =====
window.addEventListener("DOMContentLoaded", () => {
  const firstStepKey = "step1";
  researchState.currentStep = firstStepKey;
  appendMessage("gpt", getUserFacingInstruction(firstStepKey));
});
