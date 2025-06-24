// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [] },
  step4: { hypothesis: "", chat: [] },
  step5: { slidePlan: [], chat: [] },
  step6: { exportSummary: "" }
};

// ===== DOM Elements =====
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stepButtons = document.querySelectorAll(".step-btn");
const outputContent = document.getElementById("output-content");

// ===== Step Instructions =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., family, money, time, phones, study)";
    case "step2":
      return "What do you want to know about that topic? Let's make a clear research question.";
    case "step3":
      return "Now let’s build your questionnaire. I’ll help you make profile and Likert scale questions.";
    case "step4":
      return "Let’s write a simple hypothesis (your guess or prediction).";
    case "step5":
      return "Let’s plan your presentation slides. What should each slide show?";
    case "step6":
      return "Here’s your final summary. You can export or copy it when ready.";
    default:
      return "Let’s begin your research project!";
  }
}

// ===== Message Handling =====
function appendMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = role === "user" ? "user-msg" : "gpt-msg";
  bubble.innerText = content;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

// ===== Step Navigation =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
  });
});

// ===== Send Button Logic =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const step = researchState.currentStep;
  const history = researchState[step].chat;

  // Add to local chat state
  history.push({ role: "user", content: input });

  // Define role-based GPT prompt logic
  const systemPrompt = getSystemPromptForStep(step);
  const fullMessages = [{ role: "system", content: systemPrompt }, ...history];

  appendMessage("gpt", "⏳ Thinking...");

  try {
    const response = await callChatGPT(fullMessages);
    const reply = response.content.trim();
    appendMessage("gpt", reply);
    history.push({ role: "assistant", content: reply });

    // Optional: store summary elements into state
    updateStateByStep(step, input, reply);

  } catch (err) {
    appendMessage("gpt", "❌ Error communicating with ChatGPT.");
    console.error(err);
  }
});

// ===== GPT Role Instructions for Each Step =====
function getSystemPromptForStep(step) {
  switch (step) {
    case "step1":
      return `You are a friendly teacher helping a student choose a topic for a basic research project.
Ask what interests them. Accept simple topics like "family" or "money". Help them focus without overcomplicating.`;
    case "step2":
      return `You are a teacher helping students develop a research question about their topic.
Guide them to ask something measurable, using examples. Avoid vague or academic questions.`;
    case "step3":
      return `You are an assistant who helps create profile and Likert scale questions.
Generate clear survey items based on their topic. Include simple profile questions and 4-5 scale items.`;
    case "step4":
      return `You are a teacher helping the student write a simple hypothesis.
Make a clear sentence predicting what they expect to find in their survey.`;
    case "step5":
      return `You are helping a student plan their presentation slides.
Create a list of slide ideas (title + bullet points) and suggest what to say on each slide.`;
    case "step6":
      return `Summarize the student's research plan clearly for export.
Include the topic, question, questionnaire items, hypothesis, and presentation plan in a simple paragraph.`;
    default:
      return `You are a helpful research assistant.`;
  }
}

// ===== Store Key Info from GPT Replies into State =====
function updateStateByStep(step, input, reply) {
  switch (step) {
    case "step1":
      researchState.step1.theme = input;
      break;
    case "step2":
      researchState.step2.question = reply;
      break;
    case "step3":
      const profileQs = extractQuestions(reply, "profile");
      const likertQs = extractQuestions(reply, "likert");
      researchState.step3.profileQuestions = profileQs;
      researchState.step3.likertQuestions = likertQs;
      break;
    case "step4":
      researchState.step4.hypothesis = reply;
      break;
    case "step5":
      researchState.step5.slidePlan.push(reply);
      break;
    case "step6":
      researchState.step6.exportSummary = reply;
      outputContent.innerText = reply;
      break;
  }
}

// ===== Optional: Extract Questions from GPT Text =====
function extractQuestions(text, type) {
  const lines = text.split("\n").filter(line => line.match(/^\d+[.)]/));
  return lines.map(line => line.replace(/^\d+[.)]\s*/, "").trim());
}
