// Simple Stockfish Worker with Logging
console.log('[Worker] Loading /stockfish.js...');
importScripts('/stockfish.js');

let engine = null;
let ready = false;
const queue = [];

function log(...args) {
  console.log('[Worker]', ...args);
}

log('Initializing Stockfish...');
Stockfish().then(sf => {
  engine = sf;
  ready = true;
  log('Stockfish loaded!');

  engine.addMessageListener(line => {
    log('OUT:', line);
    postMessage(line);
  });

  // Process any queued commands
  while (queue.length > 0) {
    const cmd = queue.shift();
    log('Processing queued command:', cmd);
    engine.postMessage(cmd);
  }

  // Start UCI protocol
  log('Sending: uci');
  engine.postMessage('uci');
}).catch(err => {
  log('Failed to load Stockfish:', err);
  postMessage('error: ' + err.message);
});

onmessage = function(e) {
  log('IN:', e.data);
  if (engine && ready) {
    engine.postMessage(e.data);
  } else {
    log('Engine not ready, queueing:', e.data);
    queue.push(e.data);
  }
}; 