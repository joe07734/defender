
// Thanks Eugene...
// http://www.kvalda.com/Halcyon%20Days/BOOK/JARVIS.HTM
// http://www.kvalda.com/robotron/
// http://www.angelfire.com/hi/kulasoft/games.html

var Defender = {
init: function(stat) {
    var self = this;

    this.stat = stat;

    this.left = 0;
    this.right = 800;
    this.top = 0;
    this.bottom = 115 + this.stat.timeline.oy;

    this.canvas = this.stat.timeline.new_sprite(this.stat.timeline.ox, 0);
    this.canvas.style.overflow = "hidden";
    this.canvas.style.width = "800px";
    this.canvas.style.height = Math.round(this.bottom) + "px";

    this.happening = false;
    this.xmax = 400;
    this.ymax = Math.floor(this.bottom / 2);
    this.xmax2 = this.xmax / 2;
    this.ymax2 = this.ymax / 2;

    Y.util.Event.on(document, "keydown", function(event) {self.keydown(event)});
    Y.util.Event.on(document, "keypress", function(event) {self.keypress(event)});
    Y.util.Event.on(document, "keyup", function(event) {self.keyup(event)});

    this.key_left = false;
    this.key_right = false;
    this.key_up = false;
    this.key_down = false;
    this.key_fire = false;

//    DefSounds.init();

//    this.start();
},

start: function() {
    var self = this;

    if (this.happening)
        return;

    this.lander_debug = 0;  // DEBUG

    this.game = new Object;
    this.game.state = 0;

    this.sprites = [];
    this.ghosts = [];
    this.make_mountain();

    this.score = 0;
    this.last_score = -1;
    this.num_humans = 7;
    this.num_ships = 4;
    this.wave = this.key_fire ? 30 : 1;
    this.key_fire_delay = 15;

    this.alien_count = 0;
    this.human_count = 0;

    this.happening = true;
    this.counter = 0;

    this.preload_graphics();

    this.run();
    this.thread = setInterval(function() {self.run()}, 1000/30);
    this.stat.timeline.set_image_bk('#000');
},

stop: function() {
    if (!this.happening)
        return;

    clearInterval(this.thread);
    this.happening = false;
    this.kill_all_sprites();
    this.stat.timeline.set_image_bk('#FFF');
},

preload_list: ["ship", "flame", "human", "lander", "mutant", "five-hundred", "two-fifty"],

preload_graphics: function() {
    var i, sprite;
    for (i = 0; i < this.preload_list.length; ++i) {
        sprite = this.make_sprite("defender " + this.preload_list[i]);
        sprite.el.style.visibility = 'hidden';
        sprite.dead = true;  // never gets displayed
    }
},

refresh_data: function(g) {
    if (this.happening)
        this.make_mountain();
},

run: function() {
    this.move_sprites();
    this.redraw_sprites();
    this.counter += 1;
},

keypress: function(event) {
    if (!this.stat._active || !this.happening)
        return;
    Y.util.Event.preventDefault(event);        
},

keydown: function(event) {
    if (!this.stat._active)
        return;
//    Log.debug("keydown: " + event.keyCode);
    this.keyupdown(event, true);
},

keyup: function(event) {
    if (!this.stat._active)
        return;
//    Log.debug("keyup: " + event.keyCode);
    this.keyupdown(event, false);
},

keyupdown: function(event, state) {
    if (event.metaKey)
        return;

    var code = event.keyCode;
    var handled = true;
    switch (code) {
        case 32:
        case 18:
        case 17:
        case 16: this.key_fire = state; break;
        case 37:
        case 65: this.key_left = state; break;
        case 39:
        case 68: this.key_right = state; break;
        case 38:
        case 87: this.key_up = state; break;
        case 40:
        case 83: this.key_down = state; break;
        default: handled = false;
    }

    if (!this.happening)
        return;

    if (handled)
        Y.util.Event.preventDefault(event);        
},

new_sprite: function(x, y) {
    var el = document.createElement('div');
    Y.util.Dom.addClass(el, "sprite");
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    this.canvas.appendChild(el);
    return el;
},

make_sprite: function(kind) {
    var el = document.createElement("span");
    Y.util.Dom.addClass(el, kind);
    return this.make_sprite2(el);
},

make_sprite2: function(span) {
    var sprite = new Object;
    sprite.x = 0;
    sprite.y = 0;

    sprite.el = document.createElement('div');
    Y.util.Dom.addClass(sprite.el, "sprite");
    this.canvas.appendChild(sprite.el);
    sprite.el.appendChild(span);
    sprite.sp = span;
    sprite.width = span.offsetWidth / 2;  // double-sized pixels
    sprite.height = span.offsetHeight / 2;
    sprite.cx = sprite.width / 2;
    sprite.cy = sprite.height / 2;
    sprite.xalign = 0;  // alignment: 0 - center, 1 - left/bottom, 2 - right/top
    sprite.yalign = 0;
    sprite.xmin = sprite.xmax = sprite.ymin = sprite.ymax = 0;

    sprite.state = "new";
    sprite.look = 0;
    sprite.step = 0;
    sprite.timer = 0;

    this.sprites.push(sprite);
    return sprite;
},

kill_human: function(human) {
    human.dead = true;
    this.num_humans -= 1;
},

kill_sprite: function(sprite, index) {
    var i, len;

    this.canvas.removeChild(sprite.el);
    if (index == null) {
        for (i = 0, len = this.sprites.length; i < len; ++i) {
            if (this.sprites[i] == sprite) {
                index = i;
                break;
            }
        }
    }
    if (index != null)
        this.sprites.splice(index, 1);

    if (sprite.lander || sprite.mutant)
        this.alien_count -= 1;
    else if (sprite.human) {
        this.human_count -= 1;
    }
},

redraw_sprites: function() {
    var i, len, sprite, ghost, ax, ay, sx, sy, gsx, swidth, sheight, need_ghost;

    this.kill_all_ghosts();

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        sprite = this.sprites[i];

        if (sprite.ship_fragment)
            continue;

        ax = sprite.x;
        ay = sprite.y;
        switch (sprite.xalign) {
            case 0: ax -= sprite.cx; break;
            case 2: ax -= sprite.width; break;
        }
        switch (sprite.yalign) {
            case 0: ay -= sprite.cy; break;
            case 2: ay -= sprite.height; break;
        }

        sprite.xmin = ax;
        sprite.xmax = ax + sprite.width;
        sprite.ymin = ay;
        sprite.ymax = ay + sprite.height;

        swidth = sprite.width * 2;
        sheight = sprite.height * 2;
        sx = Math.round((ax*2) + this.left);
        sy = Math.round(this.bottom - (ay*2) - sheight);

        sprite.el.style.left = sx + "px";
        sprite.el.style.top = sy + "px";

        if (!sprite.fragment)
            sprite.sp.style.backgroundPosition = "0px " + -(sprite.look * sheight) + "px";

        need_ghost = false;
        if (sx < this.left) {
            need_ghost = true;
            gsx = this.right - (this.left - sx);
        } else if ((sx + swidth) >= this.right) {
            need_ghost = true;
            gsx = this.left - (this.right - sx);
        }
        if (need_ghost) {
            ghost = this.new_sprite(gsx, sy);
            ghost.appendChild(sprite.sp.cloneNode(true));
            this.ghosts.push(ghost);
        }
    }
},

