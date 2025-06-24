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
const summaryText = document.getElementById("summary-text");

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
    case "step3": return "Let’s build your survey. You will choose 5 profile questions and get Likert questions based on your topic.";
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
You already know their topic is: [topic].
Ask: \"What do you want to know about it?\"
If their answer is vague, offer 2–3 specific suggestions. If it’s good, rephrase as a clean question.
End by saying: \"✅ When you're ready, press the Questionnaire button to move to the next step.\"`;

    case "step3":
      return `You are helping a student create a basic in-class survey.
Start with: \"Here are 20 profile questions. Please choose 5 to include in your survey:\"
1. What is your gender?
2. Do you live alone or with your family?
3. Do you have a part-time job?
4. How many hours do you work per week?
5. Are you a member of a club or circle?
6. How do you usually come to school?
7. How long does it take to come to school?
8. How many hours of free time do you have each day?
9. What time do you usually go to bed?
10. What time do you usually wake up?
11. How often do you use your phone each day?
12. How often do you use social media?
13. Do you live in a city, town, or countryside?
14. How would you describe your personality?
15. How many siblings do you have?
16. How many friends do you talk to every day?
17. Do you usually eat breakfast?
18. Do you like your current lifestyle?
19. How often do you go out with friends each week?
20. How much money do you usually spend in one week?

Then say: \"Now, based on your research question — '[question]' — here are some example Likert scale questions.\"
Generate 4–5 statements students can agree/disagree with.
End by saying: \"✅ When you're ready, press the Hypothesis button to continue.\"`;

    case "step4":
      return `You are helping a student write a simple hypothesis.
They have this research question: [question]
Ask 1–2 reflective questions (e.g., What do you think students will say? Do you expect any differences?).
Then suggest 2–3 clear and short hypotheses.
End by saying: \"✅ When you're ready, press the Slide Plan button.\"`;

    case "step5":
      return `You are helping a student create a 5–7 slide presentation plan for their research project.
Here’s what they’ve done:
- Topic: [topic]
- Research Question: [question]
- Hypothesis: [hypothesis]
- Survey Questions: [likert]

Create slides like:
1. Title Slide
2. Why I chose this topic
3. Research Question
4. Questionnaire
5. Hypothesis
6. What I expect to find
7. Next Steps (optional)
Each slide should have a title, 2–3 bullet points, and a 1–2 sentence narration.
End by saying: \"✅ When you're ready, press the Final Summary button.\"`;

    case "step6":
      return `Write a final summary of the student’s research plan. Use this info:
- Topic: [topic]
- Research Question: [question]
- Profile Questions: [profile]
- Likert Questions: [likert]
- Hypothesis: [hypothesis]
- Slide Plan: [slides]

Make it clear, clean, and ready for copy-paste.`;

    default:
      return "You are a helpful assistant.";
  }
}

function updateStateByStep(step, input, reply) {
  switch (step) {
    case "step1": researchState.step1.theme = input; break;
    case "step2": researchState.step2.question = reply; break;
    case "step3":
      researchState.step3.profileQuestions = ["Choose 5 from the list."];
      researchState.step3.likertQuestions = reply.split("\n").filter(l => l.includes("agree"));
      break;
    case "step4": researchState.step4.hypothesis = reply; break;
    case "step5": researchState.step5.slidePlan.push(reply); break;
    case "step6": researchState.step6.exportSummary = reply;
      summaryText.textContent = reply;
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
    let prompt = getSystemPromptForStep(step)
      .replace("[topic]", researchState.step1.theme || "")
      .replace("[question]", researchState.step2.question || "")
      .replace("[hypothesis]", researchState.step4.hypothesis || "")
      .replace("[likert]", researchState.step3.likertQuestions.join(", ") || "")
      .replace("[profile]", researchState.step3.profileQuestions.join(", ") || "")
      .replace("[slides]", researchState.step5.slidePlan.join("\n") || "");

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
