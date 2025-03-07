/**
 * @license React
 * react-server-dom-esm-server.node.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

if (process.env.NODE_ENV !== "production") {
  (function() {
'use strict';

var React = require('react');
var util = require('util');
require('crypto');
var async_hooks = require('async_hooks');
var ReactDOM = require('react-dom');

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var ReactSharedInternalsServer = // $FlowFixMe: It's defined in the one we resolve to.
React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

if (!ReactSharedInternalsServer) {
  throw new Error('The "react" package in this environment is not configured correctly. ' + 'The "react-server" condition must be enabled in any environment that ' + 'runs React Server Components.');
}

function error(format) {
  {
    {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      printWarning('error', format, args);
    }
  }
}

function printWarning(level, format, args) {
  // When changing this logic, you might want to also
  // update consoleWithStackDev.www.js as well.
  {
    var stack = ReactSharedInternalsServer.getStackAddendum();

    if (stack !== '') {
      format += '%s';
      args = args.concat([stack]);
    } // eslint-disable-next-line react-internal/safe-string-coercion


    var argsWithFormat = args.map(function (item) {
      return String(item);
    }); // Careful: RN currently depends on this prefix

    argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
    // breaks IE9: https://github.com/facebook/react/issues/13610
    // eslint-disable-next-line react-internal/no-production-logging

    Function.prototype.apply.call(console[level], console, argsWithFormat);
  }
}

// -----------------------------------------------------------------------------
var enablePostpone = false;

function scheduleWork(callback) {
  setImmediate(callback);
}
function flushBuffered(destination) {
  // If we don't have any more data to send right now.
  // Flush whatever is in the buffer to the wire.
  if (typeof destination.flush === 'function') {
    // By convention the Zlib streams provide a flush function for this purpose.
    // For Express, compression middleware adds this method.
    destination.flush();
  }
}
var VIEW_SIZE = 2048;
var currentView = null;
var writtenBytes = 0;
var destinationHasCapacity = true;
function beginWriting(destination) {
  currentView = new Uint8Array(VIEW_SIZE);
  writtenBytes = 0;
  destinationHasCapacity = true;
}

function writeStringChunk(destination, stringChunk) {
  if (stringChunk.length === 0) {
    return;
  } // maximum possible view needed to encode entire string


  if (stringChunk.length * 3 > VIEW_SIZE) {
    if (writtenBytes > 0) {
      writeToDestination(destination, currentView.subarray(0, writtenBytes));
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }

    writeToDestination(destination, textEncoder.encode(stringChunk));
    return;
  }

  var target = currentView;

  if (writtenBytes > 0) {
    target = currentView.subarray(writtenBytes);
  }

  var _textEncoder$encodeIn = textEncoder.encodeInto(stringChunk, target),
      read = _textEncoder$encodeIn.read,
      written = _textEncoder$encodeIn.written;

  writtenBytes += written;

  if (read < stringChunk.length) {
    writeToDestination(destination, currentView.subarray(0, writtenBytes));
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = textEncoder.encodeInto(stringChunk.slice(read), currentView).written;
  }

  if (writtenBytes === VIEW_SIZE) {
    writeToDestination(destination, currentView);
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
}

function writeViewChunk(destination, chunk) {
  if (chunk.byteLength === 0) {
    return;
  }

  if (chunk.byteLength > VIEW_SIZE) {
    // this chunk may overflow a single view which implies it was not
    // one that is cached by the streaming renderer. We will enqueu
    // it directly and expect it is not re-used
    if (writtenBytes > 0) {
      writeToDestination(destination, currentView.subarray(0, writtenBytes));
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }

    writeToDestination(destination, chunk);
    return;
  }

  var bytesToWrite = chunk;
  var allowableBytes = currentView.length - writtenBytes;

  if (allowableBytes < bytesToWrite.byteLength) {
    // this chunk would overflow the current view. We enqueue a full view
    // and start a new view with the remaining chunk
    if (allowableBytes === 0) {
      // the current view is already full, send it
      writeToDestination(destination, currentView);
    } else {
      // fill up the current view and apply the remaining chunk bytes
      // to a new view.
      currentView.set(bytesToWrite.subarray(0, allowableBytes), writtenBytes);
      writtenBytes += allowableBytes;
      writeToDestination(destination, currentView);
      bytesToWrite = bytesToWrite.subarray(allowableBytes);
    }

    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }

  currentView.set(bytesToWrite, writtenBytes);
  writtenBytes += bytesToWrite.byteLength;

  if (writtenBytes === VIEW_SIZE) {
    writeToDestination(destination, currentView);
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
}

function writeChunk(destination, chunk) {
  if (typeof chunk === 'string') {
    writeStringChunk(destination, chunk);
  } else {
    writeViewChunk(destination, chunk);
  }
}

function writeToDestination(destination, view) {
  var currentHasCapacity = destination.write(view);
  destinationHasCapacity = destinationHasCapacity && currentHasCapacity;
}

function writeChunkAndReturn(destination, chunk) {
  writeChunk(destination, chunk);
  return destinationHasCapacity;
}
function completeWriting(destination) {
  if (currentView && writtenBytes > 0) {
    destination.write(currentView.subarray(0, writtenBytes));
  }

  currentView = null;
  writtenBytes = 0;
  destinationHasCapacity = true;
}
function close$1(destination) {
  destination.end();
}
var textEncoder = new util.TextEncoder();
function stringToChunk(content) {
  return content;
}
function byteLengthOfChunk(chunk) {
  return typeof chunk === 'string' ? Buffer.byteLength(chunk, 'utf8') : chunk.byteLength;
}
function closeWithError(destination, error) {
  // $FlowFixMe[incompatible-call]: This is an Error object or the destination accepts other types.
  destination.destroy(error);
}

// eslint-disable-next-line no-unused-vars
var CLIENT_REFERENCE_TAG$1 = Symbol.for('react.client.reference');
var SERVER_REFERENCE_TAG = Symbol.for('react.server.reference');
function isClientReference(reference) {
  return reference.$$typeof === CLIENT_REFERENCE_TAG$1;
}
function isServerReference(reference) {
  return reference.$$typeof === SERVER_REFERENCE_TAG;
}
function registerClientReference(proxyImplementation, id, exportName) {
  return Object.defineProperties(proxyImplementation, {
    $$typeof: {
      value: CLIENT_REFERENCE_TAG$1
    },
    $$id: {
      value: id + '#' + exportName
    }
  });
} // $FlowFixMe[method-unbinding]

var FunctionBind = Function.prototype.bind; // $FlowFixMe[method-unbinding]

var ArraySlice = Array.prototype.slice;

function bind() {
  // $FlowFixMe[unsupported-syntax]
  var newFn = FunctionBind.apply(this, arguments);

  if (this.$$typeof === SERVER_REFERENCE_TAG) {
    // $FlowFixMe[method-unbinding]
    var args = ArraySlice.call(arguments, 1);
    return Object.defineProperties(newFn, {
      $$typeof: {
        value: SERVER_REFERENCE_TAG
      },
      $$id: {
        value: this.$$id
      },
      $$bound: {
        value: this.$$bound ? this.$$bound.concat(args) : args
      },
      bind: {
        value: bind
      }
    });
  }

  return newFn;
}

function registerServerReference(reference, id, exportName) {
  return Object.defineProperties(reference, {
    $$typeof: {
      value: SERVER_REFERENCE_TAG
    },
    $$id: {
      value: id + '#' + exportName,
      configurable: true
    },
    $$bound: {
      value: null,
      configurable: true
    },
    bind: {
      value: bind,
      configurable: true
    }
  });
}

// base URL on the file system
function getClientReferenceKey(reference) {
  return reference.$$id;
}
function resolveClientReferenceMetadata(config, clientReference) {
  var baseURL = config;
  var id = clientReference.$$id;
  var idx = id.lastIndexOf('#');
  var exportName = id.slice(idx + 1);
  var fullURL = id.slice(0, idx);

  if (!fullURL.startsWith(baseURL)) {
    throw new Error('Attempted to load a Client Module outside the hosted root.');
  } // Relative URL


  var modulePath = fullURL.slice(baseURL.length);
  return [modulePath, exportName];
}
function getServerReferenceId(config, serverReference) {
  return serverReference.$$id;
}
function getServerReferenceBoundArguments(config, serverReference) {
  return serverReference.$$bound;
}

var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

var previousDispatcher = ReactDOMSharedInternals.d;
/* ReactDOMCurrentDispatcher */

ReactDOMSharedInternals.d
/* ReactDOMCurrentDispatcher */
= {
  f
  /* flushSyncWork */
  : previousDispatcher.f
  /* flushSyncWork */
  ,
  r
  /* requestFormReset */
  : previousDispatcher.r
  /* requestFormReset */
  ,
  D
  /* prefetchDNS */
  : prefetchDNS,
  C
  /* preconnect */
  : preconnect,
  L
  /* preload */
  : preload,
  m
  /* preloadModule */
  : preloadModule$1,
  X
  /* preinitScript */
  : preinitScript,
  S
  /* preinitStyle */
  : preinitStyle,
  M
  /* preinitModuleScript */
  : preinitModuleScript
};

function prefetchDNS(href) {
  if (typeof href === 'string' && href) {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'D|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      emitHint(request, 'D', href);
    } else {
      previousDispatcher.D(
      /* prefetchDNS */
      href);
    }
  }
}

function preconnect(href, crossOrigin) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = "C|" + (crossOrigin == null ? 'null' : crossOrigin) + "|" + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);

      if (typeof crossOrigin === 'string') {
        emitHint(request, 'C', [href, crossOrigin]);
      } else {
        emitHint(request, 'C', href);
      }
    } else {
      previousDispatcher.C(
      /* preconnect */
      href, crossOrigin);
    }
  }
}

function preload(href, as, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'L';

      if (as === 'image' && options) {
        key += getImagePreloadKey(href, options.imageSrcSet, options.imageSizes);
      } else {
        key += "[" + as + "]" + href;
      }

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        emitHint(request, 'L', [href, as, trimmed]);
      } else {
        emitHint(request, 'L', [href, as]);
      }
    } else {
      previousDispatcher.L(
      /* preload */
      href, as, options);
    }
  }
}

function preloadModule$1(href, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'm|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'm', [href, trimmed]);
      } else {
        return emitHint(request, 'm', href);
      }
    } else {
      previousDispatcher.m(
      /* preloadModule */
      href, options);
    }
  }
}

function preinitStyle(href, precedence, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'S|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'S', [href, typeof precedence === 'string' ? precedence : 0, trimmed]);
      } else if (typeof precedence === 'string') {
        return emitHint(request, 'S', [href, precedence]);
      } else {
        return emitHint(request, 'S', href);
      }
    } else {
      previousDispatcher.S(
      /* preinitStyle */
      href, precedence, options);
    }
  }
}

function preinitScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'X|' + src;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'X', [src, trimmed]);
      } else {
        return emitHint(request, 'X', src);
      }
    } else {
      previousDispatcher.X(
      /* preinitScript */
      src, options);
    }
  }
}

function preinitModuleScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'M|' + src;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'M', [src, trimmed]);
      } else {
        return emitHint(request, 'M', src);
      }
    } else {
      previousDispatcher.M(
      /* preinitModuleScript */
      src, options);
    }
  }
} // Flight normally encodes undefined as a special character however for directive option
// arguments we don't want to send unnecessary keys and bloat the payload so we create a
// trimmed object which omits any keys with null or undefined values.
// This is only typesafe because these option objects have entirely optional fields where
// null and undefined represent the same thing as no property.


function trimOptions(options) {
  if (options == null) return null;
  var hasProperties = false;
  var trimmed = {};

  for (var key in options) {
    if (options[key] != null) {
      hasProperties = true;
      trimmed[key] = options[key];
    }
  }

  return hasProperties ? trimmed : null;
}

function getImagePreloadKey(href, imageSrcSet, imageSizes) {
  var uniquePart = '';

  if (typeof imageSrcSet === 'string' && imageSrcSet !== '') {
    uniquePart += '[' + imageSrcSet + ']';

    if (typeof imageSizes === 'string') {
      uniquePart += '[' + imageSizes + ']';
    }
  } else {
    uniquePart += '[][]' + href;
  }

  return "[image]" + uniquePart;
}

// This module registers the host dispatcher so it needs to be imported
// small, smaller than how we encode undefined, and is unambiguous. We could use
// a different tuple structure to encode this instead but this makes the runtime
// cost cheaper by eliminating a type checks in more positions.
// prettier-ignore

