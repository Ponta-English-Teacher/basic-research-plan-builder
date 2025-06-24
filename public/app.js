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

  const currentStep = researchState.currentStep;
  const chatHistory = researchState[currentStep].chat;
  chatHistory.push({ role: "user", content: input });

  const messages = [
    { role: "system", content: getSystemPrompt(currentStep) },
    ...chatHistory
  ];

  appendMessage("gpt", "⏳ Thinking...");
  const reply = await callChatGPT(messages);
  chatHistory.push({ role: "assistant", content: reply.content });
  updateLastBotMessage(reply.content);

  saveDataToState(currentStep, input, reply.content);
  updateSummary();
});

// ===== Chat Handling =====
function appendMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.innerText = content;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function updateLastBotMessage(content) {
  const botMessages = [...chatLog.getElementsByClassName("message gpt")];
  if (botMessages.length > 0) {
    botMessages[botMessages.length - 1].innerText = content;
  }
}

function resetChat() {
  chatLog.innerHTML = "";
  userInput.value = "";
}

function updateSummary() {
  summaryText.innerText = `
Theme: ${researchState.step1.theme}
Research Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join("; ")}
Likert Questions: ${researchState.step3.likertQuestions.join("; ")}
Hypothesis: ${researchState.step4.hypothesis}
Slide Plan: ${researchState.step5.slidePlan.join(" | ")}
`;
}

// ===== Save State Info Per Step =====
function saveDataToState(step, userInput, botReply) {
  if (step === "step1") {
    researchState.step1.theme = userInput;
  } else if (step === "step2") {
    researchState.step2.question = userInput;
  } else if (step === "step3") {
    // Extract profile and Likert questions from the reply
    const profiles = botReply.match(/\[Profile\](.*?)\n/gs);
    const likerts = botReply.match(/\[Likert\](.*?)\n/gs);
    researchState.step3.profileQuestions = profiles || [];
    researchState.step3.likertQuestions = likerts || [];
  } else if (step === "step4") {
    researchState.step4.hypothesis = botReply;
  } else if (step === "step5") {
    researchState.step5.slidePlan = botReply.split(/\n(?=Slide \d+:)/);
  }
}

// ===== System Prompts by Step =====
function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You're helping a student choose a research theme for a basic survey. Respond like a kind teacher.";
    case "step2":
      return `You're helping students narrow down their research question based on their theme: "${researchState.step1.theme}".`;
    case "step3":
      return `Remind them their topic is: ${researchState.step1.theme}, and question is: ${researchState.step2.question}. Then help them select 5 profile questions from a list, and generate Likert-style questions related to their research.`;
    case "step4":
      return `Help generate hypotheses based on their question: ${researchState.step2.question}`;
    case "step5":
      return `Generate a simple 5-7 slide research plan presentation based on their topic, question, and hypothesis.`;
    case "step6":
      return "Summarize all steps of the research plan. Format clearly.";
    default:
      return "You're a helpful assistant for building a student research plan.";
  }
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "Let's begin! What general topic are you interested in (e.g., food, family, phone use)?";
    case "step2":
      return "What exactly do you want to find out about your topic? Please write your research question.";
    case "step3":
      return `Let's choose 5 profile questions from a fixed list (e.g., Gender, Living Alone, Club Activity) and create Likert-style questions related to your research question.`;
    case "step4":
      return "Now, based on your topic and Likert questions, what do you think will happen? Let's create a hypothesis.";
    case "step5":
      return "Let’s plan your research presentation. I’ll help generate 5–7 slides with narration based on your work so far.";
    case "step6":
      return "Here is your full research plan summary. You can review and download it.";
    default:
      return "Let's continue building your research plan.";
  }
}

// ===== Call ChatGPT API =====
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

// ===== Export Summary =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.innerText], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Research_Plan_Summary.txt";
  link.click();
});
