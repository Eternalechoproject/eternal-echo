// === EternalEcho MVP - script.js ===

const memoryLog = document.getElementById("memory-log");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const missBtn = document.getElementById("missBtn");
const waveform = document.getElementById("waveform");

// Scarlett-style default voice
const persona = {
  name: "Scarlett",
  voiceId: "21m00Tcm4TlvDq8ikWAM"
};

function showWaveform() {
  waveform.style.display = "flex";
  setTimeout(() => waveform.style.display = "none", 3000);
}

function appendToLog(role, text) {
  const div = document.createElement("div");
  div.className = "memory-entry";
  div.innerHTML = `<strong>${role}:</strong> ${text}`;
  memoryLog.appendChild(div);
  memoryLog.scrollTop = memoryLog.scrollHeight;
}

async function callEchoAPI(prompt) {
  const res = await fetch("/api/echo", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ prompt })
  });
  const json = await res.json();
  return json.text;
}

async function callTTS(text) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text, voiceId: persona.voiceId })
  });
  const blob = await res.blob();
  new Audio(URL.createObjectURL(blob)).play();
}

sendBtn.onclick = async () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  appendToLog("You", msg);
  chatInput.value = "";
  showWaveform();
  const reply = await callEchoAPI(msg);
  appendToLog("Scarlett", reply);
  await callTTS(reply);
};

missBtn.onclick = async () => {
  const line = "Hey… you doing okay? I'm still right here.";
  appendToLog("Scarlett", line);
  showWaveform();
  await callTTS(line);
};
