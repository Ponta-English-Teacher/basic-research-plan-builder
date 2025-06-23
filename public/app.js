// app.js

// ===== App State =====
const researchState = {
  currentStep: null,
  step3SubStep: null, // 'profile', 'multipleChoice', 'likert'
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: {
    profileQuestions: [],
    multipleChoiceQuestions: [],
    likertQuestions: [],
    chat: [] // Chat history for the current step's conversation
  },
  step4: { hypothesis: "", chat: [] },
  step5: { slidePlan: [], chat: [] },
  step6: { exportSummary: "", chat: [] }
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

    // Reset sub-step for step 3 when entering it
    if (step === "3") {
      researchState.step3SubStep = null; // Set to null to trigger initial prompt for step 3
    } else {
      researchState.step3SubStep = null; // Clear for other steps
    }

    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));

    // Clear chat history for the new step when switching
    if (researchState[step] && researchState[step].chat) {
        researchState[step].chat = [];
    }
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage("user", userMessage);
  userInput.value = "";

  // Store user message in current step's chat history
  if (researchState.currentStep && researchState[researchState.currentStep] && researchState[researchState.currentStep].chat) {
    researchState[researchState.currentStep].chat.push({ role: "user", content: userMessage });
  }

  const reply = await chatWithGPT(researchState.currentStep, userMessage);
  appendMessage("gpt", reply);

  // Store GPT reply in current step's chat history
  if (researchState.currentStep && researchState[researchState.currentStep] && researchState[researchState.currentStep].chat) {
    researchState[researchState.currentStep].chat.push({ role: "gpt", content: reply });
  }

  storeResult(researchState.currentStep, reply);

  // --- NEW LOGIC: Manage sub-steps within Step 3 ---
  if (researchState.currentStep === "3") {
    // Initial entry into Step 3
    if (researchState.step3SubStep === null) {
      researchState.step3SubStep = 'profile'; // User just received initial profile prompt
    }

    // Progression from profile to multipleChoice
    // This assumes the GPT's reply for profile questions will signal the next stage.
    // Example: "Great! Here are some profile questions. Now, let's move on to multiple-choice questions."
    if (researchState.step3SubStep === 'profile' && reply.toLowerCase().includes("multiple-choice questions")) {
      researchState.step3SubStep = 'multipleChoice';
      // Immediately send the instruction for the new sub-step
      appendMessage("gpt", getUserFacingInstruction(researchState.currentStep));
      // You might also want to send an API call here for the first MCQ suggestions
      const mcqReply = await chatWithGPT(researchState.currentStep, "User is ready for multiple-choice questions.");
      appendMessage("gpt", mcqReply);
      storeResult(researchState.currentStep, mcqReply);
    }
    // Progression from multipleChoice to likert
    // Example: "Excellent multiple-choice questions! Next, let's create your Likert scale questions."
    else if (researchState.step3SubStep === 'multipleChoice' && reply.toLowerCase().includes("likert scale questions")) {
      researchState.step3SubStep = 'likert';
      // Immediately send the instruction for the new sub-step
      appendMessage("gpt", getUserFacingInstruction(researchState.currentStep));
      // You might also want to send an API call here for the first Likert suggestions
      const likertReply = await chatWithGPT(researchState.currentStep, "User is ready for Likert scale questions.");
      appendMessage("gpt", likertReply);
      storeResult(researchState.currentStep, likertReply);
    }
    // Progression from likert to step 4 (completion of step 3)
    // Example: "Great — we can use these for your questionnaire! Let’s move on to writing your hypothesis."
    else if (researchState.step3SubStep === 'likert' && reply.toLowerCase().includes("let’s move on to writing your hypothesis")) {
      researchState.currentStep = "4"; // Advance to the next main step
      researchState.step3SubStep = null; // Clear sub-step state
      resetChat(); // Reset chat for the new main step
      appendMessage("gpt", getUserFacingInstruction(researchState.currentStep)); // Provide instruction for new step
    }
  }
  // --- END NEW LOGIC ---

  updateSummary();
});

