/**
 * Jest Polyfills
 * This file must run BEFORE setupTests.ts to set up necessary globals
 */

// Polyfill TextEncoder/TextDecoder for jsdom environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as any;
}

// Polyfill web streams (needed by MSW)
if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
  global.ReadableStream = ReadableStream as any;
  global.WritableStream = WritableStream as any;
  global.TransformStream = TransformStream as any;
}

// Polyfill fetch API using whatwg-fetch
require('whatwg-fetch');

// Mock BroadcastChannel (needed by MSW for WebSocket support)
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(public name: string) {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  } as any;
}
