const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const DEFAULT_CARDS = [
  { color:"blue", label:"Logro", tip:"El jugador responde primero, el equipo puede agregar.", questions:[
    "¿Qué cosa hizo el equipo de manera brillante este sprint?",
    "¿Qué proceso nos ahorró tiempo valioso?",
    "Dale un reconocimiento a alguien que te ayudó esta semana.",
    "¿De qué entregable estás más orgulloso/a?",
    "¿Qué momento de colaboración te sorprendió positivamente?",
    "¿Qué herramienta o práctica debería quedarse para siempre?",
    "¿Qué historia se cerró que no pensabas que terminarían?",
    "¿Qué decisión tomaron este sprint y deberían repetir siempre?",
    "¿Qué habilidad del equipo brilló más en este sprint?",
    "Nombra un momento donde el equipo se adaptó rápido y lo logró.",
  ]},
  { color:"red", label:"Reto", tip:"Compartan el reto, el equipo lo mueve a acciones.", questions:[
    "¿Qué nos frenó más durante este sprint?",
    "¿Qué deberíamos dejar de hacer de inmediato?",
    "¿Qué blocker deberíamos haber escalado más temprano?",
    "¿Qué te frustró pero se podía haber evitado?",
    "¿Qué historia fue la más dolorosa de cerrar? ¿Por qué?",
    "¿Dónde falló la comunicación del equipo?",
    "¿Qué tomó mucho más tiempo del estimado? ¿Por qué?",
    "¿Qué cambiarías si pudieras reiniciar el sprint?",
    "¿Qué historia se sintió como empujar una roca cuesta arriba?",
    "¿Dónde nos falló la Definición de Terminado este sprint?",
  ]},
  { color:"green", label:"Idea", tip:"El equipo vota pulgares arriba en el chat si está de acuerdo.", questions:[
    "Propón un experimento para el próximo sprint.",
    "Si tuvieras una varita mágica, ¿qué cambiarías en el equipo?",
    "Sugiere una nueva herramienta o hábito para probar.",
    "¿Qué deberíamos empezar a hacer y seguimos postergando?",
    "¿Qué hace otro equipo que deberíamos aprender?",
    "¿Cómo podríamos reducir el tiempo de reuniones a la mitad?",
    "¿Qué haría nuestros standups más útiles?",
    "¿Cómo podríamos reducir deuda técnica el próximo sprint?",
    "Si pudieras automatizar algo doloroso que hicimos, ¿qué sería?",
    "Trae una idea de otra industria — ¿cómo la aplicarías aquí?",
  ]},
  { color:"yellow", label:"Acción", tip:"Debe quedar con nombre y fecha comprometida.", questions:[
    "¿A qué acción concreta te comprometes el próximo sprint?",
    "¿Qué debería agregar el equipo a la Definición de Terminado?",
    "¿Quién debería ser dueño del blocker más grande del sprint?",
    "Elige una mejora de proceso y nombra a su responsable ahora.",
    "Escribe un objetivo SMART para el próximo sprint en este momento.",
    "¿Qué problema recurrente necesita una solución permanente?",
    "Identifica una dependencia que debemos resolver antes del próximo sprint.",
    "¿Qué debería agregar el Scrum Master a la agenda del planning?",
    "¿Qué historia recurrente debería tener su propio épico?",
    "¿Quién lidera la mejora del proceso de revisión el próximo sprint?",
  ]},
  { color:"wild", label:"Wild", tip:"", questions:[
    "ROBA 2: Los siguientes 2 jugadores comparten cada uno un blocker del sprint.",
    "SALTA: El jugador actual elige a alguien para que responda en su lugar.",
    "REVERSA: El orden del juego se invierte — el último habla primero.",
    "WILD: Todos escriben en el chat UNA palabra para describir este sprint. ¡Simultáneo!",
    "ROBA 4: Identifiquen 4 mejoras y asignen dueño a cada una en 5 minutos.",
    "CAMBIO DE COLOR: El facilitador elige qué tipo de carta se juega ahora.",
    "CHALLENGE: Cualquiera puede retar la última respuesta — ¡debe dar más detalle!",
    "VOTO RELÁMPAGO: Pulgares arriba o abajo en el chat sobre la última sugerencia.",
    "ROAST RÁPIDO: Los próximos 4 jugadores tienen 20 segundos para criticar el sprint.",
    "ENERGÍA: Todos escriben un número del 1 al 10 en el chat. ¡Al mismo tiempo!",
  ]},
];

const REACTIONS = ["👍","🔥","💡","❤️"];