function createHints() {
  return new Set();
}

var supportsRequestStorage = true;
var requestStorage = new async_hooks.AsyncLocalStorage();

var TEMPORARY_REFERENCE_TAG = Symbol.for('react.temporary.reference'); // eslint-disable-next-line no-unused-vars

function isTemporaryReference(reference) {
  return reference.$$typeof === TEMPORARY_REFERENCE_TAG;
}
function resolveTemporaryReferenceID(temporaryReference) {
  return temporaryReference.$$id;
}
var proxyHandlers = {
  get: function (target, name, receiver) {
    switch (name) {
      // These names are read by the Flight runtime if you end up using the exports object.
      case '$$typeof':
        // These names are a little too common. We should probably have a way to
        // have the Flight runtime extract the inner target instead.
        return target.$$typeof;

      case '$$id':
        return target.$$id;

      case '$$async':
        return target.$$async;

      case 'name':
        return undefined;

      case 'displayName':
        return undefined;
      // We need to special case this because createElement reads it if we pass this
      // reference.

      case 'defaultProps':
        return undefined;
      // Avoid this attempting to be serialized.

      case 'toJSON':
        return undefined;

      case Symbol.toPrimitive:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toPrimitive];

      case Symbol.toStringTag:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toStringTag];

      case 'Provider':
        throw new Error("Cannot render a Client Context Provider on the Server. " + "Instead, you can export a Client Component wrapper " + "that itself renders a Client Context Provider.");
    }

    throw new Error( // eslint-disable-next-line react-internal/safe-string-coercion
    "Cannot access " + String(name) + " on the server. " + 'You cannot dot into a temporary client reference from a server component. ' + 'You can only pass the value through to the client.');
  },
  set: function () {
    throw new Error('Cannot assign to a temporary client reference from a server module.');
  }
};
function createTemporaryReference(id) {
  var reference = Object.defineProperties(function () {
    throw new Error( // eslint-disable-next-line react-internal/safe-string-coercion
    "Attempted to call a temporary Client Reference from the server but it is on the client. " + "It's not possible to invoke a client function from the server, it can " + "only be rendered as a Component or passed to props of a Client Component.");
  }, {
    $$typeof: {
      value: TEMPORARY_REFERENCE_TAG
    },
    $$id: {
      value: id
    }
  });
  return new Proxy(reference, proxyHandlers);
}

var REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element') ;
var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
var REACT_CONTEXT_TYPE = Symbol.for('react.context');
var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
var REACT_MEMO_TYPE = Symbol.for('react.memo');
var REACT_LAZY_TYPE = Symbol.for('react.lazy');
var REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
var REACT_POSTPONE_TYPE = Symbol.for('react.postpone');
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator';
function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }

  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }

  return null;
}

// Corresponds to ReactFiberWakeable and ReactFizzWakeable modules. Generally,
// changes to one module should be reflected in the others.
// TODO: Rename this module and the corresponding Fiber one to "Thenable"
// instead of "Wakeable". Or some other more appropriate name.
// An error that is thrown (e.g. by `use`) to trigger Suspense. If we
// detect this is caught by userspace, we'll log a warning in development.
var SuspenseException = new Error("Suspense Exception: This is not a real error! It's an implementation " + 'detail of `use` to interrupt the current render. You must either ' + 'rethrow it immediately, or move the `use` call outside of the ' + '`try/catch` block. Capturing without rethrowing will lead to ' + 'unexpected behavior.\n\n' + 'To handle async errors, wrap your component in an error boundary, or ' + "call the promise's `.catch` method and pass the result to `use`");
function createThenableState() {
  // The ThenableState is created the first time a component suspends. If it
  // suspends again, we'll reuse the same state.
  return [];
}

function noop() {}

function trackUsedThenable(thenableState, thenable, index) {
  var previous = thenableState[index];

  if (previous === undefined) {
    thenableState.push(thenable);
  } else {
    if (previous !== thenable) {
      // Reuse the previous thenable, and drop the new one. We can assume
      // they represent the same value, because components are idempotent.
      // Avoid an unhandled rejection errors for the Promises that we'll
      // intentionally ignore.
      thenable.then(noop, noop);
      thenable = previous;
    }
  } // We use an expando to track the status and result of a thenable so that we
  // can synchronously unwrap the value. Think of this as an extension of the
  // Promise API, or a custom interface that is a superset of Thenable.
  //
  // If the thenable doesn't have a status, set it to "pending" and attach
  // a listener that will update its status and result when it resolves.


  switch (thenable.status) {
    case 'fulfilled':
      {
        var fulfilledValue = thenable.value;
        return fulfilledValue;
      }

    case 'rejected':
      {
        var rejectedError = thenable.reason;
        throw rejectedError;
      }

    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          // Attach a dummy listener, to ensure that any lazy initialization can
          // happen. Flight lazily parses JSON when the value is actually awaited.
          thenable.then(noop, noop);
        } else {
          var pendingThenable = thenable;
          pendingThenable.status = 'pending';
          pendingThenable.then(function (fulfilledValue) {
            if (thenable.status === 'pending') {
              var fulfilledThenable = thenable;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          }, function (error) {
            if (thenable.status === 'pending') {
              var rejectedThenable = thenable;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          });
        } // Check one more time in case the thenable resolved synchronously


        switch (thenable.status) {
          case 'fulfilled':
            {
              var fulfilledThenable = thenable;
              return fulfilledThenable.value;
            }

          case 'rejected':
            {
              var rejectedThenable = thenable;
              throw rejectedThenable.reason;
            }
        } // Suspend.
        //
        // Throwing here is an implementation detail that allows us to unwind the
        // call stack. But we shouldn't allow it to leak into userspace. Throw an
        // opaque placeholder value instead of the actual thenable. If it doesn't
        // get captured by the work loop, log a warning, because that means
        // something in userspace must have caught it.


        suspendedThenable = thenable;
        throw SuspenseException;
      }
  }
} // This is used to track the actual thenable that suspended so it can be
// passed to the rest of the Suspense implementation — which, for historical
// reasons, expects to receive a thenable.

var suspendedThenable = null;
function getSuspendedThenable() {
  // This is called right after `use` suspends by throwing an exception. `use`
  // throws an opaque value instead of the thenable itself so that it can't be
  // caught in userspace. Then the work loop accesses the actual thenable using
  // this function.
  if (suspendedThenable === null) {
    throw new Error('Expected a suspended thenable. This is a bug in React. Please file ' + 'an issue.');
  }

  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}

var currentRequest$1 = null;
var thenableIndexCounter = 0;
var thenableState = null;
var currentComponentDebugInfo = null;
function prepareToUseHooksForRequest(request) {
  currentRequest$1 = request;
}
function resetHooksForRequest() {
  currentRequest$1 = null;
}
function prepareToUseHooksForComponent(prevThenableState, componentDebugInfo) {
  thenableIndexCounter = 0;
  thenableState = prevThenableState;

  {
    currentComponentDebugInfo = componentDebugInfo;
  }
}
function getThenableStateAfterSuspending() {
  // If you use() to Suspend this should always exist but if you throw a Promise instead,
  // which is not really supported anymore, it will be empty. We use the empty set as a
  // marker to know if this was a replay of the same component or first attempt.
  var state = thenableState || createThenableState();

  {
    // This is a hack but we stash the debug info here so that we don't need a completely
    // different data structure just for this in DEV. Not too happy about it.
    state._componentDebugInfo = currentComponentDebugInfo;
    currentComponentDebugInfo = null;
  }

  thenableState = null;
  return state;
}
var HooksDispatcher = {
  useMemo: function (nextCreate) {
    return nextCreate();
  },
  useCallback: function (callback) {
    return callback;
  },
  useDebugValue: function () {},
  useDeferredValue: unsupportedHook,
  useTransition: unsupportedHook,
  readContext: unsupportedContext,
  useContext: unsupportedContext,
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useInsertionEffect: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useEffect: unsupportedHook,
  useId: useId,
  useSyncExternalStore: unsupportedHook,
  useCacheRefresh: function () {
    return unsupportedRefresh;
  },
  useMemoCache: function (size) {
    var data = new Array(size);

    for (var i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }

    return data;
  },
  use: use
};

function unsupportedHook() {
  throw new Error('This Hook is not supported in Server Components.');
}

function unsupportedRefresh() {
  throw new Error('Refreshing the cache is not supported in Server Components.');
}

function unsupportedContext() {
  throw new Error('Cannot read a Client Context from a Server Component.');
}

function useId() {
  if (currentRequest$1 === null) {
    throw new Error('useId can only be used while React is rendering');
  }

  var id = currentRequest$1.identifierCount++; // use 'S' for Flight components to distinguish from 'R' and 'r' in Fizz/Client

  return ':' + currentRequest$1.identifierPrefix + 'S' + id.toString(32) + ':';
}

function use(usable) {
  if (usable !== null && typeof usable === 'object' || typeof usable === 'function') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      var thenable = usable; // Track the position of the thenable within this fiber.

      var index = thenableIndexCounter;
      thenableIndexCounter += 1;

      if (thenableState === null) {
        thenableState = createThenableState();
      }

      return trackUsedThenable(thenableState, thenable, index);
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      unsupportedContext();
    }
  }

  if (isClientReference(usable)) {
    if (usable.value != null && usable.value.$$typeof === REACT_CONTEXT_TYPE) {
      // Show a more specific message since it's a common mistake.
      throw new Error('Cannot read a Client Context from a Server Component.');
    } else {
      throw new Error('Cannot use() an already resolved Client Reference.');
    }
  } else {
    throw new Error( // eslint-disable-next-line react-internal/safe-string-coercion
    'An unsupported type was passed to use(): ' + String(usable));
  }
}

function resolveCache() {
  var request = resolveRequest();

  if (request) {
    return getCache(request);
  }

  return new Map();
}

var DefaultAsyncDispatcher = {
  getCacheForType: function (resourceType) {
    var cache = resolveCache();
    var entry = cache.get(resourceType);

    if (entry === undefined) {
      entry = resourceType(); // TODO: Warn if undefined?

      cache.set(resourceType, entry);
    }

    return entry;
  }
};
var currentOwner = null;

{
  DefaultAsyncDispatcher.getOwner = function () {
    return currentOwner;
  };
}

function setCurrentOwner(componentInfo) {
  currentOwner = componentInfo;
}

var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare

function isArray(a) {
  return isArrayImpl(a);
}

var getPrototypeOf = Object.getPrototypeOf;

// in case they error.

var jsxPropsParents = new WeakMap();
var jsxChildrenParents = new WeakMap();

function isObjectPrototype(object) {
  if (!object) {
    return false;
  }

  var ObjectPrototype = Object.prototype;

  if (object === ObjectPrototype) {
    return true;
  } // It might be an object from a different Realm which is
  // still just a plain simple object.


  if (getPrototypeOf(object)) {
    return false;
  }

  var names = Object.getOwnPropertyNames(object);

  for (var i = 0; i < names.length; i++) {
    if (!(names[i] in ObjectPrototype)) {
      return false;
    }
  }

  return true;
}

function isSimpleObject(object) {
  if (!isObjectPrototype(getPrototypeOf(object))) {
    return false;
  }

  var names = Object.getOwnPropertyNames(object);

  for (var i = 0; i < names.length; i++) {
    var descriptor = Object.getOwnPropertyDescriptor(object, names[i]);

    if (!descriptor) {
      return false;
    }

    if (!descriptor.enumerable) {
      if ((names[i] === 'key' || names[i] === 'ref') && typeof descriptor.get === 'function') {
        // React adds key and ref getters to props objects to issue warnings.
        // Those getters will not be transferred to the client, but that's ok,
        // so we'll special case them.
        continue;
      }

      return false;
    }
  }

  return true;
}
function objectName(object) {
  // $FlowFixMe[method-unbinding]
  var name = Object.prototype.toString.call(object);
  return name.replace(/^\[object (.*)\]$/, function (m, p0) {
    return p0;
  });
}

function describeKeyForErrorMessage(key) {
  var encodedKey = JSON.stringify(key);
  return '"' + key + '"' === encodedKey ? key : encodedKey;
}

