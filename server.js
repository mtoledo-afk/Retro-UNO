const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const DEFAULT_CARDS = [
  { color:"blue", label:"Logro", tip:"El jugador responde primero, el equipo puede agregar.", questions:[
    "¿Qué entregable de este sprint te dio más satisfacción?",
    "¿Qué imprevisto resolviste mejor de lo esperado?",
    "¿Qué decisión técnica tomada este sprint resultó acertada?",
    "¿En qué momento el equipo se ayudó bien entre sí?",
    "¿Qué tarea que parecía complicada terminó siendo más simple de lo previsto?",
    "¿Qué feedback positivo recibiste (de cliente, PO o compañero) este sprint?",
    "¿Qué proceso o herramienta usaste por primera vez y funcionó bien?",
    "¿Qué parte del sprint salió \"como en el plan\", sin sorpresas?",
    "¿De qué logro del equipo (no solo individual) te sientes orgulloso/a?",
    "¿Qué aprendizaje técnico o de proceso te llevas de este sprint?",
    "¿Qué bug o problema atrapaste antes de que llegara a producción?",
    "¿Qué tarea terminaste antes de lo esperado?",
    "¿Qué mejora pequeña hiciste que nadie pidió pero valió la pena?",
    "¿En qué te sentiste más seguro/a técnicamente este sprint?",
    "¿Qué reconocerías públicamente de un compañero de equipo este sprint?",
  ]},
  { color:"red", label:"Reto", tip:"Compartan el reto, el equipo lo mueve a acciones.", questions:[
    "¿Qué tarea resultó mucho más pesada de lo estimado inicialmente?",
    "¿Hubo algún criterio de aceptación que tuvo que recortarse o moverse? ¿Por qué?",
    "¿Qué bloqueo tardó más de lo deseado en resolverse?",
    "¿Qué información llegó tarde y afectó el avance de alguna historia?",
    "¿Qué dependencia externa (otro equipo, cliente, infraestructura) generó fricción?",
    "¿Hubo algo que se descubrió \"sobre la marcha\" que cambió el alcance de una tarea?",
    "¿Qué parte de la estimación falló más este sprint, y por qué crees que pasó?",
    "¿Qué comunicación pudo haber sido más clara o más temprana?",
    "¿Qué riesgo identificado a tiempo evitó un problema mayor?",
    "¿Qué tarea generó más idas y vueltas entre QA y Desarrollo?",
    "¿Qué tarea tuvo más retrabajo de lo normal?",
    "¿Qué parte del sprint se sintió más desorganizada?",
    "¿Qué herramienta o ambiente te hizo perder tiempo este sprint?",
    "¿Qué tarea quedó \"casi lista\" pero no se pudo cerrar?",
    "¿Qué supuesto inicial resultó incorrecto y nos costó tiempo?",
  ]},
  { color:"green", label:"Idea", tip:"El equipo vota pulgares arriba en el chat si está de acuerdo.", questions:[
    "¿Qué cambiarías en cómo estimamos historias con alta incertidumbre técnica?",
    "¿Qué señal temprana podríamos vigilar para detectar que una historia se está complicando?",
    "¿Qué experimento de proceso te gustaría probar el próximo sprint?",
    "¿Cómo podríamos hacer más visible el avance real de una tarea \"pesada\" antes de que sea tarde?",
    "¿Qué mejora propondrías para la comunicación entre roles (FE/BE/QA)?",
    "¿Qué automatización o herramienta nos ahorraría tiempo?",
    "¿Cómo podríamos reducir el impacto cuando hay que recortar un CA a último momento?",
    "¿Qué cambiarías en el refinamiento de historias para evitar sorpresas técnicas?",
    "¿Qué métrica o dato nos ayudaría a tomar mejores decisiones en sprint planning?",
    "¿Qué harías diferente si pudieras repetir este sprint desde el día 1?",
    "¿Qué propondrías para detectar deuda técnica antes de que crezca?",
    "¿Cómo podríamos mejorar el handoff entre Desarrollo y QA?",
    "¿Qué ritual o reunión eliminarías o simplificarías?",
    "¿Qué prueba (spike, PoC) ayudaría a reducir incertidumbre antes de comprometer una historia?",
    "¿Qué te gustaría que el equipo empezara a hacer y aún no hace?",
  ]},
  { color:"yellow", label:"Acción", tip:"Debe quedar con nombre y fecha comprometida.", questions:[
    "¿Qué te comprometes a hacer distinto en la próxima estimación, y para cuándo?",
    "¿Qué acción concreta evitaría que un CA se recorte por sorpresa, y quién la lidera?",
    "¿Qué tarea pendiente de este sprint asumes resolver, y cuándo?",
    "¿Qué mejora de proceso te comprometes a probar en el próximo sprint?",
    "¿A quién y cuándo le comunicarás un riesgo que detectaste tarde la próxima vez?",
    "¿Qué documentación o conocimiento te comprometes a dejar registrado, y para qué fecha?",
    "¿Qué seguimiento darás a la historia que quedó con el CA pendiente?",
    "¿Qué acción tomarás para detectar antes una tarea \"más pesada de lo esperado\"?",
    "¿Qué reunión o checkpoint propones agregar, y a partir de cuándo?",
    "¿Qué tarea técnica deuda te comprometes a abordar, y en qué sprint?",
    "¿Qué validarás con otro rol (FE/BE/QA) antes de comprometer la próxima historia similar?",
    "¿Qué spike o prueba técnica propones hacer antes del próximo sprint, y quién la hace?",
    "¿Qué acción tomarás para mejorar tu propia estimación personal?",
    "¿Qué le pedirás al equipo que te ayude a cumplir, y para cuándo?",
    "¿Qué revisarás del backlog antes del próximo planning para evitar sorpresas?",
  ]},
  { color:"wild", label:"Wild", tip:"", questions:[
    "ROBA 2: ¿Qué fue lo más impredecible del sprint?",
    "ROBA 4: ¿Qué parte del sprint sintieron que se les fue de las manos?",
    "SALTA: ¿Hay algo de este sprint que prefieres no comentar hoy?",
    "REVERSA: Devuelve la pregunta — ¿qué le preguntarías tú al equipo sobre este sprint?",
    "WILD COLOR: Elige tú la categoría de la siguiente carta.",
    "CAMBIO DE COLOR: Describe el sprint con un color y explica por qué.",
    "CHALLENGE: Reta a alguien a defender una decisión técnica que tomó este sprint.",
    "VOTO RELÁMPAGO: En una palabra, ¿cómo describirías este sprint?",
    "ROAST RÁPIDO: Cuenta una anécdota chistosa o curiosa de este sprint.",
    "ENERGÍA: Si este sprint fuera una canción o película, ¿cuál sería y por qué?",
    "ROBA 2: ¿Qué tarea te hubiera gustado hacer pero no alcanzaste?",
    "ROBA 4: ¿Qué decisión grupal tomamos este sprint que valdría la pena revisar?",
    "SALTA: ¿Qué pregunta de esta sesión preferirías saltarte?",
    "REVERSA: ¿Qué le preguntarías al \'yo\' del inicio del sprint?",
    "WILD COLOR: Si pudieras cambiar una sola cosa del sprint, ¿qué color de carta usarías para contarlo?",
  ]},
];

