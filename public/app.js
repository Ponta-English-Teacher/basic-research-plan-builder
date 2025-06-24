// ===== App State =====
const researchState = {
  currentStep: null,
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
const exportBtn = document.getElementById("export-btn");

// ===== Step Button Switching =====
stepButtons.forEach(btn => {
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

  const systemPrompt = getSystemPrompt(researchState.currentStep);
  const messages = [
    { role: "system", content: systemPrompt },
    ...getCurrentStepChat(),
    { role: "user", content: input }
  ];

  appendMessage("gpt", "Thinking...");

  try {
    const reply = await chatWithGPT(messages);
    updateChatState(input, reply);
    updateResearchState(researchState.currentStep, input, reply);
    updateLastGptMessage(reply);
  } catch (err) {
    updateLastGptMessage("⚠️ Error. Please try again.");
    console.error(err);
  }
});

// ===== Utility Functions =====
function resetChat() {
  chatLog.innerHTML = "";
}

function appendMessage(sender, text) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  bubble.innerText = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function updateLastGptMessage(text) {
  const bubbles = document.querySelectorAll(".bubble.gpt");
  if (bubbles.length > 0) {
    bubbles[bubbles.length - 1].innerText = text;
  }
}

function getCurrentStepChat() {
  return researchState[`step${researchState.currentStep}`]?.chat || [];
}

function updateChatState(userMsg, gptMsg) {
  const stepChat = getCurrentStepChat();
  stepChat.push({ role: "user", content: userMsg });
  stepChat.push({ role: "assistant", content: gptMsg });
}

function updateResearchState(step, userMsg, gptMsg) {
  if (step === "1") researchState.step1.theme = userMsg;
  else if (step === "2") researchState.step2.question = userMsg;
  else if (step === "4") researchState.step4.hypothesis = userMsg;
  else if (step === "5") researchState.step5.slidePlan.push(userMsg);
  else if (step === "6") researchState.step6.exportSummary = gptMsg;
}

// ===== Prompts =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1": return "What topic are you interested in? (e.g., money, time, jobs, family, future)";
    case "2": return "Let’s make your research question. What do you want to know about your topic?";
    case "3": return "Let’s think about your survey. What background info and questions will help you learn something useful?";
    case "4": return "What result do you expect? Try to make a simple hypothesis.";
    case "5": return "Let’s create your slide plan. What title or message do you want to show on each slide?";
    case "6": return "Ready to export your research plan summary? Type anything and I’ll generate it!";
    default: return "Let’s get started!";
  }
}

function getSystemPrompt(step) {
  switch (step) {
    case "1":
      return `You're helping a student choose a survey topic. Accept broad themes like “money” or “family,” but guide them to something slightly more specific if they stay vague. Examples: “future family,” “part-time job experience.” Once it’s good enough, say “Let’s move on to your research question →”`;
    case "2":
      return `Now you're helping define the research question. Explain that it's “what you want to know by doing this research.” Use simple follow-up questions to understand their focus, and avoid pushing too specific or too academic (e.g., demography). When a good question emerges, say “Great — let’s move on to your questionnaire →”`;
    case "3":
      return `Help the student brainstorm their questionnaire. First suggest some profile info they may want to collect. Then ask what questions will help them learn what they want to know. If helpful, offer examples and say “If you like these, I can format them for Google Form style.”`;
    case "4":
      return `Ask what kind of results they expect. What do they think most people will say? Their answer can be used to write a hypothesis. Keep it simple and student-friendly.`;
    case "5":
      return `Guide the student to create a basic slide plan for presenting their research. Ask what to show on Slide 1 (e.g., title and topic), Slide 2 (question), Slide 3 (survey), etc. Limit it to 4–6 slides.`;
    case "6":
      return `Take all prior input and produce a Research Plan Summary. Include: topic, research question, profile items, sample survey questions, hypothesis, and slide plan. Format clearly.`;
    default:
      return "You are a research advisor guiding a student through a step-by-step plan.";
  }
}
