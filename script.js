let player = null;
const choicesDiv = document.getElementById("choices");
const info = document.getElementById("info");
let ws;

function login(name) {
  player = name;
  document.getElementById("login").style.display = "none";
  document.getElementById("game").style.display = "block";

  // Conectar ao WebSocket (usar wss:// no Render)
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "login", player: name }));
    info.textContent = `Conectado! Escolhendo jogador ${name}...`;
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "gameState") {
      render(message.game);
    }
  };

  ws.onerror = () => {
    info.textContent = "Erro na conexão com o servidor. Tente recarregar a página.";
  };

  ws.onclose = () => {
    info.textContent = "Conexão perdida. Tente recarregar a página.";
  };
}

function render(game) {
  choicesDiv.innerHTML = "";

  if (game.choices[player]) {
    info.textContent = `Você escolheu ${game.choices[player]}. Aguardando o outro jogador...`;
  } else {
    const moves = ["rock", "paper", "scissors"];
    moves.forEach((move) => {
      const div = document.createElement("div");
      div.className = "choice";
      div.textContent = move.charAt(0).toUpperCase() + move.slice(1);
      div.onclick = () => play(move);
      choicesDiv.appendChild(div);
    });
    info.textContent = `Escolha sua jogada, ${player}!`;
  }

  if (game.winner) {
    if (game.winner === "Empate") {
      info.textContent = `Empate! Reiniciando...`;
    } else {
      info.textContent = `${game.winner} ganhou! Reiniciando...`;
    }
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "reset" }));
    }, 3000);
  }
}

function play(choice) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    info.textContent = "Não conectado ao servidor. Tente recarregar.";
    return;
  }
  ws.send(JSON.stringify({ type: "play", choice, player }));
}