const REACTIONS = ["👍","👎","🔥","💡","❤️"];
const COLORS = ["#2563EB","#DC2626","#16A34A","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D","#E85D04","#3B82F6","#10B981","#F59E0B"];

let activeRoom = null;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
let roomExpireTimer = null;
let serverTimer = null;
let reactionTimer = null;

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
    currentIdx: 0, direction: 1, directionFlash: false,
    discard: [],
    logs: ["🎮 Sala creada. Comparte el código con tu equipo."],
    activeCard: null,
    forcedColor: null,          // set by WILD COLOR card
    pendingDraw2: false,        // next player must answer 2 in a row
    pendingDraw2Count: 0,       // how many left to answer in a row
    currentResponse: "",
    reactions: {},
    config: { turnSeconds: 90, cardsPerPlayer: 7, sprintName: "Sprint", gameDurationMinutes: 0, reactionSeconds: 15 },
    cards: JSON.parse(JSON.stringify(DEFAULT_CARDS)),
    timerEndsAt: null,
    reactionTimerEndsAt: null,
    gameDurationEndsAt: null,
    extraTimeUsed: false,
    paused: false,
    responseSubmitted: false,
    skipEffect: null,
    started: false, locked: false,
    gameOver: false, winner: null, winners: [],
    unoAlert: null,             // { playerId, playerName } — waiting for UNO shout
    drawnHistory: [],
    totalCards: 0, drawnCount: 0,
    questionUsageCount: {},   // { question: timesDrawn } max 2 per session
    createdAt: Date.now(),
  };
}

