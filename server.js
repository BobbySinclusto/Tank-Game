// Using p2 for server side physics

const {
    Worker,
    isMainThread,
    parentPort,
    workerData,
    threadId,
    MessageChannel,
} = require("worker_threads");

const envConfig = require("dotenv").config();
const express = require("express");
const Ably = require("ably");
const p2 = require("p2");
const app = express();
const ABLY_API_KEY = process.env.ABLY_API_KEY;
const globalGameName = "main-game-thread";
const GAME_ROOM_CAPACITY = 10;
let globalChannel;
let activeGameRooms = {};

// start Ably
const realtime = Ably.Realtime({
    key: ABLY_API_KEY,
    echoMessages: false,
});

// Wait until connection with Ably is established
realtime.connection.once("connected", () => {
    gameRoom = realtime.channels.get(gameRoomName)
});

// Create a uniqueid for each client that authorizes
const uniqueId = function() {
    return "id-" + Math.random().toString(36).substr(2, 16);
};

app.use(express.static("public"));

app.get("/auth", (request, response) => {
    const tokenParams = {clientId: uniqueId() };

    // Authenticate the player with Ably using the unique id (token)
    realtime.auth.createTokenRequest(tokenParams, function (err, tokenRequest) {
        if (err) {
            response.status(500).send("Error requesting token: " + JSON.stringify(err));
        }
        else {
            response.setHeader("Content-Type", "application/json");
            response.send(JSON.stringify(tokenRequest));
        }
    });
});



function resetServerState() {
    peopleAccessingTheWebsite = 0;
    gameOn = false;
    gameTickerOn = false;
    totalPlayers = 0;
    alivePlayers = 0;
    for (let item in playerChannels) {
        playerChanneos[item].unsubscribe();
    }
}

function startMovingPhysicsWorld() {
    let p2WorldInterval = setInterval(function () {
        if (!gameOn) {
            clearInterval(p2WorldInterval);
        }
        else {
            // Update velocity every 5 seconds
            if (++shipVelocityTimer >= 80) {
                shipVelocityTimer = 0;
                shipBody.velocity[0] = calcRandomVelocity();
            }
            p2WorldInterval.step(P2_WORLD_TIME_STEP);
            if (shipBody.position[0] > 1400 && shipBody.velocity[0] > 0) {
                shipBody.position[0] = 0;
            }
            else if (shipBody.position[0] < 0 && shipBody.velocity[0] < 0) {
                shipBody.position[0] = 1400;
            }
        }
    }, 1000 * P2_WORLD_TIME_STEP)
}