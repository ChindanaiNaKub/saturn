// Stockfish WebAssembly Worker
importScripts('https://unpkg.com/stockfish.wasm@0.10.0/stockfish.js');

// Initialize Stockfish
const wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

if (wasmSupported) {
  // Use WebAssembly version
  Stockfish().then(sf => {
    sf.addMessageListener(line => {
      postMessage(line);
    });

    // Forward commands to Stockfish
    onmessage = (e) => {
      sf.postMessage(e.data);
    };
  });
} else {
  console.error('WebAssembly is not supported in this browser');
  postMessage('error: WebAssembly not supported');
} 