function describeValueForErrorMessage(value) {
  switch (typeof value) {
    case 'string':
      {
        return JSON.stringify(value.length <= 10 ? value : value.slice(0, 10) + '...');
      }

    case 'object':
      {
        if (isArray(value)) {
          return '[...]';
        }

        if (value !== null && value.$$typeof === CLIENT_REFERENCE_TAG) {
          return describeClientReference();
        }

        var name = objectName(value);

        if (name === 'Object') {
          return '{...}';
        }

        return name;
      }

    case 'function':
      {
        if (value.$$typeof === CLIENT_REFERENCE_TAG) {
          return describeClientReference();
        }

        var _name = value.displayName || value.name;

        return _name ? 'function ' + _name : 'function';
      }

    default:
      // eslint-disable-next-line react-internal/safe-string-coercion
      return String(value);
  }
}

function describeElementType(type) {
  if (typeof type === 'string') {
    return type;
  }

  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return 'Suspense';

    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList';
  }

  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeElementType(type.render);

      case REACT_MEMO_TYPE:
        return describeElementType(type.type);

      case REACT_LAZY_TYPE:
        {
          var lazyComponent = type;
          var payload = lazyComponent._payload;
          var init = lazyComponent._init;

          try {
            // Lazy may contain any component type so we recursively resolve it.
            return describeElementType(init(payload));
          } catch (x) {}
        }
    }
  }

  return '';
}

var CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');

function describeClientReference(ref) {
  return 'client';
}

function describeObjectForErrorMessage(objectOrArray, expandedName) {
  var objKind = objectName(objectOrArray);

  if (objKind !== 'Object' && objKind !== 'Array') {
    return objKind;
  }

  var str = '';
  var start = -1;
  var length = 0;

  if (isArray(objectOrArray)) {
    if (jsxChildrenParents.has(objectOrArray)) {
      // Print JSX Children
      var type = jsxChildrenParents.get(objectOrArray);
      str = '<' + describeElementType(type) + '>';
      var array = objectOrArray;

      for (var i = 0; i < array.length; i++) {
        var value = array[i];
        var substr = void 0;

        if (typeof value === 'string') {
          substr = value;
        } else if (typeof value === 'object' && value !== null) {
          substr = '{' + describeObjectForErrorMessage(value) + '}';
        } else {
          substr = '{' + describeValueForErrorMessage(value) + '}';
        }

        if ('' + i === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 15 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '{...}';
        }
      }

      str += '</' + describeElementType(type) + '>';
    } else {
      // Print Array
      str = '[';
      var _array = objectOrArray;

      for (var _i = 0; _i < _array.length; _i++) {
        if (_i > 0) {
          str += ', ';
        }

        var _value = _array[_i];

        var _substr = void 0;

        if (typeof _value === 'object' && _value !== null) {
          _substr = describeObjectForErrorMessage(_value);
        } else {
          _substr = describeValueForErrorMessage(_value);
        }

        if ('' + _i === expandedName) {
          start = str.length;
          length = _substr.length;
          str += _substr;
        } else if (_substr.length < 10 && str.length + _substr.length < 40) {
          str += _substr;
        } else {
          str += '...';
        }
      }

      str += ']';
    }
  } else {
    if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE) {
      str = '<' + describeElementType(objectOrArray.type) + '/>';
    } else if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) {
      return describeClientReference();
    } else if (jsxPropsParents.has(objectOrArray)) {
      // Print JSX
      var _type = jsxPropsParents.get(objectOrArray);

      str = '<' + (describeElementType(_type) || '...');
      var object = objectOrArray;
      var names = Object.keys(object);

      for (var _i2 = 0; _i2 < names.length; _i2++) {
        str += ' ';
        var name = names[_i2];
        str += describeKeyForErrorMessage(name) + '=';
        var _value2 = object[name];

        var _substr2 = void 0;

        if (name === expandedName && typeof _value2 === 'object' && _value2 !== null) {
          _substr2 = describeObjectForErrorMessage(_value2);
        } else {
          _substr2 = describeValueForErrorMessage(_value2);
        }

        if (typeof _value2 !== 'string') {
          _substr2 = '{' + _substr2 + '}';
        }

        if (name === expandedName) {
          start = str.length;
          length = _substr2.length;
          str += _substr2;
        } else if (_substr2.length < 10 && str.length + _substr2.length < 40) {
          str += _substr2;
        } else {
          str += '...';
        }
      }

      str += '>';
    } else {
      // Print Object
      str = '{';
      var _object = objectOrArray;

      var _names = Object.keys(_object);

      for (var _i3 = 0; _i3 < _names.length; _i3++) {
        if (_i3 > 0) {
          str += ', ';
        }

        var _name2 = _names[_i3];
        str += describeKeyForErrorMessage(_name2) + ': ';
        var _value3 = _object[_name2];

        var _substr3 = void 0;

        if (typeof _value3 === 'object' && _value3 !== null) {
          _substr3 = describeObjectForErrorMessage(_value3);
        } else {
          _substr3 = describeValueForErrorMessage(_value3);
        }

        if (_name2 === expandedName) {
          start = str.length;
          length = _substr3.length;
          str += _substr3;
        } else if (_substr3.length < 10 && str.length + _substr3.length < 40) {
          str += _substr3;
        } else {
          str += '...';
        }
      }

      str += '}';
    }
  }

  if (expandedName === undefined) {
    return str;
  }

  if (start > -1 && length > 0) {
    var highlight = ' '.repeat(start) + '^'.repeat(length);
    return '\n  ' + str + '\n  ' + highlight;
  }

  return '\n  ' + str;
}

var ReactSharedInternals = ReactSharedInternalsServer;

var ObjectPrototype = Object.prototype;
var stringify = JSON.stringify; // Serializable values
// Thenable<ReactClientValue>
// task status

var PENDING$1 = 0;
var COMPLETED = 1;
var ABORTED = 3;
var ERRORED$1 = 4; // object reference status

var SEEN_BUT_NOT_YET_OUTLINED = -1;
var NEVER_OUTLINED = -2;

function defaultErrorHandler(error) {
  console['error'](error); // Don't transform to our wrapper
}

function defaultPostponeHandler(reason) {// Noop
}

var OPEN = 0;
var CLOSING = 1;
var CLOSED = 2;
function createRequest(model, bundlerConfig, onError, identifierPrefix, onPostpone, environmentName) {
  if (ReactSharedInternals.A !== null && ReactSharedInternals.A !== DefaultAsyncDispatcher) {
    throw new Error('Currently React only supports one RSC renderer at a time.');
  }

  ReactSharedInternals.A = DefaultAsyncDispatcher;
  var abortSet = new Set();
  var pingedTasks = [];
  var cleanupQueue = [];

  var hints = createHints();
  var request = {
    status: OPEN,
    flushScheduled: false,
    fatalError: null,
    destination: null,
    bundlerConfig: bundlerConfig,
    cache: new Map(),
    nextChunkId: 0,
    pendingChunks: 0,
    hints: hints,
    abortListeners: new Set(),
    abortableTasks: abortSet,
    pingedTasks: pingedTasks,
    completedImportChunks: [],
    completedHintChunks: [],
    completedRegularChunks: [],
    completedErrorChunks: [],
    writtenSymbols: new Map(),
    writtenClientReferences: new Map(),
    writtenServerReferences: new Map(),
    writtenObjects: new WeakMap(),
    identifierPrefix: identifierPrefix || '',
    identifierCount: 1,
    taintCleanupQueue: cleanupQueue,
    onError: onError === undefined ? defaultErrorHandler : onError,
    onPostpone: onPostpone === undefined ? defaultPostponeHandler : onPostpone
  };

  {
    request.environmentName = environmentName === undefined ? 'Server' : environmentName;
  }

  var rootTask = createTask(request, model, null, false, abortSet);
  pingedTasks.push(rootTask);
  return request;
}
var currentRequest = null;
function resolveRequest() {
  if (currentRequest) return currentRequest;

  {
    var store = requestStorage.getStore();
    if (store) return store;
  }

  return null;
}

