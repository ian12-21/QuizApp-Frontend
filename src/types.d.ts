declare global {
    interface Window {
      process: any;
      Buffer: typeof Buffer;
    }
}
export {};

/*In a project that uses both browser and Node.js functionalities, you might need to access Node.js-specific objects like  process
and  buffer  in the browser environment. By extending the  window  interface, you can avoid typescript errors when accessing these properties in your code
*/

//This setup is particularly useful in environments like Electron or when using polyfills to bring Node.js features to the browser.