function scheduleRoomExpiry() {
  if (roomExpireTimer) clearTimeout(roomExpireTimer);
  roomExpireTimer = setTimeout(() => {
    if (activeRoom) { io.to(activeRoom.code).emit("roomExpired"); activeRoom = null; }
  }, ROOM_TTL_MS);
}

function addLog(msg) {
  if (!activeRoom) return;
  activeRoom.logs.push(msg);
  if (activeRoom.logs.length > 80) activeRoom.logs.shift();
}

function broadcast() { if (!activeRoom) return; io.to(activeRoom.code).emit("state", activeRoom); }
function clearTimer() { if (serverTimer) { clearInterval(serverTimer); serverTimer = null; } }
function clearReactionTimer() { if (reactionTimer) { clearInterval(reactionTimer); reactionTimer = null; } }

function addCards(playerIdx, count) {
  const r = activeRoom;
  if (!r.players[playerIdx]) return;
  r.players[playerIdx].cards += count;
  addLog(`📥 ${r.players[playerIdx].name} recibe +${count} carta${count > 1 ? "s" : ""}.`);
}

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

function saveResponseToHistory() {
  const r = activeRoom;
  if (r.drawnHistory.length > 0) {
    const last = r.drawnHistory[r.drawnHistory.length - 1];
    last.response = r.currentResponse;
    last.reactions = { ...r.reactions };
  }
}

function advanceTurn(reason) {
  clearTimer();
  clearReactionTimer();
  const r = activeRoom;
  saveResponseToHistory();
  r.reactionTimerEndsAt = null;

  // If pending draw2 (ROBA 2), same player draws again
  if (r.pendingDraw2 && r.pendingDraw2Count > 0) {
    r.pendingDraw2Count--;
    if (r.pendingDraw2Count === 0) r.pendingDraw2 = false;
    r.activeCard = null; r.timerEndsAt = null; r.extraTimeUsed = false;
    r.currentResponse = ""; r.reactions = {}; r.responseSubmitted = false; r.paused = false;
    addLog(reason === "auto"
      ? `⏱ Tiempo agotado — ${r.players[r.currentIdx]?.name} debe responder ${r.pendingDraw2Count + 1} más.`
      : `${r.players[r.currentIdx]?.name} responde otra pregunta (ROBA 2).`);
    broadcast();
    return;
  }

  r.currentIdx = (r.currentIdx + r.direction + r.players.length) % r.players.length;
  r.activeCard = null; r.timerEndsAt = null; r.extraTimeUsed = false;
  r.skipEffect = null; r.currentResponse = ""; r.reactions = {};
  r.paused = false; r.responseSubmitted = false; r.pendingDraw2 = false; r.pendingDraw2Count = 0;

  const next = r.players[r.currentIdx];
  if (reason === "auto") addLog(`⏱ Tiempo agotado — turno de ${next?.name}.`);
  else if (reason === "reaction-timeout") addLog(`⏱ Tiempo de reacción terminado — turno de ${next?.name}.`);
  else addLog(`Turno de ${next?.name}.`);
  broadcast();
}