function serializeThenable(request, task, thenable) {
  var newTask = createTask(request, null, task.keyPath, // the server component sequence continues through Promise-as-a-child.
  task.implicitSlot, request.abortableTasks);

  {
    // If this came from Flight, forward any debug info into this new row.
    var debugInfo = thenable._debugInfo;

    if (debugInfo) {
      forwardDebugInfo(request, newTask.id, debugInfo);
    }
  }

  switch (thenable.status) {
    case 'fulfilled':
      {
        // We have the resolved value, we can go ahead and schedule it for serialization.
        newTask.model = thenable.value;
        pingTask(request, newTask);
        return newTask.id;
      }

    case 'rejected':
      {
        var x = thenable.reason;

        {
          var digest = logRecoverableError(request, x);
          emitErrorChunk(request, newTask.id, digest, x);
        }

        return newTask.id;
      }

    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          break;
        }

        var pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(function (fulfilledValue) {
          if (thenable.status === 'pending') {
            var fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, function (error) {
          if (thenable.status === 'pending') {
            var rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }

  thenable.then(function (value) {
    newTask.model = value;
    pingTask(request, newTask);
  }, function (reason) {
    {
      newTask.status = ERRORED$1;

      var _digest = logRecoverableError(request, reason);

      emitErrorChunk(request, newTask.id, _digest, reason);
    }

    request.abortableTasks.delete(newTask);
    enqueueFlush(request);
  });
  return newTask.id;
}

function emitHint(request, code, model) {
  emitHintChunk(request, code, model);
  enqueueFlush(request);
}
function getHints(request) {
  return request.hints;
}
function getCache(request) {
  return request.cache;
}

function readThenable(thenable) {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  } else if (thenable.status === 'rejected') {
    throw thenable.reason;
  }

  throw thenable;
}

function createLazyWrapperAroundWakeable(wakeable) {
  // This is a temporary fork of the `use` implementation until we accept
  // promises everywhere.
  var thenable = wakeable;

  switch (thenable.status) {
    case 'fulfilled':
    case 'rejected':
      break;

    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          break;
        }

        var pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(function (fulfilledValue) {
          if (thenable.status === 'pending') {
            var fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, function (error) {
          if (thenable.status === 'pending') {
            var rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }

  var lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: thenable,
    _init: readThenable
  };

  {
    // If this came from React, transfer the debug info.
    lazyType._debugInfo = thenable._debugInfo || [];
  }

  return lazyType;
}

function renderFunctionComponent(request, task, key, Component, props, owner) {
  // Reset the task's thenable state before continuing, so that if a later
  // component suspends we can reuse the same task object. If the same
  // component suspends again, the thenable state will be restored.
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  var componentDebugInfo = null;

  {
    if (debugID === null) {
      // We don't have a chunk to assign debug info. We need to outline this
      // component to assign it an ID.
      return outlineTask(request, task);
    } else if (prevThenableState !== null) {
      // This is a replay and we've already emitted the debug info of this component
      // in the first pass. We skip emitting a duplicate line.
      // As a hack we stashed the previous component debug info on this object in DEV.
      componentDebugInfo = prevThenableState._componentDebugInfo;
    } else {
      // This is a new component in the same task so we can emit more debug info.
      var componentName = Component.displayName || Component.name || '';
      request.pendingChunks++;
      var componentDebugID = debugID;
      componentDebugInfo = {
        name: componentName,
        env: request.environmentName,
        owner: owner
      }; // We outline this model eagerly so that we can refer to by reference as an owner.
      // If we had a smarter way to dedupe we might not have to do this if there ends up
      // being no references to this as an owner.

      outlineModel(request, componentDebugInfo);
      emitDebugChunk(request, componentDebugID, componentDebugInfo);
    }
  }

  prepareToUseHooksForComponent(prevThenableState, componentDebugInfo); // The secondArg is always undefined in Server Components since refs error early.

  var secondArg = undefined;
  var result;

  {
    setCurrentOwner(componentDebugInfo);

    try {
      result = Component(props, secondArg);
    } finally {
      setCurrentOwner(null);
    }
  }

  if (typeof result === 'object' && result !== null) {
    if (typeof result.then === 'function') {
      // When the return value is in children position we can resolve it immediately,
      // to its value without a wrapper if it's synchronously available.
      var thenable = result;

      if (thenable.status === 'fulfilled') {
        return thenable.value;
      } // TODO: Once we accept Promises as children on the client, we can just return
      // the thenable here.


      result = createLazyWrapperAroundWakeable(result);
    } // Normally we'd serialize an Iterator/AsyncIterator as a single-shot which is not compatible
    // to be rendered as a React Child. However, because we have the function to recreate
    // an iterable from rendering the element again, we can effectively treat it as multi-
    // shot. Therefore we treat this as an Iterable/AsyncIterable, whether it was one or not, by
    // adding a wrapper so that this component effectively renders down to an AsyncIterable.


    var iteratorFn = getIteratorFn(result);

    if (iteratorFn) {
      var iterableChild = result;
      result = _defineProperty({}, Symbol.iterator, function () {
        var iterator = iteratorFn.call(iterableChild);

        {
          // If this was an Iterator but not a GeneratorFunction we warn because
          // it might have been a mistake. Technically you can make this mistake with
          // GeneratorFunctions and even single-shot Iterables too but it's extra
          // tempting to try to return the value from a generator.
          if (iterator === iterableChild) {
            var isGeneratorComponent = // $FlowIgnore[method-unbinding]
            Object.prototype.toString.call(Component) === '[object GeneratorFunction]' && // $FlowIgnore[method-unbinding]
            Object.prototype.toString.call(iterableChild) === '[object Generator]';

            if (!isGeneratorComponent) {
              error('Returning an Iterator from a Server Component is not supported ' + 'since it cannot be looped over more than once. ');
            }
          }
        }

        return iterator;
      });

      {
        result._debugInfo = iterableChild._debugInfo;
      }
    }
  } // Track this element's key on the Server Component on the keyPath context..


  var prevKeyPath = task.keyPath;
  var prevImplicitSlot = task.implicitSlot;

  if (key !== null) {
    // Append the key to the path. Technically a null key should really add the child
    // index. We don't do that to hold the payload small and implementation simple.
    task.keyPath = prevKeyPath === null ? key : prevKeyPath + ',' + key;
  } else if (prevKeyPath === null) {
    // This sequence of Server Components has no keys. This means that it was rendered
    // in a slot that needs to assign an implicit key. Even if children below have
    // explicit keys, they should not be used for the outer most key since it might
    // collide with other slots in that set.
    task.implicitSlot = true;
  }

  var json = renderModelDestructive(request, task, emptyRoot, '', result);
  task.keyPath = prevKeyPath;
  task.implicitSlot = prevImplicitSlot;
  return json;
}

function renderFragment(request, task, children) {
  if (task.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    var fragment = [REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, task.keyPath, {
      children: children
    }];

    if (!task.implicitSlot) {
      // If this was keyed inside a set. I.e. the outer Server Component was keyed
      // then we need to handle reorders of the whole set. To do this we need to wrap
      // this array in a keyed Fragment.
      return fragment;
    } // If the outer Server Component was implicit but then an inner one had a key
    // we don't actually need to be able to move the whole set around. It'll always be
    // in an implicit slot. The key only exists to be able to reset the state of the
    // children. We could achieve the same effect by passing on the keyPath to the next
    // set of components inside the fragment. This would also allow a keyless fragment
    // reconcile against a single child.
    // Unfortunately because of JSON.stringify, we can't call the recursive loop for
    // each child within this context because we can't return a set with already resolved
    // values. E.g. a string would get double encoded. Returning would pop the context.
    // So instead, we wrap it with an unkeyed fragment and inner keyed fragment.


    return [fragment];
  } // Since we're yielding here, that implicitly resets the keyPath context on the
  // way up. Which is what we want since we've consumed it. If this changes to
  // be recursive serialization, we need to reset the keyPath and implicitSlot,
  // before recursing here.


  {
    var debugInfo = children._debugInfo;

    if (debugInfo) {
      // If this came from Flight, forward any debug info into this new row.
      if (debugID === null) {
        // We don't have a chunk to assign debug info. We need to outline this
        // component to assign it an ID.
        return outlineTask(request, task);
      } else {
        // Forward any debug info we have the first time we see it.
        // We do this after init so that we have received all the debug info
        // from the server by the time we emit it.
        forwardDebugInfo(request, debugID, debugInfo);
      } // Since we're rendering this array again, create a copy that doesn't
      // have the debug info so we avoid outlining or emitting debug info again.


      children = Array.from(children);
    }
  }

  return children;
}

function renderClientElement(task, type, key, props, owner) // DEV-only
{
  // the keys of any Server Components which are not serialized.


  var keyPath = task.keyPath;

  if (key === null) {
    key = keyPath;
  } else if (keyPath !== null) {
    key = keyPath + ',' + key;
  }

  var element = [REACT_ELEMENT_TYPE, type, key, props, owner] ;

  if (task.implicitSlot && key !== null) {
    // The root Server Component had no key so it was in an implicit slot.
    // If we had a key lower, it would end up in that slot with an explicit key.
    // We wrap the element in a fragment to give it an implicit key slot with
    // an inner explicit key.
    return [element];
  } // Since we're yielding here, that implicitly resets the keyPath context on the
  // way up. Which is what we want since we've consumed it. If this changes to
  // be recursive serialization, we need to reset the keyPath and implicitSlot,
  // before recursing here. We also need to reset it once we render into an array
  // or anything else too which we also get implicitly.


  return element;
} // The chunk ID we're currently rendering that we can assign debug data to.


var debugID = null;

function outlineTask(request, task) {
  var newTask = createTask(request, task.model, // the currently rendering element
  task.keyPath, // unlike outlineModel this one carries along context
  task.implicitSlot, request.abortableTasks);
  retryTask(request, newTask);

  if (newTask.status === COMPLETED) {
    // We completed synchronously so we can refer to this by reference. This
    // makes it behaves the same as prod during deserialization.
    return serializeByValueID(newTask.id);
  } // This didn't complete synchronously so it wouldn't have even if we didn't
  // outline it, so this would reduce to a lazy reference even in prod.


  return serializeLazyID(newTask.id);
}

function renderElement(request, task, type, key, ref, props, owner) // DEV only
{
  if (ref !== null && ref !== undefined) {
    // When the ref moves to the regular props object this will implicitly
    // throw for functions. We could probably relax it to a DEV warning for other
    // cases.
    // TODO: `ref` is now just a prop when `enableRefAsProp` is on. Should we
    // do what the above comment says?
    throw new Error('Refs cannot be used in Server Components, nor passed to Client Components.');
  }

  {
    jsxPropsParents.set(props, type);

    if (typeof props.children === 'object' && props.children !== null) {
      jsxChildrenParents.set(props.children, type);
    }
  }

  if (typeof type === 'function') {
    if (isClientReference(type) || isTemporaryReference(type)) {
      // This is a reference to a Client Component.
      return renderClientElement(task, type, key, props, owner);
    } // This is a Server Component.


    return renderFunctionComponent(request, task, key, type, props, owner);
  } else if (typeof type === 'string') {
    // This is a host element. E.g. HTML.
    return renderClientElement(task, type, key, props, owner);
  } else if (typeof type === 'symbol') {
    if (type === REACT_FRAGMENT_TYPE && key === null) {
      // For key-less fragments, we add a small optimization to avoid serializing
      // it as a wrapper.
      var prevImplicitSlot = task.implicitSlot;

      if (task.keyPath === null) {
        task.implicitSlot = true;
      }

      var json = renderModelDestructive(request, task, emptyRoot, '', props.children);
      task.implicitSlot = prevImplicitSlot;
      return json;
    } // This might be a built-in React component. We'll let the client decide.
    // Any built-in works as long as its props are serializable.


    return renderClientElement(task, type, key, props, owner);
  } else if (type != null && typeof type === 'object') {
    if (isClientReference(type)) {
      // This is a reference to a Client Component.
      return renderClientElement(task, type, key, props, owner);
    }

    switch (type.$$typeof) {
      case REACT_LAZY_TYPE:
        {
          var payload = type._payload;
          var init = type._init;
          var wrappedType = init(payload);
          return renderElement(request, task, wrappedType, key, ref, props, owner);
        }

      case REACT_FORWARD_REF_TYPE:
        {
          return renderFunctionComponent(request, task, key, type.render, props, owner);
        }

      case REACT_MEMO_TYPE:
        {
          return renderElement(request, task, type.type, key, ref, props, owner);
        }
    }
  }

  throw new Error("Unsupported Server Component type: " + describeValueForErrorMessage(type));
}

function pingTask(request, task) {
  var pingedTasks = request.pingedTasks;
  pingedTasks.push(task);

  if (pingedTasks.length === 1) {
    request.flushScheduled = request.destination !== null;
    scheduleWork(function () {
      return performWork(request);
    });
  }
}

function createTask(request, model, keyPath, implicitSlot, abortSet) {
  request.pendingChunks++;
  var id = request.nextChunkId++;

  if (typeof model === 'object' && model !== null) {
    // If we're about to write this into a new task we can assign it an ID early so that
    // any other references can refer to the value we're about to write.
    if ((keyPath !== null || implicitSlot)) ; else {
      request.writtenObjects.set(model, id);
    }
  }

  var task = {
    id: id,
    status: PENDING$1,
    model: model,
    keyPath: keyPath,
    implicitSlot: implicitSlot,
    ping: function () {
      return pingTask(request, task);
    },
    toJSON: function (parentPropertyName, value) {
      var parent = this; // Make sure that `parent[parentPropertyName]` wasn't JSONified before `value` was passed to us

      {
        // $FlowFixMe[incompatible-use]
        var originalValue = parent[parentPropertyName];

        if (typeof originalValue === 'object' && originalValue !== value && !(originalValue instanceof Date)) {
          if (objectName(originalValue) !== 'Object') {
            var jsxParentType = jsxChildrenParents.get(parent);

            if (typeof jsxParentType === 'string') {
              error('%s objects cannot be rendered as text children. Try formatting it using toString().%s', objectName(originalValue), describeObjectForErrorMessage(parent, parentPropertyName));
            } else {
              error('Only plain objects can be passed to Client Components from Server Components. ' + '%s objects are not supported.%s', objectName(originalValue), describeObjectForErrorMessage(parent, parentPropertyName));
            }
          } else {
            error('Only plain objects can be passed to Client Components from Server Components. ' + 'Objects with toJSON methods are not supported. Convert it manually ' + 'to a simple value before passing it to props.%s', describeObjectForErrorMessage(parent, parentPropertyName));
          }
        }
      }

      return renderModel(request, task, parent, parentPropertyName, value);
    },
    thenableState: null
  };
  abortSet.add(task);
  return task;
}

function serializeByValueID(id) {
  return '$' + id.toString(16);
}

function serializeLazyID(id) {
  return '$L' + id.toString(16);
}

function serializeInfinitePromise() {
  return '$@';
}

function serializePromiseID(id) {
  return '$@' + id.toString(16);
}

function serializeServerReferenceID(id) {
  return '$F' + id.toString(16);
}

function serializeTemporaryReferenceID(id) {
  return '$T' + id;
}

function serializeSymbolReference(name) {
  return '$S' + name;
}

function serializeNumber(number) {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}

function serializeUndefined() {
  return '$undefined';
}

function serializeDateFromDateJSON(dateJSON) {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + dateJSON;
}

function serializeBigInt(n) {
  return '$n' + n.toString(10);
}

function serializeRowHeader(tag, id) {
  return id.toString(16) + ':' + tag;
}

function encodeReferenceChunk(request, id, reference) {
  var json = stringify(reference);
  var row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

function serializeClientReference(request, parent, parentPropertyName, clientReference) {
  var clientReferenceKey = getClientReferenceKey(clientReference);
  var writtenClientReferences = request.writtenClientReferences;
  var existingId = writtenClientReferences.get(clientReferenceKey);

  if (existingId !== undefined) {
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(existingId);
    }

    return serializeByValueID(existingId);
  }

  try {
    var clientReferenceMetadata = resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    request.pendingChunks++;
    var importId = request.nextChunkId++;
    emitImportChunk(request, importId, clientReferenceMetadata);
    writtenClientReferences.set(clientReferenceKey, importId);

    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(importId);
    }

    return serializeByValueID(importId);
  } catch (x) {
    request.pendingChunks++;
    var errorId = request.nextChunkId++;
    var digest = logRecoverableError(request, x);
    emitErrorChunk(request, errorId, digest, x);
    return serializeByValueID(errorId);
  }
}

function outlineModel(request, value) {
  var newTask = createTask(request, value, null, // The way we use outlining is for reusing an object.
  false, // It makes no sense for that use case to be contextual.
  request.abortableTasks);
  retryTask(request, newTask);
  return newTask.id;
}

function serializeServerReference(request, serverReference) {
  var writtenServerReferences = request.writtenServerReferences;
  var existingId = writtenServerReferences.get(serverReference);

  if (existingId !== undefined) {
    return serializeServerReferenceID(existingId);
  }

  var bound = getServerReferenceBoundArguments(request.bundlerConfig, serverReference);
  var serverReferenceMetadata = {
    id: getServerReferenceId(request.bundlerConfig, serverReference),
    bound: bound ? Promise.resolve(bound) : null
  };
  var metadataId = outlineModel(request, serverReferenceMetadata);
  writtenServerReferences.set(serverReference, metadataId);
  return serializeServerReferenceID(metadataId);
}

function serializeTemporaryReference(request, temporaryReference) {
  var id = resolveTemporaryReferenceID(temporaryReference);
  return serializeTemporaryReferenceID(id);
}

function serializeLargeTextString(request, text) {
  request.pendingChunks++;
  var textId = request.nextChunkId++;
  emitTextChunk(request, textId, text);
  return serializeByValueID(textId);
}

function serializeMap(request, map) {
  var entries = Array.from(map);

  for (var i = 0; i < entries.length; i++) {
    var key = entries[i][0];

    if (typeof key === 'object' && key !== null) {
      var writtenObjects = request.writtenObjects;
      var existingId = writtenObjects.get(key);

      if (existingId === undefined) {
        writtenObjects.set(key, SEEN_BUT_NOT_YET_OUTLINED);
      }
    }
  }

  var id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}

function serializeFormData(request, formData) {
  var entries = Array.from(formData.entries());
  var id = outlineModel(request, entries);
  return '$K' + id.toString(16);
}

function serializeSet(request, set) {
  var entries = Array.from(set);

  for (var i = 0; i < entries.length; i++) {
    var key = entries[i];

    if (typeof key === 'object' && key !== null) {
      var writtenObjects = request.writtenObjects;
      var existingId = writtenObjects.get(key);

      if (existingId === undefined) {
        writtenObjects.set(key, SEEN_BUT_NOT_YET_OUTLINED);
      }
    }
  }

  var id = outlineModel(request, entries);
  return '$W' + id.toString(16);
}

function serializeIterator(request, iterator) {
  var id = outlineModel(request, Array.from(iterator));
  return '$i' + id.toString(16);
}

function escapeStringValue(value) {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

var modelRoot = false;

function renderModel(request, task, parent, key, value) {
  var prevKeyPath = task.keyPath;
  var prevImplicitSlot = task.implicitSlot;

  try {
    return renderModelDestructive(request, task, parent, key, value);
  } catch (thrownValue) {
    var x = thrownValue === SuspenseException ? // This is a special type of exception used for Suspense. For historical
    // reasons, the rest of the Suspense implementation expects the thrown
    // value to be a thenable, because before `use` existed that was the
    // (unstable) API for suspending. This implementation detail can change
    // later, once we deprecate the old API in favor of `use`.
    getSuspendedThenable() : thrownValue; // If the suspended/errored value was an element or lazy it can be reduced
    // to a lazy reference, so that it doesn't error the parent.

    var model = task.model;
    var wasReactNode = typeof model === 'object' && model !== null && (model.$$typeof === REACT_ELEMENT_TYPE || model.$$typeof === REACT_LAZY_TYPE);

    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended, we'll need to create a new task and resolve it later.
        var newTask = createTask(request, task.model, task.keyPath, task.implicitSlot, request.abortableTasks);
        var ping = newTask.ping;
        x.then(ping, ping);
        newTask.thenableState = getThenableStateAfterSuspending(); // Restore the context. We assume that this will be restored by the inner
        // functions in case nothing throws so we don't use "finally" here.

        task.keyPath = prevKeyPath;
        task.implicitSlot = prevImplicitSlot;

        if (wasReactNode) {
          return serializeLazyID(newTask.id);
        }

        return serializeByValueID(newTask.id);
      }
    } // Restore the context. We assume that this will be restored by the inner
    // functions in case nothing throws so we don't use "finally" here.


    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;

    if (wasReactNode) {
      // Something errored. We'll still send everything we have up until this point.
      // We'll replace this element with a lazy reference that throws on the client
      // once it gets rendered.
      request.pendingChunks++;
      var errorId = request.nextChunkId++;
      var digest = logRecoverableError(request, x);
      emitErrorChunk(request, errorId, digest, x);
      return serializeLazyID(errorId);
    } // Something errored but it was not in a React Node. There's no need to serialize
    // it by value because it'll just error the whole parent row anyway so we can
    // just stop any siblings and error the whole parent row.


    throw x;
  }
}

function renderModelDestructive(request, task, parent, parentPropertyName, value) {
  // Set the currently rendering model
  task.model = value; // Special Symbol, that's very common.

  if (value === REACT_ELEMENT_TYPE) {
    return '$';
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'object') {
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        {
          var _writtenObjects = request.writtenObjects;

          var _existingId = _writtenObjects.get(value);

          if (_existingId !== undefined) {
            if ((task.keyPath !== null || task.implicitSlot)) ; else if (modelRoot === value) {
              // This is the ID we're currently emitting so we need to write it
              // once but if we discover it again, we refer to it by id.
              modelRoot = null;
            } else if (_existingId === SEEN_BUT_NOT_YET_OUTLINED) {
              // TODO: If we throw here we can treat this as suspending which causes an outline
              // but that is able to reuse the same task if we're already in one but then that
              // will be a lazy future value rather than guaranteed to exist but maybe that's good.
              var newId = outlineModel(request, value);
              return serializeByValueID(newId);
            } else {
              // We've already emitted this as an outlined object, so we can refer to that by its
              // existing ID. TODO: We should use a lazy reference since, unlike plain objects,
              // elements might suspend so it might not have emitted yet even if we have the ID for
              // it. However, this creates an extra wrapper when it's not needed. We should really
              // detect whether this already was emitted and synchronously available. In that
              // case we can refer to it synchronously and only make it lazy otherwise.
              // We currently don't have a data structure that lets us see that though.
              return serializeByValueID(_existingId);
            }
          } else {
            // This is the first time we've seen this object. We may never see it again
            // so we'll inline it. Mark it as seen. If we see it again, we'll outline.
            _writtenObjects.set(value, SEEN_BUT_NOT_YET_OUTLINED); // The element's props are marked as "never outlined" so that they are inlined into
            // the same row as the element itself.


            _writtenObjects.set(value.props, NEVER_OUTLINED);
          }

          var element = value;

          {
            var debugInfo = value._debugInfo;

            if (debugInfo) {
              // If this came from Flight, forward any debug info into this new row.
              if (debugID === null) {
                // We don't have a chunk to assign debug info. We need to outline this
                // component to assign it an ID.
                return outlineTask(request, task);
              } else {
                // Forward any debug info we have the first time we see it.
                forwardDebugInfo(request, debugID, debugInfo);
              }
            }
          }

          var props = element.props;
          var ref;

          {
            // TODO: This is a temporary, intermediate step. Once the feature
            // flag is removed, we should get the ref off the props object right
            // before using it.
            var refProp = props.ref;
            ref = refProp !== undefined ? refProp : null;
          } // Attempt to render the Server Component.


          return renderElement(request, task, element.type, // $FlowFixMe[incompatible-call] the key of an element is null | string
          element.key, ref, props, element._owner );
        }

      case REACT_LAZY_TYPE:
        {
          // Reset the task's thenable state before continuing. If there was one, it was
          // from suspending the lazy before.
          task.thenableState = null;
          var lazy = value;
          var payload = lazy._payload;
          var init = lazy._init;
          var resolvedModel = init(payload);

          {
            var _debugInfo = lazy._debugInfo;

            if (_debugInfo) {
              // If this came from Flight, forward any debug info into this new row.
              if (debugID === null) {
                // We don't have a chunk to assign debug info. We need to outline this
                // component to assign it an ID.
                return outlineTask(request, task);
              } else {
                // Forward any debug info we have the first time we see it.
                // We do this after init so that we have received all the debug info
                // from the server by the time we emit it.
                forwardDebugInfo(request, debugID, _debugInfo);
              }
            }
          }

          return renderModelDestructive(request, task, emptyRoot, '', resolvedModel);
        }
    }

    if (isClientReference(value)) {
      return serializeClientReference(request, parent, parentPropertyName, value);
    }

    var writtenObjects = request.writtenObjects;
    var existingId = writtenObjects.get(value); // $FlowFixMe[method-unbinding]

    if (typeof value.then === 'function') {
      if (existingId !== undefined) {
        if ((task.keyPath !== null || task.implicitSlot)) {
          // If we're in some kind of context we can't reuse the result of this render or
          // previous renders of this element. We only reuse Promises if they're not wrapped
          // by another Server Component.
          var _promiseId = serializeThenable(request, task, value);

          return serializePromiseID(_promiseId);
        } else if (modelRoot === value) {
          // This is the ID we're currently emitting so we need to write it
          // once but if we discover it again, we refer to it by id.
          modelRoot = null;
        } else {
          // We've seen this promise before, so we can just refer to the same result.
          return serializePromiseID(existingId);
        }
      } // We assume that any object with a .then property is a "Thenable" type,
      // or a Promise type. Either of which can be represented by a Promise.


      var promiseId = serializeThenable(request, task, value);
      writtenObjects.set(value, promiseId);
      return serializePromiseID(promiseId);
    }

    if (existingId !== undefined) {
      if (modelRoot === value) {
        // This is the ID we're currently emitting so we need to write it
        // once but if we discover it again, we refer to it by id.
        modelRoot = null;
      } else if (existingId === SEEN_BUT_NOT_YET_OUTLINED) {
        var _newId = outlineModel(request, value);

        return serializeByValueID(_newId);
      } else if (existingId !== NEVER_OUTLINED) {
        // We've already emitted this as an outlined object, so we can
        // just refer to that by its existing ID.
        return serializeByValueID(existingId);
      }
    } else {
      // This is the first time we've seen this object. We may never see it again
      // so we'll inline it. Mark it as seen. If we see it again, we'll outline.
      writtenObjects.set(value, SEEN_BUT_NOT_YET_OUTLINED);
    }

    if (isArray(value)) {
      return renderFragment(request, task, value);
    }

    if (value instanceof Map) {
      return serializeMap(request, value);
    }

    if (value instanceof Set) {
      return serializeSet(request, value);
    } // TODO: FormData is not available in old Node. Remove the typeof later.


    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeFormData(request, value);
    }

    var iteratorFn = getIteratorFn(value);

    if (iteratorFn) {
      // TODO: Should we serialize the return value as well like we do for AsyncIterables?
      var iterator = iteratorFn.call(value);

      if (iterator === value) {
        // Iterator, not Iterable
        return serializeIterator(request, iterator);
      }

      return renderFragment(request, task, Array.from(iterator));
    }


    var proto = getPrototypeOf(value);

    if (proto !== ObjectPrototype && (proto === null || getPrototypeOf(proto) !== null)) {
      throw new Error('Only plain objects, and a few built-ins, can be passed to Client Components ' + 'from Server Components. Classes or null prototypes are not supported.');
    }

    {
      if (objectName(value) !== 'Object') {
        error('Only plain objects can be passed to Client Components from Server Components. ' + '%s objects are not supported.%s', objectName(value), describeObjectForErrorMessage(parent, parentPropertyName));
      } else if (!isSimpleObject(value)) {
        error('Only plain objects can be passed to Client Components from Server Components. ' + 'Classes or other objects with methods are not supported.%s', describeObjectForErrorMessage(parent, parentPropertyName));
      } else if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(value);

        if (symbols.length > 0) {
          error('Only plain objects can be passed to Client Components from Server Components. ' + 'Objects with symbol properties like %s are not supported.%s', symbols[0].description, describeObjectForErrorMessage(parent, parentPropertyName));
        }
      }
    } // $FlowFixMe[incompatible-return]


    return value;
  }

  if (typeof value === 'string') {


    if (value[value.length - 1] === 'Z') {
      // Possibly a Date, whose toJSON automatically calls toISOString
      // $FlowFixMe[incompatible-use]
      var originalValue = parent[parentPropertyName];

      if (originalValue instanceof Date) {
        return serializeDateFromDateJSON(value);
      }
    }

    if (value.length >= 1024) {
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeLargeTextString(request, value);
    }

    return escapeStringValue(value);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return serializeNumber(value);
  }

  if (typeof value === 'undefined') {
    return serializeUndefined();
  }

  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeClientReference(request, parent, parentPropertyName, value);
    }

    if (isServerReference(value)) {
      return serializeServerReference(request, value);
    }

    if (isTemporaryReference(value)) {
      return serializeTemporaryReference(request, value);
    }

    if (/^on[A-Z]/.test(parentPropertyName)) {
      throw new Error('Event handlers cannot be passed to Client Component props.' + describeObjectForErrorMessage(parent, parentPropertyName) + '\nIf you need interactivity, consider converting part of this to a Client Component.');
    } else if ((jsxChildrenParents.has(parent) || jsxPropsParents.has(parent) && parentPropertyName === 'children')) {
      var componentName = value.displayName || value.name || 'Component';
      throw new Error('Functions are not valid as a child of Client Components. This may happen if ' + 'you return ' + componentName + ' instead of <' + componentName + ' /> from render. ' + 'Or maybe you meant to call this function rather than return it.' + describeObjectForErrorMessage(parent, parentPropertyName));
    } else {
      throw new Error('Functions cannot be passed directly to Client Components ' + 'unless you explicitly expose it by marking it with "use server". ' + 'Or maybe you meant to call this function rather than return it.' + describeObjectForErrorMessage(parent, parentPropertyName));
    }
  }

  if (typeof value === 'symbol') {
    var writtenSymbols = request.writtenSymbols;

    var _existingId2 = writtenSymbols.get(value);

    if (_existingId2 !== undefined) {
      return serializeByValueID(_existingId2);
    } // $FlowFixMe[incompatible-type] `description` might be undefined


    var name = value.description;

    if (Symbol.for(name) !== value) {
      throw new Error('Only global symbols received from Symbol.for(...) can be passed to Client Components. ' + ("The symbol Symbol.for(" + // $FlowFixMe[incompatible-type] `description` might be undefined
      value.description + ") cannot be found among global symbols.") + describeObjectForErrorMessage(parent, parentPropertyName));
    }

    request.pendingChunks++;
    var symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    writtenSymbols.set(value, symbolId);
    return serializeByValueID(symbolId);
  }

  if (typeof value === 'bigint') {

    return serializeBigInt(value);
  }

  throw new Error("Type " + typeof value + " is not supported in Client Component props." + describeObjectForErrorMessage(parent, parentPropertyName));
}

