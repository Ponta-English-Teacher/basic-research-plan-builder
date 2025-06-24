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

// ===== Initial Chat Load =====
document.addEventListener("DOMContentLoaded", () => {
  researchState.currentStep = "step1";
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step1"));
});

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

  const step = researchState.currentStep;
  appendMessage("user", input);
  researchState[step].chat.push({ role: "user", content: input });
  userInput.value = "";

  const messages = [
    { role: "system", content: getSystemPrompt(step) },
    ...researchState[step].chat
  ];

  appendMessage("gpt", "Thinking...");
  const reply = await callChatGPT(messages);
  replaceLastGptMessage(reply.content);
  researchState[step].chat.push({ role: "assistant", content: reply.content });

  handleStepSpecificLogic(step, input, reply.content);
  updateSummary();
});

// ===== Chat Functions =====
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = `${sender === "gpt" ? "GPT" : "You"}: ${text}`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function replaceLastGptMessage(text) {
  const msgs = document.querySelectorAll(".message.gpt");
  if (msgs.length > 0) msgs[msgs.length - 1].innerText = `GPT: ${text}`;
}

function resetChat() {
  chatLog.innerHTML = "";
}

function updateSummary() {
  summaryText.textContent = `
Research Theme: ${researchState.step1.theme}
Research Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
Likert Questions: ${researchState.step3.likertQuestions.join(", ")}
Hypothesis: ${researchState.step4.hypothesis}
Slide Plan: ${researchState.step5.slidePlan.join(" | ")}
  `.trim();
}

exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research_plan.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ===== Prompts & Logic =====
function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You are a kind research advisor helping students choose a general theme.";
    case "step2":
      return `The student chose: ${researchState.step1.theme}. Help them narrow it to a clear, surveyable research question.`;
    case "step3":
      return `Student’s theme: ${researchState.step1.theme}, Question: ${researchState.step2.question}. Help select 5 profile and 5 Likert questions.`;
    case "step4":
      return `Using the previous survey questions, guide the student in forming a testable hypothesis.`;
    case "step5":
      return `Generate a 5–7 slide presentation plan with slide titles and narration.`;
    case "step6":
      return `Combine all previous steps into one summary. Present it clearly for copy-paste.`;
    default:
      return "You are a helpful assistant.";
  }
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "🎯 What general topic are you interested in? (e.g., money, time, jobs, family, phones)";
    case "step2":
      return `📌 You're interested in \"${researchState.step1.theme}\". What exactly do you want to know about it?`;
    case "step3":
      return `📝 Let's build your survey. First, choose 5 profile questions from our list. Then ChatGPT will help you write Likert and other questions.`;
    case "step4":
      return `🧠 Based on your survey questions, let’s explore your ideas. What patterns do you expect?`;
    case "step5":
      return `🎬 Let’s make a 5–7 slide presentation plan with narration. Ready?`;
    case "step6":
      return `📄 Here's your full research plan. Click “Download Summary” to save it!`;
    default:
      return "Start by choosing a step.";
  }
}

function handleStepSpecificLogic(step, input, reply) {
  if (step === "step1") {
    researchState.step1.theme = input;
  } else if (step === "step2") {
    researchState.step2.question = input;
  } else if (step === "step3") {
    const profile = reply.match(/Profile Questions:\s*(.*)/i);
    const likert = reply.match(/Likert Questions:\s*(.*)/i);
    if (profile) researchState.step3.profileQuestions = profile[1].split(/\d+\.\s*/).filter(q => q.trim());
    if (likert) researchState.step3.likertQuestions = likert[1].split(/\d+\.\s*/).filter(q => q.trim());
  } else if (step === "step4") {
    researchState.step4.hypothesis = reply.trim();
  } else if (step === "step5") {
    researchState.step5.slidePlan = reply.split(/\d+\.\s*/).filter(p => p.trim());
  } else if (step === "step6") {
    researchState.step6.exportSummary = summaryText.textContent;
  }
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
