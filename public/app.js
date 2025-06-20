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

function resetChat() {
  chatLog.innerHTML = "";
  outputContent.textContent = "Your result will appear here.";
  userInput.value = "";
}

// ===== Step Prompts =====
function getStepPrompt(step) {
  switch (step) {
    case "1": return `
You are helping a university student conduct a small survey in English class. 
This is not academic research — it is a class exercise to practice making a simple questionnaire, analyzing results, and presenting findings.

First, ask what topic they are interested in (e.g., money, time, family, phones, relationships).
If their answer is vague, give 5–7 simple and measurable examples related to that topic.
✅ Do NOT say "we must narrow it down more."
✅ Accept broad interest as long as it can be asked in survey form.
✅ Confirm their interest and say:
"Great — let’s move on to making your research question."
`;

    case "2": return `
Now help the student create a simple research question based on their topic.
Ask: "What do you want to know about that topic?"
Give 2–3 example questions based on their topic that are short, clear, and suitable for a basic survey.
✅ Accept if the student wants to explore more than one aspect.
✅ Once the question is set, say:
"Great — we can use that as your research question! Let’s move on to building your questionnaire."
`;

    case "3": return `
Help the student write questions for a short survey.
First: write 3–4 profile questions (e.g., gender, grade, part-time job, club activities)
Then: write 7–10 Likert scale questions related to their research question
(e.g., "I often spend money on snacks.")
✅ Keep questions clear and simple.
✅ End by saying:
"Nice job! Now let’s write your hypothesis."
`;

    case "4": return `
Ask the student:
- What do you expect most people will answer?
- Do you think there will be any pattern?
Help them write 1 short and simple hypothesis.
✅ It can be just a guess. No need to be formal.
✅ Then say:
"Great — let’s make your presentation slide plan."
`;

    case "5": return `
Help the student outline 4–5 slides for a presentation:
1. Topic & Reason
2. Research Question
3. Survey Questions
4. Hypothesis
5. What you want to find out or expect
✅ Give simple bullet points or slide titles.
✅ Then say:
"All done! Let’s review your full plan."
`;

    case "6": return `
Summarize everything the student has done:
- Topic
- Research Question
- Survey (profile + Likert)
- Hypothesis
- Slide Plan
✅ Make it clear and neat
✅ End by saying:
"If you're ready, you can download your plan!"
`;

    default: return "Let’s get started!";
  }
}

// ===== Instructions to Student UI =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., money, time, jobs)\nYou can also choose topics like: family, friends, phone use, study, sleep, part-time jobs, dating, future, stress.\nLet’s choose something you want to learn more about!";
    case "2":
      return "Now let’s think more about your topic.\nWhat do you want to know about it?\nWhat kind of question do you want to ask your classmates?";
    case "3":
      return "Let’s make your questionnaire!\nWrite 3–4 profile questions (e.g., age, gender, part-time job)\nThen 7–10 Likert scale questions (1 = strongly disagree ~ 5 = strongly agree).";
    case "4":
      return "What do you think your classmates will say?\nLet’s make your guess — your hypothesis!";
    case "5":
      return "Let’s make your slide plan.\nWe will outline 4–5 slides to show your research.";
    case "6":
      return "This is the final step.\nLet’s check your whole plan and download it if you're ready!";
    default:
      return "Let’s get started!";
  }
}

// ===== Store Step Output =====
function storeResult(step, content) {
  switch (step) {
    case "1": researchState.step1.theme = content; break;
    case "2": researchState.step2.question = content; break;
    case "3":
      const parts = content.split("Profile Questions:");
      if (parts.length === 2) {
        const [_, profileAndLikert] = parts;
        const [profilePart, likertPart] = profileAndLikert.split("Likert Questions:");
        researchState.step3.profileQuestions = profilePart.trim().split("\n").filter(Boolean);
        researchState.step3.likertQuestions = likertPart.trim().split("\n").filter(Boolean);
      }
      break;
    case "4": researchState.step4.hypothesis = content; break;
    case "5": researchState.step5.slidePlan = content.split("\n"); break;
    case "6": researchState.step6.exportSummary = content; break;
  }
  outputContent.textContent = content;
}

// ===== Update Summary View =====
function updateSummary() {
  summaryText.textContent = `
