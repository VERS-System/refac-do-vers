// services/mobile/global-polyfills.js

// 1. Inicializa dependências globais de rede e eventos do React Native
try {
  require('react-native/Libraries/Core/setUpGlobals')();
} catch (e) {
  // Ignora se já tiver sido inicializado
}

// 2. Polyfill seguro para DOMException sem afetar propriedades read-only
if (typeof globalThis.DOMException === 'undefined') {
  function CustomDOMException(message, name) {
    const error = new Error(message);
    error.name = name || 'Error';
    error.code = 0;
    return error;
  }

  CustomDOMException.prototype = Object.create(Error.prototype);
  CustomDOMException.prototype.constructor = CustomDOMException;

  try {
    Object.defineProperty(globalThis, 'DOMException', {
      value: CustomDOMException,
      writable: true,
      configurable: true,
    });
  } catch (e) {
    globalThis.DOMException = CustomDOMException;
  }
}