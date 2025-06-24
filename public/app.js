// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [], chat: [] },
  step4: { hypothesis: "", chat: [] },
  step5: { slidePlan: [], chat: [] },
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
    researchState.currentStep = "step" + step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction("step" + step));
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const messages = buildMessages(input);

  try {
    appendMessage("gpt", "🧠 Thinking...");
    const result = await callChatGPT(messages);
    document.querySelector(".message.gpt:last-child").remove();
    appendMessage("gpt", result.content);

    saveToState(result.content);
    updateSummary();
  } catch (err) {
    document.querySelector(".message.gpt:last-child").remove();
    appendMessage("gpt", "❌ Failed to get a response. Please try again.");
  }
});

// ===== Initial Chat Load =====
document.addEventListener("DOMContentLoaded", () => {
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step1"));
});

// ===== Chat Helpers =====
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerText = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

function buildMessages(latestUserInput) {
  const currentStep = researchState.currentStep;
  const messages = [];

  const previousChat = researchState[currentStep].chat || [];
  previousChat.forEach(msg => messages.push(msg));

  const newMsg = { role: "user", content: latestUserInput };
  messages.push(newMsg);

  return messages;
}

function saveToState(gptReply) {
  const step = researchState.currentStep;
  const chat = researchState[step].chat || [];
  chat.push({ role: "gpt", content: gptReply });
  researchState[step].chat = chat;

  if (step === "step1") researchState.step1.theme = userInput.value.trim();
  if (step === "step2") researchState.step2.question = userInput.value.trim();
  if (step === "step3") {
    // Expecting both profile and Likert questions to be mentioned in GPT output
    researchState.step3.profileQuestions.push("..."); // (dummy placeholder)
    researchState.step3.likertQuestions.push("..."); // (dummy placeholder)
  }
  if (step === "step4") researchState.step4.hypothesis = userInput.value.trim();
  if (step === "step5") researchState.step5.slidePlan.push(userInput.value.trim());
  if (step === "step6") researchState.step6.exportSummary = generateExportText();
}

function updateSummary() {
  summaryText.textContent = generateExportText();
}

function generateExportText() {
  return `Theme: ${researchState.step1.theme}
Research Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join("; ")}
Likert Questions: ${researchState.step3.likertQuestions.join("; ")}
Hypothesis: ${researchState.step4.hypothesis}
Slides: ${researchState.step5.slidePlan.join("; ")}`;
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., family, money, sleep, phones)";
    case "step2":
      return "What do you want to know about that topic? Please write your research question.";
    case "step3":
      const topic = researchState.step1.theme || "your topic";
      const question = researchState.step2.question || "your research question";
      return `Thanks for your question: "${question}". Now, let’s choose some profile questions (age, gender…) and Likert questions (e.g., \"How often do you...\") based on your topic \"${topic}\".`;
    case "step4":
      return "Now write a simple hypothesis that matches your research question.";
    case "step5":
      return "Let’s make a slide plan. What should go on Slide 1?";
    case "step6":
      return "Here is your final summary. You can download it below.";
    default:
      return "What do you want to do next?";
  }
}

// ===== Export =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([generateExportText()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ===== API Call =====
async function callChatGPT(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();

  if (!data || !data.reply) throw new Error("Invalid response from OpenAI");
  return { content: data.reply };
}
