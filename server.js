const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// ── Cartas por defecto ────────────────────────────────────────────────
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

function freshState() {
  return {
    players: [], currentIdx: 0, direction: 1,
    discard: [], logs: ["¡Esperando jugadores... comparte el link con tu equipo!"],
    activeCard: null, facilitatorId: null,
    config: { turnSeconds: 90, cardsPerPlayer: 7, sprintName: "Sprint" },
    cards: JSON.parse(JSON.stringify(DEFAULT_CARDS)),
    timerEndsAt: null, extraTimeUsed: false,
    skipEffect: null, started: false, locked: false,
    winner: null, gameOver: false,
    drawnHistory: [],   // { color, label, question, playerName, timestamp }
    totalCards: 0, drawnCount: 0,
  };
}

let gs = freshState();
let serverTimer = null;

function allQuestions() {
  return gs.cards.flatMap(d => d.questions.map(q => ({ color:d.color, label:d.label, tip:d.tip||"", question:q })));
}

function addLog(msg) { gs.logs.push(msg); if(gs.logs.length>60) gs.logs.shift(); }
function broadcast() { io.emit("state", gs); }

function clearTimer() { if(serverTimer){ clearInterval(serverTimer); serverTimer=null; } }

function startTimer() {
  clearTimer();
  if(!gs.activeCard) return;
  gs.timerEndsAt = Date.now() + gs.config.turnSeconds * 1000;
  gs.extraTimeUsed = false;
  broadcast();
  serverTimer = setInterval(() => {
    if(!gs.timerEndsAt){ clearTimer(); return; }
    if(Date.now() >= gs.timerEndsAt){ clearTimer(); advanceTurn("auto"); }
  }, 500);
}

function advanceTurn(reason) {
  clearTimer();
  gs.currentIdx = (gs.currentIdx + gs.direction + gs.players.length) % gs.players.length;
  gs.activeCard = null; gs.timerEndsAt = null; gs.extraTimeUsed = false; gs.skipEffect = null;
  const next = gs.players[gs.currentIdx];
  if(reason==="auto") addLog(`⏱ Tiempo agotado — turno de ${next?.name}.`);
  else addLog(`Turno de ${next?.name}.`);
  broadcast();
}

function checkGameOver() {
  // winner = first to reach 0 cards
  const w = gs.players.find(p => p.cards === 0);
  if(w){ gs.winner = w.name; gs.gameOver = true; clearTimer(); addLog(`🏆 ¡${w.name} ganó el juego!`); broadcast(); return true; }
  // deck exhausted
  if(gs.drawnCount >= gs.totalCards){ gs.gameOver = true; clearTimer(); addLog("🎴 ¡El mazo se agotó! Fin del juego."); broadcast(); return true; }
  return false;
}

