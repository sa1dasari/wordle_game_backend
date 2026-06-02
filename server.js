const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Health check — Railway/Render ping this
app.get('/', (req, res) => res.send('Wordle Duel server running ✅'));

// ── Word list (curated 5-letter words) ────────────────────────────────────────
const WORDS = [
    'ABOUT','ABOVE','ABUSE','ADMIT','ADOPT','ADULT','AFTER','AGAIN','AGENT','AGREE',
    'AHEAD','ALARM','ALBUM','ALERT','ALIKE','ALIVE','ALLOW','ALONE','ALONG','ALTER',
    'ANGEL','ANGER','ANGLE','ANGRY','APART','APPLE','APPLY','ARENA','ARGUE','ARISE',
    'ARMED','ARMOR','ARROW','ASIDE','ASSET','AVOID','AWAKE','AWARD','AWARE','BADLY',
    'BEACH','BEARD','BEAST','BEGIN','BEING','BELOW','BENCH','BIRTH','BLACK','BLADE',
    'BLAME','BLANK','BLIND','BLOCK','BLOOD','BOARD','BOOST','BOUND','BRAIN','BRAND',
    'BRASS','BRAVE','BREAD','BREAK','BREED','BRICK','BRIDE','BRIEF','BRING','BRINK',
    'BRISK','BROAD','BROKE','BROWN','BUILD','BUILT','CABLE','CANDY','CARGO','CARRY',
    'CARVE','CATCH','CAUSE','CHAIN','CHAIR','CHALK','CHAOS','CHARM','CHART','CHASE',
    'CHEAP','CHEAT','CHECK','CHEEK','CHEER','CHESS','CHEST','CHIEF','CHILD','CHILL',
    'CHOSE','CHUNK','CHURN','CIGAR','CIVIC','CIVIL','CLAIM','CLASH','CLASS','CLEAN',
    'CLEAR','CLERK','CLICK','CLIFF','CLIMB','CLOAK','CLOCK','CLONE','CLOSE','CLOTH',
    'CLOUD','CLOWN','COACH','COAST','COLOR','COMET','COMIC','CORAL','CORNY','COUCH',
    'COULD','COUNT','COURT','COVER','CRAFT','CRASH','CRATE','CRAVE','CRAZY','CREAM',
    'CREEK','CREEP','CREST','CRIME','CRISP','CROSS','CROWD','CROWN','CRUDE','CRUEL',
    'CRUSH','CRUST','CURVE','CYCLE','DAILY','DAIRY','DAISY','DANCE','DATED','DEATH',
    'DEBUT','DECOR','DECOY','DEITY','DELAY','DEMON','DENSE','DEPTH','DERBY','DEVIL',
    'DIARY','DIGIT','DINER','DIRTY','DISCO','DITCH','DIVER','DIZZY','DODGE','DONOR',
    'DOUBT','DOUGH','DOZEN','DRAFT','DRAIN','DRAMA','DRANK','DRAPE','DREAD','DREAM',
    'DRESS','DRIED','DRIFT','DRILL','DRINK','DRIVE','DRONE','DROWN','DRUGS','DRUMS',
    'DRUNK','DUSTY','DYING','EAGER','EAGLE','EARLY','EARTH','EATEN','EBONY','EERIE',
    'EIGHT','ELBOW','ELDER','ELECT','ELITE','ELOPE','ELUDE','EMAIL','EMBER','EMPTY',
    'ENEMY','ENJOY','ENTER','ENTRY','ENVOY','EPOCH','EQUAL','EQUIP','ERASE','ERECT',
    'ERROR','ERUPT','ESSAY','ETHIC','EVADE','EVENT','EVERY','EVICT','EVOKE','EXACT',
    'EXCEL','EXERT','EXILE','EXIST','EXPEL','EXTRA','FABLE','FAITH','FALSE','FANCY',
    'FARCE','FATAL','FAULT','FAUNA','FAVOR','FEAST','FELON','FEMUR','FENCE','FERAL',
    'FERRY','FETCH','FEVER','FEWER','FIBER','FIEND','FIERY','FIFTH','FIFTY','FIGHT',
    'FILLY','FILTH','FINAL','FINCH','FIRST','FISHY','FIXED','FLAME','FLASH','FLASK',
    'FLAKY','FLESH','FLICK','FLINT','FLIRT','FLOAT','FLOCK','FLOOD','FLOOR','FLORA',
    'FLOUR','FLUID','FLUKE','FLUSH','FLUTE','FOCAL','FOCUS','FOLLY','FORAY','FORCE',
    'FORGE','FORTE','FORTH','FORTY','FORUM','FOUND','FRAIL','FRAME','FRANK','FRAUD',
    'FREAK','FREED','FRESH','FRIAR','FRIED','FRISK','FROCK','FROND','FRONT','FROST',
    'FROTH','FROWN','FROZE','FRUIT','FULLY','FUNGI','FUNKY','FUNNY','FURRY','FUSSY',
    'FUZZY','GHOST','GIANT','GIDDY','GIVEN','GLAND','GLARE','GLASS','GLAZE','GLEAM',
    'GLIDE','GLINT','GLOAT','GLOBE','GLOOM','GLORY','GLOSS','GLOVE','GNASH','GNOME',
    'GRACE','GRADE','GRAFT','GRAIN','GRAND','GRAPE','GRASP','GRASS','GRATE','GRAVE',
    'GRAVY','GRAZE','GREAT','GREED','GREEN','GREET','GRIEF','GRILL','GRIME','GRIMY',
    'GRIND','GROAN','GROOM','GROPE','GROSS','GROUP','GROUT','GROVE','GROWL','GROWN',
    'GUARD','GUAVA','GUESS','GUEST','GUIDE','GUILD','GUILT','HAPPY','HARDY','HARSH',
    'HASTE','HASTY','HATED','HAUNT','HAVEN','HAVOC','HAZEL','HEART','HEATH','HEAVE',
    'HEAVY','HEDGE','HEIST','HELIX','HIPPO','HITCH','HOARD','HOARY','HOBBY','HONEY',
    'HONOR','HORSE','HOTEL','HOUND','HOUSE','HUMAN','HUMID','HURRY','IDEAL','IMAGE',
    'IMPLY','INDEX','INFER','INNER','INPUT','INTER','INTRO','IRONY','ISSUE','IVORY',
    'JELLY','JEWEL','JOINT','JOKER','JUDGE','JUICE','JUICY','JUMBO','JUMPY','KNACK',
    'KNEEL','KNIFE','KNOCK','KNOWN','LABEL','LARGE','LASER','LATCH','LATER','LAUGH',
    'LAYER','LEARN','LEASE','LEASH','LEAST','LEGAL','LEMON','LEVEL','LIGHT','LIMIT',
    'LINEN','LIVER','LOCAL','LODGE','LOGIC','LOOSE','LOVER','LOWER','LOYAL','LUCID',
    'LUCKY','LUNAR','LUNCH','LUSTY','LYRIC','MAGIC','MAJOR','MAKER','MANOR','MAPLE',
    'MATCH','MAYOR','METAL','MINOR','MINUS','MIRTH','MOIST','MONEY','MONTH','MORAL',
    'MOTOR','MOTTO','MOUNT','MOURN','MOUSE','MOUTH','MOVIE','MUDDY','MUSIC','NAIVE',
    'NASTY','NAVAL','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH','NOTED','NOVEL',
    'NURSE','NYMPH','OCCUR','OCEAN','OFFER','OFTEN','OLIVE','ONSET','OPTIC','ORDER',
    'OTHER','OUTER','OXIDE','OZONE','PAINT','PANEL','PANIC','PAPER','PATCH','PAUSE',
    'PEACE','PEACH','PEARL','PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT',
    'PINCH','PIXEL','PIZZA','PLACE','PLAIN','PLANE','PLANT','PLATE','PLAZA','PLEAD',
    'PLUCK','PLUMB','PLUME','PLUNK','PLUSH','POINT','POISE','POLAR','POUND','POWER',
    'PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRISM','PRIZE','PROBE','PROOF',
    'PROSE','PROUD','PROVE','PROWL','PROXY','PUDGY','PULSE','PUNCH','PUPIL','PURGE',
    'QUEEN','QUERY','QUEST','QUICK','QUIET','QUOTA','QUOTE','RADAR','RADIO','RAISE',
    'RALLY','RANCH','RANGE','RAPID','RAVEN','REACH','READY','REALM','REBEL','RELAX',
    'REMIT','REPAY','REPEL','RESIN','RISKY','RIVAL','RIVER','ROBIN','ROBOT','ROCKY',
    'ROUGE','ROUGH','ROUND','ROUTE','ROYAL','RULER','RURAL','RUSTY','SAINT','SAUCE',
    'SCALE','SCENE','SCONE','SCOOP','SCOPE','SCORE','SCOUT','SCRAP','SCREW','SEIZE',
    'SENSE','SERVE','SEVEN','SHAKE','SHALL','SHAME','SHAPE','SHARE','SHARP','SHEER',
    'SHELF','SHELL','SHIFT','SHINE','SHIRT','SHOCK','SHORE','SHORT','SHOUT','SHOVE',
    'SHOWN','SIGHT','SILLY','SINCE','SIXTH','SIXTY','SKILL','SKULL','SLATE','SLAVE',
    'SLEEP','SLEEK','SLEET','SLICK','SLIDE','SLIMY','SLING','SLOPE','SLUMP','SLURP',
    'SMALL','SMART','SMASH','SMEAR','SMELL','SMILE','SMITE','SMOKE','SNACK','SNAIL',
    'SNAKE','SNARE','SNEAK','SNEER','SNIFF','SNORE','SNORT','SNOWY','SOLAR','SOLID',
    'SOLVE','SORRY','SOUTH','SPACE','SPARE','SPARK','SPEAK','SPEAR','SPEED','SPEND',
    'SPICE','SPIKY','SPINE','SPOKE','SPOON','SPORT','SPOUT','SPRAY','SQUAD','SQUAT',
    'SQUID','STACK','STAFF','STAGE','STAIN','STAIR','STAKE','STALE','STALL','STAMP',
    'STAND','STARE','START','STASH','STATE','STEAK','STEAL','STEAM','STEEL','STEEP',
    'STEER','STERN','STICK','STIFF','STILL','STING','STOCK','STOIC','STOMP','STONE',
    'STOOD','STOOP','STORM','STORY','STOUT','STOVE','STRAP','STRAW','STRAY','STRIP',
    'STRUM','STRUT','STUCK','STUDY','STUMP','STUNG','STUNK','STUNT','STYLE','SUGAR',
    'SUITE','SUNNY','SUPER','SURGE','SWAMP','SWEAR','SWEAT','SWEEP','SWEET','SWEPT',
    'SWIFT','SWILL','SWIPE','SWIRL','SWORD','SWORE','SWORN','SWUNG','TABLE','TALON',
    'TASTE','TAUNT','TAWNY','TEACH','TENSE','TENTH','TEPID','TERSE','THEME','THICK',
    'THING','THINK','THORN','THREE','THREW','THROW','THUMB','THUMP','TIDAL','TIGER',
    'TIGHT','TIMER','TIRED','TITAN','TITLE','TODAY','TOKEN','TONIC','TOOTH','TOPAZ',
    'TOPIC','TOTAL','TOUCH','TOUGH','TOWEL','TOWER','TOXIC','TRACE','TRACK','TRADE',
    'TRAIL','TRAIN','TRAIT','TRAMP','TRASH','TRAWL','TREAT','TREND','TRIAL','TRIBE',
    'TRICK','TRIED','TROOP','TROUT','TRUCE','TRULY','TRUMP','TRUNK','TRUST','TRUTH',
    'TULIP','TUMOR','TUNER','TWEAK','TWICE','TWIST','ULTRA','UNIFY','UNION','UNITY',
    'UNTIL','UPPER','UPSET','URBAN','USHER','USURP','UTTER','VAGUE','VALID','VALUE',
    'VALVE','VAPOR','VAULT','VAUNT','VICAR','VIDEO','VIGOR','VILLA','VIOLA','VIRAL',
    'VIRUS','VISTA','VITAL','VIVID','VOCAL','VOICE','VOTER','WASTE','WATCH','WATER',
    'WEARY','WEDGE','WEIRD','WHALE','WHEAT','WHEEL','WHERE','WHICH','WHILE','WHITE',
    'WHOLE','WHOSE','WIDER','WITCH','WOMEN','WORLD','WORRY','WORSE','WORST','WORTH',
    'WOULD','WOUND','WRATH','WRIST','WROTE','YACHT','YEARN','YIELD','YOUNG','YOUTH',
    'ZESTY','ZONAL'
];

function randomWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// ── Room state ─────────────────────────────────────────────────────────────────
// rooms: Map<roomCode, RoomState>
const rooms = new Map();

function makeRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? makeRoomCode() : code; // ensure unique
}

function evaluateGuess(guess, secret) {
    const result      = Array(5).fill('absent');
    const secretArr   = secret.split('');
    const guessArr    = guess.split('');
    const usedSecret  = Array(5).fill(false);
    const usedGuess   = Array(5).fill(false);

    // Pass 1: correct
    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === secretArr[i]) {
            result[i]      = 'correct';
            usedSecret[i]  = true;
            usedGuess[i]   = true;
        }
    }

    // Pass 2: present
    for (let i = 0; i < 5; i++) {
        if (usedGuess[i]) continue;
        for (let j = 0; j < 5; j++) {
            if (!usedSecret[j] && guessArr[i] === secretArr[j]) {
                result[i]     = 'present';
                usedSecret[j] = true;
                break;
            }
        }
    }

    return result;
}

// ── Socket events ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    // ── Create room ──
    socket.on('create_room', ({ playerName }) => {
        const code = makeRoomCode();
        rooms.set(code, {
            code,
            word: randomWord(),
            players: [{ id: socket.id, name: playerName, guessCount: 0 }],
            guesses: [],          // shared guess log
            currentTurn: null,    // set when game starts
            started: false,
            winner: null,
        });
        socket.join(code);
        socket.roomCode = code;
        socket.emit('room_created', { code });
        console.log(`Room ${code} created by ${playerName}`);
    });

    // ── Join room ──
    socket.on('join_room', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }
        if (room.started) {
            socket.emit('error', { message: 'Game already in progress.' });
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('error', { message: 'Room is full.' });
            return;
        }

        room.players.push({ id: socket.id, name: playerName, guessCount: 0 });
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Both players in — start the game
        room.started     = true;
        room.currentTurn = room.players[0].id; // creator goes first

        io.to(roomCode).emit('game_start', {
            players:     room.players.map(p => ({ id: p.id, name: p.name })),
            currentTurn: room.currentTurn,
        });

        console.log(`Room ${roomCode} started: ${room.players.map(p=>p.name).join(' vs ')}`);
    });

    // ── Submit guess ──
    socket.on('submit_guess', ({ guess }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || !room.started || room.winner) return;

        // Validate it's this player's turn
        if (room.currentTurn !== socket.id) {
            socket.emit('error', { message: "It's not your turn." });
            return;
        }

        guess = guess.toUpperCase().trim();
        if (guess.length !== 5) return;

        const result    = evaluateGuess(guess, room.word);
        const player    = room.players.find(p => p.id === socket.id);
        const isCorrect = result.every(r => r === 'correct');

        player.guessCount++;

        const guessEntry = {
            playerId:   socket.id,
            playerName: player.name,
            guess,
            result,
            guessNum:   player.guessCount,
        };

        room.guesses.push(guessEntry);

        if (isCorrect) {
            room.winner = socket.id;
            io.to(room.code).emit('guess_result', guessEntry);
            io.to(room.code).emit('game_over', {
                winnerId:   socket.id,
                winnerName: player.name,
                word:       room.word,
                guesses:    room.guesses,
            });
            console.log(`Room ${room.code} won by ${player.name} in ${player.guessCount} guesses`);
        } else {
            // Switch turn to the other player
            const other      = room.players.find(p => p.id !== socket.id);
            room.currentTurn = other.id;
            io.to(room.code).emit('guess_result', guessEntry);
            io.to(room.code).emit('turn_change', { currentTurn: room.currentTurn });
        }
    });

    // ── Rematch ──
    socket.on('rematch', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        room.word        = randomWord();
        room.guesses     = [];
        room.winner      = null;
        // Swap who goes first for fairness
        room.players     = [room.players[1], room.players[0]];
        room.currentTurn = room.players[0].id;

        io.to(room.code).emit('game_start', {
            players:     room.players.map(p => ({ id: p.id, name: p.name })),
            currentTurn: room.currentTurn,
        });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        io.to(room.code).emit('opponent_left', {
            message: 'Your opponent disconnected.',
        });

        rooms.delete(room.code);
        console.log(`Room ${room.code} closed — player disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
