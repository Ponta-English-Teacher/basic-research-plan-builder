// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], topicQuestions: [] },
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

// ===== Chat Display =====
function appendMessage(sender, text) {
  const message = document.createElement("div");
  message.className = sender;
  message.innerHTML = `<strong>${sender === "gpt" ? "GPT" : "You"}:</strong> ${text}`;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
  userInput.value = "";
}

// ===== Step Button Switching =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
  });
});

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., money, time, jobs, phones, stress, family, future)";
    case "step2":
      return `You chose "${researchState.step1.theme}". What do you want to know about it?`;
    case "step3":
      return `Thanks for your question: "${researchState.step2.question}". Let’s now choose 5 profile questions and write 9 topic-based questions (3 Yes/No, 3 Multiple Choice, 3 Likert).`;
    case "step4":
      return `Do you think there’s a pattern in how people respond to: "${researchState.step2.question}"? What hypothesis could we test?`;
    case "step5":
      return `Let’s plan your slide presentation! I’ll make 5–7 slides with titles, bullet points, and narration.`;
    case "step6":
      return generateFinalSummary();
    default:
      return "Start by choosing a step.";
  }
}

// ===== OpenAI Proxy Call =====
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

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);
  const step = researchState.currentStep;
  userInput.value = "";

  if (step === "step1") researchState.step1.theme = input;
  if (step === "step2") researchState.step2.question = input;

  const chatHistory = [
    { role: "system", content: getSystemPrompt(step) },
    { role: "user", content: input }
  ];

  const response = await callChatGPT(chatHistory);
  appendMessage("gpt", response.content);
  saveChatToState(step, { role: "user", content: input }, { role: "gpt", content: response.content });
});

function saveChatToState(step, userMsg, gptMsg) {
  researchState[step].chat.push(userMsg, gptMsg);
  updateSummary();
}

function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You are a kind teacher helping students pick a general topic for a simple in-class survey. Ask only once, then wait.";
    case "step2":
      return `Student chose '${researchState.step1.theme}'. Help them come up with a focused and measurable question.`;
    case "step3":
      return `User’s research question: '${researchState.step2.question}'. Suggest 5 profile questions from a list of 20. Then suggest 3 yes/no, 3 multiple choice, 3 Likert questions related to their question.`;
    case "step4":
      return `Research Question: '${researchState.step2.question}'. Suggest 2–3 beginner-level hypotheses.`;
    case "step5":
      return `Topic: '${researchState.step1.theme}', Question: '${researchState.step2.question}', Hypothesis: '${researchState.step4.hypothesis}'. Create slide titles, bullet points, and narration for 5–7 slides.`;
    case "step6":
      return `Summarize all findings into a student research plan: topic, question, survey, hypothesis, slides.`;
    default:
      return "You are a helpful assistant.";
  }
}

function generateFinalSummary() {
  return `📘 Final Research Plan\n\n` +
    `Theme: ${researchState.step1.theme}\n` +
    `Question: ${researchState.step2.question}\n` +
    `Hypothesis: ${researchState.step4.hypothesis}\n` +
    `Slide Plan: ${researchState.step5.slidePlan.join("\n")}`;
}

function updateSummary() {
  summaryText.textContent = generateFinalSummary();
}

// ===== Export Button =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research_plan.txt";
  a.click();
  URL.revokeObjectURL(url);
});
