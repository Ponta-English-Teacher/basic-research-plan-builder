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

// ===== Message Handling =====
function appendMessage(role, content) {
  const div = document.createElement("div");
  div.className = role === "user" ? "user-msg" : "gpt-msg";
  div.textContent = content;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

// ===== Step Instructions =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "step1": return "What topic are you interested in? (e.g., family, money, sleep, phones)";
    case "step2": return "Let’s create a research question. What do you want to know about your topic?";
    case "step3": return "Let’s choose your survey questions: profile + topic-based Likert questions.";
    case "step4": return "Let’s write a simple hypothesis based on your question.";
    case "step5": return "Let’s make a slide plan for your research presentation.";
    case "step6": return "Here’s your final summary. You can copy and export it.";
    default: return "Let’s begin your research project!";
  }
}

function getSystemPromptForStep(step) {
  switch (step) {
    case "step1":
      return `You are a kind teacher helping a student choose a research topic.
Ask: \"What topic are you interested in?\" Accept simple topics like family, money, jobs, phones.
When they answer, reply once: \"Great! We'll use [topic] as your research theme. ✅ Now, please press the Research Question button to go to the next step.\"
Do not continue the conversation after that.`;

    case "step2":
      return `You are a kind teacher helping a student create a simple research question.
Start by saying: \"You are interested in the topic '[topic]'. What do you want to know about it?\"
If their answer is vague, offer 2–3 specific suggestions. If it’s good, rephrase as a clean question.
End by saying: \"✅ When you're ready, press the Questionnaire button to move to the next step.\"`;

    case "step3":
      return `You are helping a student create a basic in-class survey.
First, say: \"You can choose 5 from the following 20 profile questions.\"
(List them clearly.)
Then, generate 4–5 Likert questions based on their research question.
End by saying: \"✅ When you're ready, press the Hypothesis button to continue.\"`;

    case "step4":
      return `You are helping a student write a simple hypothesis.
Restate their research question. Ask 1–2 guiding questions (e.g., What do you think you’ll find?).
Then suggest 2–3 clear hypotheses. End by saying: \"✅ When you're ready, choose one or write your own, then press the Slide Plan button.\"`;

    case "step5":
      return `You are helping a student create a slide plan for their research presentation.
Use their topic, question, survey, and hypothesis.
Give 5–7 slides with: Slide title, 2–3 bullet points, and 1–2 sentence narration.
End by saying: \"✅ When you're ready, press the Final Summary button.\"`;

    case "step6":
      return `Write a final summary of the research project. Include: topic, question, questionnaire, hypothesis, slide plan.
Make it clear and easy to copy for class use.`;

    default:
      return "You are a helpful assistant.";
  }
}

function updateStateByStep(step, input, reply) {
  switch (step) {
    case "step1": researchState.step1.theme = input; break;
    case "step2": researchState.step2.question = reply; break;
    case "step3":
      researchState.step3.profileQuestions = ["Choose 5 from the provided list of 20 questions"];
      researchState.step3.likertQuestions = reply.split("\n").filter(l => l.includes("agree"));
      break;
    case "step4": researchState.step4.hypothesis = reply; break;
    case "step5": researchState.step5.slidePlan.push(reply); break;
    case "step6": researchState.step6.exportSummary = reply; 
      document.getElementById("summary-text").textContent = reply;
      outputContent.innerText = reply; 
      break;
  }
}

// ===== Step Navigation =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const stepIndex = btn.dataset.step;
    const step = `step${stepIndex}`;
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
  history.push({ role: "user", content: input });

  appendMessage("gpt", "⏳ Thinking...");

  try {
    const prompt = getSystemPromptForStep(step).replace("[topic]", researchState.step1.theme || "your topic");
    const messages = [{ role: "system", content: prompt }, ...history];
    const response = await callChatGPT(messages);
    const reply = response.content.trim();

    appendMessage("gpt", reply);
    history.push({ role: "assistant", content: reply });
    updateStateByStep(step, input, reply);
  } catch (err) {
    console.error(err);
    appendMessage("gpt", "❌ Failed to get a response. Please try again.");
  }
});

// ===== Initial Chat Load =====
document.addEventListener("DOMContentLoaded", () => {
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step1"));
});
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

  if (!data || !data.reply) {
    throw new Error("Invalid response from OpenAI");
  }

  return { content: data.reply };
}