make_mountain: function() {
    var i, ii, fi, x, y, ys, ye, scale, mountain, points;
    var ox, oy;

    this.mountain = mountain = [];
    points = this.stat.timeline.graphVM.points();

    if (!points || points.length === 0) {
        for (x = 0; x < this.xmax; ++x)
            mountain[x] = 1;
    } else {
        ox = this.stat.timeline.ox;
        oy = this.stat.timeline.oy;
        scale = (points.length-1) / (this.xmax-1);
        for (x = 0; x < this.xmax; ++x) {
            i = x * scale;
            ii = Math.floor(i);
            fi = i - ii;
            ys = (this.bottom - (points[ii].cy() + oy)) / 2;
            if (fi == 0)
                mountain[x] = ys;
            else {
                ye = (this.bottom - (points[ii+1].cy() + oy)) / 2;
                mountain[x] = ys + (ye - ys) * fi;
            }
        }
    }
},

move_sprites: function() {
    var i, sprite;

    this.move_game();
    this.move_ship();
    this.move_shots();
    this.move_fragments();
    this.move_ship_fragments();
    this.move_score();
    this.move_bonuses();
    if (!this.pause) {
        this.move_landers();
        this.move_mutants();
        this.move_humans();
    }

    for (i = this.sprites.length - 1; i >= 0; --i) {
        sprite = this.sprites[i];
        if (sprite.dead)
            this.kill_sprite(sprite, i);
    }
},

make_bonus: function(kind, x, y) {
    var bonus;

    bonus = this.make_sprite("defender " + kind);
    bonus.bonus = true;
    bonus.x = x;
    bonus.y = y;
    return bonus;
},

move_bonuses: function() {
    var i, bonus;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        bonus = this.sprites[i];
        if (!bonus.bonus)
            continue;

        if (bonus.state == "new") {
            bonus.state = "flashing";
            bonus.step = 30;
            bonus.timer = 0;
        }

        if (--bonus.timer <= 0) {
            if (--bonus.step <= 0)
                bonus.dead = true;
            else {
                bonus.timer = 3;
                bonus.look = (bonus.look + 1) % 3;
            }
        }
    }
},

