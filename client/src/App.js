// App.js

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

const socket = io("process.env.REACT_APP_SOCKET_SERVER");

function App() {
    const [hostName, setHostName] = useState("");
    const [gameInfo, setGameInfo] = useState(null);
    const [socketId, setSocketId] = useState("");
    const [players, setPlayers] = useState([]);
    const [isJoining, setIsJoining] = useState(false);
    const [joiningPlayerName, setJoiningPlayerName] = useState("");
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [myCharacter, setMyCharacter] = useState(null);
    const [ramuduGuess, setRamuduGuess] = useState('');
    const [isRoundOver, setIsRoundOver] = useState(false);
    const [isGuessCorrect, setIsGuessCorrect] = useState(false);
    const [roundScores, setRoundScores] = useState({});
    const [isGameEnded, setIsGameEnded] = useState(false);
    const [winner, setWinner] = useState(null);

    const createGame = () => {
        if (!hostName) {
            alert("Enter your name to create a game");
            return;
        }
        socket.emit("create_game", hostName);
    };

    const joinGame = () => {
        if (!joiningPlayerName) {
            alert("Enter your name to join the game");
            return;
        }
        socket.emit("join_game", { gameId: gameInfo.id, playerName: joiningPlayerName });
    };

    const startGame = () => {
        socket.emit('start_game', gameInfo.id);
    };

    const submitGuess = () => {
        if (!ramuduGuess) {
            alert("Please enter a player's name.");
            return;
        }
        socket.emit('submit_guess', {
            gameId: gameInfo.id,
            guesserId: socket.id,
            guessedPlayerName: ramuduGuess
        });
    };
    
    const exitGame = () => {
        socket.emit('exit_game', gameInfo.id);
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlGameId = urlParams.get('gameId');

        if (urlGameId) {
            setIsJoining(true);
            setGameInfo({ id: urlGameId });
        }

        socket.on("connect", () => {
            setSocketId(socket.id);
            console.log("Connected to server:", socket.id);
        });

        socket.on("game_created", (gameData) => {
            setGameInfo(gameData);
            setPlayers(gameData.players);
            console.log("Game created:", gameData);
        });

        socket.on("player_joined", (playerList) => {
            setPlayers(playerList);
            console.log("New player joined:", playerList);
        });

        socket.on('game_started', (game) => {
            console.log('Game started:', game);
            setIsGameStarted(true);
            const currentPlayer = game.players.find(p => p.id === socket.id);
            if (currentPlayer) {
                setMyCharacter(currentPlayer.character);
            }
        });
        
        socket.on('round_results', ({ roundScores, isCorrect }) => {
            console.log('Round results received:', roundScores, isCorrect);
            setIsRoundOver(true);
            setIsGuessCorrect(isCorrect);
            setRoundScores(roundScores);
        });
        
        socket.on('game_ended', (winnerData) => {
            console.log('Game has ended! Winner:', winnerData);
            setIsGameEnded(true);
            setWinner(winnerData);
        });

        return () => {
            socket.off("connect");
            socket.off("game_created");
            socket.off("player_joined");
            socket.off('game_started');
            socket.off('round_results');
            socket.off('game_ended');
        };
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h1>Ramudu Game</h1>
            <p>Socket ID: {socketId}</p>

            {isGameEnded ? (
                <div style={{ marginTop: '20px' }}>
                    <h2>Game Over!</h2>
                    {winner ? (
                        <h3>The winner is {winner.name} with a total score of {winner.totalScore}!</h3>
                    ) : (
                        <h3>No winner could be determined.</h3>
                    )}
                </div>
            ) : (
                isGameStarted ? (
                    <div>
                        {isRoundOver ? (
                            <div style={{ marginTop: '20px' }}>
                                <h2>Round Over!</h2>
                                <p>Ramudu's guess was: **{isGuessCorrect ? 'Correct!' : 'Incorrect.'}**</p>
                                <h3>Round Scores:</h3>
                                <ul>
                                    {players.map(player => (
                                        <li key={player.id}>
                                            {player.name} ({player.character.name}): {roundScores[player.id]} points
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div>
                                <h2>Game in Progress!</h2>
                                {myCharacter && (
                                    <div>
                                        <h3>Your Character: {myCharacter.name}</h3>
                                        <p>Score Value: {myCharacter.score}</p>
                                    </div>
                                )}
                                {myCharacter && myCharacter.name === 'Ramudu' && (
                                    <div style={{ marginTop: '20px' }}>
                                        <h3>Your Guess:</h3>
                                        <input
                                            type="text"
                                            placeholder="Enter name of the Sita player"
                                            value={ramuduGuess}
                                            onChange={(e) => setRamuduGuess(e.target.value)}
                                        />
                                        <button onClick={submitGuess} style={{ marginLeft: '10px' }}>Submit Guess</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    isJoining ? (
                        <div>
                            <h2>Joining Game {gameInfo.id}</h2>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={joiningPlayerName}
                                onChange={(e) => setJoiningPlayerName(e.target.value)}
                            />
                            <button onClick={joinGame} style={{ marginLeft: "10px" }}>Join Game</button>
                        </div>
                    ) : (
                        <div>
                            {!gameInfo ? (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Enter your name"
                                        value={hostName}
                                        onChange={(e) => setHostName(e.target.value)}
                                    />
                                    <button onClick={createGame} style={{ marginLeft: "10px" }}>Create Game</button>
                                </div>
                            ) : (
                                <div style={{ marginTop: "20px" }}>
                                    <h2>Game ID: {gameInfo.id}</h2>
                                    <p>Scan this QR code to join:</p>
                                    <div style={{ padding: "10px", backgroundColor: "#fff" }}>
                                        <QRCodeSVG value={`http://${window.location.hostname}:3000/?gameId=${gameInfo.id}`} />
                                    </div>
                                    <div style={{ marginTop: "20px" }}>
                                        <h3>Players Joined ({players.length}):</h3>
                                        <ul style={{ listStyleType: "none", padding: "0" }}>
                                            {players.map((player) => (
                                                <li key={player.id}>{player.name}</li>
                                            ))}
                                        </ul>
                                        <button onClick={startGame} style={{ marginTop: "10px" }}>Start Game</button>
                                        <button onClick={exitGame} style={{ marginTop: "10px", marginLeft: "10px" }}>Exit Game</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )
            )}
        </div>
    );
}

export default App;