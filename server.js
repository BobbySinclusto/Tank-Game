const { triggerAsyncId } = require('async_hooks');
const { SSL_OP_TLS_ROLLBACK_BUG } = require('constants');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var players = {};
var current_map = generate_map(8, 6);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// To represent the map we will have one array for each of the vertical walls and one array for each of the horizontal walls.
// The number of vertical walls in a row is always one less than the number of grid squares in a row.
// The number of horizontal walls in a row is always the same as the number of grid squares in a row.
// The number of vertical walls in a column is always the same as the number of grid squares in a column.
// The number of horizontal walls in a column is always one less than the number of grid squares in a column.
// Each grid square has the following walls: vw[i][j-1] vw[i][j] hw[i-1][j] hw[i][j]
// The output of this function is an array with two elements: the vertical wall array, and the horizontal wall array.
/*
function generate_map(width, height) {
    // Set up the arrays
    let vw = new Array(height);
    for (let i = 0; i < height; ++i) {
        vw[i] = new Array(width - 1).fill(1);
    }
    let hw = new Array(height - 1);
    for (let i = 0; i < height - 1; ++i) {
        hw[i] = new Array(width).fill(1);
    }

    // Generate the board
    for (let i = 0; i < height; ++i) {
        for (let j = 0; j < width; ++j) {
            // Choose either horizontal or vertical wall to delete
            if (Math.floor(Math.random() * 2) == 0) {
                // Delete a vertical wall. Make sure that we choose one that isn't out of bounds.
                let d = Math.floor(Math.random() * 2);
                if (j == width - 1 || (d == 0 && j != 0)) {
                    // Delete wall to the left
                    vw[i][j - 1] = 0;
                }
                else {
                    // Delete wall to the right
                    vw[i][j] = 0;
                }
            }
            else {
                // Delete a horizontal wall. Make sure that we choose one that isn't out of bounds.
                let d = Math.floor(Math.random() * 2);
                if (i == height - 1 || (d == 0 && i != 0)) {
                    // Delete wall to the left
                    hw[i - 1][j] = 0;
                }
                else {
                    // Delete wall to the right
                    hw[i][j] = 0;
                }
            }
        }
    }

    return [vw, hw];
}
*/

// TAKE 2
function validate_map(map) {
    let vw = map[0];
    let hw = map[1];
    let rows = vw.length;
    let cols = hw[0].length;
    // Start at top left grid square
    // Do a search of some kind
    // If we don't count all the nodes then it's a bad map
    let s = [];
    let explored = new Set();
    s.push(0);
    let count = 0;

    while (s.length != 0) {
        let v = s.pop();
        explored.add(v);
        ++count;

        // Add connected vertices if they haven't been visited
        let r = Math.floor(v / cols);
        let c = v % cols;
        // up
        if (r - 1 >= 0 && hw[r - 1][c] == 0) {
            let w = (r - 1) * cols + c;
            if (!explored.has(w)) {
                s.push(w);
            }
        }
        // down
        if (r < rows - 1 && hw[r][c] == 0) {
            let w = (r + 1) * cols + c;
            if (!explored.has(w)) {
                s.push(w);
            }
        }
        // left
        if (c - 1 >= 0 && vw[r][c - 1] == 0) {
            let w = r * cols + c - 1;
            if (!explored.has(w)) {
                s.push(w);
            }
        }
        // right
        if (c < cols - 1 && vw[r][c] == 0) {
            let w = r * cols + c + 1;
            if (!explored.has(w)) {
                s.push(w);
            }
        }
    }

    return explored.size == rows * cols;
}

function generate_map(width, height) {
    while (true) {
        // Set up the arrays
        let vw = new Array(height);
        for (let i = 0; i < height; ++i) {
            vw[i] = new Array(width - 1).fill(1);
        }
        let hw = new Array(height - 1);
        for (let i = 0; i < height - 1; ++i) {
            hw[i] = new Array(width).fill(1);
        }

        // Generate the board
        for (let i = 0; i < height; ++i) {
            for (let j = 0; j < width; ++j) {
                // Choose either horizontal or vertical wall to delete
                let tries = 0;
                while (tries >= 0 && tries < 20) {
                    if (Math.floor(Math.random() * 2) == 0) {
                        // Delete a vertical wall. Make sure that we choose one that isn't out of bounds.
                        let d = Math.floor(Math.random() * 2);
                        if (j == width - 1 || (d == 0 && j != 0)) {
                            // Delete wall to the left
                            if (vw[i][j - 1] != 0) {
                                vw[i][j - 1] = 0;
                                tries = -2;
                            }
                        }
                        else {
                            // Delete wall to the right
                            if (vw[i][j] != 0) {
                                vw[i][j] = 0;
                                tries = -2;
                            }
                        }
                    }
                    else {
                        // Delete a horizontal wall. Make sure that we choose one that isn't out of bounds.
                        let d = Math.floor(Math.random() * 2);
                        if (i == height - 1 || (d == 0 && i != 0)) {
                            // Delete wall to the left
                            if (hw[i - 1][j] != 0) {
                                hw[i - 1][j] = 0;
                                tries = -2;
                            }
                        }
                        else {
                            // Delete wall to the right
                            if (hw[i][j] != 0) {
                                hw[i][j] = 0;
                                tries = -2;
                            }
                        }
                    }
                    ++tries;
                }
            }
        }
        if (validate_map([vw, hw])) {
            return [vw, hw];
        }
    }
}
// END OF TAKE 2

io.on('connection', function(socket) {
    console.log('a user connected!');

    // create a new player and add it to our players object
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0)? 'red' : 'blue'
    };

    // Send the players object to the new player
    socket.emit('currentPlayers', players);
    // Send the map to the new player
    socket.emit('current_map', current_map);

    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
        console.log('user disconnected.');
        
        // remove player from players
        delete players[socket.id];
        // tell other players to remove this player
        io.emit('disconnect_player', socket.id);
    });

    // when a player moves, update player data
    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;

        // broadcast new data to all players
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    // When a player shoots a bullet, shoot the bullet.
    socket.on('shotBullet', function (bulletData) {
        socket.broadcast.emit('shotBullet', bulletData);
    });
});

server.listen(8081, function () {
    console.log(`listening on ${server.address().port}`);
});