// ===== GPT API Call =====
async function chatWithGPT(step, userMessage) {
  let messages = [
    { role: "system", content: getStepPrompt(step) }
  ];

  // Add previous messages from the current step's chat history
  if (researchState[step] && researchState[step].chat) {
    // Exclude the most recent user message as it's passed as 'userMessage' directly
    messages = messages.concat(researchState[step].chat);
  }

  // Ensure the *actual* user message for the current turn is the last one sent
  // This is crucial for the GPT to process the immediate user input.
  // If the user's message is already added to researchState[step].chat before this function call,
  // then it's already in the 'messages' array and this line is redundant/will duplicate.
  // Given the 'sendBtn' logic above, it's added *before* this call, so we don't need to add it here again.
  // It's part of messages = messages.concat(researchState[step].chat);

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
  // Access researchState for context in prompts
  const topic = researchState.step1.theme;
  const researchQuestion = researchState.step2.question;

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

    case "3":
      switch (researchState.step3SubStep) {
        case "profile":
          return `
You are helping a university student create a survey. Their **established topic is "${topic}"** and their **specific research question is "${researchQuestion}"**.

Your current task is to help them define "Profile Questions." These questions help understand the background of the survey taker.

First, ask the student: "Considering your research topic (${topic}) and question, what background factors do you think might affect how people answer your survey?"
Then, suggest 3-4 diverse examples of profile questions. These examples should **ideally relate to the established topic or provide relevant demographic context for the research question**. (e.g., gender, age range, grade level, part-time job status, number of siblings, family environment, years in school). Present these as bullet points prefixed with '- '.

After suggesting questions, prompt the student to confirm, edit, or choose from the suggestions for their profile questions.
**Crucially, end your output with a clear transition phrase if the profile questions are done, for example: "Great! Here are some profile questions. Now, let's move on to multiple-choice questions." or "What do you think of these? Once decided, we can move to multiple-choice questions."**
✅ Keep questions clear and simple.
✅ Ensure suggestions are relevant to a general student survey context and **directly tie back to the chosen topic/research question where possible**.
`;

        case "multipleChoice":
          return `
The student has completed their profile questions. Now, you need to help them create 3-4 "Multiple Choice Questions." These questions should offer predefined options for the user to select from.

These questions **MUST directly relate to the student's primary topic ("${topic}") and specific research question ("${researchQuestion}")**. They should aim to identify what factors or aspects are most important to respondents regarding the topic.

For example, if the topic is "jobs," you might ask: "What do you consider most important when looking for a job? (1. Pay, 2. Working Environment, 3. Work-Life Balance, 4. Career Growth, 5. Benefits)".

First, ask the student: "Now thinking about your research question, what specific aspects or factors related to your topic are important for people to choose from?"
Then, suggest 3-4 relevant multiple-choice questions with 4-5 distinct, clear options for each. **Ensure these suggestions are strictly within the scope of "${topic}" and "${researchQuestion}"**. Present these as numbered lists (e.g., "1. Question?\n\t1. Option1\n\t2. Option2").

After suggesting questions, prompt the student to confirm, edit, or choose from the suggestions for their multiple-choice questions.
**Crucially, end your output with a clear transition phrase if the multiple-choice questions are done, for example: "Excellent multiple-choice questions! Next, let's create your Likert scale questions." or "Are these good? Once decided, we can move to Likert scale questions."**
✅ Ensure questions directly relate to the topic/research question.
✅ Ensure choices are distinct and cover common options **within the established scope**.
`;

        case "likert":
          return `
The student has completed their profile and multiple-choice questions. Now, you need to help them create 3-5 "Likert Scale Questions." These questions should be statements that respondents can agree or disagree with on a scale (e.g., 1=Strongly Disagree to 5=Strongly Agree).

These questions **MUST directly explore attitudes, opinions, or frequencies of behavior specifically related to the student's established topic ("${topic}") and research question ("${researchQuestion}")**.

Suggest 3-5 clear and simple Likert scale statements based on their topic and research question. **Do not deviate from the core subject defined in previous steps.** Present these as bullet points prefixed with '- '.

After suggesting questions, prompt the student to confirm, edit, or choose from the suggestions for their Likert scale questions.
**Crucially, end by saying: "Great — we can use these for your questionnaire! Let’s move on to writing your hypothesis." (This exact phrase will signal completion of step 3 to the application).**
✅ Questions must be statements, not direct questions.
✅ Ensure they are suitable for a 5-point Likert scale.
✅ Keep them concise and unambiguous and **focused on "${topic}" and "${researchQuestion}"**.
`;

        default: // Initial prompt when entering Step 3
          return `
You are helping a university student create a survey. Their **primary topic is "${topic}"** and their **specific research question is "${researchQuestion}"**.

We will create three types of questions for your survey: profile questions, multiple-choice questions, and Likert scale questions. Let's start with your profile questions.

First, ask the student: "Considering your research topic (${topic}) and question, what background factors do you think might affect how people answer your survey?"
Then, suggest 3-4 diverse examples of profile questions. These examples should **ideally relate to the established topic or provide relevant demographic context for the research question**. Present these as bullet points prefixed with '- '.

After suggesting questions, prompt the student to confirm, edit, or choose from the suggestions for their profile questions.
**Crucially, end your output with a clear transition phrase if the profile questions are done, for example: "Great! Here are some profile questions. Now, let's move on to multiple-choice questions." or "What do you think of these? Once decided, we can move to multiple-choice questions."**
✅ Keep questions clear and simple.
`;
      }

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
- Survey (profile + multiple-choice + Likert)
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
      // This instruction now needs to guide the user to the current sub-step or the first if new to step 3
      if (researchState.step3SubStep === 'profile') {
          return "We're setting up your Profile Questions. Tell me, what kind of background information about your respondents do you think is important for your survey?";
      } else if (researchState.step3SubStep === 'multipleChoice') {
          return "Great! Now let's work on your Multiple Choice Questions. What specific aspects related to your topic would you like to give options for?";
      } else if (researchState.step3SubStep === 'likert') {
          return "Excellent! Let's now create your Likert Scale Questions. Think about statements related to your topic that people can strongly agree or disagree with.";
      }
      // Default for initial entry to Step 3
      return "Let's build your questionnaire in three parts: Profile Questions, Multiple Choice Questions, and Likert Scale Questions. We'll start with Profile Questions. What kind of background information about your respondents do you think is important for your survey?";
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
  // Store the actual content of the output (GPT's reply)
  outputContent.textContent = content;

  switch (step) {
    case "1":
      researchState.step1.theme = content;
      break;
    case "2":
      researchState.step2.question = content;
      break;
    case "3":
      // This is a simplified parsing.
      // It assumes the GPT output will consistently include the list of questions
      // in a format that can be easily extracted.
      // For profile and likert, assumes bullet points: '- Question text'
      // For multiple choice, assumes numbered questions: '1. Question\n\t1. Option'
      if (researchState.step3SubStep === 'profile') {
        const lines = content.split("\n").filter(line => line.startsWith('- '));
        if (lines.length > 0) {
            researchState.step3.profileQuestions = lines.map(line => line.substring(2).trim());
        }
      } else if (researchState.step3SubStep === 'multipleChoice') {
        // This regex attempts to capture numbered questions and their options
        const mcqMatches = content.match(/\d+\. [^\n]+(?:\n\t\d+\. [^\n]+)*/g);
        if (mcqMatches) {
            researchState.step3.multipleChoiceQuestions = mcqMatches.map(match => match.trim());
        }
      } else if (researchState.step3SubStep === 'likert') {
        const lines = content.split("\n").filter(line => line.startsWith('- '));
        if (lines.length > 0) {
            researchState.step3.likertQuestions = lines.map(line => line.substring(2).trim());
        }
      }
      break;
    case "4":
      researchState.step4.hypothesis = content;
      break;
    case "5":
      // Split by newline and filter out empty strings
      researchState.step5.slidePlan = content.split("\n").filter(line => line.trim() !== "");
      break;
    case "6":
      researchState.step6.exportSummary = content;
      break;
  }
}

// ===== Update Summary View =====
function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme || "Not yet defined"}
❓ Research Question: ${researchState.step2.question || "Not yet defined"}

👤 Profile Questions:
${researchState.step3.profileQuestions.length > 0 ? researchState.step3.profileQuestions.join("\n") : "Not yet defined"}

🔢 Multiple Choice Questions:
${researchState.step3.multipleChoiceQuestions.length > 0 ? researchState.step3.multipleChoiceQuestions.join("\n") : "Not yet defined"}

📊 Likert Questions:
${researchState.step3.likertQuestions.length > 0 ? researchState.step3.likertQuestions.join("\n") : "Not yet defined"}

💡 Hypothesis: ${researchState.step4.hypothesis || "Not yet defined"}

🎞 Slide Plan:
${researchState.step5.slidePlan.length > 0 ? researchState.step5.slidePlan.join("\n") : "Not yet defined"}
  `;
}

// ===== Export Summary =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
