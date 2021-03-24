const WIDTH = 1920;
const HEIGHT = 1080;
const MAX_TANK_SPEED = 100;
const MAX_BULLET_SPEED = 110;
let is_mobile = false;
let should_shoot = false;

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

function checkMob() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

function preload() {
    this.load.image('ship', 'assets/playerShip1_blue.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png')
    if (checkMob()) {
        is_mobile = true;
        // Add joystick module
        this.load.plugin('rexvirtualjoystickplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js', true);
        // Add button module
        this.load.plugin('rexbuttonplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js', true);
    }
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

    // Check if on mobile
    if (is_mobile) {
        // Add joystick
        let margin = HEIGHT / 16;
        let radius = WIDTH / 16;
        this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
            x: margin + radius,
            y: HEIGHT - margin - radius,
            radius: radius,
            base: this.add.circle(0, 0, radius, 0x888888),
            thumb: this.add.circle(0, 0, radius / 2, 0xcccccc),
            // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
            forceMin: 70,
            // enable: true
        });
        this.cursors = this.joyStick.createCursorKeys();

        // Add fire button
        let button = this.add.circle(WIDTH - margin - radius, HEIGHT - margin - radius, radius, 0x880000);
        this.fireButton = this.plugins.get('rexbuttonplugin').add(button);
        this.fireButton.on('click', function () {
            should_shoot = true;
        });
    }
    else {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

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

        if (!is_mobile) {
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
        }
        else {
            if (should_shoot) {
                should_shoot = false;
                shootBullet(this, this.ship.x, this.ship.y, this.ship.rotation, true);
                this.socket.emit('shotBullet', {x: this.ship.x, y: this.ship.y, rot: this.ship.rotation});
            }
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