move_score: function() {
    if (this.score != this.last_score) {
        this.stat.timeline.el_deets.innerHTML = Text.escapeHtml(UIUtils.commafy(this.score)) + " plays";
        this.last_score = this.score;
    }
},

make_ship: function() {
    var ship;

    this.ship = ship = this.make_sprite("defender ship");
    ship.ship = true;
},

SHIP_EXPLOSION_LOOKS: [3, 5, 3, 5, 4, 5, 4, 3],

move_ship: function() {
    var ship = this.ship, flame = this.flame;
    var thrusting, len, current_state;

    if (ship.dead)
        return;

    do {
        current_state = ship.state;
        switch (ship.state) {

        case "new":
            ship.x = this.xmax2;
            ship.y = this.ymax2;
            ship.dir = 1;
            ship.speed = 0;
            ship.yalign = 1;
            ship.el.style.zIndex = "200";
            ship.state = "flying";

            flame = this.flame = this.make_sprite("defender flame");
            flame.flame = true;
            flame.yalign = 1;
            break;

        case "flying":
            for (j = 0, len = this.sprites.length; j < len; ++j) {
                sprite = this.sprites[j];
                if (sprite.lander || sprite.mutant) {
                    if (this.intersect_sprites(ship, sprite)) {
                        this.make_explosion(sprite, sprite.x, ship.y, this.explosion_angle(ship, sprite, true));
                        sprite.dead = true;
                        ship.state = "explode";
                        break;
                    }
                }
            }
            if (ship.state != "flying")
                break;

            if (this.key_left && !this.key_right)
                ship.dir = -1;
            else if (this.key_right && !this.key_left)
                ship.dir = 1;

            if (this.key_down) {
                ship.y -= 2;
                if (ship.y < 0)
                    ship.y = 0;
            }
            if (this.key_up) {
                ship.y += 2;
                if (ship.y > (this.ymax - ship.height))
                    ship.y = (this.ymax - ship.height);
            }

            thrusting = false;
            if (this.key_left || this.key_right) {
                ship.speed += ship.dir * 0.3;
                if (ship.speed < -4)
                    ship.speed = -4;
                else if (ship.speed > 4)
                    ship.speed = 4;
                thrusting = true;
            } else if (ship.speed != 0) {
                ship.speed *= 0.94;
                if (Math.abs(ship.speed) < 0.01)
                    ship.speed = 0;
            }

            ship.x = this.wrap(ship.x + ship.speed);

            if (this.key_fire && this.key_fire_delay <= 0) {
                this.key_fire_delay = 6;
                this.make_shot();
        //        DefSounds.play("youfire");
            }
            if (this.key_fire_delay > 0)
                this.key_fire_delay -= 1;

            if (++ship.timer >= 4) {
                ship.timer = 0;
                ship.step = (ship.step + 1) % 3;
            }
            ship.look = ship.step + (ship.dir > 0 ? 6 : 0);

            flame.step = (flame.step + 1) % 12;
            if (ship.dir < 0) {
                flame.x = ship.x + ship.cx;
                flame.xalign = 1;
            } else {
                flame.x = ship.x - ship.cx;
                flame.xalign = 2;
            }
            flame.y = ship.y;
            flame.look = flame.step + (ship.dir > 0 ? 24 : 0) + (thrusting ? 12 : 0);
            break;

        case "explode":
            ship.step = 0;
            ship.timer = 0;
            this.stop_carrying_humans();
            flame.dead = true;
            ship.state = "flashing";
            break;

        case "flashing":
            if (++ship.timer >= 3) {
                ship.timer = 0;
                if (++ship.step >= this.SHIP_EXPLOSION_LOOKS.length) {
                    this.flash = this.make_sprite("defender flash");
                    this.flash.flash = true;
                    ship.timer = 0;
                    ship.state = "exploding";
                    break;
                }
            }
            ship.look = this.SHIP_EXPLOSION_LOOKS[ship.step] + (ship.dir > 0 ? 6 : 0);
            break;

        case "exploding":
            if (++ship.timer >= 1) {
                this.start_ship_explosion();
                this.flash.dead = true;
                ship.dead = true;
            }
            break;
        }
    } while (ship.state != current_state);
},

stop_carrying_humans: function() {
    var i, len;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        human = this.sprites[i];
        if (!human.human)
            continue;
        if (human.state == "carried")
            human.state = "walking";
    }
},

rnd: function(max) {
    return Math.floor(Math.random() * max);
},

wrap: function(x) {
    while (x < 0)
        x += this.xmax;
    while (x >= this.xmax)
        x -= this.xmax;
    return x;
},

make_human: function() {
    var human;

    human = this.make_sprite("defender human");
    human.human = true;
    human.timer = this.rnd(10);
    this.human_count += 1;
    return human;
},