let activeRoom = null;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
let roomExpireTimer = null;
let serverTimer = null;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RETRO-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function freshRoom(code, hostId) {
  return {
    code, hostId,
    players: [],
    currentIdx: 0, direction: 1,
    discard: [], logs: ["🎮 Sala creada. Comparte el código con tu equipo."],
    activeCard: null,
    // response + reactions
    currentResponse: "",       // live text from active player
    reactions: {},             // { "👍": count, ... }
    config: { turnSeconds: 90, cardsPerPlayer: 7, sprintName: "Sprint" },
    cards: JSON.parse(JSON.stringify(DEFAULT_CARDS)),
    timerEndsAt: null, extraTimeUsed: false,
    paused: false,
    skipEffect: null,
    started: false, locked: false,
    gameOver: false, winner: null,
    drawnHistory: [],          // { color, label, question, playerName, response, reactions, timestamp }
    totalCards: 0, drawnCount: 0,
    createdAt: Date.now(),
  };
}

function scheduleRoomExpiry() {
  if (roomExpireTimer) clearTimeout(roomExpireTimer);
  roomExpireTimer = setTimeout(() => {
    if (activeRoom) { io.to(activeRoom.code).emit("roomExpired"); activeRoom = null; }
  }, ROOM_TTL_MS);
}

function addLog(msg) { if (!activeRoom) return; activeRoom.logs.push(msg); if (activeRoom.logs.length > 60) activeRoom.logs.shift(); }
function broadcast() { if (!activeRoom) return; io.to(activeRoom.code).emit("state", activeRoom); }

function clearTimer() { if (serverTimer) { clearInterval(serverTimer); serverTimer = null; } }

function startTimer() {
  clearTimer();
  if (!activeRoom?.activeCard || activeRoom.paused) return;
  activeRoom.timerEndsAt = Date.now() + activeRoom.config.turnSeconds * 1000;
  activeRoom.extraTimeUsed = false;
  broadcast();
  serverTimer = setInterval(() => {
    if (!activeRoom?.timerEndsAt || activeRoom.paused) return;
    if (Date.now() >= activeRoom.timerEndsAt) { clearTimer(); advanceTurn("auto"); }
  }, 500);
}

function advanceTurn(reason) {
  clearTimer();
  const r = activeRoom;
  // Save response + reactions into history entry
  if (r.drawnHistory.length > 0) {
    const last = r.drawnHistory[r.drawnHistory.length - 1];
    last.response = r.currentResponse;
    last.reactions = { ...r.reactions };
  }
  r.currentIdx = (r.currentIdx + r.direction + r.players.length) % r.players.length;
  r.activeCard = null; r.timerEndsAt = null; r.extraTimeUsed = false;
  r.skipEffect = null; r.currentResponse = ""; r.reactions = {}; r.paused = false;
  const next = r.players[r.currentIdx];
  addLog(reason === "auto" ? `⏱ Tiempo agotado — turno de ${next?.name}.` : `Turno de ${next?.name}.`);
  broadcast();
}

function checkGameOver() {
  const r = activeRoom;
  const w = r.players.find(p => p.cards === 0);
  if (w) { r.winner = w.name; r.gameOver = true; clearTimer(); addLog(`🏆 ¡${w.name} ganó!`); broadcast(); return true; }
  if (r.drawnCount >= r.totalCards) { r.gameOver = true; clearTimer(); addLog("🎴 ¡Mazo agotado! Fin del juego."); broadcast(); return true; }
  return false;
}

function allQuestions() {
  return activeRoom.cards.flatMap(d => d.questions.map(q => ({ color:d.color, label:d.label, tip:d.tip||"", question:q })));
}

