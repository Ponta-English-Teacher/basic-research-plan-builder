// ===== App State =====
const researchState = {
  currentStep: null,
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

// ===== Step Button Switching =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    showSystemMessage(getStepPrompt(step));
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage("user", userMessage);
  userInput.value = "";

  const reply = await chatWithGPT(researchState.currentStep, userMessage);
  appendMessage("gpt", reply);
  storeResult(researchState.currentStep, reply);
  updateSummary();
});

// ===== GPT API Call =====
async function chatWithGPT(step, userMessage) {
  const messages = [
    { role: "system", content: getStepPrompt(step) },
    { role: "user", content: userMessage }
  ];

  const response = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();
  return data.reply;
}

// ===== Chat & Display Functions =====
function appendMessage(sender, message) {
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-msg" : "gpt-msg";
  div.textContent = message;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showSystemMessage(msg) {
  appendMessage("gpt", msg);
}

function resetChat() {
  chatLog.innerHTML = "";
  outputContent.textContent = "Your result will appear here.";
  userInput.value = "";
}

// ===== Step Prompts =====
function getStepPrompt(step) {
  switch (step) {
    case "1": return "What topic are you interested in? (e.g., money, time, jobs)";
    case "2": return "Let’s narrow down your topic into a clear research question.";
    case "3": return "Let’s create 3–4 profile questions and 7–10 Likert scale questions for your survey.";
    case "4": return "What do you expect your survey will show? Let's form a clear hypothesis.";
    case "5": return "Let's make slide ideas for presenting your research plan before the survey.";
    case "6": return "Here’s your current research plan. Do you want to export or revise anything?";
    default: return "Let’s get started!";
  }
}

// ===== Store Step Output =====
function storeResult(step, content) {
  switch (step) {
    case "1":
      researchState.step1.theme = content;
      break;
    case "2":
      researchState.step2.question = content;
      break;
    case "3":
      researchState.step3.likertQuestions = content.split("\n");
      break;
    case "4":
      researchState.step4.hypothesis = content;
      break;
    case "5":
      researchState.step5.slidePlan = content.split("\n");
      break;
    case "6":
      researchState.step6.exportSummary = content;
      break;
  }

  outputContent.textContent = content;
}

// ===== Update Summary View =====
function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme}
❓ Research Question: ${researchState.step2.question}

👤 Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
📊 Likert Questions:
${researchState.step3.likertQuestions.join("\n")}

💡 Hypothesis: ${researchState.step4.hypothesis}

🎞 Slide Plan:
${researchState.step5.slidePlan.join("\n")}
  `;
}

// ===== Glossary Popup Logic =====
const popup = document.getElementById("dictionary-popup");
const dictionaryResult = document.getElementById("dictionary-result");
const closePopup = document.getElementById("close-popup");
const btnMeaning = document.getElementById("btn-meaning");
const btnSay = document.getElementById("btn-say");

btnMeaning.addEventListener("click", () => {
  const text = userInput.value.trim() || "No input";
  dictionaryResult.innerHTML = `
    <strong>📘 Plain English:</strong> Explanation of "<em>${text}</em>" in easy words.<br><br>
    <strong>🗣 Context Explanation:</strong> How this term is used in surveys or research.<br><br>
    <strong>🇯🇵 Japanese:</strong> ${text} の意味
  `;
  popup.classList.remove("hidden");
});

btnSay?.addEventListener("click", () => {
  const text = userInput.value.trim() || "No input";
  dictionaryResult.innerHTML = `
    <strong>💬 Natural English:</strong> A native-like way to say "${text}".<br><br>
    <strong>✍️ Suggested Rephrase:</strong> Try using: “In my experience, ...” or “It's important that...”<br><br>
    <strong>🇯🇵 Japanese:</strong> ${text} を英語でどう言うか
  `;
  popup.classList.remove("hidden");
});

closePopup.addEventListener("click", () => {
  popup.classList.add("hidden");
});

const exportBtn = document.getElementById("export-btn");

exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
// ===== Make Glossary Popup Draggable =====
const dragTarget = document.getElementById("dictionary-popup");
const dragHandle = dragTarget.querySelector(".popup-header");

let offsetX = 0;
let offsetY = 0;
let isDragging = false;

dragHandle.style.cursor = "move";

dragHandle.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - dragTarget.offsetLeft;
  offsetY = e.clientY - dragTarget.offsetTop;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragTarget.style.left = `${e.clientX - offsetX}px`;
  dragTarget.style.top = `${e.clientY - offsetY}px`;
});