function logPostpone(request, reason) {
  var prevRequest = currentRequest;
  currentRequest = null;

  try {
    var onPostpone = request.onPostpone;

    if (supportsRequestStorage) {
      // Exit the request context while running callbacks.
      requestStorage.run(undefined, onPostpone, reason);
    }
  } finally {
    currentRequest = prevRequest;
  }
}

function logRecoverableError(request, error) {
  var prevRequest = currentRequest;
  currentRequest = null;
  var errorDigest;

  try {
    var onError = request.onError;

    if (supportsRequestStorage) {
      // Exit the request context while running callbacks.
      errorDigest = requestStorage.run(undefined, onError, error);
    }
  } finally {
    currentRequest = prevRequest;
  }

  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error("onError returned something with a type other than \"string\". onError should return a string and may return null or undefined but must not return anything else. It received something of type \"" + typeof errorDigest + "\" instead");
  }

  return errorDigest || '';
}

function fatalError(request, error) {


  if (request.destination !== null) {
    request.status = CLOSED;
    closeWithError(request.destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
  }
}

function emitPostponeChunk(request, id, postponeInstance) {
  var row;

  {
    var reason = '';
    var stack = '';

    try {
      // eslint-disable-next-line react-internal/safe-string-coercion
      reason = String(postponeInstance.message); // eslint-disable-next-line react-internal/safe-string-coercion

      stack = String(postponeInstance.stack);
    } catch (x) {}

    row = serializeRowHeader('P', id) + stringify({
      reason: reason,
      stack: stack
    }) + '\n';
  }

  var processedChunk = stringToChunk(row);
  request.completedErrorChunks.push(processedChunk);
}

function emitErrorChunk(request, id, digest, error) {
  var errorInfo;

  {
    var message;
    var stack = '';

    try {
      if (error instanceof Error) {
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error.message); // eslint-disable-next-line react-internal/safe-string-coercion

        stack = String(error.stack);
      } else if (typeof error === 'object' && error !== null) {
        message = describeObjectForErrorMessage(error);
      } else {
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error);
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
    }

    errorInfo = {
      digest: digest,
      message: message,
      stack: stack
    };
  }

  var row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  var processedChunk = stringToChunk(row);
  request.completedErrorChunks.push(processedChunk);
}