io.on("connection", socket => {
  socket.emit("serverStatus", { hasRoom: !!activeRoom, code: activeRoom?.code || null });

  socket.on("createRoom", ({ name }) => {
    if (activeRoom) return socket.emit("error", "Ya existe una sala activa. Solo puede haber una sala a la vez.");
    const code = generateCode();
    activeRoom = freshRoom(code, socket.id);
    const COLS = ["#2563EB","#DC2626","#16A34A","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D"];
    activeRoom.players.push({ id:socket.id, name, cards:activeRoom.config.cardsPerPlayer, color:COLS[0], isHost:true });
    socket.join(code);
    scheduleRoomExpiry();
    addLog(`${name} creó la sala como host.`);
    socket.emit("roomCreated", { code });
    broadcast();
  });

  socket.on("joinRoom", ({ code, name }) => {
    if (!activeRoom || activeRoom.code !== code.toUpperCase()) return socket.emit("error", "Sala no encontrada. Verifica el código.");
    if (activeRoom.locked) return socket.emit("error", "La sala está cerrada — el juego ya inició.");
    if (activeRoom.players.find(p => p.id === socket.id)) return;
    const COLS = ["#2563EB","#DC2626","#16A34A","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D","#E85D04","#3B82F6","#10B981","#F59E0B"];
    activeRoom.players.push({ id:socket.id, name, cards:activeRoom.config.cardsPerPlayer, color:COLS[activeRoom.players.length % COLS.length], isHost:false });
    socket.join(activeRoom.code);
    addLog(`${name} se unió a la sala.`);
    broadcast();
  });

  socket.on("rejoin", ({ code, name }) => {
    if (!activeRoom || activeRoom.code !== code) return;
    const p = activeRoom.players.find(p => p.name === name);
    if (p) { p.id = socket.id; socket.join(code); socket.emit("state", activeRoom); }
  });

  socket.on("setConfig", ({ turnSeconds, cardsPerPlayer, sprintName }) => {
    if (!activeRoom || socket.id !== activeRoom.hostId || activeRoom.started) return;
    if (turnSeconds) activeRoom.config.turnSeconds = Math.max(30, Math.min(300, parseInt(turnSeconds)||90));
    if (cardsPerPlayer) { activeRoom.config.cardsPerPlayer = Math.max(3, Math.min(15, parseInt(cardsPerPlayer)||7)); activeRoom.players.forEach(p => p.cards = activeRoom.config.cardsPerPlayer); }
    if (sprintName) activeRoom.config.sprintName = sprintName.trim()||"Sprint";
    broadcast();
  });

  // ── Card editor ──
  socket.on("addQuestion", ({ color, question }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&question?.trim()){cat.questions.push(question.trim());broadcast();} });
  socket.on("editQuestion", ({ color, idx, question }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&cat.questions[idx]!==undefined&&question?.trim()){cat.questions[idx]=question.trim();broadcast();} });
  socket.on("deleteQuestion", ({ color, idx }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&cat.questions.length>1){cat.questions.splice(idx,1);broadcast();} });
  socket.on("addCategory", ({ color, label, tip }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; if(!activeRoom.cards.find(c=>c.color===color)) activeRoom.cards.push({color,label:label||"Nueva",tip:tip||"",questions:["Escribe tu primera pregunta aquí."]}); broadcast(); });
  socket.on("importCards", ({ cards }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; if(Array.isArray(cards)){activeRoom.cards=cards;broadcast();} });

  // ── Start ──
  socket.on("startGame", () => {
    if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started||activeRoom.players.length<2) return;
    activeRoom.started=true; activeRoom.locked=true;
    activeRoom.totalCards=activeRoom.players.length*activeRoom.config.cardsPerPlayer;
    activeRoom.players.forEach(p=>p.cards=activeRoom.config.cardsPerPlayer);
    addLog(`🎮 ¡Juego iniciado! ${activeRoom.players.length} jugadores · ${activeRoom.config.cardsPerPlayer} cartas c/u · ${activeRoom.config.turnSeconds}s por turno.`);
    addLog(`Turno de ${activeRoom.players[0].name}.`);
    broadcast();
  });

  // ── Gameplay ──
  socket.on("draw", () => {
    if (!activeRoom||activeRoom.gameOver||activeRoom.activeCard||activeRoom.paused) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id) return;
    const all=allQuestions();
    const card=all[Math.floor(Math.random()*all.length)];
    activeRoom.activeCard={...card,playerName:p.name};
    activeRoom.discard.push(card); if(activeRoom.discard.length>4) activeRoom.discard.shift();
    activeRoom.drawnHistory.push({...card,playerName:p.name,response:"",reactions:{},timestamp:new Date().toLocaleString("es-GT")});
    activeRoom.currentResponse=""; activeRoom.reactions={};
    REACTIONS.forEach(r=>activeRoom.reactions[r]=0);
    p.cards=Math.max(0,p.cards-1); activeRoom.drawnCount++;
    addLog(`${p.name} robó carta ${card.label}.`);
    if(p.cards===1) addLog(`⚡ ¡${p.name} tiene UNA carta! ¡Griten RETRO UNO!`);
    if(!checkGameOver()) startTimer();
  });

  // ── Live response typing (active player only) ──
  socket.on("typeResponse", ({ text }) => {
    if (!activeRoom||!activeRoom.activeCard) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id) return;
    activeRoom.currentResponse=text.slice(0,300);
    broadcast();
  });

  // ── Reactions (anyone except active player) ──
  socket.on("react", ({ emoji }) => {
    if (!activeRoom||!activeRoom.activeCard||!REACTIONS.includes(emoji)) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (p&&p.id===socket.id) return; // active player can't react to own card
    if (activeRoom.reactions[emoji]===undefined) activeRoom.reactions[emoji]=0;
    activeRoom.reactions[emoji]++;
    broadcast();
  });

  // ── Extra time ──
  socket.on("extraTime", () => {
    if (!activeRoom) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id||activeRoom.extraTimeUsed) return;
    activeRoom.extraTimeUsed=true;
    activeRoom.timerEndsAt=(activeRoom.timerEndsAt||Date.now())+30000;
    addLog(`⏳ ${p.name} pidió 30 segundos extra.`);
    broadcast();
  });

  // ── Pause / Resume (host only) ──
  socket.on("togglePause", () => {
    if (!activeRoom||socket.id!==activeRoom.hostId||!activeRoom.activeCard) return;
    activeRoom.paused=!activeRoom.paused;
    if (activeRoom.paused) {
      clearTimer();
      // Freeze: store remaining ms
      activeRoom.pausedRemaining=Math.max(0,activeRoom.timerEndsAt-Date.now());
      activeRoom.timerEndsAt=null;
      addLog("⏸ El host pausó el juego.");
    } else {
      // Resume
      activeRoom.timerEndsAt=Date.now()+(activeRoom.pausedRemaining||activeRoom.config.turnSeconds*1000);
      activeRoom.pausedRemaining=null;
      addLog("▶️ El host reanudó el juego.");
      startTimer();
    }
    broadcast();
  });

  // ── Next / Skip / Reverse ──
  socket.on("next", () => {
    if (!activeRoom||activeRoom.gameOver||activeRoom.paused) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id) return;
    advanceTurn("manual");
  });

  socket.on("skip", () => {
    if (!activeRoom||activeRoom.gameOver||activeRoom.paused) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id) return;
    clearTimer();
    const skipIdx=(activeRoom.currentIdx+activeRoom.direction+activeRoom.players.length)%activeRoom.players.length;
    const skipped=activeRoom.players[skipIdx];
    activeRoom.skipEffect={targetId:skipped?.id,targetName:skipped?.name};
    activeRoom.activeCard=null; activeRoom.timerEndsAt=null;
    activeRoom.currentResponse=""; activeRoom.reactions={};
    addLog(`🚫 ${skipped?.name} fue saltado/a.`);
    broadcast();
    setTimeout(()=>{
      if (!activeRoom) return;
      activeRoom.currentIdx=(skipIdx+activeRoom.direction+activeRoom.players.length)%activeRoom.players.length;
      activeRoom.skipEffect=null; activeRoom.extraTimeUsed=false;
      addLog(`Turno de ${activeRoom.players[activeRoom.currentIdx]?.name}.`);
      broadcast();
    },2500);
  });

  socket.on("reverse", () => {
    if (!activeRoom||activeRoom.gameOver) return;
    const p=activeRoom.players[activeRoom.currentIdx];
    if (!p||p.id!==socket.id) return;
    activeRoom.direction*=-1; addLog("🔄 Orden invertido."); broadcast();
  });

  socket.on("reset", () => {
    if (!activeRoom) return;
    clearTimer();
    const code=activeRoom.code, hostId=activeRoom.hostId;
    const config=activeRoom.config, cards=activeRoom.cards;
    const oldPlayers=activeRoom.players.map(p=>({...p,cards:config.cardsPerPlayer,isHost:p.id===hostId}));
    activeRoom=freshRoom(code,hostId);
    activeRoom.players=oldPlayers; activeRoom.config=config; activeRoom.cards=cards;
    activeRoom.logs=["↺ Nueva retro iniciada. ¡Configura y presiona Iniciar!"];
    scheduleRoomExpiry(); broadcast();
  });

  socket.on("closeRoom", () => {
    if (!activeRoom||socket.id!==activeRoom.hostId) return;
    clearTimer(); io.to(activeRoom.code).emit("roomClosed"); activeRoom=null;
    if (roomExpireTimer) clearTimeout(roomExpireTimer);
  });

  socket.on("disconnect", () => {
    if (!activeRoom) return;
    const idx=activeRoom.players.findIndex(p=>p.id===socket.id);
    if (idx===-1) return;
    const name=activeRoom.players[idx].name, wasHost=activeRoom.players[idx].isHost;
    activeRoom.players.splice(idx,1);
    if (activeRoom.currentIdx>=activeRoom.players.length) activeRoom.currentIdx=0;
    if (wasHost&&activeRoom.players.length>0) {
      activeRoom.hostId=activeRoom.players[0].id; activeRoom.players[0].isHost=true;
      addLog(`${activeRoom.players[0].name} es el nuevo host.`);
    }
    addLog(`${name} salió.`); broadcast();
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Servidor en puerto ${PORT}`));