HUMAN_VECTORS: [[-1, -1], [-1, +0], [-1, +1], [+1, -1], [+1, +0], [+1, +1]],
HUMAN_VECTOR_PROBS: [0, 1, 1, 2, 2, 3, 4, 4, 5, 5],  // dudes like to climb

move_humans: function() {
    var i, len, v, human, new_x, new_y, mountain_y, current_state;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        human = this.sprites[i];
        if (!human.human)
            continue;

        do {
            current_state = human.state;
            switch (current_state) {

            case "new":
                human.yalign = 1;
                human.x = this.rnd(this.xmax);
                mountain_y = this.mountain[Math.floor(human.x)];
                human.y = Math.min(this.rnd(10) + 2, mountain_y);
                human.walk = 0;
                human.state = "walking";
                break;

            case "walking":
                mountain_y = this.mountain[Math.floor(human.x)];
                if (human.y > mountain_y) {
                    human.state = "falling";
                    human.dy = 0;
                    human.falling_y = human.y;
                    break;
                }

                human.timer -= 1;
                if (human.timer <= 0) {
                    human.timer = 15;
                    if (--human.walk <= 0) {
                        human.walk = this.rnd(20) + 5;
                        v = this.HUMAN_VECTOR_PROBS[this.rnd(this.HUMAN_VECTOR_PROBS.length)];
                        human.dx = this.HUMAN_VECTORS[v][0];
                        human.dy = this.HUMAN_VECTORS[v][1];
                    }

                    new_x = this.wrap(human.x + human.dx);
                    new_y = human.y + human.dy;

                    if (new_y < 0 || new_y > this.mountain[Math.floor(new_x)])
                        human.walk = 0;
                    else {
                        human.x = new_x;
                        human.y = new_y;
                        human.step = (human.step + 1) % 2;
                    }
                }

                if (human.dx < 0)
                    human.look = human.step;
                else if (human.dx > 0)
                    human.look = 2 + human.step;
                break;

            case "falling":
                mountain_y = this.mountain[Math.floor(human.x)];
                human.y += human.dy;
                human.dy -= 0.05;
                if (human.dy < -1)
                    human.dy = -1;
                human.look = 0;
                if (human.y <= mountain_y) {
                    human.state = "walking";
                    if ((human.falling_y - mountain_y) > this.ymax / 3) {
                        this.make_explosion(human, human.x, human.y, human.dir < 0 ? 1 : 2);
                        this.kill_human(human);
                    } else {
                        human.y = mountain_y;
                        human.timer = 90;  // a little stunned
                        human.walk = 0;
                        this.score += 250;
                        this.make_bonus("two-fifty", human.x, human.y + 14);
                    }
                } else if (this.intersect_sprites(human, this.ship)) {
                    human.state = "carried";
                    this.score += 500;
                    this.make_bonus("five-hundred", human.x, human.y);
                }
                break;

            case "carried":
                mountain_y = this.mountain[Math.floor(human.x)];
                if (human.y <= mountain_y) {
                    human.state = "walking";
                    if (human.y < 0)
                        human.y = 0;
                    human.timer = 90;  // a little stunned
                    human.walk = 0;
                    this.score += 500;
                    this.make_bonus("five-hundred", human.x, human.y + 14);
                } else {
                    human.x = this.ship.x;
                    human.y = this.ship.y - human.height - 2;
                    human.look = 0;
                }
                break;

            case "lifted":
                if (!this.ship.dead && this.intersect_sprites(human, this.ship)) {
                    human.my_lander = null;
                    human.state = "carried";
                    this.score += 500;
                    this.make_bonus("five-hundred", human.x, human.y);
                } else if (human.my_lander.dead) {
                    human.my_lander = null;
                    human.state = "walking";
                }
                break;

            }
        } while (human.state != current_state);

    }
},

make_shot: function() {
    var shot;

    shot = this.make_sprite("defender shot");
    shot.shot = true;
},