function emitImportChunk(request, id, clientReferenceMetadata) {
  // $FlowFixMe[incompatible-type] stringify can return null
  var json = stringify(clientReferenceMetadata);
  var row = serializeRowHeader('I', id) + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedImportChunks.push(processedChunk);
}

function emitHintChunk(request, code, model) {
  var json = stringify(model);
  var id = request.nextChunkId++;
  var row = serializeRowHeader('H' + code, id) + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedHintChunks.push(processedChunk);
}

function emitSymbolChunk(request, id, name) {
  var symbolReference = serializeSymbolReference(name);
  var processedChunk = encodeReferenceChunk(request, id, symbolReference);
  request.completedImportChunks.push(processedChunk);
}

function emitModelChunk(request, id, json) {
  var row = id.toString(16) + ':' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}

function emitDebugChunk(request, id, debugInfo) {
  // use the full serialization that requires a task.


  var counter = {
    objectCount: 0
  };

  function replacer(parentPropertyName, value) {
    return renderConsoleValue(request, counter, this, parentPropertyName, value);
  } // $FlowFixMe[incompatible-type] stringify can return null


  var json = stringify(debugInfo, replacer);
  var row = serializeRowHeader('D', id) + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}

function emitTextChunk(request, id, text) {
  request.pendingChunks++; // Extra chunk for the header.

  var textChunk = stringToChunk(text);
  var binaryLength = byteLengthOfChunk(textChunk);
  var row = id.toString(16) + ':T' + binaryLength.toString(16) + ',';
  var headerChunk = stringToChunk(row);
  request.completedRegularChunks.push(headerChunk, textChunk);
}

function serializeEval(source) {

  return '$E' + source;
} // This is a forked version of renderModel which should never error, never suspend and is limited
// in the depth it can encode.


function renderConsoleValue(request, counter, parent, parentPropertyName, value) {
  // Make sure that `parent[parentPropertyName]` wasn't JSONified before `value` was passed to us
  // $FlowFixMe[incompatible-use]
  var originalValue = parent[parentPropertyName];

  if (value === null) {
    return null;
  }

  if (typeof value === 'object') {
    if (isClientReference(value)) {
      // We actually have this value on the client so we could import it.
      // This might be confusing though because on the Server it won't actually
      // be this value, so if you're debugging client references maybe you'd be
      // better with a place holder.
      return serializeClientReference(request, parent, parentPropertyName, value);
    }

    if (counter.objectCount > 20) {
      // We've reached our max number of objects to serialize across the wire so we serialize this
      // object but no properties inside of it, as a place holder.
      return Array.isArray(value) ? [] : {};
    }

    counter.objectCount++;
    var writtenObjects = request.writtenObjects;
    var existingId = writtenObjects.get(value); // $FlowFixMe[method-unbinding]

    if (typeof value.then === 'function') {
      if (existingId !== undefined) {
        // We've seen this promise before, so we can just refer to the same result.
        return serializePromiseID(existingId);
      }

      var thenable = value;

      switch (thenable.status) {
        case 'fulfilled':
          {
            return serializePromiseID(outlineConsoleValue(request, counter, thenable.value));
          }

        case 'rejected':
          {
            var x = thenable.reason;
            request.pendingChunks++;
            var errorId = request.nextChunkId++;

            {
              // We don't log these errors since they didn't actually throw into Flight.
              var digest = '';
              emitErrorChunk(request, errorId, digest, x);
            }

            return serializePromiseID(errorId);
          }
      } // If it hasn't already resolved (and been instrumented) we just encode an infinite
      // promise that will never resolve.


      return serializeInfinitePromise();
    }

    if (existingId !== undefined && existingId >= 0) {
      // We've already emitted this as a real object, so we can
      // just refer to that by its existing ID.
      return serializeByValueID(existingId);
    }

    if (isArray(value)) {
      return value;
    }

    if (value instanceof Map) {
      return serializeMap(request, value);
    }

    if (value instanceof Set) {
      return serializeSet(request, value);
    } // TODO: FormData is not available in old Node. Remove the typeof later.


    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeFormData(request, value);
    }

    var iteratorFn = getIteratorFn(value);

    if (iteratorFn) {
      return Array.from(value);
    } // $FlowFixMe[incompatible-return]


    return value;
  }

  if (typeof value === 'string') {
    if (value[value.length - 1] === 'Z') {
      // Possibly a Date, whose toJSON automatically calls toISOString
      if (originalValue instanceof Date) {
        return serializeDateFromDateJSON(value);
      }
    }

    if (value.length >= 1024) {
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeLargeTextString(request, value);
    }

    return escapeStringValue(value);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return serializeNumber(value);
  }

  if (typeof value === 'undefined') {
    return serializeUndefined();
  }

  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeClientReference(request, parent, parentPropertyName, value);
    }

    if (isTemporaryReference(value)) {
      return serializeTemporaryReference(request, value);
    } // Serialize the body of the function as an eval so it can be printed.
    // $FlowFixMe[method-unbinding]


    return serializeEval('(' + Function.prototype.toString.call(value) + ')');
  }

  if (typeof value === 'symbol') {
    var writtenSymbols = request.writtenSymbols;

    var _existingId3 = writtenSymbols.get(value);

    if (_existingId3 !== undefined) {
      return serializeByValueID(_existingId3);
    } // $FlowFixMe[incompatible-type] `description` might be undefined


    var name = value.description; // We use the Symbol.for version if it's not a global symbol. Close enough.

    request.pendingChunks++;
    var symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    return serializeByValueID(symbolId);
  }

  if (typeof value === 'bigint') {
    return serializeBigInt(value);
  }

  return 'unknown type ' + typeof value;
}

function outlineConsoleValue(request, counter, model) {

  function replacer(parentPropertyName, value) {
    try {
      return renderConsoleValue(request, counter, this, parentPropertyName, value);
    } catch (x) {
      return 'unknown value';
    }
  } // $FlowFixMe[incompatible-type] stringify can return null


  var json = stringify(model, replacer);
  request.pendingChunks++;
  var id = request.nextChunkId++;
  var row = id.toString(16) + ':' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
  return id;
}

function forwardDebugInfo(request, id, debugInfo) {
  for (var i = 0; i < debugInfo.length; i++) {
    request.pendingChunks++;
    emitDebugChunk(request, id, debugInfo[i]);
  }
}

function emitChunk(request, task, value) {
  var id = task.id; // For certain types we have special types, we typically outlined them but
  // we can emit them directly for this row instead of through an indirection.

  if (typeof value === 'string') {

    emitTextChunk(request, id, value);
    return;
  }
  // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do


  var json = stringify(value, task.toJSON);
  emitModelChunk(request, task.id, json);
}

var emptyRoot = {};

function retryTask(request, task) {
  if (task.status !== PENDING$1) {
    // We completed this by other means before we had a chance to retry it.
    return;
  }

  var prevDebugID = debugID;

  try {
    // Track the root so we know that we have to emit this object even though it
    // already has an ID. This is needed because we might see this object twice
    // in the same toJSON if it is cyclic.
    modelRoot = task.model;

    if (true) {
      // Track the ID of the current task so we can assign debug info to this id.
      debugID = task.id;
    } // We call the destructive form that mutates this task. That way if something
    // suspends again, we can reuse the same task instead of spawning a new one.


    var resolvedModel = renderModelDestructive(request, task, emptyRoot, '', task.model);

    if (true) {
      // We're now past rendering this task and future renders will spawn new tasks for their
      // debug info.
      debugID = null;
    } // Track the root again for the resolved object.


    modelRoot = resolvedModel; // The keyPath resets at any terminal child node.

    task.keyPath = null;
    task.implicitSlot = false;

    if (typeof resolvedModel === 'object' && resolvedModel !== null) {
      // Object might contain unresolved values like additional elements.
      // This is simulating what the JSON loop would do if this was part of it.
      emitChunk(request, task, resolvedModel);
    } else {
      // If the value is a string, it means it's a terminal value and we already escaped it
      // We don't need to escape it again so it's not passed the toJSON replacer.
      // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do
      var json = stringify(resolvedModel);
      emitModelChunk(request, task.id, json);
    }

    request.abortableTasks.delete(task);
    task.status = COMPLETED;
  } catch (thrownValue) {
    var x = thrownValue === SuspenseException ? // This is a special type of exception used for Suspense. For historical
    // reasons, the rest of the Suspense implementation expects the thrown
    // value to be a thenable, because before `use` existed that was the
    // (unstable) API for suspending. This implementation detail can change
    // later, once we deprecate the old API in favor of `use`.
    getSuspendedThenable() : thrownValue;

    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended again, let's pick it back up later.
        var ping = task.ping;
        x.then(ping, ping);
        task.thenableState = getThenableStateAfterSuspending();
        return;
      }
    }

    request.abortableTasks.delete(task);
    task.status = ERRORED$1;
    var digest = logRecoverableError(request, x);
    emitErrorChunk(request, task.id, digest, x);
  } finally {
    {
      debugID = prevDebugID;
    }
  }
}