// ── Determine winner(s) by fewest cards ──────────────────────────────
function endGameByCards(reason) {
  clearTimer();
  const r = activeRoom;
  r.gameOver = true;
  const minCards = Math.min(...r.players.map(p => p.cards));
  r.winners = r.players.filter(p => p.cards === minCards).map(p => p.name);
  r.winner = r.winners.join(" & ");
  const msg = r.winners.length > 1
    ? `🏆 ¡Empate! Ganadores: ${r.winner} (${minCards} cartas)`
    : `🏆 ¡${r.winner} gana con ${minCards} cartas!`;
  addLog(msg + (reason ? ` — ${reason}` : ""));
  broadcast();
}

function checkGameOver() {
  const r = activeRoom;
  // Instant win: player reaches exactly 0
  const winner = r.players.find(p => p.cards === 0);
  if (winner) {
    clearTimer();
    r.gameOver = true;
    r.winner = winner.name;
    r.winners = [winner.name];
    addLog(`🏆 ¡${winner.name} llegó a 0 cartas y gana!`);
    broadcast();
    return true;
  }
  return false;
}

function pickNextCard(forcedColor) {
  const cards = activeRoom.cards;
  const usage = activeRoom.questionUsageCount;
  const MAX_USES = 2;
  const lastQuestion = activeRoom.discard.length ? activeRoom.discard[activeRoom.discard.length - 1].question : null;

  function questionsFor(cat) {
    return cat.questions.map(q => ({ color: cat.color, label: cat.label, tip: cat.tip || "", question: q }));
  }

  function freshFilter(list) {
    let fresh = list.filter(q => (usage[q.question] || 0) < MAX_USES && q.question !== lastQuestion);
    if (fresh.length > 0) return fresh;
    fresh = list.filter(q => (usage[q.question] || 0) < MAX_USES);
    if (fresh.length > 0) return fresh;
    return list.filter(q => q.question !== lastQuestion).length ? list.filter(q => q.question !== lastQuestion) : list;
  }

  // Forced color (Wild Color) — pick fresh question from that category only
  if (forcedColor) {
    const cat = cards.find(c => c.color === forcedColor);
    if (cat && cat.questions.length) {
      const candidates = freshFilter(questionsFor(cat));
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Balanced category pick: choose a category uniformly at random first,
  // then a fresh question within it — so every color (5 cats) gets ~20% regardless of question count.
  const categoriesWithOptions = cards.filter(c => c.questions.length > 0);
  if (categoriesWithOptions.length === 0) return null;

  // Try up to N times to find a category with at least one non-exhausted question
  let attempts = 0;
  let chosenCat, candidates;
  do {
    chosenCat = categoriesWithOptions[Math.floor(Math.random() * categoriesWithOptions.length)];
    candidates = freshFilter(questionsFor(chosenCat));
    attempts++;
  } while (candidates.length === 0 && attempts < 20);

  if (candidates.length === 0) {
    // Full reset — every category exhausted
    activeRoom.questionUsageCount = {};
    addLog("🔄 Todas las preguntas se han usado — reiniciando el mazo.");
    candidates = questionsFor(chosenCat);
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ── Socket.io ─────────────────────────────────────────────────────────
io.on("connection", socket => {
  socket.emit("serverStatus", { hasRoom: !!activeRoom, code: activeRoom?.code || null });

  // ── Room management ──
  socket.on("createRoom", ({ name }) => {
    if (activeRoom) return socket.emit("error", "Ya existe una sala activa. Solo puede haber una sala a la vez.");
    const code = generateCode();
    activeRoom = freshRoom(code, socket.id);
    activeRoom.players.push({ id: socket.id, name, cards: activeRoom.config.cardsPerPlayer, color: COLORS[0], isHost: true });
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
    activeRoom.players.push({ id: socket.id, name, cards: activeRoom.config.cardsPerPlayer, color: COLORS[activeRoom.players.length % COLORS.length], isHost: false });
    socket.join(activeRoom.code);
    addLog(`${name} se unió a la sala.`);
    broadcast();
  });

  socket.on("rejoin", ({ code, name }) => {
    if (!activeRoom || activeRoom.code !== code) return;
    const p = activeRoom.players.find(p => p.name === name);
    if (p) { p.id = socket.id; socket.join(code); socket.emit("state", activeRoom); }
  });

  // ── Config ──
  socket.on("setConfig", ({ turnSeconds, cardsPerPlayer, sprintName, gameDurationMinutes, reactionSeconds }) => {
    if (!activeRoom || socket.id !== activeRoom.hostId || activeRoom.started) return;
    if (turnSeconds) activeRoom.config.turnSeconds = Math.max(30, Math.min(300, parseInt(turnSeconds) || 90));
    if (cardsPerPlayer) { activeRoom.config.cardsPerPlayer = Math.max(3, Math.min(15, parseInt(cardsPerPlayer) || 7)); activeRoom.players.forEach(p => p.cards = activeRoom.config.cardsPerPlayer); }
    if (sprintName) activeRoom.config.sprintName = sprintName.trim() || "Sprint";
    if (gameDurationMinutes !== undefined) activeRoom.config.gameDurationMinutes = Math.max(0, parseInt(gameDurationMinutes) || 0);
    if (reactionSeconds) activeRoom.config.reactionSeconds = Math.max(5, Math.min(60, parseInt(reactionSeconds) || 15));
    broadcast();
  });

  // ── Card editor ──
  socket.on("addQuestion",    ({ color, question }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&question?.trim()){cat.questions.push(question.trim());broadcast();} });
  socket.on("editQuestion",   ({ color, idx, question }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&cat.questions[idx]!==undefined&&question?.trim()){cat.questions[idx]=question.trim();broadcast();} });
  socket.on("deleteQuestion", ({ color, idx }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; const cat=activeRoom.cards.find(c=>c.color===color); if(cat&&cat.questions.length>1){cat.questions.splice(idx,1);broadcast();} });
  socket.on("addCategory",    ({ color, label, tip }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; if(!activeRoom.cards.find(c=>c.color===color)) activeRoom.cards.push({color,label:label||"Nueva",tip:tip||"",questions:["Escribe tu primera pregunta aquí."]}); broadcast(); });
  socket.on("importCards",    ({ cards }) => { if (!activeRoom||socket.id!==activeRoom.hostId||activeRoom.started) return; if(Array.isArray(cards)){activeRoom.cards=cards;broadcast();} });

  // ── Start game ──
  socket.on("startGame", () => {
    if (!activeRoom || socket.id !== activeRoom.hostId || activeRoom.started || activeRoom.players.length < 2) return;
    activeRoom.started = true;
    activeRoom.locked = true;
    activeRoom.totalCards = activeRoom.players.length * activeRoom.config.cardsPerPlayer;
    activeRoom.players.forEach(p => p.cards = activeRoom.config.cardsPerPlayer);
    // Optional game duration timer
    if (activeRoom.config.gameDurationMinutes > 0) {
      activeRoom.gameDurationEndsAt = Date.now() + activeRoom.config.gameDurationMinutes * 60 * 1000;
      setTimeout(() => {
        if (activeRoom && !activeRoom.gameOver) endGameByCards("tiempo de juego agotado");
      }, activeRoom.config.gameDurationMinutes * 60 * 1000);
    }
    addLog(`🎮 ¡Juego iniciado! ${activeRoom.players.length} jugadores · ${activeRoom.config.cardsPerPlayer} cartas c/u · ${activeRoom.config.turnSeconds}s por turno.`);
    addLog(`Turno de ${activeRoom.players[0].name}.`);
    broadcast();
  });

  // ── Draw card ──
  socket.on("draw", () => {
    if (!activeRoom || activeRoom.gameOver || activeRoom.activeCard || activeRoom.paused) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;

    const card = pickNextCard(activeRoom.forcedColor);
    if (!card) return;
    activeRoom.forcedColor = null; // consume forced color

    activeRoom.activeCard = { ...card, playerName: p.name };
    activeRoom.discard.push(card);
    if (activeRoom.discard.length > 4) activeRoom.discard.shift();
    activeRoom.drawnHistory.push({ ...card, playerName: p.name, response: "", reactions: {}, timestamp: new Date().toLocaleString("es-GT") });
    activeRoom.currentResponse = ""; activeRoom.reactions = {};
    REACTIONS.forEach(r => activeRoom.reactions[r] = 0);

    // Track question usage
    activeRoom.questionUsageCount[card.question] = (activeRoom.questionUsageCount[card.question] || 0) + 1;

    addLog(`${p.name} robó carta ${card.label}.`);

    // Wild effects: apply BEFORE timer (effects on others)
    if (card.question.startsWith("ROBA 2")) {
      const nextIdx = (activeRoom.currentIdx + activeRoom.direction + activeRoom.players.length) % activeRoom.players.length;
      addLog(`🃏 ROBA 2 — ${activeRoom.players[nextIdx]?.name} responderá 2 preguntas seguidas.`);
      // Will be applied when the next turn starts
      activeRoom.nextPlayerDraw2 = true;
    }
    if (card.question.startsWith("ROBA 4")) {
      for (let i = 1; i <= 4; i++) {
        const idx = (activeRoom.currentIdx + activeRoom.direction * i + activeRoom.players.length) % activeRoom.players.length;
        addCards(idx, 1);
      }
    }

    // UNO alert — check AFTER removing card
    // Card count reduces on submitResponse, not on draw, so check will happen there.

    if (!checkGameOver()) startTimer();
    else broadcast();
  });

  // ── Type response (live) ──
  socket.on("typeResponse", ({ text }) => {
    if (!activeRoom || !activeRoom.activeCard) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;
    activeRoom.currentResponse = text.slice(0, 300);
    broadcast();
  });

  // ── Reactions ──
  socket.on("react", ({ emoji }) => {
    if (!activeRoom || !activeRoom.activeCard || !REACTIONS.includes(emoji)) return;
    if (!activeRoom.responseSubmitted) return; // only allowed after response is submitted
    const p = activeRoom.players[activeRoom.currentIdx];
    if (p && p.id === socket.id) return;
    if (activeRoom.reactions[emoji] === undefined) activeRoom.reactions[emoji] = 0;
    activeRoom.reactions[emoji]++;
    broadcast();
  });

  // ── Submit + pass (two-step) ──
  socket.on("next", () => {
    if (!activeRoom || activeRoom.gameOver) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;

    if (activeRoom.activeCard && !activeRoom.responseSubmitted) {
      // STEP 1: submit response — freeze main timer, start reaction window
      clearTimer();
      activeRoom.responseSubmitted = true;
      activeRoom.paused = true;
      activeRoom.pausedRemaining = 0;
      saveResponseToHistory();
      // -1 card for responding
      p.cards = Math.max(0, p.cards - 1);
      addLog(`✅ ${p.name} respondió. (${p.cards} cartas restantes)`);
      // UNO check
      if (p.cards === 1) {
        activeRoom.unoAlert = { playerId: p.id, playerName: p.name, calledUno: false };
        addLog(`⚡ ¡${p.name} tiene UNA carta! ¡Grita RETRO UNO antes que alguien te atrape!`);
        // 10 second window to call UNO
        setTimeout(() => {
          if (!activeRoom || !activeRoom.unoAlert || activeRoom.unoAlert.playerId !== p.id) return;
          if (!activeRoom.unoAlert.calledUno) {
            // Penalty: didn't call UNO
            const pp = activeRoom.players.find(pl => pl.id === p.id);
            if (pp) { pp.cards += 2; addLog(`😱 ¡${pp.name} no gritó RETRO UNO! +2 cartas de penalización.`); }
          }
          activeRoom.unoAlert = null;
          broadcast();
        }, 10000);
      }
      if (!checkGameOver()) {
        // Start reaction window — auto-advance turn when it ends
        clearReactionTimer();
        activeRoom.reactionTimerEndsAt = Date.now() + activeRoom.config.reactionSeconds * 1000;
        broadcast();
        reactionTimer = setInterval(() => {
          if (!activeRoom || !activeRoom.reactionTimerEndsAt) { clearReactionTimer(); return; }
          if (Date.now() >= activeRoom.reactionTimerEndsAt) {
            clearReactionTimer();
            activeRoom.reactionTimerEndsAt = null;
            activeRoom.responseSubmitted = false;
            activeRoom.paused = false;
            activeRoom.unoAlert = null;
            if (activeRoom.nextPlayerDraw2) {
              activeRoom.nextPlayerDraw2 = false;
              activeRoom.pendingDraw2 = true;
              activeRoom.pendingDraw2Count = 1;
            }
            advanceTurn("reaction-timeout");
          }
        }, 500);
      } else {
        broadcast();
      }
    } else {
      // STEP 2: manual pass (e.g. if host/player wants to skip the wait) — actually advance turn
      clearReactionTimer();
      activeRoom.reactionTimerEndsAt = null;
      activeRoom.responseSubmitted = false;
      activeRoom.paused = false;
      activeRoom.unoAlert = null;
      // Apply ROBA 2 to next player
      if (activeRoom.nextPlayerDraw2) {
        activeRoom.nextPlayerDraw2 = false;
        activeRoom.pendingDraw2 = true;
        activeRoom.pendingDraw2Count = 1; // they answer current + 1 extra
      }
      advanceTurn("manual");
    }
  });

  // ── Call UNO ──
  socket.on("callUno", ({ targetId }) => {
    if (!activeRoom || !activeRoom.unoAlert) return;
    const caller = activeRoom.players.find(p => p.id === socket.id);
    const target = activeRoom.players.find(p => p.id === targetId);
    if (!caller || !target) return;

    if (socket.id === targetId) {
      // The player with 1 card calls UNO themselves
      activeRoom.unoAlert.calledUno = true;
      addLog(`🎉 ¡${caller.name} gritó RETRO UNO! Está a salvo.`);
    } else {
      // Another player catches them
      if (!activeRoom.unoAlert.calledUno) {
        target.cards += 2;
        addLog(`😱 ¡${caller.name} atrapó a ${target.name}! +2 cartas de penalización.`);
        activeRoom.unoAlert = null;
      }
    }
    broadcast();
  });

  // ── Wild Color: host/active player picks forced color ──
  socket.on("setForcedColor", ({ color }) => {
    if (!activeRoom) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;
    activeRoom.forcedColor = color;
    addLog(`🌈 ${p.name} eligió categoría: ${color} para el siguiente turno.`);
    broadcast();
  });

  // ── Extra time ──
  socket.on("extraTime", () => {
    if (!activeRoom) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id || activeRoom.extraTimeUsed) return;
    activeRoom.extraTimeUsed = true;
    activeRoom.timerEndsAt = (activeRoom.timerEndsAt || Date.now()) + 30000;
    addLog(`⏳ ${p.name} pidió 30 segundos extra.`);
    broadcast();
  });

  // ── Pause / Resume (host) ──
  socket.on("togglePause", () => {
    if (!activeRoom || socket.id !== activeRoom.hostId || !activeRoom.activeCard) return;
    activeRoom.paused = !activeRoom.paused;
    if (activeRoom.paused) {
      clearTimer();
      activeRoom.pausedRemaining = Math.max(0, (activeRoom.timerEndsAt || Date.now()) - Date.now());
      activeRoom.timerEndsAt = null;
      addLog("⏸ El host pausó el juego.");
    } else {
      activeRoom.timerEndsAt = Date.now() + (activeRoom.pausedRemaining || activeRoom.config.turnSeconds * 1000);
      activeRoom.pausedRemaining = null;
      addLog("▶️ El host reanudó el juego.");
      startTimer();
    }
    broadcast();
  });

  // ── Host ends game manually ──
  socket.on("endGame", () => {
    if (!activeRoom || socket.id !== activeRoom.hostId || activeRoom.gameOver) return;
    endGameByCards("el host terminó el juego");
  });

  // ── Skip — only valid when active card is SALTA ──
  socket.on("skip", () => {
    if (!activeRoom || activeRoom.gameOver || activeRoom.paused) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;
    if (!activeRoom.activeCard || !activeRoom.activeCard.question.startsWith("SALTA")) return;
    clearTimer();
    const skipIdx = (activeRoom.currentIdx + activeRoom.direction + activeRoom.players.length) % activeRoom.players.length;
    const skipped = activeRoom.players[skipIdx];
    activeRoom.skipEffect = { targetId: skipped?.id, targetName: skipped?.name };
    activeRoom.activeCard = null; activeRoom.timerEndsAt = null;
    activeRoom.currentResponse = ""; activeRoom.reactions = {};
    addLog(`🚫 ${skipped?.name} fue saltado/a.`);
    broadcast();
    setTimeout(() => {
      if (!activeRoom) return;
      activeRoom.currentIdx = (skipIdx + activeRoom.direction + activeRoom.players.length) % activeRoom.players.length;
      activeRoom.skipEffect = null; activeRoom.extraTimeUsed = false;
      addLog(`Turno de ${activeRoom.players[activeRoom.currentIdx]?.name}.`);
      broadcast();
    }, 2500);
  });

  // ── Reverse — only valid when active card is REVERSA ──
  socket.on("reverse", () => {
    if (!activeRoom || activeRoom.gameOver) return;
    const p = activeRoom.players[activeRoom.currentIdx];
    if (!p || p.id !== socket.id) return;
    if (!activeRoom.activeCard || !activeRoom.activeCard.question.startsWith("REVERSA")) return;
    activeRoom.direction *= -1;
    activeRoom.directionFlash = true;
    addLog("🔄 Orden invertido.");
    broadcast();
    setTimeout(() => { if (activeRoom) { activeRoom.directionFlash = false; broadcast(); } }, 1200);
  });

  // ── Reset ──
  socket.on("reset", () => {
    if (!activeRoom) return;
    clearTimer();
    const code = activeRoom.code, hostId = activeRoom.hostId;
    const config = activeRoom.config, cards = activeRoom.cards;
    const oldPlayers = activeRoom.players.map(p => ({ ...p, cards: config.cardsPerPlayer, isHost: p.id === hostId }));
    activeRoom = freshRoom(code, hostId);
    activeRoom.players = oldPlayers; activeRoom.config = config; activeRoom.cards = cards;
    activeRoom.logs = ["↺ Nueva retro iniciada. ¡Configura y presiona Iniciar!"];
    scheduleRoomExpiry(); broadcast();
  });

  socket.on("closeRoom", () => {
    if (!activeRoom || socket.id !== activeRoom.hostId) return;
    clearTimer(); io.to(activeRoom.code).emit("roomClosed"); activeRoom = null;
    if (roomExpireTimer) clearTimeout(roomExpireTimer);
  });

  socket.on("disconnect", () => {
    if (!activeRoom) return;
    const idx = activeRoom.players.findIndex(p => p.id === socket.id);
    if (idx === -1) return;
    const name = activeRoom.players[idx].name, wasHost = activeRoom.players[idx].isHost;
    activeRoom.players.splice(idx, 1);
    if (activeRoom.currentIdx >= activeRoom.players.length) activeRoom.currentIdx = 0;
    if (wasHost && activeRoom.players.length > 0) {
      activeRoom.hostId = activeRoom.players[0].id; activeRoom.players[0].isHost = true;
      addLog(`${activeRoom.players[0].name} es el nuevo host.`);
    }
    addLog(`${name} salió.`); broadcast();
  });
});

// ── Admin endpoints (manual recovery if a room gets stuck) ─────────────
const ADMIN_KEY = "Chester";

app.get("/admin/status", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send("❌ Clave incorrecta.");
  res.json({
    hasRoom: !!activeRoom,
    code: activeRoom?.code || null,
    players: activeRoom?.players?.length || 0,
    started: activeRoom?.started || false,
    createdAt: activeRoom?.createdAt || null,
  });
});

app.get("/admin/reset", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send("❌ Clave incorrecta.");
  if (activeRoom) {
    clearTimer();
    clearReactionTimer();
    io.to(activeRoom.code).emit("roomClosed");
  }
  activeRoom = null;
  if (roomExpireTimer) clearTimeout(roomExpireTimer);
  res.send("✅ Sala fantasma eliminada. Ya puedes crear una sala nueva.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));