move_shots: function() {
    var i, len, shot, s_xmin, s_xmax, s_width, j, sprite, current_state;
    var rgb, ship = this.ship;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        shot = this.sprites[i];
        if (!shot.shot)
            continue;

        do {
            current_state = shot.state;
            switch (current_state) {
            case "new":
                shot.dir = ship.dir;
                if (ship.dir < 0) {
                    shot.x = ship.x - ship.cx;
                    shot.xalign = 2;
                } else {
                    shot.x = ship.x + ship.cx;
                    shot.xalign = 1;
                }
                shot.y = ship.y + 1;
                shot.yalign = 1;
                shot.hue = this.rnd(360);
                shot.state = "shooting";
                break;

            case "shooting":
                for (j = 0; j < len; ++j) {
                    sprite = this.sprites[j];
                    if (sprite.human || sprite.lander || sprite.mutant) {
                        if (this.intersect_sprites(shot, sprite)) {
                            this.make_explosion(sprite, sprite.x, shot.y, this.explosion_angle(shot, sprite, shot.step < 7));
                            if (sprite.lander || sprite.mutant)
                                this.score += 150;
                            if (sprite.human)
                                this.kill_human(sprite);
                            else
                                sprite.dead = true;
                            shot.dead = true;
                            break;
                        }
                    }
                }
                if (shot.dead)
                    break;

                shot.step += 1;
                if (shot.step >= 15) {
                    shot.dead = true;
                    break;
                }

                shot.x = this.wrap(shot.x + shot.dir * 5);
                shot.width = shot.step * 6;
                shot.sp.style.width = Math.round(shot.width * 2) + "px";  // double-sized pixels

                shot.hue = (shot.hue + 10) % 360;
                shot.sp.style.backgroundColor = this.hsv2hex(shot.hue, 1, 1);
                break;
            }
        } while (shot.state != current_state);
    }
},


HCHARS: "0123456789ABCDEF",

real2hex: function(n) {
    var n = Math.min(255, Math.round(n*256));
    return this.HCHARS.charAt((n - n % 16) / 16) + this.HCHARS.charAt(n % 16);
},

hsv2hex: function(h, s, v) { 

    var r, g, b, i, f, p, q, t;
    i = Math.floor((h/60)%6);
    f = (h/60)-i;
    p = v*(1-s);
    q = v*(1-f*s);
    t = v*(1-(1-f)*s);
    switch(i) {
        case 0: r=v; g=t; b=p; break;
        case 1: r=q; g=v; b=p; break;
        case 2: r=p; g=v; b=t; break;
        case 3: r=p; g=q; b=v; break;
        case 4: r=t; g=p; b=v; break;
        case 5: r=v; g=p; b=q; break;
    }

    return "#" + this.real2hex(r) + this.real2hex(g) + this.real2hex(b);
},

intersect: function(s1_xmin, s1_xmax, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax) {  // TQNB
    var xmin, xmax, ymin, ymax;

    xmin = Math.max(s1_xmin, s2_xmin);
    xmax = Math.min(s1_xmax, s2_xmax);
    ymin = Math.max(s1_ymin, s2_ymin);
    ymax = Math.min(s1_ymax, s2_ymax);

    return (xmin < xmax) && (ymin < ymax);
},

intersect_wrap: function(s1_xmin, s1_xmax, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax) {  // TQNB
    var width = this.xmax;

    if (s1_xmin < 0) {
        return this.intersect_wrap(0, s1_xmax, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax) ||
               this.intersect_wrap(width + s1_xmin, width, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax);
    } else if (s1_xmax > width) {
        return this.intersect_wrap(s1_xmin, width, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax) ||
               this.intersect_wrap(0, s1_xmax - width, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax);
    } else if (s2_xmin < 0) {
        return this.intersect_wrap(s1_xmin, s1_xmax, s1_ymin, s1_ymax, 0, s2_xmax, s2_ymin, s2_ymax) ||
               this.intersect_wrap(s1_xmin, s1_xmax, s1_ymin, s1_ymax, width + s2_xmin, width, s2_ymin, s2_ymax);
    } else if (s2_xmax > width) {
        return this.intersect_wrap(s1_xmin, s1_xmax, s1_ymin, s1_ymax, s2_xmin, width, s2_ymin, s2_ymax) ||
               this.intersect_wrap(s1_xmin, s1_xmax, s1_ymin, s1_ymax, 0, s2_xmax - width, s2_ymin, s2_ymax);
    } else {
        return this.intersect(s1_xmin, s1_xmax, s1_ymin, s1_ymax, s2_xmin, s2_xmax, s2_ymin, s2_ymax);
    }
},

intersect_sprites: function(s1, s2) {  // TQNB
    return this.intersect_wrap(s1.xmin, s1.xmax, s1.ymin, s1.ymax, s2.xmin, s2.xmax, s2.ymin, s2.ymax);
},

EXPLOSION_VECTORS: [[-3, +3], [-1, +3], [+1, +3], [+3, +3],
                    [-3, +1], [-1, +1], [+1, +1], [+3, +1],
                    [-3, -1], [-1, -1], [+1, -1], [+3, -1],
                    [-3, -3], [-1, -3], [+1, -3], [+3, -3]],

