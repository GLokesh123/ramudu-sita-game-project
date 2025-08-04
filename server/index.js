// index.js

const express = require("express");
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const characters = [
    { name: 'Ramudu', score: 1000 },
    { name: 'Sita', score: 0 },
    { name: 'Lakshmana', score: 900 },
    { name: 'Hanuman', score: 800 },
    { name: 'Vibhishana', score: 700 },
    { name: 'Sugriva', score: 600 },
    { name: 'Jambavan', score: 500 },
    { name: 'Angada', score: 400 },
    { name: 'Indrajit', score: 300 },
    { name: 'Ravana', score: 200 }
];

function distributeCharacters(players, characters) {
    // Shuffles the characters to ensure random distribution.
    const shuffledCharacters = [...characters].sort(() => 0.5 - Math.random());
    
    // Assigns a character to each player.
    const assignedCharacters = players.map((player, index) => {
        return {
            ...player,
            character: shuffledCharacters[index]
        };
    });
    return assignedCharacters;
}

const io = new Server(server, {
    cors: {
        origin: "http://10.131.211.110:3000",
        methods: ["GET", "POST"]
    }
});

const games = {};

function generateRandomGameId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`A user connected with ID: ${socket.id}`);

    socket.on('create_game', (hostName) => {
        const gameId = generateRandomGameId();
        games[gameId] = {
            id: gameId,
            hostId: socket.id,
            players: [{ id: socket.id, name: hostName, totalScore: 0 }],
            isStarted: false
        };
        socket.join(gameId);
        socket.emit('game_created', games[gameId]);
        console.log(`Game created with Id: ${gameId} by host: ${hostName}`);
    });

    socket.on('disconnect', () => {
        console.log(`A user disconnected with ID: ${socket.id}`);
    });

    socket.on('join_game', ({ gameId, playerName }) => {
        const game = games[gameId];
        if (!game || game.isStarted || game.players.length >= 10) {
            socket.emit('join_error', "Unable to join this game.");
            return;
        }

        const newPlayer = { id: socket.id, name: playerName, totalScore: 0 };
        game.players.push(newPlayer);

        socket.join(gameId);

        io.to(gameId).emit('player_joined', game.players);

        console.log(`Player ${playerName} joined game ${gameId}. Current players: ${game.players.map(p => p.name).join(', ')}`);
    });

    socket.on('start_game', (gameId) => {
        const game = games[gameId];
        if (game && game.hostId === socket.id && !game.isStarted) {
            game.isStarted = true;

            const updatedPlayers = distributeCharacters(game.players, characters);
            game.players = updatedPlayers;

            io.to(gameId).emit('game_started', game);
            console.log(`Game ${gameId} has officially started.`);
        }
    });

    socket.on('submit_guess', ({ gameId, guesserId, guessedPlayerName }) => {
        const game = games[gameId];
        if (!game) return;

        const sitaPlayer = game.players.find(p => p.character.name === 'Sita');
        if (!sitaPlayer) return;

        const guessedPlayer = game.players.find(p => p.name === guessedPlayerName);
        const isCorrect = (guessedPlayer && guessedPlayer.id === sitaPlayer.id);

        let currentRoundScores = {};
        game.players.forEach(player => {
            currentRoundScores[player.id] = player.character.score;
        });

        if (isCorrect) {
            currentRoundScores[guesserId] = 1000;
            currentRoundScores[sitaPlayer.id] = 0;
        } else {
            currentRoundScores[guesserId] = 0;
            currentRoundScores[sitaPlayer.id] = 1000;
        }

        const updatedPlayers = game.players.map(player => {
            return {
                ...player,
                totalScore: player.totalScore + (currentRoundScores[player.id] || 0)
            };
        });
        game.players = updatedPlayers;

        io.to(gameId).emit('round_results', { roundScores: currentRoundScores, isCorrect });
    });

    socket.on('exit_game', (gameId) => {
        const game = games[gameId];
        if (game && game.hostId === socket.id) {
            // Sort players by total score to find the winner.
            const winner = game.players.sort((a, b) => b.totalScore - a.totalScore)[0];
            io.to(gameId).emit('game_ended', winner);
            delete games[gameId];
            console.log(`Game ${gameId} ended. Winner is ${winner.name}.`);
        }
    });
});

const PORT = 4000;

app.get("/", (req, res) => {
    res.send("<h1>Server is running</h1>");
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Accessible at: http://YOUR_IP_ADDRESS:${PORT}`);
});