function performWork(request) {
  var prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  var prevRequest = currentRequest;
  currentRequest = request;
  prepareToUseHooksForRequest(request);

  try {
    var pingedTasks = request.pingedTasks;
    request.pingedTasks = [];

    for (var i = 0; i < pingedTasks.length; i++) {
      var task = pingedTasks[i];
      retryTask(request, task);
    }

    if (request.destination !== null) {
      flushCompletedChunks(request, request.destination);
    }
  } catch (error) {
    logRecoverableError(request, error);
    fatalError(request, error);
  } finally {
    ReactSharedInternals.H = prevDispatcher;
    resetHooksForRequest();
    currentRequest = prevRequest;
  }
}

function abortTask(task, request, errorId) {
  task.status = ABORTED; // Instead of emitting an error per task.id, we emit a model that only
  // has a single value referencing the error.

  var ref = serializeByValueID(errorId);
  var processedChunk = encodeReferenceChunk(request, task.id, ref);
  request.completedErrorChunks.push(processedChunk);
}

function flushCompletedChunks(request, destination) {
  beginWriting();

  try {
    // We emit module chunks first in the stream so that
    // they can be preloaded as early as possible.
    var importsChunks = request.completedImportChunks;
    var i = 0;

    for (; i < importsChunks.length; i++) {
      request.pendingChunks--;
      var chunk = importsChunks[i];
      var keepWriting = writeChunkAndReturn(destination, chunk);

      if (!keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }

    importsChunks.splice(0, i); // Next comes hints.

    var hintChunks = request.completedHintChunks;
    i = 0;

    for (; i < hintChunks.length; i++) {
      var _chunk = hintChunks[i];

      var _keepWriting = writeChunkAndReturn(destination, _chunk);

      if (!_keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }

    hintChunks.splice(0, i); // Next comes model data.

    var regularChunks = request.completedRegularChunks;
    i = 0;

    for (; i < regularChunks.length; i++) {
      request.pendingChunks--;
      var _chunk2 = regularChunks[i];

      var _keepWriting2 = writeChunkAndReturn(destination, _chunk2);

      if (!_keepWriting2) {
        request.destination = null;
        i++;
        break;
      }
    }

    regularChunks.splice(0, i); // Finally, errors are sent. The idea is that it's ok to delay
    // any error messages and prioritize display of other parts of
    // the page.

    var errorChunks = request.completedErrorChunks;
    i = 0;

    for (; i < errorChunks.length; i++) {
      request.pendingChunks--;
      var _chunk3 = errorChunks[i];

      var _keepWriting3 = writeChunkAndReturn(destination, _chunk3);

      if (!_keepWriting3) {
        request.destination = null;
        i++;
        break;
      }
    }

    errorChunks.splice(0, i);
  } finally {
    request.flushScheduled = false;
    completeWriting(destination);
  }

  flushBuffered(destination);

  if (request.pendingChunks === 0) {

    close$1(destination);
    request.destination = null;
  }
}

function startWork(request) {
  request.flushScheduled = request.destination !== null;

  {
    scheduleWork(function () {
      return requestStorage.run(request, performWork, request);
    });
  }
}

function enqueueFlush(request) {
  if (request.flushScheduled === false && // If there are pinged tasks we are going to flush anyway after work completes
  request.pingedTasks.length === 0 && // If there is no destination there is nothing we can flush to. A flush will
  // happen when we start flowing again
  request.destination !== null) {
    var destination = request.destination;
    request.flushScheduled = true;
    scheduleWork(function () {
      return flushCompletedChunks(request, destination);
    });
  }
}

function startFlowing(request, destination) {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }

  if (request.status === CLOSED) {
    return;
  }

  if (request.destination !== null) {
    // We're already flowing.
    return;
  }

  request.destination = destination;

  try {
    flushCompletedChunks(request, destination);
  } catch (error) {
    logRecoverableError(request, error);
    fatalError(request, error);
  }
}
function stopFlowing(request) {
  request.destination = null;
} // This is called to early terminate a request. It creates an error at all pending tasks.

function abort(request, reason) {
  try {
    var abortableTasks = request.abortableTasks; // We have tasks to abort. We'll emit one error row and then emit a reference
    // to that row from every row that's still remaining.

    if (abortableTasks.size > 0) {
      request.pendingChunks++;
      var errorId = request.nextChunkId++;

      var postponeInstance; if (enablePostpone && typeof reason === 'object' && reason !== null && reason.$$typeof === REACT_POSTPONE_TYPE) ; else {
        var error = reason === undefined ? new Error('The render was aborted by the server without a reason.') : reason;
        var digest = logRecoverableError(request, error);
        emitErrorChunk(request, errorId, digest, error);
      }

      abortableTasks.forEach(function (task) {
        return abortTask(task, request, errorId);
      });
      abortableTasks.clear();
    }

    var abortListeners = request.abortListeners;

    if (abortListeners.size > 0) {
      var _error;

      if (enablePostpone && typeof reason === 'object' && reason !== null && reason.$$typeof === REACT_POSTPONE_TYPE) ; else {
        _error = reason === undefined ? new Error('The render was aborted by the server without a reason.') : reason;
      }

      abortListeners.forEach(function (callback) {
        return callback(_error);
      });
      abortListeners.clear();
    }

    if (request.destination !== null) {
      flushCompletedChunks(request, request.destination);
    }
  } catch (error) {
    logRecoverableError(request, error);
    fatalError(request, error);
  }
}

// Module root path
function resolveServerReference(config, id) {
  var baseURL = config;
  var idx = id.lastIndexOf('#');
  var exportName = id.slice(idx + 1);
  var fullURL = id.slice(0, idx);

  if (!fullURL.startsWith(baseURL)) {
    throw new Error('Attempted to load a Server Reference outside the hosted root.');
  }

  return {
    specifier: fullURL,
    name: exportName
  };
}
var asyncModuleCache = new Map();
function preloadModule(metadata) {
  var existingPromise = asyncModuleCache.get(metadata.specifier);

  if (existingPromise) {
    if (existingPromise.status === 'fulfilled') {
      return null;
    }

    return existingPromise;
  } else {
    // $FlowFixMe[unsupported-syntax]
    var modulePromise = import(metadata.specifier);
    modulePromise.then(function (value) {
      var fulfilledThenable = modulePromise;
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = value;
    }, function (reason) {
      var rejectedThenable = modulePromise;
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = reason;
    });
    asyncModuleCache.set(metadata.specifier, modulePromise);
    return modulePromise;
  }
}
function requireModule(metadata) {
  var moduleExports; // We assume that preloadModule has been called before, which
  // should have added something to the module cache.

  var promise = asyncModuleCache.get(metadata.specifier);

  if (promise.status === 'fulfilled') {
    moduleExports = promise.value;
  } else {
    throw promise.reason;
  }

  return moduleExports[metadata.name];
}

// The server acts as a Client of itself when resolving Server References.
var PENDING = 'pending';
var BLOCKED = 'blocked';
var RESOLVED_MODEL = 'resolved_model';
var INITIALIZED = 'fulfilled';
var ERRORED = 'rejected'; // $FlowFixMe[missing-this-annot]

function Chunk(status, value, reason, response) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  this._response = response;
} // We subclass Promise.prototype so that we get other methods like .catch


Chunk.prototype = Object.create(Promise.prototype); // TODO: This doesn't return a new Promise chain unlike the real .then

Chunk.prototype.then = function (resolve, reject) {
  var chunk = this; // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.

  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;
  } // The status might have changed after initialization.


  switch (chunk.status) {
    case INITIALIZED:
      resolve(chunk.value);
      break;

    case PENDING:
    case BLOCKED:
      if (resolve) {
        if (chunk.value === null) {
          chunk.value = [];
        }

        chunk.value.push(resolve);
      }

      if (reject) {
        if (chunk.reason === null) {
          chunk.reason = [];
        }

        chunk.reason.push(reject);
      }

      break;

    default:
      reject(chunk.reason);
      break;
  }
};

function getRoot(response) {
  var chunk = getChunk(response, 0);
  return chunk;
}

function createPendingChunk(response) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new Chunk(PENDING, null, null, response);
}

function wakeChunk(listeners, value) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    listener(value);
  }
}

function wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners) {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(resolveListeners, chunk.value);
      break;

    case PENDING:
    case BLOCKED:
      chunk.value = resolveListeners;
      chunk.reason = rejectListeners;
      break;

    case ERRORED:
      if (rejectListeners) {
        wakeChunk(rejectListeners, chunk.reason);
      }

      break;
  }
}

function triggerErrorOnChunk(chunk, error) {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // We already resolved. We didn't expect to see this.
    return;
  }

  var listeners = chunk.reason;
  var erroredChunk = chunk;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;

  if (listeners !== null) {
    wakeChunk(listeners, error);
  }
}

function createResolvedModelChunk(response, value) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new Chunk(RESOLVED_MODEL, value, null, response);
}

function resolveModelChunk(chunk, value) {
  if (chunk.status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }

  var resolveListeners = chunk.value;
  var rejectListeners = chunk.reason;
  var resolvedChunk = chunk;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = value;

  if (resolveListeners !== null) {
    // This is unfortunate that we're reading this eagerly if
    // we already have listeners attached since they might no
    // longer be rendered or might not be the highest pri.
    initializeModelChunk(resolvedChunk); // The status might have changed after initialization.

    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
  }
}

function bindArgs$1(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}

function loadServerReference$1(response, id, bound, parentChunk, parentObject, key) {
  var serverReference = resolveServerReference(response._bundlerConfig, id); // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.

  var preloadPromise = preloadModule(serverReference);
  var promise;

  if (bound) {
    promise = Promise.all([bound, preloadPromise]).then(function (_ref) {
      var args = _ref[0];
      return bindArgs$1(requireModule(serverReference), args);
    });
  } else {
    if (preloadPromise) {
      promise = Promise.resolve(preloadPromise).then(function () {
        return requireModule(serverReference);
      });
    } else {
      // Synchronously available
      return requireModule(serverReference);
    }
  }

  promise.then(createModelResolver(parentChunk, parentObject, key), createModelReject(parentChunk)); // We need a placeholder value that will be replaced later.

  return null;
}

var initializingChunk = null;
var initializingChunkBlockedModel = null;

function initializeModelChunk(chunk) {
  var prevChunk = initializingChunk;
  var prevBlocked = initializingChunkBlockedModel;
  initializingChunk = chunk;
  initializingChunkBlockedModel = null;

  try {
    var value = JSON.parse(chunk.value, chunk._response._fromJSON);

    if (initializingChunkBlockedModel !== null && initializingChunkBlockedModel.deps > 0) {
      initializingChunkBlockedModel.value = value; // We discovered new dependencies on modules that are not yet resolved.
      // We have to go the BLOCKED state until they're resolved.

      var blockedChunk = chunk;
      blockedChunk.status = BLOCKED;
      blockedChunk.value = null;
      blockedChunk.reason = null;
    } else {
      var initializedChunk = chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = value;
    }
  } catch (error) {
    var erroredChunk = chunk;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    initializingChunk = prevChunk;
    initializingChunkBlockedModel = prevBlocked;
  }
} // Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.


function reportGlobalError(response, error) {
  response._chunks.forEach(function (chunk) {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(chunk, error);
    }
  });
}

