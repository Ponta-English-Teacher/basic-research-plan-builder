// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [] },
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

// ===== Step Button Switching =====
stepButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
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

  const systemPrompt = getSystemPrompt(step);
  const messages = [
    { role: "system", content: systemPrompt },
    ...researchState[step].chat
  ];

  appendMessage("gpt", "Thinking...");
  try {
    const response = await sendToOpenAI(messages);
    const reply = response.content;
    replaceLastGPTMessage(reply);
    researchState[step].chat.push({ role: "assistant", content: reply });
    updateStateFromResponse(step, input, reply);
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
      return "You are helping a student choose a broad topic for a basic research project. Accept vague ideas like 'money' or 'family'. Just help them pick a general theme.";
    case "step2":
      return "You are helping a student focus their theme into a specific, surveyable research question. Accept their vague topic and help them take one step deeper. Offer encouraging ideas and end with 'Great — we can use that as your research question! Let’s move on to building your questionnaire.'";
    case "step3":
      return "Now suggest 20 profile questions (age, grade, hobbies, etc.), 3–5 Likert scale questions based on their research question, and 2–3 yes/no multiple choice questions. Keep it beginner friendly.";
    case "step4":
      return "Help the student write a simple hypothesis based on their survey question. Ask what they expect and suggest one simple sentence.";
    case "step5":
      return "Create a slide plan (5–6 slides) for a short student presentation. Each slide should have a short title and 2–3 bullet points. Keep it simple, suitable for use in Felo or Gamma.";
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
  } else if (step === "step3") {
    // Just storing suggestion responses; user edits manually
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
// ===== API Call to OpenAI (Backend Proxy or Local Server) =====
async function sendToOpenAI(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messages
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI API request failed");
  }

  const data = await response.json();
  return data.choices[0].message;
}
