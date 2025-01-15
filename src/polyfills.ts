import { Buffer } from 'buffer';
import process from 'process';

(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = process;

import 'zone.js';  // Included with Angular CLI


// Polyfills: The primary purpose of this file is to include polyfills that ensure compatibility with older browsers.
// Node.js Compatibility: By adding Buffer and process to the window object, it allows the use of Node.js-specific features in 
// the browser environment, which can be useful in certain applications like Electron or when using specific libraries that rely 
// on these Node.js features.
// Zone.js: Ensures that Angular's change detection works correctly by patching asynchronous operations.

// The polyfills.ts file is crucial for ensuring that your Angular application works across different browsers and environments 
// by including necessary polyfills and setting up global objects that might be required by your application or third-party libraries.