function getChunk(response, id) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    var prefix = response._prefix;
    var key = prefix + id; // Check if we have this field in the backing store already.

    var backingEntry = response._formData.get(key);

    if (backingEntry != null) {
      // We assume that this is a string entry for now.
      chunk = createResolvedModelChunk(response, backingEntry);
    } else {
      // We're still waiting on this entry to stream in.
      chunk = createPendingChunk(response);
    }

    chunks.set(id, chunk);
  }

  return chunk;
}

function createModelResolver(chunk, parentObject, key) {
  var blocked;

  if (initializingChunkBlockedModel) {
    blocked = initializingChunkBlockedModel;
    blocked.deps++;
  } else {
    blocked = initializingChunkBlockedModel = {
      deps: 1,
      value: null
    };
  }

  return function (value) {
    parentObject[key] = value;
    blocked.deps--;

    if (blocked.deps === 0) {
      if (chunk.status !== BLOCKED) {
        return;
      }

      var resolveListeners = chunk.value;
      var initializedChunk = chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = blocked.value;

      if (resolveListeners !== null) {
        wakeChunk(resolveListeners, blocked.value);
      }
    }
  };
}

function createModelReject(chunk) {
  return function (error) {
    return triggerErrorOnChunk(chunk, error);
  };
}

function getOutlinedModel(response, id) {
  var chunk = getChunk(response, id);

  if (chunk.status === RESOLVED_MODEL) {
    initializeModelChunk(chunk);
  }

  if (chunk.status !== INITIALIZED) {
    // We know that this is emitted earlier so otherwise it's an error.
    throw chunk.reason;
  }

  return chunk.value;
}

function parseModelString(response, obj, key, value) {
  if (value[0] === '$') {
    switch (value[1]) {
      case '$':
        {
          // This was an escaped string value.
          return value.slice(1);
        }

      case '@':
        {
          // Promise
          var _id = parseInt(value.slice(2), 16);

          var _chunk = getChunk(response, _id);

          return _chunk;
        }

      case 'F':
        {
          // Server Reference
          var _id2 = parseInt(value.slice(2), 16); // TODO: Just encode this in the reference inline instead of as a model.


          var metaData = getOutlinedModel(response, _id2);
          return loadServerReference$1(response, metaData.id, metaData.bound, initializingChunk, obj, key);
        }

      case 'T':
        {
          // Temporary Reference
          return createTemporaryReference(value.slice(2));
        }

      case 'Q':
        {
          // Map
          var _id3 = parseInt(value.slice(2), 16);

          var data = getOutlinedModel(response, _id3);
          return new Map(data);
        }

      case 'W':
        {
          // Set
          var _id4 = parseInt(value.slice(2), 16);

          var _data = getOutlinedModel(response, _id4);

          return new Set(_data);
        }

      case 'K':
        {
          // FormData
          var stringId = value.slice(2);
          var formPrefix = response._prefix + stringId + '_';

          var _data2 = new FormData();

          var backingFormData = response._formData; // We assume that the reference to FormData always comes after each
          // entry that it references so we can assume they all exist in the
          // backing store already.
          // $FlowFixMe[prop-missing] FormData has forEach on it.

          backingFormData.forEach(function (entry, entryKey) {
            if (entryKey.startsWith(formPrefix)) {
              _data2.append(entryKey.slice(formPrefix.length), entry);
            }
          });
          return _data2;
        }

      case 'i':
        {
          // Iterator
          var _id5 = parseInt(value.slice(2), 16);

          var _data3 = getOutlinedModel(response, _id5);

          return _data3[Symbol.iterator]();
        }

      case 'I':
        {
          // $Infinity
          return Infinity;
        }

      case '-':
        {
          // $-0 or $-Infinity
          if (value === '$-0') {
            return -0;
          } else {
            return -Infinity;
          }
        }

      case 'N':
        {
          // $NaN
          return NaN;
        }

      case 'u':
        {
          // matches "$undefined"
          // Special encoding for `undefined` which can't be serialized as JSON otherwise.
          return undefined;
        }

      case 'D':
        {
          // Date
          return new Date(Date.parse(value.slice(2)));
        }

      case 'n':
        {
          // BigInt
          return BigInt(value.slice(2));
        }
    }


    var id = parseInt(value.slice(1), 16);
    var chunk = getChunk(response, id);

    switch (chunk.status) {
      case RESOLVED_MODEL:
        initializeModelChunk(chunk);
        break;
    } // The status might have changed after initialization.


    switch (chunk.status) {
      case INITIALIZED:
        return chunk.value;

      case PENDING:
      case BLOCKED:
        var parentChunk = initializingChunk;
        chunk.then(createModelResolver(parentChunk, obj, key), createModelReject(parentChunk));
        return null;

      default:
        throw chunk.reason;
    }
  }

  return value;
}

function createResponse(bundlerConfig, formFieldPrefix) {
  var backingFormData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new FormData();
  var chunks = new Map();
  var response = {
    _bundlerConfig: bundlerConfig,
    _prefix: formFieldPrefix,
    _formData: backingFormData,
    _chunks: chunks,
    _fromJSON: function (key, value) {
      if (typeof value === 'string') {
        // We can't use .bind here because we need the "this" value.
        return parseModelString(response, this, key, value);
      }

      return value;
    }
  };
  return response;
}
function resolveField(response, key, value) {
  // Add this field to the backing store.
  response._formData.append(key, value);

  var prefix = response._prefix;

  if (key.startsWith(prefix)) {
    var chunks = response._chunks;
    var id = +key.slice(prefix.length);
    var chunk = chunks.get(id);

    if (chunk) {
      // We were waiting on this key so now we can resolve it.
      resolveModelChunk(chunk, value);
    }
  }
}
function resolveFileInfo(response, key, filename, mime) {
  return {
    chunks: [],
    filename: filename,
    mime: mime
  };
}
function resolveFileChunk(response, handle, chunk) {
  handle.chunks.push(chunk);
}
function resolveFileComplete(response, key, handle) {
  // Add this file to the backing store.
  // Node.js doesn't expose a global File constructor so we need to use
  // the append() form that takes the file name as the third argument,
  // to create a File object.
  var blob = new Blob(handle.chunks, {
    type: handle.mime
  });

  response._formData.append(key, blob, handle.filename);
}
function close(response) {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}

function bindArgs(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}

function loadServerReference(bundlerConfig, id, bound) {
  var serverReference = resolveServerReference(bundlerConfig, id); // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.

  var preloadPromise = preloadModule(serverReference);

  if (bound) {
    return Promise.all([bound, preloadPromise]).then(function (_ref) {
      var args = _ref[0];
      return bindArgs(requireModule(serverReference), args);
    });
  } else if (preloadPromise) {
    return Promise.resolve(preloadPromise).then(function () {
      return requireModule(serverReference);
    });
  } else {
    // Synchronously available
    return Promise.resolve(requireModule(serverReference));
  }
}

function decodeBoundActionMetaData(body, serverManifest, formFieldPrefix) {
  // The data for this reference is encoded in multiple fields under this prefix.
  var actionResponse = createResponse(serverManifest, formFieldPrefix, body);
  close(actionResponse);
  var refPromise = getRoot(actionResponse); // Force it to initialize
  // $FlowFixMe

  refPromise.then(function () {});

  if (refPromise.status !== 'fulfilled') {
    // $FlowFixMe
    throw refPromise.reason;
  }

  return refPromise.value;
}

function decodeAction(body, serverManifest) {
  // We're going to create a new formData object that holds all the fields except
  // the implementation details of the action data.
  var formData = new FormData();
  var action = null; // $FlowFixMe[prop-missing]

  body.forEach(function (value, key) {
    if (!key.startsWith('$ACTION_')) {
      formData.append(key, value);
      return;
    } // Later actions may override earlier actions if a button is used to override the default
    // form action.


    if (key.startsWith('$ACTION_REF_')) {
      var formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      var metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
      action = loadServerReference(serverManifest, metaData.id, metaData.bound);
      return;
    }

    if (key.startsWith('$ACTION_ID_')) {
      var id = key.slice(11);
      action = loadServerReference(serverManifest, id, null);
      return;
    }
  });

  if (action === null) {
    return null;
  } // Return the action with the remaining FormData bound to the first argument.


  return action.then(function (fn) {
    return fn.bind(null, formData);
  });
}
function decodeFormState(actionResult, body, serverManifest) {
  var keyPath = body.get('$ACTION_KEY');

  if (typeof keyPath !== 'string') {
    // This form submission did not include any form state.
    return Promise.resolve(null);
  } // Search through the form data object to get the reference id and the number
  // of bound arguments. This repeats some of the work done in decodeAction.


  var metaData = null; // $FlowFixMe[prop-missing]

  body.forEach(function (value, key) {
    if (key.startsWith('$ACTION_REF_')) {
      var formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
    } // We don't check for the simple $ACTION_ID_ case because form state actions
    // are always bound to the state argument.

  });

  if (metaData === null) {
    // Should be unreachable.
    return Promise.resolve(null);
  }

  var referenceId = metaData.id;
  return Promise.resolve(metaData.bound).then(function (bound) {
    if (bound === null) {
      // Should be unreachable because form state actions are always bound to the
      // state argument.
      return null;
    } // The form action dispatch method is always bound to the initial state.
    // But when comparing signatures, we compare to the original unbound action.
    // Subtract one from the arity to account for this.


    var boundArity = bound.length - 1;
    return [actionResult, keyPath, referenceId, boundArity];
  });
}

function createDrainHandler(destination, request) {
  return function () {
    return startFlowing(request, destination);
  };
}

function renderToPipeableStream(model, moduleBasePath, options) {
  var request = createRequest(model, moduleBasePath, options ? options.onError : undefined, options ? options.identifierPrefix : undefined, options ? options.onPostpone : undefined, options ? options.environmentName : undefined);
  var hasStartedFlowing = false;
  startWork(request);
  return {
    pipe: function (destination) {
      if (hasStartedFlowing) {
        throw new Error('React currently only supports piping to one writable stream.');
      }

      hasStartedFlowing = true;
      startFlowing(request, destination);
      destination.on('drain', createDrainHandler(destination, request));
      return destination;
    },
    abort: function (reason) {
      stopFlowing(request);
      abort(request, reason);
    }
  };
}

function decodeReplyFromBusboy(busboyStream, moduleBasePath) {
  var response = createResponse(moduleBasePath, '');
  var pendingFiles = 0;
  var queuedFields = [];
  busboyStream.on('field', function (name, value) {
    if (pendingFiles > 0) {
      // Because the 'end' event fires two microtasks after the next 'field'
      // we would resolve files and fields out of order. To handle this properly
      // we queue any fields we receive until the previous file is done.
      queuedFields.push(name, value);
    } else {
      resolveField(response, name, value);
    }
  });
  busboyStream.on('file', function (name, value, _ref) {
    var filename = _ref.filename,
        encoding = _ref.encoding,
        mimeType = _ref.mimeType;

    if (encoding.toLowerCase() === 'base64') {
      throw new Error("React doesn't accept base64 encoded file uploads because we don't expect " + "form data passed from a browser to ever encode data that way. If that's " + 'the wrong assumption, we can easily fix it.');
    }

    pendingFiles++;
    var file = resolveFileInfo(response, name, filename, mimeType);
    value.on('data', function (chunk) {
      resolveFileChunk(response, file, chunk);
    });
    value.on('end', function () {
      resolveFileComplete(response, name, file);
      pendingFiles--;

      if (pendingFiles === 0) {
        // Release any queued fields
        for (var i = 0; i < queuedFields.length; i += 2) {
          resolveField(response, queuedFields[i], queuedFields[i + 1]);
        }

        queuedFields.length = 0;
      }
    });
  });
  busboyStream.on('finish', function () {
    close(response);
  });
  busboyStream.on('error', function (err) {
    reportGlobalError(response, // $FlowFixMe[incompatible-call] types Error and mixed are incompatible
    err);
  });
  return getRoot(response);
}

function decodeReply(body, moduleBasePath) {
  if (typeof body === 'string') {
    var form = new FormData();
    form.append('0', body);
    body = form;
  }

  var response = createResponse(moduleBasePath, '', body);
  var root = getRoot(response);
  close(response);
  return root;
}

exports.decodeAction = decodeAction;
exports.decodeFormState = decodeFormState;
exports.decodeReply = decodeReply;
exports.decodeReplyFromBusboy = decodeReplyFromBusboy;
exports.registerClientReference = registerClientReference;
exports.registerServerReference = registerServerReference;
exports.renderToPipeableStream = renderToPipeableStream;
  })();
}
