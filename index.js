// ─────────────────────────────────────────────────────────────────────────────
// index.js — Combined Wordle server
// Runs BOTH duel mode and party mode on the same port / same Socket.io instance
// ─────────────────────────────────────────────────────────────────────────────
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const fetch    = require('node-fetch');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('Wordle server running ✅ — Duel + Party modes active'));

// Keep-alive: ping self every 5 minutes so Railway doesn't spin down
const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || 3000}`;

setInterval(() => {
    const http = require('http');
    const https = require('https');
    const client = SELF_URL.startsWith('https') ? https : http;
    client.get(SELF_URL, (res) => {
        console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
        console.warn('Keep-alive ping failed:', err.message);
    });
}, 5 * 60 * 1000); // every 5 minutes

// ── Shared word lists & helpers ───────────────────────────────────────────────
const WORDS5 = [
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

const WORDS4 = [
    'ABLE','ACID','AGED','ALSO','AREA','ARMY','ARTS','BACK','BAIL','BAKE','BALL','BAND',
    'BANK','BARE','BARN','BASE','BATH','BEAD','BEAM','BEAR','BEAT','BEEF','BELL','BEST',
    'BIRD','BITE','BLOW','BLUE','BOAT','BODY','BOLD','BOLT','BONE','BOOK','BOOT','BORE',
    'BORN','BULK','BURN','CAFE','CAGE','CAKE','CALF','CALL','CALM','CAMP','CAPE','CARD',
    'CARE','CART','CASE','CASH','CAST','CAVE','CELL','CHAT','CHIP','CITE','CITY','CLAM',
    'CLAP','CLAY','CLIP','CLUE','COAL','CODE','COIL','COLD','COME','COOK','COOL','COPE',
    'COPY','CORD','CORE','CORN','COST','COUP','CREW','CROP','CROW','CURE','DARE','DARK',
    'DART','DASH','DATA','DATE','DAWN','DEAD','DEAL','DEAR','DEBT','DECK','DEED','DEEP',
    'DENY','DESK','DIAL','DIET','DIME','DINE','DIRT','DISH','DISK','DOCK','DONE','DOOR',
    'DOSE','DOVE','DOWN','DRAW','DRIP','DROP','DRUG','DRUM','DUEL','DULL','DUMP','DUNE',
    'DUSK','DUST','DUTY','EARN','EASE','EAST','EASY','EDGE','EMIT','EPIC','EVEN','EVER',
    'EVIL','EXAM','FACE','FACT','FADE','FAIL','FAIR','FALL','FAME','FARM','FAST','FATE',
    'FEAR','FEAT','FEED','FEEL','FEET','FELL','FELT','FILE','FILL','FILM','FIND','FINE',
    'FIRE','FISH','FIST','FLAG','FLAT','FLIP','FLOW','FOAM','FOLD','FOLK','FOND','FOOD',
    'FOOT','FORD','FORK','FORM','FORT','FOUL','FOUR','FREE','FUEL','FULL','FUND','FUSE',
    'GATE','GAVE','GAZE','GEAR','GENE','GIVE','GLAD','GLOW','GLUE','GOAL','GOAT','GOLD',
    'GOLF','GONE','GOOD','GRAB','GREW','GREY','GRID','GRIN','GRIP','GRIT','GROW','GULF',
    'GUST','HACK','HAIL','HAIR','HALF','HALL','HALT','HAND','HANG','HARD','HARM','HARP',
    'HATE','HAVE','HAWK','HEAD','HEAL','HEAP','HEAT','HEEL','HELD','HELL','HELP','HERB',
    'HERE','HERO','HIGH','HILL','HINT','HIRE','HOLD','HOLE','HOLY','HOME','HOOD','HOOK',
    'HOPE','HORN','HOST','HULL','HUNG','HUNT','HURT','ICON','IDEA','IDLE','INCH','INTO',
    'IRON','ISLE','ITEM','JACK','JAIL','JAZZ','JEST','JOIN','JOKE','JUMP','JUST','KEEN',
    'KEEP','KICK','KIND','KING','KISS','KNEW','LAKE','LAND','LANE','LAST','LATE','LAWN',
    'LEAD','LEAF','LEAN','LEFT','LEND','LESS','LICK','LIFE','LIFT','LIKE','LIME','LINE',
    'LINK','LION','LIST','LIVE','LOAD','LOAN','LOCK','LOFT','LONE','LONG','LOOK','LOOP',
    'LORD','LORE','LOSE','LOSS','LOST','LOUD','LOVE','LUCK','LURE','LURK','MADE','MAIL',
    'MAIN','MAKE','MALE','MALL','MALT','MANY','MARK','MASS','MAST','MATE','MATH','MAZE',
    'MEAL','MEAN','MEAT','MEET','MELT','MEMO','MENU','MERE','MESH','MICE','MILD','MILE',
    'MILK','MILL','MIND','MINE','MINT','MISS','MIST','MODE','MOLD','MOON','MORE','MOST',
    'MOVE','MUCH','MULE','MUST','NAME','NEAR','NECK','NEED','NEWS','NEXT','NICE','NODE',
    'NONE','NOON','NORM','NOSE','NOTE','NOUN','NUDE','OBEY','ODDS','ONCE','ONLY','OPEN',
    'ORAL','OVEN','OVER','PACE','PACK','PAGE','PAID','PAIN','PAIR','PALM','PARK','PART',
    'PASS','PAST','PATH','PAVE','PEAK','PEEL','PEER','PICK','PILE','PINE','PINK','PIPE',
    'PLAN','PLAY','PLEA','PLOT','PLOW','PLUG','PLUS','POEM','POET','POLE','POLL','POOL',
    'POOR','PORT','POSE','POST','POUR','PRAY','PREY','PROP','PULL','PURE','PUSH','RACE',
    'RACK','RAGE','RAIN','RAMP','RANK','RARE','RATE','READ','REAL','REAP','REEF','REIN',
    'RELY','RENT','REST','RICE','RICH','RIDE','RING','RIOT','RISE','RISK','ROAD','ROAM',
    'ROAR','ROBE','ROCK','ROLE','ROLL','ROOF','ROOM','ROOT','ROPE','ROSE','RUIN','RULE',
    'RUSH','SAFE','SAIL','SALE','SALT','SAME','SAND','SANE','SAVE','SCAN','SCAR','SEAL',
    'SEAT','SEED','SEEK','SEEM','SEEN','SELF','SELL','SEND','SENT','SHED','SHIP','SHOE',
    'SHOP','SHOT','SHOW','SHUT','SICK','SIDE','SIGH','SIGN','SILK','SING','SINK','SIZE',
    'SKIN','SKIP','SLAM','SLAP','SLIM','SLIP','SLOT','SLOW','SLUG','SNAP','SNOW','SOAK',
    'SOAP','SOCK','SOFT','SOIL','SOLD','SOLE','SOME','SONG','SOON','SORT','SOUL','SOUP',
    'SOUR','SPAN','SPIN','SPIT','SPOT','STAB','STAR','STAY','STEM','STEP','STEW','STOP',
    'STUB','SUCH','SUIT','SUNG','SUNK','SURF','SWAP','SWIM','TAIL','TAKE','TALK','TALL',
    'TANK','TAPE','TASK','TEAM','TEAR','TELL','TEND','TENT','TERM','TEST','TEXT','THAN',
    'THAT','THEM','THEN','THEY','THIN','THIS','THUS','TIDE','TIED','TILL','TIME','TINY',
    'TIRE','TOAD','TOLD','TOLL','TOMB','TONE','TOOK','TOOL','TORN','TOSS','TOWN','TRAM',
    'TRAP','TREE','TRIM','TRIO','TRIP','TRUE','TUBE','TUCK','TUNA','TUNE','TURF','TURN',
    'TWIN','TYPE','UNIT','UPON','USED','USER','VARY','VAST','VEIL','VERY','VIBE','VIEW',
    'VINE','VOID','VOTE','WADE','WAGE','WAKE','WALK','WALL','WAND','WARD','WARM','WARN',
    'WARP','WAVE','WAYS','WEAK','WEAR','WEED','WEEK','WELL','WENT','WERE','WEST','WHAT',
    'WHEN','WHOM','WIDE','WIFE','WILD','WILL','WIND','WINE','WING','WIRE','WISE','WISH',
    'WITH','WOLF','WOOD','WORD','WORE','WORK','WORN','WRAP','YARD','YEAR','YOUR','ZERO',
    'ZONE','ZOOM'
];

const WORD_SET5 = new Set(WORDS5);
const WORD_SET4 = new Set(WORDS4);

function randomWord(len) {
    const list = len === 4 ? WORDS4 : WORDS5;
    return list[Math.floor(Math.random() * list.length)];
}

async function isValidWord(word) {
    const w   = word.toUpperCase();
    const set = w.length === 4 ? WORD_SET4 : WORD_SET5;
    if (set.has(w)) return true;
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
            { timeout: 3000 }
        );
        return res.ok;
    } catch { return true; }
}

function evaluateGuess(guess, secret) {
    const len = secret.length;
    const result = Array(len).fill('absent');
    const sArr = secret.split(''), gArr = guess.split('');
    const uS = Array(len).fill(false), uG = Array(len).fill(false);
    for (let i = 0; i < len; i++) {
        if (gArr[i] === sArr[i]) { result[i] = 'correct'; uS[i] = uG[i] = true; }
    }
    for (let i = 0; i < len; i++) {
        if (uG[i]) continue;
        for (let j = 0; j < len; j++) {
            if (!uS[j] && gArr[i] === sArr[j]) { result[i] = 'present'; uS[j] = true; break; }
        }
    }
    return result;
}

const rooms = new Map();

function makeRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? makeRoomCode() : code;
}

// ─────────────────────────────────────────────────────
// DUEL MODE handlers
// ─────────────────────────────────────────────────────
function resetDuelRoom(room, swapTurn = false) {
    room.word = randomWord(5);
    room.guesses = [];
    room.winner = null;
    room.rematchVotes = new Set();
    room.newWordVotes = new Set();
    room.players.forEach(p => p.guessCount = 0);
    if (swapTurn) room.players = [room.players[1], room.players[0]];
    room.currentTurn = room.players[0].id;
}

// ─────────────────────────────────────────────────────
// PARTY MODE helpers
// ─────────────────────────────────────────────────────
function calcScore(guessNum, hintsRevealed, maxGuesses) {
    const base = Math.max(maxGuesses - guessNum + 1, 1);
    const mult = hintsRevealed === 0 ? 1.0 : hintsRevealed === 1 ? 0.85 : hintsRevealed === 2 ? 0.7 : 0.5;
    return Math.round(base * mult);
}

function serializeScores(room) {
    return [...room.players.entries()]
        .map(([id, p]) => ({ playerId: id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score);
}

function broadcastChat(room, senderName, message) {
    const msg = { senderName, message, time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) };
    room.chat.push(msg);
    if (room.chat.length > 200) room.chat.shift();
    io.to(room.code).emit('party_chat_msg', msg);
}

function emitLobbyState(room) {
    io.to(room.code).emit('party_lobby_state', {
        code:     room.code,
        hostId:   room.hostId,
        players:  [...room.players.entries()].map(([id, p]) => ({ id, name: p.name, score: p.score })),
        settings: { wordLength: room.wordLength, timerSeconds: room.timerSeconds, revealInterval: room.revealInterval },
    });
}

function clearPartyTimers(room) {
    if (room.roundTimer)      { clearInterval(room.roundTimer);     room.roundTimer = null; }
    if (room.setterPickTimer) { clearTimeout(room.setterPickTimer); room.setterPickTimer = null; }
}

function startNextRound(room) {
    clearPartyTimers(room);
    room.setterOrder = room.setterOrder.filter(id => room.players.has(id));
    if (!room.setterOrder.length) return;
    room.roundNumber++;
    if (room.setterIndex >= room.setterOrder.length) { endGame(room); return; }

    room.currentSetter = room.setterOrder[room.setterIndex++];
    room.currentWord   = '';
    room.hintsRevealed = [];
    room.phase         = 'setting';
    room.guesserState  = new Map();
    room.players.forEach((_, id) => {
        if (id !== room.currentSetter)
            room.guesserState.set(id, { guesses:[], solved:false, failed:false, guessCount:0 });
    });

    const setter = room.players.get(room.currentSetter);
    io.to(room.code).emit('party_round_start', {
        roundNumber: room.roundNumber, totalRounds: room.setterOrder.length,
        setterId: room.currentSetter, setterName: setter?.name,
        wordLength: room.wordLength, timerSeconds: room.timerSeconds,
        revealInterval: room.revealInterval, scores: serializeScores(room),
        players: [...room.players.entries()].map(([id,p]) => ({ id, name:p.name })),
    });

    broadcastChat(room, null, `Round ${room.roundNumber}: ${setter?.name} is picking a word...`);

    room.setterPickTimer = setTimeout(() => {
        if (room.phase === 'setting' && !room.currentWord) {
            room.currentWord = randomWord(room.wordLength);
            broadcastChat(room, null, `${setter?.name} took too long — random word selected!`);
            startGuessingPhase(room);
        }
    }, 30000);
}

function startGuessingPhase(room) {
    if (room.setterPickTimer) { clearTimeout(room.setterPickTimer); room.setterPickTimer = null; }
    room.phase    = 'guessing';
    room.timeLeft = room.timerSeconds;
    io.to(room.code).emit('party_guessing_start', {
        wordLength: room.wordLength, timerSeconds: room.timerSeconds, revealInterval: room.revealInterval,
    });
    broadcastChat(room, null, `🔤 Guess the ${room.wordLength}-letter word! Timer started.`);

    room.roundTimer = setInterval(() => {
        room.timeLeft--;
        io.to(room.code).emit('party_tick', { timeLeft: room.timeLeft });
        if (room.timeLeft > 0 && room.timeLeft % room.revealInterval === 0) revealNextLetter(room);
        if (room.timeLeft <= 0) { clearPartyTimers(room); endRound(room); }
    }, 1000);
}

function revealNextLetter(room) {
    const word = room.currentWord;
    const revealed = new Set(room.hintsRevealed.map(h => h.index));
    const unrevealed = [...Array(word.length).keys()].filter(i => !revealed.has(i));
    if (!unrevealed.length) return;
    const idx  = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const hint = { index: idx, letter: word[idx] };
    room.hintsRevealed.push(hint);
    io.to(room.code).emit('party_letter_reveal', { hints: room.hintsRevealed, wordLength: room.wordLength });
    broadcastChat(room, null, `💡 Hint: Position ${idx + 1} is "${word[idx]}"`);
}

function checkRoundEnd(room) {
    const allDone = [...room.guesserState.values()].every(s => s.solved || s.failed);
    if (allDone) { clearPartyTimers(room); setTimeout(() => endRound(room), 500); }
}

function endRound(room) {
    room.phase = 'results';
    const anyoneSolved = [...room.guesserState.values()].some(s => s.solved);
    const setter = room.players.get(room.currentSetter);
    if (!anyoneSolved && setter) setter.score += 3;

    const results = [];
    room.players.forEach((player, id) => {
        if (id === room.currentSetter) {
            results.push({ playerId:id, playerName:player.name, role:'setter', points: anyoneSolved ? 0 : 3 });
        } else {
            const state = room.guesserState.get(id);
            const pts   = state?.solved ? calcScore(state.guessCount, room.hintsRevealed.length, 6) : 0;
            results.push({ playerId:id, playerName:player.name, role:'guesser', solved:state?.solved||false, guessCount:state?.guessCount||0, points:pts });
        }
    });

    const isLastRound = room.setterIndex >= room.setterOrder.filter(id => room.players.has(id)).length;
    io.to(room.code).emit('party_round_end', { word:room.currentWord, results, scores:serializeScores(room), isLastRound });
    broadcastChat(room, null, `Round over! The word was "${room.currentWord}"`);
}

function endGame(room) {
    room.phase = 'ended';
    const scores = serializeScores(room);
    const winner = scores[0];
    io.to(room.code).emit('party_game_end', { scores, winner });
    broadcastChat(room, null, `🏆 Game over! ${winner.name} wins with ${winner.score} points!`);
}

// ─────────────────────────────────────────────────────
// SOCKET HANDLERS
// ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    // ════ DUEL events ════════════════════════════════
    socket.on('create_room', ({ playerName }) => {
        const code = makeRoomCode();
        rooms.set(code, {
            type: 'duel', code,
            word: randomWord(5),
            players: [{ id:socket.id, name:playerName, guessCount:0 }],
            guesses: [], currentTurn: null, started:false, winner:null,
            rematchVotes: new Set(), newWordVotes: new Set(),
        });
        socket.join(code); socket.roomCode = code;
        socket.emit('room_created', { code });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room || room.type !== 'duel')  { socket.emit('error', { message:'Room not found.' }); return; }
        if (room.started)                   { socket.emit('error', { message:'Game already started.' }); return; }
        if (room.players.length >= 2)       { socket.emit('error', { message:'Room is full.' }); return; }
        room.players.push({ id:socket.id, name:playerName, guessCount:0 });
        socket.join(roomCode); socket.roomCode = roomCode;
        room.started = true; room.currentTurn = room.players[0].id;
        io.to(roomCode).emit('game_start', { players:room.players.map(p=>({id:p.id,name:p.name})), currentTurn:room.currentTurn });
    });

    socket.on('submit_guess', async ({ guess }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'duel' || !room.started || room.winner) return;
        if (room.currentTurn !== socket.id) { socket.emit('error', { message:"Not your turn." }); return; }
        guess = guess.toUpperCase().trim();
        if (guess.length !== 5) return;
        const valid = await isValidWord(guess);
        if (!valid) { socket.emit('invalid_word', { message:'Not a valid word!' }); return; }
        const result = evaluateGuess(guess, room.word);
        const player = room.players.find(p => p.id === socket.id);
        const isCorrect = result.every(r => r === 'correct');
        player.guessCount++;
        const entry = { playerId:socket.id, playerName:player.name, guess, result, guessNum:player.guessCount };
        room.guesses.push(entry);
        if (isCorrect) {
            room.winner = socket.id;
            io.to(room.code).emit('guess_result', entry);
            io.to(room.code).emit('game_over', { winnerId:socket.id, winnerName:player.name, word:room.word });
        } else {
            room.currentTurn = room.players.find(p => p.id !== socket.id).id;
            io.to(room.code).emit('guess_result', entry);
            io.to(room.code).emit('turn_change', { currentTurn:room.currentTurn });
        }
    });

    socket.on('rematch', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'duel') return;
        room.rematchVotes.add(socket.id);
        if (room.rematchVotes.size === 1) {
            const other = room.players.find(p => p.id !== socket.id);
            if (other) io.to(other.id).emit('rematch_pending', { voterName:room.players.find(p=>p.id===socket.id)?.name });
        }
        if (room.rematchVotes.size === 2) {
            resetDuelRoom(room, true);
            io.to(room.code).emit('game_start', { players:room.players.map(p=>({id:p.id,name:p.name})), currentTurn:room.currentTurn });
        }
    });

    socket.on('typing', ({ isTyping }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'duel') return;
        const other = room.players?.find(p => p.id !== socket.id);
        if (other) io.to(other.id).emit('opponent_typing', { isTyping });
    });

    socket.on('exit_room', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        io.to(room.code).emit('opponent_left', { message:'Your opponent left the room.' });
        rooms.delete(room.code);
    });

    // ════ PARTY events ════════════════════════════════
    socket.on('party_create', ({ playerName, wordLength, timerSeconds, revealInterval }) => {
        const code = makeRoomCode();
        rooms.set(code, {
            type:'party', code, hostId:socket.id, phase:'lobby',
            wordLength: wordLength||5, timerSeconds: timerSeconds||90, revealInterval: revealInterval||15,
            players: new Map([[socket.id, { name:playerName, score:0 }]]),
            setterOrder:[], setterIndex:0, currentSetter:null, currentWord:'',
            hintsRevealed:[], guesserState:new Map(),
            roundTimer:null, setterPickTimer:null,
            chat:[], roundNumber:0, timeLeft:0, nextRoundVotes: new Set(),
        });
        socket.join(code); socket.roomCode = code;
        socket.emit('party_room_created', { code });
        emitLobbyState(rooms.get(code));
    });

    socket.on('party_join', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room || room.type !== 'party')  { socket.emit('party_error', { message:'Room not found.' }); return; }
        if (room.phase !== 'lobby')          { socket.emit('party_error', { message:'Game already in progress.' }); return; }
        if (room.players.size >= 8)          { socket.emit('party_error', { message:'Room is full (max 8).' }); return; }
        room.players.set(socket.id, { name:playerName, score:0 });
        socket.join(roomCode); socket.roomCode = roomCode;
        emitLobbyState(room);
        broadcastChat(room, null, `${playerName} joined 👋`);
    });

    socket.on('party_start', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'party' || socket.id !== room.hostId) return;
        if (room.players.size < 2) { socket.emit('party_error', { message:'Need at least 2 players.' }); return; }
        room.setterOrder = [...room.players.keys()];
        room.setterIndex = 0; room.roundNumber = 0;
        startNextRound(room);
    });

    socket.on('party_set_word', async ({ word }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'party' || room.phase !== 'setting' || socket.id !== room.currentSetter) return;
        word = word.toUpperCase().trim();
        if (word.length !== room.wordLength) { socket.emit('party_set_error', { message:`Word must be ${room.wordLength} letters.` }); return; }
        const valid = await isValidWord(word);
        if (!valid) { socket.emit('party_set_error', { message:'Not a valid word. Try another.' }); return; }
        room.currentWord = word;
        startGuessingPhase(room);
    });

    socket.on('party_guess', async ({ guess }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'party' || room.phase !== 'guessing') return;
        if (socket.id === room.currentSetter) return;
        const state = room.guesserState.get(socket.id);
        if (!state || state.solved || state.failed) return;
        guess = guess.toUpperCase().trim();
        if (guess.length !== room.wordLength) { socket.emit('party_invalid', { message:'Not enough letters.' }); return; }
        const valid = await isValidWord(guess);
        if (!valid) { socket.emit('party_invalid', { message:'Not a valid word!' }); return; }
        const result = evaluateGuess(guess, room.currentWord);
        const isCorrect = result.every(r => r === 'correct');
        state.guesses.push({ guess, result }); state.guessCount++;
        const player = room.players.get(socket.id);
        socket.emit('party_guess_result', { guess, result, guessNum:state.guessCount, isCorrect });
        if (isCorrect) {
            state.solved = true;
            const pts = calcScore(state.guessCount, room.hintsRevealed.length, 6);
            player.score += pts;
            io.to(room.code).emit('party_player_solved', { playerId:socket.id, playerName:player.name, guessCount:state.guessCount, points:pts });
            broadcastChat(room, null, `🎉 ${player.name} solved it in ${state.guessCount}!`);
        } else if (state.guessCount >= 6) {
            state.failed = true;
            io.to(room.code).emit('party_player_failed', { playerId:socket.id, playerName:player.name });
        }
        checkRoundEnd(room);
    });

    // ── Next round vote — both players must click before round starts ──
    socket.on('party_next_round', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'party' || room.phase !== 'results') return;

        room.nextRoundVotes.add(socket.id);

        if (room.nextRoundVotes.size === 1) {
            // Tell the other player(s) someone is ready
            const voter = room.players.get(socket.id);
            io.to(room.code).emit('party_next_round_pending', {
                voterName: voter?.name,
                voterId:   socket.id,
                total:     room.players.size,
                votes:     room.nextRoundVotes.size,
            });
        }

        if (room.nextRoundVotes.size >= room.players.size) {
            // Everyone ready — start next round
            room.nextRoundVotes = new Set();
            startNextRound(room);
        }
    });

    socket.on('party_chat', ({ message }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.type !== 'party') return;
        const player = room.players.get(socket.id);
        if (!player) return;
        const msg = message.trim().slice(0, 200);
        if (!msg) return;
        broadcastChat(room, player.name, msg);
    });

    // ════ Shared disconnect ════════════════════════════
    socket.on('disconnect', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        if (room.type === 'duel') {
            // Only notify + delete if game was actually started
            if (room.started) {
                io.to(room.code).emit('opponent_left', { message:'Your opponent disconnected.' });
            }
            rooms.delete(room.code);
        } else if (room.type === 'party') {
            const player = room.players.get(socket.id);
            const playerName = player?.name || 'A player';
            room.players.delete(socket.id);

            // If room is now empty, clean up
            if (room.players.size === 0) {
                clearPartyTimers(room);
                rooms.delete(room.code);
                return;
            }

            // If host left, assign new host
            if (socket.id === room.hostId) {
                room.hostId = [...room.players.keys()][0];
                io.to(room.hostId).emit('party_host_assigned');
            }

            // Only broadcast chat during active game, not lobby
            if (room.phase !== 'lobby') {
                broadcastChat(room, null, `${playerName} left.`);
                if (room.phase === 'setting' && socket.id === room.currentSetter) {
                    broadcastChat(room, null, 'Setter left — skipping round.');
                    setTimeout(() => startNextRound(room), 2000);
                }
                if (room.phase === 'guessing') checkRoundEnd(room);
            }

            emitLobbyState(room);
        }
        console.log(`Room ${room.code} — player disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Wordle server on port ${PORT} — Duel + Party active`));