io.on("connection", socket => {
  socket.emit("state", gs);

  socket.on("join", ({ name }) => {
    if(gs.locked) return socket.emit("error","La sala está cerrada.");
    if(gs.players.find(p=>p.id===socket.id)) return;
    const COLS=["#2563EB","#DC2626","#16A34A","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D","#E85D04","#3B82F6","#10B981","#F59E0B"];
    const isFacilitator = gs.players.length===0;
    gs.players.push({ id:socket.id, name, cards: gs.config.cardsPerPlayer, color:COLS[gs.players.length%COLS.length], isFacilitator });
    if(isFacilitator){ gs.facilitatorId=socket.id; addLog(`${name} se unió como facilitador/a.`); }
    else addLog(`${name} se unió al juego.`);
    broadcast();
  });

  socket.on("setConfig", ({ turnSeconds, cardsPerPlayer, sprintName }) => {
    if(socket.id!==gs.facilitatorId || gs.started) return;
    if(turnSeconds) gs.config.turnSeconds = Math.max(30,Math.min(300,parseInt(turnSeconds)||90));
    if(cardsPerPlayer) {
      gs.config.cardsPerPlayer = Math.max(3,Math.min(15,parseInt(cardsPerPlayer)||7));
      gs.players.forEach(p => p.cards = gs.config.cardsPerPlayer);
    }
    if(sprintName) gs.config.sprintName = sprintName.trim()||"Sprint";
    broadcast();
  });

  // ── Card editor ───────────────────────────────────────────────────
  socket.on("addQuestion", ({ color, question }) => {
    if(socket.id!==gs.facilitatorId||gs.started) return;
    const cat = gs.cards.find(c=>c.color===color);
    if(cat && question?.trim()) { cat.questions.push(question.trim()); broadcast(); }
  });

  socket.on("editQuestion", ({ color, idx, question }) => {
    if(socket.id!==gs.facilitatorId||gs.started) return;
    const cat = gs.cards.find(c=>c.color===color);
    if(cat && cat.questions[idx]!==undefined && question?.trim()) { cat.questions[idx]=question.trim(); broadcast(); }
  });

  socket.on("deleteQuestion", ({ color, idx }) => {
    if(socket.id!==gs.facilitatorId||gs.started) return;
    const cat = gs.cards.find(c=>c.color===color);
    if(cat && cat.questions.length>1) { cat.questions.splice(idx,1); broadcast(); }
  });

  socket.on("addCategory", ({ color, label, tip }) => {
    if(socket.id!==gs.facilitatorId||gs.started) return;
    if(gs.cards.find(c=>c.color===color)) return;
    gs.cards.push({ color, label:label||"Nueva", tip:tip||"", questions:["Escribe tu primera pregunta aquí."] });
    broadcast();
  });

  socket.on("importCards", ({ cards }) => {
    if(socket.id!==gs.facilitatorId||gs.started) return;
    try { if(Array.isArray(cards)) { gs.cards=cards; broadcast(); } } catch(e){}
  });

  // ── Game control ──────────────────────────────────────────────────
  socket.on("startGame", () => {
    if(socket.id!==gs.facilitatorId||gs.started||gs.players.length<2) return;
    gs.started=true; gs.locked=true;
    gs.totalCards = gs.players.length * gs.config.cardsPerPlayer;
    gs.drawnCount=0;
    gs.players.forEach(p=>p.cards=gs.config.cardsPerPlayer);
    addLog(`🎮 ¡Juego iniciado! ${gs.players.length} jugadores · ${gs.config.cardsPerPlayer} cartas c/u · ${gs.config.turnSeconds}s por turno.`);
    addLog(`Turno de ${gs.players[0].name}.`);
    broadcast();
  });

  socket.on("draw", () => {
    if(gs.gameOver) return;
    const p = gs.players[gs.currentIdx];
    if(!p||p.id!==socket.id||gs.activeCard) return;
    const all = allQuestions();
    const card = all[Math.floor(Math.random()*all.length)];
    gs.activeCard = { ...card, playerName:p.name };
    gs.discard.push(card); if(gs.discard.length>4) gs.discard.shift();
    gs.drawnHistory.push({ ...card, playerName:p.name, timestamp:new Date().toLocaleString("es-GT") });
    p.cards = Math.max(0, p.cards-1);
    gs.drawnCount++;
    addLog(`${p.name} robó carta ${card.label}.`);
    if(p.cards===1) addLog(`⚡ ¡${p.name} tiene UNA carta! ¡Griten RETRO UNO!`);
    if(!checkGameOver()) startTimer();
  });

  socket.on("extraTime", () => {
    const p=gs.players[gs.currentIdx];
    if(!p||p.id!==socket.id||gs.extraTimeUsed) return;
    gs.extraTimeUsed=true;
    gs.timerEndsAt=(gs.timerEndsAt||Date.now())+30000;
    addLog(`⏳ ${p.name} pidió 30 segundos extra.`);
    broadcast();
  });

  socket.on("next", () => {
    const p=gs.players[gs.currentIdx];
    if(!p||p.id!==socket.id||gs.gameOver) return;
    advanceTurn("manual");
  });

  socket.on("skip", () => {
    const p=gs.players[gs.currentIdx];
    if(!p||p.id!==socket.id||gs.gameOver) return;
    clearTimer();
    const skipIdx=(gs.currentIdx+gs.direction+gs.players.length)%gs.players.length;
    const skipped=gs.players[skipIdx];
    gs.skipEffect={ targetId:skipped?.id, targetName:skipped?.name };
    gs.activeCard=null; gs.timerEndsAt=null;
    addLog(`🚫 ${skipped?.name} fue saltado/a.`);
    broadcast();
    setTimeout(()=>{
      gs.currentIdx=(skipIdx+gs.direction+gs.players.length)%gs.players.length;
      gs.skipEffect=null; gs.extraTimeUsed=false;
      addLog(`Turno de ${gs.players[gs.currentIdx]?.name}.`);
      broadcast();
    },2500);
  });

  socket.on("reverse", () => {
    const p=gs.players[gs.currentIdx];
    if(!p||p.id!==socket.id||gs.gameOver) return;
    gs.direction*=-1; addLog("🔄 Orden invertido."); broadcast();
  });

  socket.on("reset", () => {
    clearTimer();
    const facId=gs.facilitatorId;
    const oldPlayers=gs.players.map(p=>({...p,cards:7,isFacilitator:p.id===facId}));
    gs=freshState();
    gs.players=oldPlayers; gs.facilitatorId=facId;
    gs.logs=["¡Nuevo juego iniciado! Configura y presiona Iniciar."];
    broadcast();
  });

  socket.on("disconnect", () => {
    const idx=gs.players.findIndex(p=>p.id===socket.id);
    if(idx===-1) return;
    const name=gs.players[idx].name;
    gs.players.splice(idx,1);
    if(gs.currentIdx>=gs.players.length) gs.currentIdx=0;
    if(socket.id===gs.facilitatorId&&gs.players.length>0){
      gs.facilitatorId=gs.players[0].id; gs.players[0].isFacilitator=true;
      addLog(`${gs.players[0].name} es el nuevo facilitador/a.`);
    }
    addLog(`${name} salió.`); broadcast();
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Servidor en puerto ${PORT}`));