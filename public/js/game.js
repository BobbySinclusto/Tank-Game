const WIDTH = 1920;
const HEIGHT = 1080;
const MAX_TANK_SPEED = 100;
const MAX_BULLET_SPEED = 110;

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: WIDTH,
	height: HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {y: 0}
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/playerShip1_blue.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png')
}

function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.playerGroup = this.physics.add.group();
    this.initialX = -1;
    this.initialY = -1;
    this.walls = this.physics.add.group();
    this.myBullets = this.physics.add.group();
    this.otherBullets = this.physics.add.group();

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            }
            else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('disconnect_player', function(playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });
    this.socket.on('playerMoved', function(playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });
    this.socket.on('current_map', function(current_map) {
        console.log(current_map);
        draw_map(self, current_map);
        // Randomly select initial player position based on current map
        self.initialX = Math.floor(Math.random() * self.map_width / self.grid_size) * self.grid_size + self.grid_size * 0.5 + WIDTH / 2 - self.map_width / 2;
        self.initialY = Math.floor(Math.random() * self.map_height / self.grid_size) * self.grid_size + self.grid_size * 0.5 + HEIGHT / 2 - self.map_height / 2;
    });
    this.socket.on('shotBullet', function(bulletData) {
        shootBullet(self, bulletData.x, bulletData.y, bulletData.rot, false);
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    // Players and myBullets collide with walls
    this.physics.add.collider(this.walls, this.playerGroup);
    this.physics.add.collider(this.walls, this.myBullets);
    this.physics.add.collider(this.walls, this.otherBullets);
    // myBullets collide with other players
    this.physics.add.collider(this.myBullets, this.otherPlayers, function (_bullet, _player) {
        console.log("testing");
        alert("ya done hit the dude");
    });
}

function update() {
    if (this.ship) {
        if (this.initialX != -1) {
            this.ship.oldPosition = {x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation};
            this.ship.x = this.initialX;
            this.ship.y = this.initialY;
            this.initialX = -1;
            this.initialY = -1;
        }
        // emit new position if it has changed
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;

        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', {x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation});
        }

        // save old position data
        this.ship.oldPosition = {x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation};

        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-150);
        }
        else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(150);
        }
        else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.ship.setVelocityX(Math.sin(this.ship.rotation) * MAX_TANK_SPEED);
            this.ship.setVelocityY(-Math.cos(this.ship.rotation) * MAX_TANK_SPEED);
        }
        else if (this.cursors.down.isDown) {
            this.ship.setVelocityX(-Math.sin(this.ship.rotation) * MAX_TANK_SPEED);
            this.ship.setVelocityY(Math.cos(this.ship.rotation) * MAX_TANK_SPEED);
        }
        else {
            this.ship.setVelocityX(0);
            this.ship.setVelocityY(0);
        }

        if (this.cursors.space.isDown) {
            if (this.isShooting == false) {
                this.isShooting = true;
                // Shoot a bullet
                shootBullet(this, this.ship.x, this.ship.y, this.ship.rotation, true);
                this.socket.emit('shotBullet', {x: this.ship.x, y: this.ship.y, rot: this.ship.rotation});
            }
        }
        else {
            this.isShooting = false;
        }

        this.physics.world.wrap(this.ship, 5);
    }
}

function shootBullet(self, x, y, angle, mine) {
    let bullet = self.add.circle(x, y, WIDTH / 400, 0xff00ff);
    bullet = self.physics.add.existing(bullet);
    // TODO: Set timeout
    if (mine) {
        self.myBullets.add(bullet);
    }
    else {
        self.otherBullets.add(bullet);
    }
    bullet.body.bounce.x = 1;
    bullet.body.bounce.y = 1;
    bullet.body.velocity.x = Math.sin(angle) * MAX_BULLET_SPEED;
    bullet.body.velocity.y = -Math.cos(angle) * MAX_BULLET_SPEED;
}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    self.playerGroup.add(self.ship);
    if (playerInfo.team === 'blue') {
        self.ship.setTint(0x0000ff);
    }
    else {
        self.ship.setTint(0xff0000);
    }
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
    self.ship.body.bounce.x = 1;
    self.ship.body.bounce.y = 1;
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    }
    else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function add_wall(self, x, y, width, height, color) {
    // Calculate x and y so that they refer to the center of the dumb rectangle
    x = x + width / 2;
    y = y + height / 2;
    color = color * (0.9 + Math.random() * 0.1);
    let wall = self.add.rectangle(x, y, width, height, color);
    self.physics.add.existing(wall);
    wall.body.bounce.x = 1;
    wall.body.bounce.y = 1;
    self.walls.add(wall);
    wall.body.immovable = true;
}

function draw_map(self, current_map) {
    let vw = current_map[0];
    let hw = current_map[1];

    // Calculate total width and height of the map (measured from middle of lines)
    self.map_width = 0.8 * WIDTH;
    self.map_height = 0.8 * HEIGHT;
    self.grid_size = 0;

    if (self.map_width / hw[0].length * vw.length > 0.8 * HEIGHT) {
        // Limit height instead of width
        self.grid_size = self.map_height / vw.length;
        self.map_width = self.grid_size * hw[0].length;
    }
    else {
        // Limit width
        self.grid_size = self.map_width / hw[0].length;
        self.map_height = self.grid_size * vw.length;
    }

    // Calculate line width
    let line_width = WIDTH / 200;

    // Calculate where to put top left corner
    let x = WIDTH / 2 - self.map_width / 2;
    let y = HEIGHT / 2 - self.map_height / 2;

    // Draw outline
    const map_color = 0x00ff00;
    // TODO: Add to collision group
    add_wall(self, x - line_width / 2, y - line_width / 2, self.map_width + line_width, line_width, map_color); // TOP
    add_wall(self, x - line_width / 2, y + (self.map_height - line_width / 2), self.map_width + line_width, line_width, map_color); // BOTTOM
    add_wall(self, x - line_width / 2, y + line_width / 2, line_width, self.map_height - line_width, map_color); // LEFT
    add_wall(self, x + self.map_width - line_width / 2, y + line_width / 2, line_width, self.map_height - line_width, map_color); // RIGHT

    // Add vertical walls
    for (row = 0; row < vw.length; ++row) {
        for (col = 0; col < vw[row].length; ++col) {
            if (vw[row][col] == 1) {
                // Calculate position of corner
                let wall_x = x + (col + 1) * self.grid_size - line_width / 2;
                let wall_y = y + row * self.grid_size - line_width / 2;
                // Add wall
                add_wall(self, wall_x, wall_y, line_width, self.grid_size + line_width, map_color);
            }
        }
    }

    // Add horizontal walls
    for (row = 0; row < hw.length; ++row) {
        for (col = 0; col < hw[row].length; ++col) {
            if (hw[row][col]) {
                let wall_x = x + col * self.grid_size - line_width / 2;
                let wall_y = y + (row + 1) * self.grid_size - line_width / 2;
                add_wall(self, wall_x, wall_y, self.grid_size + line_width, line_width, map_color);
            }
        }
    }
}