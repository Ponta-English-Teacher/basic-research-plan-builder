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
    const stepNumber = btn.dataset.step;
    const stepKey = `step${stepNumber}`;
    researchState.currentStep = stepKey;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(stepKey));
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
      return "Let’s start by selecting some basic profile questions. Would you like to see some examples?";
    case "step4":
      return "Let’s write a simple hypothesis. Think about what you expect based on your question.";
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
      return "You are helping a student choose a simple, broad theme for a research project. Accept vague answers like 'money' or 'family'. Do NOT break it into subtopics or give academic suggestions. Just encourage the student and confirm their chosen topic. Keep it short and simple, like a kind teacher.";
    case "step2":
      return "You are helping a student focus their theme into a specific, surveyable research question. Accept their vague topic and help them take one step deeper. Offer encouraging ideas and end with 'Great — we can use that as your research question! Let’s move on to building your questionnaire.'";
    case "step3":
      return "You are helping a student build a questionnaire. For now, give only general profile questions. List exactly 10 simple items such as age, year, part-time job, club activities, daily routine, etc. Do not explain anything. Do not include Likert or Yes/No questions. Just return the list clearly so the student can choose 5–7 of them.";
    case "step4":
      return "Ask the student 2–3 simple questions to help them think about what they expect from the survey results. Do NOT write the hypothesis yourself. Just help them think. The student will write their own hypothesis.";
    case "step5":
      return "Create a 5–6 slide presentation plan based on the student's research project. For each slide, write a short title and 2–3 simple bullet points. Do NOT explain or describe the slides. Do NOT include narration or text for speaking. Just output the slide ideas clearly.";
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
    const errorText = await response.text();
    throw new Error(`OpenAI API request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

// ===== Initial GPT Message on Load =====
window.addEventListener("DOMContentLoaded", () => {
  const firstStepKey = "step1";
  researchState.currentStep = firstStepKey;
  appendMessage("gpt", getUserFacingInstruction(firstStepKey));
});