make_explosion: function(sprite, x, y, angle) {
    var i, fragment, ax, ay, dx, dy;
    var fragments;

    fragments = this.make_plosion_fragments(sprite, x, y);

    if (angle != null) {
        ax = this.EXPLOSION_VECTORS[angle][0];
        ay = this.EXPLOSION_VECTORS[angle][1];
    } else
        ax = ay = 0;

    for (i = 0; i < 16; ++i) {
        fragment = fragments[i];
        dx = (this.EXPLOSION_VECTORS[i][0] + ax);
        dy = (this.EXPLOSION_VECTORS[i][1] + ay);
        if (dx == 0 && dy == 0) {
            fragment.dead = true;
            continue;
        }
        fragment.dx = dx;
        fragment.dy = dy;
        fragment.step = 10;
    }
},

make_implosion: function(sprite) {
    var i, fragment, dx, dy;
    var fragments;
    var steps;

    fragments = this.make_plosion_fragments(sprite, sprite.x, sprite.y);
    steps = this.rnd(20) + 15;

    for (i = 0; i < 16; ++i) {
        fragment = fragments[i];
        dx = this.EXPLOSION_VECTORS[i][0] * 0.75;
        dy = (this.EXPLOSION_VECTORS[i][1] - 1) * 0.75;
        fragment.x += dx * steps;
        fragment.y += dy * steps;
        fragment.dx = -dx;
        fragment.dy = -dy;
        fragment.step = steps;
    }
    sprite.step = steps;
},

make_plosion_fragments: function(sprite, x, y) {
    var i, el, fragment, width, height;
    var xpos, ypos;
    var fragments = [];

    width = sprite.sp.offsetWidth / 4;
    height = sprite.sp.offsetHeight / 4;

    xpos = [];
    for (i = 0; i < 4; ++i)
        xpos[i] = Math.round(-i * width) + "px";
    ypos = [];
    dy = -sprite.look * sprite.sp.offsetHeight;
    for (i = 0; i < 4; ++i)
        ypos[i] = Math.round(-i * height + dy) + "px";

    width = Math.round(width) + "px";
    height = Math.round(height) + "px";

    for (i = 0; i < 16; ++i) {    
        el = sprite.sp.cloneNode(true);
        el.style.width = width;
        el.style.height = height;
        el.style.backgroundPosition = xpos[i % 4] + " " + ypos[Math.floor(i/4)];

        fragment = this.make_sprite2(el);
        fragment.fragment = true;
        fragment.x = x;
        fragment.y = y;
        fragments.push(fragment);
    }
    return fragments;
},

explosion_angle: function(shot, sprite, hard) {  // sprite is being hit
    var a, midy;

    midy = (sprite.ymax + sprite.ymin) / 2;
    if (shot.y > midy) {
        midy = (sprite.ymax + midy) / 2;
        if (shot.y > midy)
            a = 12;
        else
            a = 8;
    } else {
        midy = (midy + sprite.ymin) / 2;
        if (shot.y < midy)
            a = 0;
        else
            a = 4;
    }

    if (hard) {
        if (shot.dir > 0)
            a += 3;
    } else {
        if (shot.dir > 0)
            a += 2;
        else
            a += 1;
    }

    return a;
},

move_fragments: function() {
    var i, len, fragment;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        fragment = this.sprites[i];
        if (!fragment.fragment)
            continue;

        if (--fragment.step <= 0)
            fragment.dead = true;
        else {
            fragment.x += fragment.dx;
            fragment.y += fragment.dy;
        }
    }
},

convert_to_mutant: function(lander) {
    if (lander.my_human) {
        this.kill_human(lander.my_human);
        lander.my_human = null;
    }
    lander.lander = false;
    lander.mutant = true;
    lander.timer = 0;
    Y.util.Dom.removeClass(lander.sp, "lander");
    Y.util.Dom.addClass(lander.sp, "mutant");
},

move_mutants: function() {
    var i, len, mutant, dir;
    var ship = this.ship;

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        mutant = this.sprites[i];
        if (!mutant.mutant)
            continue;
        this.act_like_a_mutant(mutant);
        mutant.look = this.rnd(4);
    }
},

act_like_a_mutant: function(mutant) {
    var ship = this.ship;
    var do_dy;

    if (mutant.state == "new") {
        mutant.yalign = 1;
        while (1) {
            mutant.x = this.rnd(this.xmax);
            if (Math.abs(mutant.x - ship.x) > ship.width)
                break;
        }
        mutant.y = this.ymax;
        dir = (this.rnd(2) == 0 ? -1 : 1);
        mutant.dx = ((Math.random() + 0.4) / 2) * dir;
        mutant.state = "scanning";
    }

    do_dy = false;
    if (--mutant.timer <= 0) {
        dir = mutant.x < ship.x ? 1 : -1;
        if (Math.abs(mutant.x - ship.x) > this.xmax2)
            dir = -dir;
        mutant.dx = (Math.random() * 2 + 2) * dir;
        mutant.timer = this.rnd(4) + 3;
        if (ship.dead)
            mutant.timer += this.rnd(100);
        do_dy = true;
    } else if (mutant.y > this.ymax - 10 || mutant.y < -10)
        do_dy = true;

    if (do_dy) {
        dir = mutant.y < ship.y ? 1 : -1;
        mutant.dy = (Math.random() * 2) * dir;            
    }

    mutant.x = this.wrap(mutant.x + mutant.dx);
    mutant.y += mutant.dy;
},

