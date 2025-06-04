const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

// Carregar estado inicial do data.json
const initialGameState = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json")));

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ path: "/ws", server });

// Estado do jogo inicializado com data.json
let gameState = { ...initialGameState, players: [] };

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, ".")));

// Função para verificar vencedor
function checkWinner(game) {
  const choices = game.choices;
  if (choices.Ewerton && choices.Hellen) {
    const moves = ["rock", "paper", "scissors"];
    if (choices.Ewerton === choices.Hellen) {
      game.winner = "Empate";
    } else if (
      (choices.Ewerton === "rock" && choices.Hellen === "scissors") ||
      (choices.Ewerton === "paper" && choices.Hellen === "rock") ||
      (choices.Ewerton === "scissors" && choices.Hellen === "paper")
    ) {
      game.winner = "Ewerton";
    } else {
      game.winner = "Hellen";
    }
  }
}

// Função para resetar o jogo
function resetGame() {
  gameState = {
    choices: { Ewerton: null, Hellen: null },
    winner: null,
    players: gameState.players
  };
}

// Enviar estado do jogo para todos os clientes
function broadcastGameState() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "gameState", game: gameState }));
    }
  });
}

// WebSocket: lidar com conexões
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "login") {
      if (["Ewerton", "Hellen"].includes(data.player) && !gameState.players.includes(data.player)) {
        gameState.players.push(data.player);
        ws.player = data.player; // Associar jogador ao WebSocket
        broadcastGameState();
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Jogador já conectado ou inválido." }));
        ws.close();
      }
    }

    if (data.type === "play" && !gameState.winner && gameState.players.includes(data.player)) {
      if (!gameState.choices[data.player]) {
        gameState.choices[data.player] = data.choice;
        checkWinner(gameState);
        broadcastGameState();
      }
    }

    if (data.type === "reset") {
      resetGame();
      broadcastGameState();
    }
  });

  ws.on("close", () => {
    gameState.players = gameState.players.filter(p => p !== ws.player);
    broadcastGameState();
  });

  // Enviar estado inicial imediatamente
  ws.send(JSON.stringify({ type: "gameState", game: gameState }));
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});