// === CONFIG & STATE ===
let OPENAI_API_KEY = '';
let ELEVENLABS_API_KEY = '';
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

firebase.initializeApp({
  apiKey:    'AIzaSyDIKOTcAGGyhJrnvmTLefF1IUIcbcnr08k',
  authDomain:'echosoul-dev.firebaseapp.com',
  projectId: 'echosoul-dev'
});
const db = firebase.firestore();

let echoMemory = [];
let activeEcho = '#dad';

const personalityProfiles = {
  '#dad':    { tone:'Direct, motivational', examples:['You’ve got this.','Keep your head up.'] },
  '#mom':    { tone:'Loving, supportive',     examples:['I’m proud of you.','Take care of yourself.'] },
  '#partner':{ tone:'Warm, emotional',       examples:['I miss you.','You always come back to me.'] },
  '#future': { tone:'Wise, grounded',        examples:["You're further along than you think.","Stay in the long game."] }
};

const memoryModes = {
  '#dad':     { voice:'iiidtqDt9FBdT1vfBluA' },
  '#mom':     { voice:'gPe4h2IS1C7XHbnizzFa' },
  '#partner': { voice:'WtA85syCrJwasGeHGH2p' },
  '#future':  { voice:'TxGEqnHWrfWFTfGW9XjX' }
};

const voiceToneSettings = {
  sad:{stability:0.8,similarity_boost:0.6},
  love:{stability:0.6,similarity_boost:0.9},
  comfort:{stability:0.7,similarity_boost:0.8},
  strong:{stability:0.4,similarity_boost:1.0},
  angry:{stability:0.5,similarity_boost:0.9},
  happy:{stability:0.3,similarity_boost:1.0},
  neutral:{stability:0.5,similarity_boost:0.7}
};

// === UTILITIES ===
async function detectEmotion(text) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST', headers:{
      Authorization:`Bearer ${OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'gpt-4o-mini',
      messages:[
        { role:'system', content:'You are an emotion analyzer. One word: love, sad, strong, comfort, happy, angry, or neutral.' },
        { role:'user', content:text }
      ]
    })
  });
  const js = await res.json();
  return js.choices?.[0]?.message?.content.trim().toLowerCase() || 'neutral';
}

function showWaveform() {
  waveform.style.display = 'flex';
  setTimeout(()=>waveform.style.display = 'none', 3000);
}

function playVoice(text, emotion = 'neutral') {
  const vid = memoryModes[activeEcho].voice || ELEVENLABS_VOICE_ID;
  const tone = voiceToneSettings[emotion] || voiceToneSettings.neutral;
  showWaveform();
  fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`, {
    method:'POST', headers:{
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type':'application/json',
      'Accept':'audio/mpeg'
    },
    body: JSON.stringify({ text, voice_settings: tone })
  })
  .then(r=>r.blob()).then(b=>new Audio(URL.createObjectURL(b)).play())
  .catch(console.error);
}

function renderMemoryLog() {
  memoryLog.innerHTML = '';
  echoMemory.forEach(e => {
    const d = document.createElement('div');
    d.className = 'memory-entry';
    d.innerHTML = `<strong>You:</strong> ${e.user}<br><strong>Echo:</strong> ${e.echo}`;
    memoryLog.appendChild(d);
  });
}

function saveMemoryToCloud(entry) {
  db.collection('memories').add({ ...entry, echo: activeEcho }).catch(console.error);
}

// === CORE CHAT LOGIC ===
async function generateEchoResponse(userInput) {
  const userEmo = await detectEmotion(userInput);
  const prof = personalityProfiles[activeEcho];
  const last = echoMemory.length ? echoMemory[echoMemory.length-1].echo : '(none)';
  const vibes = {
    love:'warm and familiar', sad:'calm and grounding',
    strong:'confident and bold', happy:'light and playful',
    comfort:'soft and reassuring', angry:'direct and centered',
    neutral:'thoughtful'
  };

  const systemMsg = {
    role:'system',
    content:`You are ${activeEcho.replace('#','')}, a presence that listens.
Acknowledge the user’s feeling, reply in your tone (${prof.tone}), under 30 words.`
  };
  const userMsg = {
    role:'user',
    content:`Last: "${last}"\nUser: "${userInput}"\nRespond ${vibes[userEmo]||'thoughtful'}.`
  };

  let res = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{
    Authorization:`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'
  }, body: JSON.stringify({ model:'gpt-4', messages:[systemMsg,userMsg] }) });
  let js = await res.json();
  let echo = js.choices?.[0]?.message?.content.trim();

  if (!echo || /^I['’]?m here/i.test(echo)) {
    userMsg.content = `Please try again. User: "${userInput}"`;
    res = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{
      Authorization:`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'
    }, body: JSON.stringify({ model:'gpt-4', messages:[systemMsg,userMsg] }) });
    js = await res.json();
    echo = js.choices?.[0]?.message?.content.trim() || 'Still listening.';
  }

  const emo = await detectEmotion(echo);
  const entry = { user:userInput, echo, emotion:emo, timestamp:new Date().toISOString() };
  echoMemory.push(entry);
  renderMemoryLog();
  playVoice(echo, emo);
  saveMemoryToCloud(entry);
}