make_lander: function() {
    var lander = this.make_sprite("defender lander");
    lander.lander = true;
    this.alien_count += 1;
    return lander;
},

move_landers: function() {
    var i, j, y, len, dir, lander, human, current_state, lander_num, wacc;

    lander_num = 0;
    for (i = 0, len = this.sprites.length; i < len; ++i) {
        lander = this.sprites[i];
        if (!lander.lander)
            continue;

        lander_num += 1;
        do {
            current_state = lander.state;

            if (current_state == "scanning" || current_state == "scanning2") {
                if (lander_num > this.human_count) {
                    if (!lander.acting_like_a_mutant) {
                        lander.acting_like_a_mutant = true;
                        lander.timer = 0;
                    }
                    this.act_like_a_mutant(lander);
                    continue;
                } else {
                    if (lander.acting_like_a_mutant) {
                        lander.acting_like_a_mutant = false;
                        this.random_lander_dx(lander);  // reset dx, since mutants are krazy!
                    }
                }
            }

            switch (current_state) {

            case "new":
                lander.yalign = 1;
                while (1) {
                    lander.x = this.rnd(this.xmax);
                    if (Math.abs(lander.x - this.ship.x) > this.ship.width)
                        break;
                }
                lander.y = this.ymax - lander.height / 2;
                y = this.mountain[Math.floor(lander.x)] + 15;
                if (lander.y < y)
                    lander.y = y;
                this.random_lander_dx(lander);
                this.make_implosion(lander);
                lander.appear_y = lander.y;
                lander.y = -100;  // way off screen
                lander.state = "imploding";
                break;

            case "imploding":
                if (--lander.step <= 0) {
                    lander.state = "scanning";
                    lander.y = lander.appear_y;
                }
                break;

            case "scanning":
                if (lander.y <= this.mountain[Math.floor(lander.x)] + 15)
                    lander.state = "scanning2";
                lander.x = this.wrap(lander.x + lander.dx);
                lander.y -= 1;
                if (--lander.timer <= 0) {
                    lander.timer = 4;
                    lander.look = (lander.look + 1) % 3;
                }
                break;

            case "scanning2":
                wacc = Math.max(0.20, 1 - (this.wave * 0.005));
                for (j = 0; j < len; ++j) {
                    human = this.sprites[j];
                    if (!human.human)
                        continue;
                    if (human.state != "walking" || human.my_lander)
                        continue;
                    if (Math.abs(human.x - lander.x) <= 3) {
                        this.lander_debug += 1;
                        if (Math.random() > wacc) {
                            lander.x = human.x;
                            human.dx = human.dy = 0;  // stun him
                            human.walk = 150;
                            lander.my_human = human;
                            human.my_lander = lander;
                            lander.state = "picking";
                            break;
                        }
                    }
                }
                if (lander.state == "picking")
                    break;

                lander.x = this.wrap(lander.x + lander.dx);
                lander.y = this.mountain[Math.floor(lander.x)] + 15;
                if (--lander.timer <= 0) {
                    lander.timer = 4;
                    lander.look = (lander.look + 1) % 3;
                }
                break;

            case "picking":
                if (lander.my_human.dead) {
                    lander.my_human = null;
                    lander.state = "scanning";
                } else if (lander.y - lander.my_human.y <= 10) {
                    lander.my_human.state = "lifted";
                    lander.dy = 10;
                    lander.state = "lifting";
                } else {
                    lander.y -= 0.2;
                    lander.look = 2;
                }
                break;

            case "lifting":
                if (lander.my_human.dead || lander.my_human.state != "lifted") {
                    lander.my_human = null;
                    lander.state = "scanning";
                } else {
                    if (lander.y >= this.ymax - lander.height)
                        lander.state = "assimilating";
                    else {
                        lander.y += 0.75;
                        lander.my_human.y = lander.y - lander.dy;
                        lander.look = 2;
                    }
                }
                break;

            case "assimilating":
                if (lander.my_human.dead || lander.my_human.state != "lifted") {
                    lander.my_human = null;
                    lander.state = "scanning";
                } else {
                    if (lander.dy <= 0)
                        this.convert_to_mutant(lander);
                    else {
                        lander.dy -= 0.75;
                        lander.my_human.y = lander.y - lander.dy;
                        lander.look = 2;
                    }
                }
                break;
            }
        } while (lander.state != current_state);

    }
},

