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
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = `step${step}`;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(`step${step}`));
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const messages = getMessagesForStep(input);
  const response = await callChatGPT(messages);
  appendMessage("gpt", response.content);
  updateState(response.content);
});

// ===== Helper Functions =====
function resetChat() {
  chatLog.innerHTML = "";
  userInput.value = "";
}

function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = sender;
  div.innerText = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1": return "What topic are you interested in? (e.g., money, time, jobs, phones, stress, family, future)";
    case "step2": return `You're interested in "${researchState.step1.theme}". What do you want to know about it?`;
    case "step3": return `Let's choose 5 profile questions and create topic-related Likert questions based on: \n\nResearch Question: ${researchState.step2.question}`;
    case "step4": return `Let’s form your hypothesis.\n\nResearch Question: ${researchState.step2.question}`;
    case "step5": return `Here’s a sample slide structure and narration based on your research topic.`;
    case "step6": return generateSummary();
    default: return "Let’s work on your research plan.";
  }
}

function getMessagesForStep(input) {
  const step = researchState.currentStep;
  const messages = [
    { role: "system", content: "You are a kind research teacher guiding a student in English." }
  ];

  switch (step) {
    case "step1":
      messages.push({ role: "user", content: `My topic is: ${input}` });
      break;
    case "step2":
      messages.push({ role: "user", content: `My question is: ${input}` });
      messages.push({ role: "assistant", content: `Help me form a clear and simple research question based on this.` });
      break;
    case "step3":
      messages.push({ role: "user", content: `Now I want to make a questionnaire based on: ${researchState.step2.question}` });
      messages.push({ role: "assistant", content: `Provide 5 profile and 6 Likert or Yes/No/multiple choice questions.` });
      break;
    case "step4":
      messages.push({ role: "user", content: `My question is: ${researchState.step2.question}` });
      messages.push({ role: "assistant", content: `Suggest 2-3 possible hypotheses related to this.` });
      break;
    case "step5":
      messages.push({ role: "user", content: `Give me slide ideas and narration for a presentation.` });
      break;
    case "step6":
      messages.push({ role: "user", content: `Summarize my research plan.` });
      break;
  }
  return messages;
}

function updateState(content) {
  const step = researchState.currentStep;
  if (step === "step1") researchState.step1.theme = content;
  else if (step === "step2") researchState.step2.question = content;
  else if (step === "step3") outputContent.innerText = content;
  else if (step === "step4") researchState.step4.hypothesis = content;
  else if (step === "step5") researchState.step5.slidePlan.push(content);
  else if (step === "step6") researchState.step6.exportSummary = content;

  updateSummary();
}

function updateSummary() {
  const s = researchState;
  summaryText.textContent = `Topic: ${s.step1.theme}\nResearch Question: ${s.step2.question}\nHypothesis: ${s.step4.hypothesis}`;
}

function generateSummary() {
  return summaryText.textContent;
}

// ===== OpenAI Proxy Call =====
async function callChatGPT(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();
  if (!data || !data.reply) throw new Error("Invalid response from OpenAI");
  return { content: data.reply };
}

// ===== Export Button =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([generateSummary()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
