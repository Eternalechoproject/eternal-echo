const log = document.getElementById('log');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const missBtn = document.getElementById('missBtn');

function appendLine(who, text) {
  const p = document.createElement('p');
  p.innerHTML = `<strong>${who}:</strong> ${text}`;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

async function talk(prompt) {
  appendLine('You', prompt);
  input.value = '';
  sendBtn.disabled = true;
  // call our API (uses env keys on Vercel)
  const res = await fetch('/api/echo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const { text } = await res.json();
  appendLine('Scarlett', text);
  sendBtn.disabled = false;
}

sendBtn.onclick = () => {
  const txt = input.value.trim();
  if (!txt) return;
  talk(txt);
};

missBtn.onclick = () => {
  talk('I miss you.');
};

// auto‐start with a greeting
appendLine('Scarlett', "Hi there—what's on your mind?");
