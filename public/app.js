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
    researchState.currentStep = step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
    if (step === "step1" && researchState.step1.chat.length === 0) {
      appendMessage("gpt", "What topic are you interested in? (e.g., money, time, jobs, family, future)");
    }
  });
});

// ===== Handle Send Button =====
sendBtn.addEventListener("click", () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;
  appendMessage("user", userMessage);
  userInput.value = "";
  handleUserMessage(userMessage);
});

// ===== Append Chat Message =====
function appendMessage(sender, message) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = `<span>${message}</span>`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

// ===== API Call to ChatGPT =====
async function handleUserMessage(message) {
  const step = researchState.currentStep;
  const payload = {
    step,
    message,
    state: researchState
  };

  try {
    appendMessage("gpt", "⏳ Thinking...");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    chatLog.lastChild.remove(); // remove "Thinking..."
    appendMessage("gpt", data.reply);

    updateState(step, message, data.reply);
    if (data.summary) {
      summaryText.textContent = data.summary;
    }
    if (data.output) {
      outputContent.innerHTML = data.output;
    }
  } catch (err) {
    chatLog.lastChild.remove();
    appendMessage("gpt", "⚠️ Error. Please try again.");
    console.error(err);
  }
}

// ===== State Tracker =====
function updateState(step, userMsg, gptReply) {
  researchState[step].chat.push({ user: userMsg, gpt: gptReply });
  if (step === "step1") researchState.step1.theme = userMsg;
  if (step === "step2") researchState.step2.question = userMsg;
  if (step === "step4") researchState.step4.hypothesis = userMsg;
}

// ===== Instruction per Step =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "step1": return "Let’s begin. Please tell me your research topic.";
    case "step2": return "Let’s make your research question. What do you want to know about your topic?";
    case "step3": return "Let’s think about your survey. What background info and questions will help you learn something useful?";
    case "step4": return "Let’s try a hypothesis. What do you think the result will be?";
    case "step5": return "Now let’s prepare some slides. What are the key points and visuals you want to include?";
    case "step6": return "Here’s your summary. You can copy or download it for your final plan.";
    default: return "Let’s work on your research plan.";
  }
}

// ===== Export Summary Button =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research_summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
