import encodeFunc from './encode.js';
import decodeFunc from './decode.js';

// Expose to global window for dynamic loading in non-module scripts
window.jsquash_webp_encode = encodeFunc;
window.jsquash_webp_decode = decodeFunc;

// Keep original exports for potential module usage elsewhere
export const encode = encodeFunc;
export const decode = decodeFunc;
