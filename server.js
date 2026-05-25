const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── Estado inicial del juego ──────────────────────────────────────────
const CARDS = [
  {
    color: "blue", label: "Logro",
    tip: "El jugador responde primero, el equipo puede agregar.",
    questions: [
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
    ],
  },
  {
    color: "red", label: "Reto",
    tip: "Compartan el reto, el equipo lo mueve a acciones.",
    questions: [
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
    ],
  },
  {
    color: "green", label: "Idea",
    tip: "El equipo vota pulgares arriba en el chat si está de acuerdo.",
    questions: [
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
    ],
  },
  {
    color: "yellow", label: "Acción",
    tip: "Debe quedar con nombre y fecha comprometida.",
    questions: [
      "¿A qué acción concreta te comprometes el próximo sprint?",
      "¿Qué debería agregar el equipo a la Definición de Terminado?",
      "¿Quién debería ser dueño del blocker más grande del sprint?",
      "Elige una mejora de proceso y nombra a su responsable ahora.",
      "Escribe un objetivo SMART para el próximo sprint en este momento.",
      "¿Qué problema recurrente necesita una solución permanente?",
      "Identifica una dependencia que debemos resolver antes del próximo sprint.",
      "¿Qué debería agregar el Scrum Master a la agenda del planning?",
      "¿Qué historia recurrente debería tener su propio épico?",
      "¿Quién lidera la mejora del proceso de code review?",
    ],
  },
  {
    color: "wild", label: "Wild",
    tip: "",
    questions: [
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
    ],
  },
];

function freshState() {
  return {
    players: [],
    currentIdx: 0,
    direction: 1,
    discard: [],
    fullHistory: [],
    logs: ["¡Esperando jugadores... comparte el link con tu equipo!"],
    started: false,
    activeCard: null,
  };
}

let gameState = freshState();

function drawRandomCard() {
  const all = CARDS.flatMap((d) =>
    d.questions.map((q) => ({ color: d.color, label: d.label, tip: d.tip, question: q }))
  );
  return all[Math.floor(Math.random() * all.length)];
}

function addLog(msg) {
  gameState.logs.push(msg);
  if (gameState.logs.length > 50) gameState.logs.shift();
}

function broadcast() {
  io.emit("state", gameState);
}

// ── Conexiones ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.emit("state", gameState);

  // Unirse al juego
  socket.on("join", ({ name }) => {
    if (gameState.players.find((p) => p.id === socket.id)) return;
    const COLORS = ["#2563EB","#DC2626","#16A34A","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D","#E85D04","#3B82F6","#10B981","#F59E0B"];
    const idx = gameState.players.length;
    gameState.players.push({ id: socket.id, name, cards: 7, color: COLORS[idx % COLORS.length] });
    addLog(`${name} se unió al juego.`);
    broadcast();
  });

  // Renombrar jugador
  socket.on("rename", ({ name }) => {
    const p = gameState.players.find((p) => p.id === socket.id);
    if (p) { const old = p.name; p.name = name; addLog(`${old} cambió su nombre a ${name}.`); broadcast(); }
  });

  // Robar carta (solo el jugador activo)
  socket.on("draw", () => {
    const p = gameState.players[gameState.currentIdx];
    if (!p || p.id !== socket.id) return;
    const card = drawRandomCard();
    gameState.activeCard = { ...card, playerName: p.name };
    gameState.discard.push(card);
    gameState.fullHistory.push({ ...card, playerName: p.name, timestamp: new Date().toISOString() });
    if (gameState.discard.length > 4) gameState.discard.shift();
    p.cards = Math.max(0, p.cards - 1);
    addLog(`${p.name} robó carta ${card.label}.`);
    if (p.cards === 1) addLog(`⚡ ¡${p.name} tiene UNA carta! ¡Griten RETRO UNO!`);
    if (p.cards === 0) addLog(`🏆 ¡${p.name} terminó sus cartas! ¡GANADOR/A!`);
    broadcast();
  });

  // Siguiente turno
  socket.on("next", () => {
    const p = gameState.players[gameState.currentIdx];
    if (!p || p.id !== socket.id) return;
    gameState.currentIdx = (gameState.currentIdx + gameState.direction + gameState.players.length) % gameState.players.length;
    gameState.activeCard = null;
    addLog(`Turno de ${gameState.players[gameState.currentIdx].name}.`);
    broadcast();
  });

  // Saltar
  socket.on("skip", () => {
    const p = gameState.players[gameState.currentIdx];
    if (!p || p.id !== socket.id) return;
    const skipped = gameState.players[gameState.currentIdx].name;
    gameState.currentIdx = (gameState.currentIdx + gameState.direction + gameState.players.length) % gameState.players.length;
    gameState.activeCard = null;
    addLog(`${skipped} fue saltado. Turno de ${gameState.players[gameState.currentIdx].name}.`);
    broadcast();
  });

  // Reversa
  socket.on("reverse", () => {
    const p = gameState.players[gameState.currentIdx];
    if (!p || p.id !== socket.id) return;
    gameState.direction *= -1;
    addLog(`🔄 Orden invertido.`);
    broadcast();
  });

  // Resetear juego (cualquiera puede)
  socket.on("reset", () => {
    const old = gameState.players.map((p) => ({ ...p, cards: 7 }));
    gameState = freshState();
    gameState.players = old;
    gameState.logs = ["¡Nuevo juego iniciado!"];
    gameState.fullHistory = [];
    broadcast();
  });

  // Desconexión
  socket.on("disconnect", () => {
    const idx = gameState.players.findIndex((p) => p.id === socket.id);
    if (idx !== -1) {
      const name = gameState.players[idx].name;
      gameState.players.splice(idx, 1);
      if (gameState.currentIdx >= gameState.players.length) gameState.currentIdx = 0;
      addLog(`${name} salió del juego.`);
      broadcast();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));