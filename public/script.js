(async () => {
  // Try reading production vars; if present we skip the setup screen
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

  const setupForm = document.getElementById('setup-form');
  const chatUI    = document.getElementById('chat-ui');
  const keyOpen   = document.getElementById('openai-key');
  const keyEleven = document.getElementById('elevenlabs-key');

  // If env vars exist, hide setup and show chat
  if (OPENAI_API_KEY && ELEVENLABS_API_KEY) {
    setupForm.style.display = 'none';
    chatUI.style.display    = 'block';
  } else {
    setupForm.style.display = 'block';
  }

  document.getElementById('save-btn').onclick = () => {
    localStorage.setItem('OPENAI_API_KEY', keyOpen.value.trim());
    localStorage.setItem('ELEVENLABS_API_KEY', keyEleven.value.trim());
    window.location.reload();
  };

  async function sendToEcho(text) {
    const key1 = OPENAI_API_KEY || localStorage.getItem('OPENAI_API_KEY');
    const key2 = ELEVENLABS_API_KEY || localStorage.getItem('ELEVENLABS_API_KEY');
    const resp = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, openaiKey: key1 })
    });
    return resp.json();
  }

  async function playTTS(text) {
    const key2 = ELEVENLABS_API_KEY || localStorage.getItem('ELEVENLABS_API_KEY');
    const resp = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, elevenKey: key2 })
    });
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    new Audio(url).play();
  }

  document.getElementById('send-btn').onclick = async () => {
    const input = document.getElementById('user-input');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';
    await playTTS(msg);                 // play your voice
    const { reply } = await sendToEcho(msg);
    await playTTS(reply);               // play Scarlett’s voice
    // append to chat log… (you can hook this up later)
  };
})();
