# 🃏 Retro UNO — Multijugador

Retrospectiva Scrum estilo UNO con sincronización en tiempo real via WebSockets.

---

## Estructura del proyecto

```
retro-uno-multiplayer/
├── index.html      → Frontend (sube a GitHub Pages)
├── server.js       → Backend Node.js (sube a Render)
├── package.json    → Dependencias del servidor
└── README.md
```

---

## 🚀 Despliegue paso a paso

### 1. Sube el backend a Render

1. Crea una cuenta en https://render.com
2. Crea un nuevo **Web Service**
3. Conecta tu repositorio de GitHub (sube `server.js` y `package.json`)
4. Configura así:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. Render te dará una URL como `https://retro-uno.onrender.com`
6. Copia esa URL

### 2. Actualiza el frontend

En `index.html`, busca esta línea:

```javascript
const SERVER_URL = "https://TU-SERVIDOR.onrender.com";
```

Reemplaza con la URL de tu servidor Render:

```javascript
const SERVER_URL = "https://retro-uno.onrender.com";
```

### 3. Sube el frontend a GitHub Pages

1. Crea un repositorio en GitHub (puede ser el mismo o uno separado)
2. Sube `index.html`
3. Ve a **Settings → Pages**
4. En **Source**, selecciona la rama `main` y carpeta `/root`
5. GitHub te dará un link como `https://tuusuario.github.io/retro-uno`

### 4. Comparte el link con tu equipo 🎉

Todos entran al link de GitHub Pages. ¡El juego funciona en tiempo real!

---

## 🎮 Cómo facilitar la retro

1. **Antes de empezar:** Todos abren el link y escriben su nombre
2. **Turno por turno:** Solo el jugador activo ve los botones habilitados
3. **Cartas amarillas (Acción):** Anótalas en un doc compartido — son el output real de la retro
4. **Cartas Wild:** Sigue las instrucciones de la carta al pie de la letra para el caos máximo
5. **Al final:** Revisen las acciones juntos y asignen fechas en Jira/Trello

---

## ⚙️ Nota sobre el free tier de Render

El servidor se "duerme" después de 15 minutos sin uso. La primera vez que alguien entre puede tardar 30-60 segundos en despertar. Considera hacer una prueba 5 minutos antes de la retro.

---

## 🛠️ Correr localmente

```bash
npm install
node server.js
# Abre index.html y cambia SERVER_URL a "http://localhost:3000"
```
