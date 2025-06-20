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
    case "1": return `
You are helping a first-year university student create a simple in-class research project. 
The student will collect answers from classmates using a short questionnaire.

First, ask what topic they are interested in (e.g., money, time, jobs, parents, future, relationships, phones, stress). 

If the topic is vague or abstract, guide the student by giving 5–7 possible, simple ideas they could study through a short survey. Each idea should be measurable (e.g., hours, habits, opinions).

✅ Help them explore what they want to know.
✅ Use short, easy English.
✅ Be friendly and patient.
📦 When the student picks one idea, say:
“Great — let’s move on to the next step: making your research question.”
`;

    case "2": return `
The student has picked a specific idea. Now help them think more deeply.

✅ Restate the idea they chose. (e.g., "You're interested in how part-time jobs affect students' money management.")

Then ask a few of these:
- What do you want to know most about this topic?
- What do you want to ask your classmates?
- What kind of differences or patterns do you expect?

🎯 Suggest 2–3 simple research questions like:
1. Do students with part-time jobs save more money than others?
2. What do students with part-time jobs spend the most money on?
3. Does earning money change students’ spending habits?

📩 Ask: “Which one do you want to choose?”
📩 Or say: “Do you want to write your own question?”

📦 When the student agrees, say:
“Great — we can use that as your research question! Let’s move on to building your questionnaire.”
`;

    case "3": return `
Now it’s time to make the student’s survey questions.

First, help them write 3–4 profile questions (e.g., gender, age, part-time job, club activities).

Then, help them create 7–10 Likert scale questions (e.g., “I often stay up late because of my phone. 1 = strongly disagree to 5 = strongly agree”).

✅ Keep questions simple, clear, and related to their research question.
📦 When complete, say:
“Nice job! Now let’s write your hypothesis.”
`;

    case "4": return `
Help the student think about what kind of result they expect.

Ask them:
- What do you think your classmates will say?
- Do you think there will be a pattern or connection?

Then help them write 1 simple hypothesis, like:
“Students who use their phones before bed will sleep less than those who don’t.”

📦 When ready, say:
“Great — let’s make a slide plan for your presentation.”
`;

    case "5": return `
Help the student make a presentation plan for their research idea.

Give them ideas for 4–5 slides:
1. Title & Introduction
2. Research Question
3. Questionnaire (profile + survey questions)
4. Hypothesis
5. What they want to find out or expect

✅ Use short, clear slide ideas with example titles and notes.
📦 When finished, say:
“All done! Let’s look at your full summary.”
`;

    case "6": return `
This is the final step.

Help the student review their full research plan:
- Topic
- Research Question
- Survey Questions
- Hypothesis
- Slide Plan

✅ Offer to make corrections or improvements.
📦 Then say:
“If you're ready, you can download your plan!”
`;

    default: return "Let’s get started!";
  }
}

// ===== Step Instructions for Student UI =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., money, time, jobs)\n\nYou can also choose topics like:\nfamily, friends, phone use, study, sleep, part-time jobs, dating, future, stress.\n\nLet’s choose something you want to learn more about!";

    case "2":
      return "Now, let’s think more about your topic.\n\nWhat do you want to know about it?\nWhat do you want to ask your classmates?\n\nLet’s make a simple and clear research question together!";

    case "3":
      return "Let’s write your questionnaire.\nStart with 3–4 profile questions (e.g., gender, club, part-time job),\nthen 7–10 survey questions about your topic using a 1–5 scale.";

    case "4":
      return "What do you think your classmates will say?\nLet’s write your guess — this is your hypothesis!";

    case "5":
      return "Now let’s plan your presentation.\nWe will make slide ideas to explain your research to your classmates.";

    case "6":
      return "This is the final step.\nLet’s check your research plan and download it if you’re finished.";

    default:
      return "Let’s get started!";
  }
} // END