random_lander_dx: function(lander) {
    var dir = (this.rnd(2) == 0 ? -1 : 1);
    var wacc = Math.min(1.0, 0.2 + (this.wave * 0.05));
    lander.dx = ((Math.random() + wacc) / 2) * dir;
},

start_ship_explosion: function() {
    var i, ship_fragment;
    var a, s, pi2 = Math.PI * 2;
    var offset, sx, sy;

    offset = Y.util.Dom.getXY(this.ship.el);
    sx = offset[0] - window.scrollX + this.ship.cx * 2;  // double pixels
    sy = offset[1] - window.scrollY + this.ship.cy * 2;
//    offset[0] += this.ship.cx * 2;  // double pixels
//    offset[1] += this.ship.cy * 2;

    for (i = 0; i < 120; ++i) {
        ship_fragment = this.make_sprite("defender ship-fragment");
        ship_fragment.ship_fragment = true;
        a = Math.random() * pi2;
        s = (i / 120) * 10 + 5;
        ship_fragment.dx = Math.cos(a) * s;
        ship_fragment.dy = Math.sin(a) * s;
        ship_fragment.x = sx;
        ship_fragment.y = sy;
        ship_fragment.el.style.position = "fixed";
        ship_fragment.el.style.zIndex = "2000";
    }
    this.ship_fragment_step = 0;
},

move_ship_fragments: function() {
    var i, len, ship_fragment;

    if (++this.ship_fragment_step >= 50) {
        for (i = 0, len = this.sprites.length; i < len; ++i) {
            ship_fragment = this.sprites[i];
            if (ship_fragment.ship_fragment)
                ship_fragment.dead = true;
        }
        return;
    }

    for (i = 0, len = this.sprites.length; i < len; ++i) {
        ship_fragment = this.sprites[i];
        if (!ship_fragment.ship_fragment)
            continue;
        ship_fragment.x += ship_fragment.dx;
        ship_fragment.y += ship_fragment.dy;
        ship_fragment.dx *= 0.95;
        ship_fragment.dy *= 0.95;

        // do the redraw here because it's in the window
        ship_fragment.el.style.left = Math.round(ship_fragment.x) + "px";
        ship_fragment.el.style.top = Math.round(ship_fragment.y) + "px";
    }
},

move_game: function() {
    if (this.game.state == 0) {
        this.num_ships -= 1;
        this.reset_game();
        this.game.state = 1;
        this.game.timer = 0;
    }

    if (this.game.state == 1) {
        if (++this.game.timer > 60) {
            this.place_humans();
            this.game.state = 2;
            this.game.timer = 0;
        }
    }

    if (this.game.state == 2) {
        if (++this.game.timer > 30) {
            this.place_landers();
            this.game.state = 100;
            this.game.timer = 0;
        }
    }

    // normal running
    if (this.game.state == 100) {
        if (this.ship.dead) {
            if (this.num_ships > 0)
                this.game.state = 101;
        } else if (this.alien_count == 0) {
            this.wave += 1;
            this.game.state = 2;
        }
        this.game.timer = 0;
    }

    if (this.game.state == 101) {
        if (++this.game.timer > 100) {
            this.kill_all_sprites();
            this.game.state = 102;
            this.game.timer = 0;
        }
    }

    if (this.game.state == 102) {
        if (++this.game.timer > 15) {
            this.game.state = 0;
        }
    }
},

kill_all_sprites: function() {
    var i;
    for (i = this.sprites.length - 1; i >= 0; --i) {
        this.kill_sprite(this.sprites[i], i);
    }
    this.kill_all_ghosts();
},

kill_all_ghosts: function() {
    var i;
    for (i = 0, len = this.ghosts.length; i < len; ++i) {
        this.canvas.removeChild(this.ghosts[i]);
    }
    this.ghosts = [];
},

reset_game: function() {
    var i, sprite;

    this.pause = false;

    this.kill_all_sprites();
    this.make_ship();
    this.place_num_ships();
},

place_num_ships: function() {
    var i;
    var mark;

    for (i = 0; i < this.num_ships; ++i) {
        mark = this.make_sprite("defender num-ship");
        mark.num_ship = true;
        mark.xalign = 1;
        mark.yalign = 2;
        mark.x = 0;
        mark.y = this.ymax - 5 - (i * 3);
    }
},

place_humans: function() {
    var i;
    for (i = 0; i < this.num_humans; ++i)
        this.make_human();
},

place_landers: function() {
    var i, num;

    if (this.wave <= 6)
        num = 1;
    else if (this.wave <= 24)
        num = 3;
    else if (this.wave <= 48)
        num = 5;
    else if (this.wave <= 60)
        num = 7;
    else
        num = 12;

    for (i = 0; i < num; ++i)
        this.make_lander();
},

zzz: 0

};