// === HANDLERS ===
function handleSend() {
  const t = userInput.value.trim(); if(!t) return;
  generateEchoResponse(t); userInput.value = '';
}
function handlePlayAll() {
  let i=0; (function nxt(){ if(i>=echoMemory.length) return;
    playVoice(echoMemory[i].echo, echoMemory[i].emotion); i++;
    setTimeout(nxt,4000);
  })();
}
function handleWhisper() {
  if(!echoMemory.length) return playVoice("Let's start talking.","comfort");
  const last = echoMemory[echoMemory.length-1].user;
  playVoice(`You said: "${last}"`,"comfort");
}
function handleAddExample() {
  const v = newExample.value.trim(); if(!v) return;
  personalityProfiles[activeEcho].examples.push(v); newExample.value=''; updatePersonalityDisplay();
}
async function handleGenLines() {
  const p = personalityProfiles[activeEcho];
  const pr = `Generate 3 tone-matched phrases for tone: ${p.tone}`;
  const r = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{
    Authorization:`Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json'
  }, body: JSON.stringify({ model:'gpt-4', messages:[{role:'user',content:pr}] }) });
  const d = await r.json();
  gptResults.textContent = d.choices?.[0]?.message?.content.trim() || '';
}
function handleSavePreset() {
  const n=prompt('Preset name?'); if(!n)return;
  const ps = JSON.parse(localStorage.getItem('echoPresets')||'{}');
  ps[n] = JSON.parse(JSON.stringify(personalityProfiles));
  localStorage.setItem('echoPresets',JSON.stringify(ps));
  updatePresetPicker();
}
function handleExport() {
  const b = new Blob([JSON.stringify(personalityProfiles,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'profiles.json';
  a.click();
}
function handleImport() { importProfiles.click(); }
function handleFileImport(e) {
  const f = e.target.files[0]; if(!f)return;
  const r = new FileReader();
  r.onload = () => {
    try { Object.assign(personalityProfiles,JSON.parse(r.result)); updatePersonalityDisplay(); }
    catch { alert('Import failed'); }
  };
  r.readAsText(f);
}
function updatePersonalityDisplay() {
  const p = personalityProfiles[activeEcho];
  personalityDisplay.innerHTML =
    `<strong>Tone:</strong> ${p.tone}<br><strong>Examples:</strong><br>` +
    p.examples.map(x=>`- ${x}`).join('<br>');
}
function updatePresetPicker() {
  const ps = JSON.parse(localStorage.getItem('echoPresets')||'{}');
  presetPicker.innerHTML = '';
  Object.keys(ps).forEach(n => presetPicker.append(new Option(n,n)));
}

// === BOOTSTRAP ===
window.onload = () => {
  // DOM refs
  setupScreen      = document.getElementById('setupScreen');
  mainEcho         = document.getElementById('mainEcho');
  openaiKeyInput   = document.getElementById('openaiKeyInput');
  elevenKeyInput   = document.getElementById('elevenKeyInput');
  saveKeysBtn      = document.getElementById('saveKeysBtn');
  avatarBtns       = document.querySelectorAll('.avatar-btn');
  userInput        = document.getElementById('user-input');
  sendBtn          = document.getElementById('sendBtn');
  waveform         = document.getElementById('waveform');
  playAllBtn       = document.getElementById('playAllBtn');
  whisperBtn       = document.getElementById('whisperBtn');
  profileTag       = document.getElementById('profileTag');
  personalityDisplay=document.getElementById('personalityDisplay');
  newExample       = document.getElementById('newExample');
  addExampleBtn    = document.getElementById('addExampleBtn');
  generateLinesBtn = document.getElementById('generateLinesBtn');
  gptResults       = document.getElementById('gptResults');
  presetPicker     = document.getElementById('presetPicker');
  savePresetBtn    = document.getElementById('savePresetBtn');
  exportProfilesBtn= document.getElementById('exportProfilesBtn');
  importProfiles   = document.getElementById('importProfiles');
  importProfilesTrigger = document.getElementById('importProfilesTrigger');
  memoryLog        = document.getElementById('memory-log');

  // Setup flow
  const savedO = localStorage.getItem('OPENAI_KEY');
  const savedE = localStorage.getItem('ELEVENLABS_KEY');
  if (savedO && savedE) {
    OPENAI_API_KEY     = savedO;
    ELEVENLABS_API_KEY = savedE;
    setupScreen.style.display = 'none';
    mainEcho.style.display    = 'block';
    updatePresetPicker();
    updatePersonalityDisplay();
  } else {
    mainEcho.style.display = 'none';
  }
  saveKeysBtn.onclick = () => {
    const o = openaiKeyInput.value.trim();
    const e = elevenKeyInput.value.trim();
    if (!o || !e) return alert('Both keys required');
    localStorage.setItem('OPENAI_KEY',o);
    localStorage.setItem('ELEVENLABS_KEY',e);
    OPENAI_API_KEY     = o;
    ELEVENLABS_API_KEY = e;
    setupScreen.style.display = 'none';
    mainEcho.style.display    = 'block';
    updatePresetPicker();
    updatePersonalityDisplay();
  };

  // Avatars
  avatarBtns.forEach(btn=>{
    btn.onclick = ()=>{
      avatarBtns.forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      activeEcho = btn.dataset.echo;
      profileTag.value = activeEcho;
      updatePersonalityDisplay();
    };
  });

  // Listeners
  sendBtn.onclick           = handleSend;
  playAllBtn.onclick        = handlePlayAll;
  whisperBtn.onclick        = handleWhisper;
  addExampleBtn.onclick     = handleAddExample;
  generateLinesBtn.onclick  = handleGenLines;
  savePresetBtn.onclick     = handleSavePreset;
  exportProfilesBtn.onclick = handleExport;
  importProfilesTrigger.onclick = handleImport;
  importProfiles.onchange   = handleFileImport;
  profileTag.onchange       = ()=>{ activeEcho = profileTag.value; updatePersonalityDisplay(); };
};
