/**
 * @license React
 * react-server-dom-esm-server.node.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";
var util = require("util");
require("crypto");
var async_hooks = require("async_hooks"),
  ReactDOM = require("react-dom"),
  React = require("react"),
  currentView = null,
  writtenBytes = 0,
  destinationHasCapacity = !0;
function writeToDestination(destination, view) {
  destination = destination.write(view);
  destinationHasCapacity = destinationHasCapacity && destination;
}
function writeChunkAndReturn(destination, chunk) {
  if ("string" === typeof chunk) {
    if (0 !== chunk.length)
      if (2048 < 3 * chunk.length)
        0 < writtenBytes &&
          (writeToDestination(
            destination,
            currentView.subarray(0, writtenBytes)
          ),
          (currentView = new Uint8Array(2048)),
          (writtenBytes = 0)),
          writeToDestination(destination, textEncoder.encode(chunk));
      else {
        var target = currentView;
        0 < writtenBytes && (target = currentView.subarray(writtenBytes));
        target = textEncoder.encodeInto(chunk, target);
        var read = target.read;
        writtenBytes += target.written;
        read < chunk.length &&
          (writeToDestination(
            destination,
            currentView.subarray(0, writtenBytes)
          ),
          (currentView = new Uint8Array(2048)),
          (writtenBytes = textEncoder.encodeInto(
            chunk.slice(read),
            currentView
          ).written));
        2048 === writtenBytes &&
          (writeToDestination(destination, currentView),
          (currentView = new Uint8Array(2048)),
          (writtenBytes = 0));
      }
  } else
    0 !== chunk.byteLength &&
      (2048 < chunk.byteLength
        ? (0 < writtenBytes &&
            (writeToDestination(
              destination,
              currentView.subarray(0, writtenBytes)
            ),
            (currentView = new Uint8Array(2048)),
            (writtenBytes = 0)),
          writeToDestination(destination, chunk))
        : ((target = currentView.length - writtenBytes),
          target < chunk.byteLength &&
            (0 === target
              ? writeToDestination(destination, currentView)
              : (currentView.set(chunk.subarray(0, target), writtenBytes),
                (writtenBytes += target),
                writeToDestination(destination, currentView),
                (chunk = chunk.subarray(target))),
            (currentView = new Uint8Array(2048)),
            (writtenBytes = 0)),
          currentView.set(chunk, writtenBytes),
          (writtenBytes += chunk.byteLength),
          2048 === writtenBytes &&
            (writeToDestination(destination, currentView),
            (currentView = new Uint8Array(2048)),
            (writtenBytes = 0))));
  return destinationHasCapacity;
}
var textEncoder = new util.TextEncoder(),
  CLIENT_REFERENCE_TAG$1 = Symbol.for("react.client.reference"),
  SERVER_REFERENCE_TAG = Symbol.for("react.server.reference"),
  FunctionBind = Function.prototype.bind,
  ArraySlice = Array.prototype.slice;
function bind() {
  var newFn = FunctionBind.apply(this, arguments);
  if (this.$$typeof === SERVER_REFERENCE_TAG) {
    var args = ArraySlice.call(arguments, 1);
    return Object.defineProperties(newFn, {
      $$typeof: { value: SERVER_REFERENCE_TAG },
      $$id: { value: this.$$id },
      $$bound: { value: this.$$bound ? this.$$bound.concat(args) : args },
      bind: { value: bind }
    });
  }
  return newFn;
}
var ReactDOMSharedInternals =
    ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  previousDispatcher = ReactDOMSharedInternals.d;
ReactDOMSharedInternals.d = {
  f: previousDispatcher.f,
  r: previousDispatcher.r,
  D: prefetchDNS,
  C: preconnect,
  L: preload,
  m: preloadModule$1,
  X: preinitScript,
  S: preinitStyle,
  M: preinitModuleScript
};
function prefetchDNS(href) {
  if ("string" === typeof href && href) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "D|" + href;
      hints.has(key) || (hints.add(key), emitHint(request, "D", href));
    } else previousDispatcher.D(href);
  }
}
function preconnect(href, crossOrigin) {
  if ("string" === typeof href) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "C|" + (null == crossOrigin ? "null" : crossOrigin) + "|" + href;
      hints.has(key) ||
        (hints.add(key),
        "string" === typeof crossOrigin
          ? emitHint(request, "C", [href, crossOrigin])
          : emitHint(request, "C", href));
    } else previousDispatcher.C(href, crossOrigin);
  }
}
function preload(href, as, options) {
  if ("string" === typeof href) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "L";
      if ("image" === as && options) {
        var imageSrcSet = options.imageSrcSet,
          imageSizes = options.imageSizes,
          uniquePart = "";
        "string" === typeof imageSrcSet && "" !== imageSrcSet
          ? ((uniquePart += "[" + imageSrcSet + "]"),
            "string" === typeof imageSizes &&
              (uniquePart += "[" + imageSizes + "]"))
          : (uniquePart += "[][]" + href);
        key += "[image]" + uniquePart;
      } else key += "[" + as + "]" + href;
      hints.has(key) ||
        (hints.add(key),
        (options = trimOptions(options))
          ? emitHint(request, "L", [href, as, options])
          : emitHint(request, "L", [href, as]));
    } else previousDispatcher.L(href, as, options);
  }
}
function preloadModule$1(href, options) {
  if ("string" === typeof href) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "m|" + href;
      if (hints.has(key)) return;
      hints.add(key);
      return (options = trimOptions(options))
        ? emitHint(request, "m", [href, options])
        : emitHint(request, "m", href);
    }
    previousDispatcher.m(href, options);
  }
}
function preinitStyle(href, precedence, options) {
  if ("string" === typeof href) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "S|" + href;
      if (hints.has(key)) return;
      hints.add(key);
      return (options = trimOptions(options))
        ? emitHint(request, "S", [
            href,
            "string" === typeof precedence ? precedence : 0,
            options
          ])
        : "string" === typeof precedence
        ? emitHint(request, "S", [href, precedence])
        : emitHint(request, "S", href);
    }
    previousDispatcher.S(href, precedence, options);
  }
}
function preinitScript(src, options) {
  if ("string" === typeof src) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "X|" + src;
      if (hints.has(key)) return;
      hints.add(key);
      return (options = trimOptions(options))
        ? emitHint(request, "X", [src, options])
        : emitHint(request, "X", src);
    }
    previousDispatcher.X(src, options);
  }
}
function preinitModuleScript(src, options) {
  if ("string" === typeof src) {
    var request = resolveRequest();
    if (request) {
      var hints = request.hints,
        key = "M|" + src;
      if (hints.has(key)) return;
      hints.add(key);
      return (options = trimOptions(options))
        ? emitHint(request, "M", [src, options])
        : emitHint(request, "M", src);
    }
    previousDispatcher.M(src, options);
  }
}
function trimOptions(options) {
  if (null == options) return null;
  var hasProperties = !1,
    trimmed = {},
    key;
  for (key in options)
    null != options[key] &&
      ((hasProperties = !0), (trimmed[key] = options[key]));
  return hasProperties ? trimmed : null;
}
var requestStorage = new async_hooks.AsyncLocalStorage(),
  TEMPORARY_REFERENCE_TAG = Symbol.for("react.temporary.reference"),
  proxyHandlers = {
    get: function (target, name) {
      switch (name) {
        case "$$typeof":
          return target.$$typeof;
        case "$$id":
          return target.$$id;
        case "$$async":
          return target.$$async;
        case "name":
          return;
        case "displayName":
          return;
        case "defaultProps":
          return;
        case "toJSON":
          return;
        case Symbol.toPrimitive:
          return Object.prototype[Symbol.toPrimitive];
        case Symbol.toStringTag:
          return Object.prototype[Symbol.toStringTag];
        case "Provider":
          throw Error(
            "Cannot render a Client Context Provider on the Server. Instead, you can export a Client Component wrapper that itself renders a Client Context Provider."
          );
      }
      throw Error(
        "Cannot access " +
          String(name) +
          " on the server. You cannot dot into a temporary client reference from a server component. You can only pass the value through to the client."
      );
    },
    set: function () {
      throw Error(
        "Cannot assign to a temporary client reference from a server module."
      );
    }
  };
function createTemporaryReference(id) {
  id = Object.defineProperties(
    function () {
      throw Error(
        "Attempted to call a temporary Client Reference from the server but it is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."
      );
    },
    { $$typeof: { value: TEMPORARY_REFERENCE_TAG }, $$id: { value: id } }
  );
  return new Proxy(id, proxyHandlers);
}
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
Symbol.for("react.postpone");
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var SuspenseException = Error(
  "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`"
);
function noop() {}
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      "string" === typeof thenable.status
        ? thenable.then(noop, noop)
        : ((thenableState = thenable),
          (thenableState.status = "pending"),
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable)
    throw Error(
      "Expected a suspended thenable. This is a bug in React. Please file an issue."
    );
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
var currentRequest$1 = null,
  thenableIndexCounter = 0,
  thenableState = null;
function getThenableStateAfterSuspending() {
  var state = thenableState || [];
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
    for (var data = Array(size), i = 0; i < size; i++)
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    return data;
  },
  use: use
};
function unsupportedHook() {
  throw Error("This Hook is not supported in Server Components.");
}
function unsupportedRefresh() {
  throw Error("Refreshing the cache is not supported in Server Components.");
}
function unsupportedContext() {
  throw Error("Cannot read a Client Context from a Server Component.");
}
function useId() {
  if (null === currentRequest$1)
    throw Error("useId can only be used while React is rendering");
  var id = currentRequest$1.identifierCount++;
  return ":" + currentRequest$1.identifierPrefix + "S" + id.toString(32) + ":";
}
function use(usable) {
  if (
    (null !== usable && "object" === typeof usable) ||
    "function" === typeof usable
  ) {
    if ("function" === typeof usable.then) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      null === thenableState && (thenableState = []);
      return trackUsedThenable(thenableState, usable, index);
    }
    usable.$$typeof === REACT_CONTEXT_TYPE && unsupportedContext();
  }
  if (usable.$$typeof === CLIENT_REFERENCE_TAG$1) {
    if (null != usable.value && usable.value.$$typeof === REACT_CONTEXT_TYPE)
      throw Error("Cannot read a Client Context from a Server Component.");
    throw Error("Cannot use() an already resolved Client Reference.");
  }
  throw Error("An unsupported type was passed to use(): " + String(usable));
}
var DefaultAsyncDispatcher = {
    getCacheForType: function (resourceType) {
      var JSCompiler_inline_result = (JSCompiler_inline_result =
        resolveRequest())
        ? JSCompiler_inline_result.cache
        : new Map();
      var entry = JSCompiler_inline_result.get(resourceType);
      void 0 === entry &&
        ((entry = resourceType()),
        JSCompiler_inline_result.set(resourceType, entry));
      return entry;
    }
  },
  isArrayImpl = Array.isArray,
  getPrototypeOf = Object.getPrototypeOf;
function objectName(object) {
  return Object.prototype.toString
    .call(object)
    .replace(/^\[object (.*)\]$/, function (m, p0) {
      return p0;
    });
}
function describeValueForErrorMessage(value) {
  switch (typeof value) {
    case "string":
      return JSON.stringify(
        10 >= value.length ? value : value.slice(0, 10) + "..."
      );
    case "object":
      if (isArrayImpl(value)) return "[...]";
      if (null !== value && value.$$typeof === CLIENT_REFERENCE_TAG)
        return "client";
      value = objectName(value);
      return "Object" === value ? "{...}" : value;
    case "function":
      return value.$$typeof === CLIENT_REFERENCE_TAG
        ? "client"
        : (value = value.displayName || value.name)
        ? "function " + value
        : "function";
    default:
      return String(value);
  }
}
function describeElementType(type) {
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeElementType(type.render);
      case REACT_MEMO_TYPE:
        return describeElementType(type.type);
      case REACT_LAZY_TYPE:
        var payload = type._payload;
        type = type._init;
        try {
          return describeElementType(type(payload));
        } catch (x) {}
    }
  return "";
}
var CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference");
function describeObjectForErrorMessage(objectOrArray, expandedName) {
  var objKind = objectName(objectOrArray);
  if ("Object" !== objKind && "Array" !== objKind) return objKind;
  objKind = -1;
  var length = 0;
  if (isArrayImpl(objectOrArray)) {
    var str = "[";
    for (var i = 0; i < objectOrArray.length; i++) {
      0 < i && (str += ", ");
      var value = objectOrArray[i];
      value =
        "object" === typeof value && null !== value
          ? describeObjectForErrorMessage(value)
          : describeValueForErrorMessage(value);
      "" + i === expandedName
        ? ((objKind = str.length), (length = value.length), (str += value))
        : (str =
            10 > value.length && 40 > str.length + value.length
              ? str + value
              : str + "...");
    }
    str += "]";
  } else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
    str = "<" + describeElementType(objectOrArray.type) + "/>";
  else {
    if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) return "client";
    str = "{";
    i = Object.keys(objectOrArray);
    for (value = 0; value < i.length; value++) {
      0 < value && (str += ", ");
      var name = i[value],
        encodedKey = JSON.stringify(name);
      str += ('"' + name + '"' === encodedKey ? name : encodedKey) + ": ";
      encodedKey = objectOrArray[name];
      encodedKey =
        "object" === typeof encodedKey && null !== encodedKey
          ? describeObjectForErrorMessage(encodedKey)
          : describeValueForErrorMessage(encodedKey);
      name === expandedName
        ? ((objKind = str.length),
          (length = encodedKey.length),
          (str += encodedKey))
        : (str =
            10 > encodedKey.length && 40 > str.length + encodedKey.length
              ? str + encodedKey
              : str + "...");
    }
    str += "}";
  }
  return void 0 === expandedName
    ? str
    : -1 < objKind && 0 < length
    ? ((objectOrArray = " ".repeat(objKind) + "^".repeat(length)),
      "\n  " + str + "\n  " + objectOrArray)
    : "\n  " + str;
}
var ReactSharedInternalsServer =
  React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (!ReactSharedInternalsServer)
  throw Error(
    'The "react" package in this environment is not configured correctly. The "react-server" condition must be enabled in any environment that runs React Server Components.'
  );
var ObjectPrototype = Object.prototype,
  stringify = JSON.stringify;
function defaultErrorHandler(error) {
  console.error(error);
}
function defaultPostponeHandler() {}
function createRequest(
  model,
  bundlerConfig,
  onError,
  identifierPrefix,
  onPostpone
) {
  if (
    null !== ReactSharedInternalsServer.A &&
    ReactSharedInternalsServer.A !== DefaultAsyncDispatcher
  )
    throw Error("Currently React only supports one RSC renderer at a time.");
  ReactSharedInternalsServer.A = DefaultAsyncDispatcher;
  var abortSet = new Set(),
    pingedTasks = [],
    hints = new Set();
  bundlerConfig = {
    status: 0,
    flushScheduled: !1,
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
    identifierPrefix: identifierPrefix || "",
    identifierCount: 1,
    taintCleanupQueue: [],
    onError: void 0 === onError ? defaultErrorHandler : onError,
    onPostpone: void 0 === onPostpone ? defaultPostponeHandler : onPostpone
  };
  model = createTask(bundlerConfig, model, null, !1, abortSet);
  pingedTasks.push(model);
  return bundlerConfig;
}
var currentRequest = null;
function resolveRequest() {
  if (currentRequest) return currentRequest;
  var store = requestStorage.getStore();
  return store ? store : null;
}
function serializeThenable(request, task, thenable) {
  var newTask = createTask(
    request,
    null,
    task.keyPath,
    task.implicitSlot,
    request.abortableTasks
  );
  switch (thenable.status) {
    case "fulfilled":
      return (
        (newTask.model = thenable.value), pingTask(request, newTask), newTask.id
      );
    case "rejected":
      return (
        (task = logRecoverableError(request, thenable.reason)),
        emitErrorChunk(request, newTask.id, task),
        newTask.id
      );
    default:
      "string" !== typeof thenable.status &&
        ((thenable.status = "pending"),
        thenable.then(
          function (fulfilledValue) {
            "pending" === thenable.status &&
              ((thenable.status = "fulfilled"),
              (thenable.value = fulfilledValue));
          },
          function (error) {
            "pending" === thenable.status &&
              ((thenable.status = "rejected"), (thenable.reason = error));
          }
        ));
  }
  thenable.then(
    function (value) {
      newTask.model = value;
      pingTask(request, newTask);
    },
    function (reason) {
      newTask.status = 4;
      reason = logRecoverableError(request, reason);
      emitErrorChunk(request, newTask.id, reason);
      request.abortableTasks.delete(newTask);
      enqueueFlush(request);
    }
  );
  return newTask.id;
}
function emitHint(request, code, model) {
  model = stringify(model);
  var id = request.nextChunkId++;
  code = "H" + code;
  code = id.toString(16) + ":" + code;
  request.completedHintChunks.push(code + model + "\n");
  enqueueFlush(request);
}
function readThenable(thenable) {
  if ("fulfilled" === thenable.status) return thenable.value;
  if ("rejected" === thenable.status) throw thenable.reason;
  throw thenable;
}
function createLazyWrapperAroundWakeable(wakeable) {
  switch (wakeable.status) {
    case "fulfilled":
    case "rejected":
      break;
    default:
      "string" !== typeof wakeable.status &&
        ((wakeable.status = "pending"),
        wakeable.then(
          function (fulfilledValue) {
            "pending" === wakeable.status &&
              ((wakeable.status = "fulfilled"),
              (wakeable.value = fulfilledValue));
          },
          function (error) {
            "pending" === wakeable.status &&
              ((wakeable.status = "rejected"), (wakeable.reason = error));
          }
        ));
  }
  return { $$typeof: REACT_LAZY_TYPE, _payload: wakeable, _init: readThenable };
}
function renderFunctionComponent(request, task, key, Component, props) {
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  Component = Component(props, void 0);
  if ("object" === typeof Component && null !== Component) {
    if ("function" === typeof Component.then) {
      props = Component;
      if ("fulfilled" === props.status) return props.value;
      Component = createLazyWrapperAroundWakeable(Component);
    }
    var iteratorFn = getIteratorFn(Component);
    if (iteratorFn) {
      var iterableChild = Component;
      Component = {};
      Component =
        ((Component[Symbol.iterator] = function () {
          return iteratorFn.call(iterableChild);
        }),
        Component);
    }
  }
  props = task.keyPath;
  prevThenableState = task.implicitSlot;
  null !== key
    ? (task.keyPath = null === props ? key : props + "," + key)
    : null === props && (task.implicitSlot = !0);
  request = renderModelDestructive(request, task, emptyRoot, "", Component);
  task.keyPath = props;
  task.implicitSlot = prevThenableState;
  return request;
}
function renderFragment(request, task, children) {
  return null !== task.keyPath
    ? ((request = [
        REACT_ELEMENT_TYPE,
        REACT_FRAGMENT_TYPE,
        task.keyPath,
        { children: children }
      ]),
      task.implicitSlot ? [request] : request)
    : children;
}
function renderClientElement(task, type, key, props) {
  var keyPath = task.keyPath;
  null === key
    ? (key = keyPath)
    : null !== keyPath && (key = keyPath + "," + key);
  type = [REACT_ELEMENT_TYPE, type, key, props];
  return task.implicitSlot && null !== key ? [type] : type;
}
function renderElement(request, task, type, key, ref, props) {
  if (null !== ref && void 0 !== ref)
    throw Error(
      "Refs cannot be used in Server Components, nor passed to Client Components."
    );
  if ("function" === typeof type)
    return type.$$typeof === CLIENT_REFERENCE_TAG$1 ||
      type.$$typeof === TEMPORARY_REFERENCE_TAG
      ? renderClientElement(task, type, key, props)
      : renderFunctionComponent(request, task, key, type, props);
  if ("string" === typeof type)
    return renderClientElement(task, type, key, props);
  if ("symbol" === typeof type)
    return type === REACT_FRAGMENT_TYPE && null === key
      ? ((key = task.implicitSlot),
        null === task.keyPath && (task.implicitSlot = !0),
        (request = renderModelDestructive(
          request,
          task,
          emptyRoot,
          "",
          props.children
        )),
        (task.implicitSlot = key),
        request)
      : renderClientElement(task, type, key, props);
  if (null != type && "object" === typeof type) {
    if (type.$$typeof === CLIENT_REFERENCE_TAG$1)
      return renderClientElement(task, type, key, props);
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE:
        var init = type._init;
        type = init(type._payload);
        return renderElement(request, task, type, key, ref, props);
      case REACT_FORWARD_REF_TYPE:
        return renderFunctionComponent(request, task, key, type.render, props);
      case REACT_MEMO_TYPE:
        return renderElement(request, task, type.type, key, ref, props);
    }
  }
  throw Error(
    "Unsupported Server Component type: " + describeValueForErrorMessage(type)
  );
}
function pingTask(request, task) {
  var pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  1 === pingedTasks.length &&
    ((request.flushScheduled = null !== request.destination),
    setImmediate(function () {
      return performWork(request);
    }));
}
function createTask(request, model, keyPath, implicitSlot, abortSet) {
  request.pendingChunks++;
  var id = request.nextChunkId++;
  "object" !== typeof model ||
    null === model ||
    null !== keyPath ||
    implicitSlot ||
    request.writtenObjects.set(model, id);
  var task = {
    id: id,
    status: 0,
    model: model,
    keyPath: keyPath,
    implicitSlot: implicitSlot,
    ping: function () {
      return pingTask(request, task);
    },
    toJSON: function (parentPropertyName, value) {
      var prevKeyPath = task.keyPath,
        prevImplicitSlot = task.implicitSlot;
      try {
        var JSCompiler_inline_result = renderModelDestructive(
          request,
          task,
          this,
          parentPropertyName,
          value
        );
      } catch (thrownValue) {
        if (
          ((parentPropertyName =
            thrownValue === SuspenseException
              ? getSuspendedThenable()
              : thrownValue),
          (value = task.model),
          (value =
            "object" === typeof value &&
            null !== value &&
            (value.$$typeof === REACT_ELEMENT_TYPE ||
              value.$$typeof === REACT_LAZY_TYPE)),
          "object" === typeof parentPropertyName &&
            null !== parentPropertyName &&
            "function" === typeof parentPropertyName.then)
        ) {
          JSCompiler_inline_result = createTask(
            request,
            task.model,
            task.keyPath,
            task.implicitSlot,
            request.abortableTasks
          );
          var ping = JSCompiler_inline_result.ping;
          parentPropertyName.then(ping, ping);
          JSCompiler_inline_result.thenableState =
            getThenableStateAfterSuspending();
          task.keyPath = prevKeyPath;
          task.implicitSlot = prevImplicitSlot;
          JSCompiler_inline_result = value
            ? "$L" + JSCompiler_inline_result.id.toString(16)
            : serializeByValueID(JSCompiler_inline_result.id);
        } else if (
          ((task.keyPath = prevKeyPath),
          (task.implicitSlot = prevImplicitSlot),
          value)
        )
          request.pendingChunks++,
            (prevKeyPath = request.nextChunkId++),
            (prevImplicitSlot = logRecoverableError(
              request,
              parentPropertyName
            )),
            emitErrorChunk(request, prevKeyPath, prevImplicitSlot),
            (JSCompiler_inline_result = "$L" + prevKeyPath.toString(16));
        else throw parentPropertyName;
      }
      return JSCompiler_inline_result;
    },
    thenableState: null
  };
  abortSet.add(task);
  return task;
}
function serializeByValueID(id) {
  return "$" + id.toString(16);
}
function encodeReferenceChunk(request, id, reference) {
  request = stringify(reference);
  return id.toString(16) + ":" + request + "\n";
}
function serializeClientReference(
  request,
  parent,
  parentPropertyName,
  clientReference
) {
  var clientReferenceKey = clientReference.$$id,
    writtenClientReferences = request.writtenClientReferences,
    existingId = writtenClientReferences.get(clientReferenceKey);
  if (void 0 !== existingId)
    return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
      ? "$L" + existingId.toString(16)
      : serializeByValueID(existingId);
  try {
    var baseURL = request.bundlerConfig,
      id = clientReference.$$id,
      idx = id.lastIndexOf("#"),
      exportName = id.slice(idx + 1),
      fullURL = id.slice(0, idx);
    if (!fullURL.startsWith(baseURL))
      throw Error("Attempted to load a Client Module outside the hosted root.");
    var JSCompiler_inline_result = [fullURL.slice(baseURL.length), exportName];
    request.pendingChunks++;
    var importId = request.nextChunkId++,
      json = stringify(JSCompiler_inline_result),
      processedChunk = importId.toString(16) + ":I" + json + "\n";
    request.completedImportChunks.push(processedChunk);
    writtenClientReferences.set(clientReferenceKey, importId);
    return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
      ? "$L" + importId.toString(16)
      : serializeByValueID(importId);
  } catch (x) {
    return (
      request.pendingChunks++,
      (parent = request.nextChunkId++),
      (parentPropertyName = logRecoverableError(request, x)),
      emitErrorChunk(request, parent, parentPropertyName),
      serializeByValueID(parent)
    );
  }
}
function outlineModel(request, value) {
  value = createTask(request, value, null, !1, request.abortableTasks);
  retryTask(request, value);
  return value.id;
}
var modelRoot = !1;
function renderModelDestructive(
  request,
  task,
  parent,
  parentPropertyName,
  value
) {
  task.model = value;
  if (value === REACT_ELEMENT_TYPE) return "$";
  if (null === value) return null;
  if ("object" === typeof value) {
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        parent = request.writtenObjects;
        parentPropertyName = parent.get(value);
        if (void 0 !== parentPropertyName) {
          if (null === task.keyPath && !task.implicitSlot)
            if (modelRoot === value) modelRoot = null;
            else
              return -1 === parentPropertyName
                ? ((request = outlineModel(request, value)),
                  serializeByValueID(request))
                : serializeByValueID(parentPropertyName);
        } else parent.set(value, -1), parent.set(value.props, -2);
        parent = value.props;
        parentPropertyName = parent.ref;
        return renderElement(
          request,
          task,
          value.type,
          value.key,
          void 0 !== parentPropertyName ? parentPropertyName : null,
          parent
        );
      case REACT_LAZY_TYPE:
        return (
          (task.thenableState = null),
          (parent = value._init),
          (value = parent(value._payload)),
          renderModelDestructive(request, task, emptyRoot, "", value)
        );
    }
    if (value.$$typeof === CLIENT_REFERENCE_TAG$1)
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value
      );
    parent = request.writtenObjects;
    parentPropertyName = parent.get(value);
    if ("function" === typeof value.then) {
      if (void 0 !== parentPropertyName) {
        if (null !== task.keyPath || task.implicitSlot)
          return "$@" + serializeThenable(request, task, value).toString(16);
        if (modelRoot === value) modelRoot = null;
        else return "$@" + parentPropertyName.toString(16);
      }
      request = serializeThenable(request, task, value);
      parent.set(value, request);
      return "$@" + request.toString(16);
    }
    if (void 0 !== parentPropertyName)
      if (modelRoot === value) modelRoot = null;
      else {
        if (-1 === parentPropertyName)
          return (
            (request = outlineModel(request, value)),
            serializeByValueID(request)
          );
        if (-2 !== parentPropertyName)
          return serializeByValueID(parentPropertyName);
      }
    else parent.set(value, -1);
    if (isArrayImpl(value)) return renderFragment(request, task, value);
    if (value instanceof Map) {
      value = Array.from(value);
      for (task = 0; task < value.length; task++)
        (parent = value[task][0]),
          "object" === typeof parent &&
            null !== parent &&
            ((parentPropertyName = request.writtenObjects),
            void 0 === parentPropertyName.get(parent) &&
              parentPropertyName.set(parent, -1));
      return "$Q" + outlineModel(request, value).toString(16);
    }
    if (value instanceof Set) {
      value = Array.from(value);
      for (task = 0; task < value.length; task++)
        (parent = value[task]),
          "object" === typeof parent &&
            null !== parent &&
            ((parentPropertyName = request.writtenObjects),
            void 0 === parentPropertyName.get(parent) &&
              parentPropertyName.set(parent, -1));
      return "$W" + outlineModel(request, value).toString(16);
    }
    if ("function" === typeof FormData && value instanceof FormData)
      return (
        (value = Array.from(value.entries())),
        "$K" + outlineModel(request, value).toString(16)
      );
    if ((parent = getIteratorFn(value)))
      return (
        (parent = parent.call(value)),
        parent === value
          ? "$i" + outlineModel(request, Array.from(parent)).toString(16)
          : renderFragment(request, task, Array.from(parent))
      );
    request = getPrototypeOf(value);
    if (
      request !== ObjectPrototype &&
      (null === request || null !== getPrototypeOf(request))
    )
      throw Error(
        "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported."
      );
    return value;
  }
  if ("string" === typeof value) {
    if (
      "Z" === value[value.length - 1] &&
      parent[parentPropertyName] instanceof Date
    )
      return "$D" + value;
    if (1024 <= value.length)
      return (
        request.pendingChunks++,
        (task = request.nextChunkId++),
        emitTextChunk(request, task, value),
        serializeByValueID(task)
      );
    request = "$" === value[0] ? "$" + value : value;
    return request;
  }
  if ("boolean" === typeof value) return value;
  if ("number" === typeof value)
    return Number.isFinite(value)
      ? 0 === value && -Infinity === 1 / value
        ? "$-0"
        : value
      : Infinity === value
      ? "$Infinity"
      : -Infinity === value
      ? "$-Infinity"
      : "$NaN";
  if ("undefined" === typeof value) return "$undefined";
  if ("function" === typeof value) {
    if (value.$$typeof === CLIENT_REFERENCE_TAG$1)
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value
      );
    if (value.$$typeof === SERVER_REFERENCE_TAG)
      return (
        (task = request.writtenServerReferences),
        (parent = task.get(value)),
        void 0 !== parent
          ? (request = "$F" + parent.toString(16))
          : ((parent = value.$$bound),
            (parent = {
              id: value.$$id,
              bound: parent ? Promise.resolve(parent) : null
            }),
            (request = outlineModel(request, parent)),
            task.set(value, request),
            (request = "$F" + request.toString(16))),
        request
      );
    if (value.$$typeof === TEMPORARY_REFERENCE_TAG) return "$T" + value.$$id;
    if (/^on[A-Z]/.test(parentPropertyName))
      throw Error(
        "Event handlers cannot be passed to Client Component props." +
          describeObjectForErrorMessage(parent, parentPropertyName) +
          "\nIf you need interactivity, consider converting part of this to a Client Component."
      );
    throw Error(
      'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.' +
        describeObjectForErrorMessage(parent, parentPropertyName)
    );
  }
  if ("symbol" === typeof value) {
    task = request.writtenSymbols;
    var existingId$10 = task.get(value);
    if (void 0 !== existingId$10) return serializeByValueID(existingId$10);
    existingId$10 = value.description;
    if (Symbol.for(existingId$10) !== value)
      throw Error(
        "Only global symbols received from Symbol.for(...) can be passed to Client Components. The symbol Symbol.for(" +
          (value.description + ") cannot be found among global symbols.") +
          describeObjectForErrorMessage(parent, parentPropertyName)
      );
    request.pendingChunks++;
    parent = request.nextChunkId++;
    parentPropertyName = encodeReferenceChunk(
      request,
      parent,
      "$S" + existingId$10
    );
    request.completedImportChunks.push(parentPropertyName);
    task.set(value, parent);
    return serializeByValueID(parent);
  }
  if ("bigint" === typeof value) return "$n" + value.toString(10);
  throw Error(
    "Type " +
      typeof value +
      " is not supported in Client Component props." +
      describeObjectForErrorMessage(parent, parentPropertyName)
  );
}
function logRecoverableError(request, error) {
  var prevRequest = currentRequest;
  currentRequest = null;
  try {
    var errorDigest = requestStorage.run(void 0, request.onError, error);
  } finally {
    currentRequest = prevRequest;
  }
  if (null != errorDigest && "string" !== typeof errorDigest)
    throw Error(
      'onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "' +
        typeof errorDigest +
        '" instead'
    );
  return errorDigest || "";
}
function fatalError(request, error) {
  null !== request.destination
    ? ((request.status = 2), request.destination.destroy(error))
    : ((request.status = 1), (request.fatalError = error));
}
function emitErrorChunk(request, id, digest) {
  digest = { digest: digest };
  id = id.toString(16) + ":E" + stringify(digest) + "\n";
  request.completedErrorChunks.push(id);
}
function emitTextChunk(request, id, text) {
  request.pendingChunks++;
  var binaryLength =
    "string" === typeof text
      ? Buffer.byteLength(text, "utf8")
      : text.byteLength;
  id = id.toString(16) + ":T" + binaryLength.toString(16) + ",";
  request.completedRegularChunks.push(id, text);
}
var emptyRoot = {};
function retryTask(request, task) {
  if (0 === task.status)
    try {
      modelRoot = task.model;
      var resolvedModel = renderModelDestructive(
        request,
        task,
        emptyRoot,
        "",
        task.model
      );
      modelRoot = resolvedModel;
      task.keyPath = null;
      task.implicitSlot = !1;
      if ("object" === typeof resolvedModel && null !== resolvedModel) {
        var id = task.id;
        if ("string" === typeof resolvedModel)
          emitTextChunk(request, id, resolvedModel);
        else {
          var json = stringify(resolvedModel, task.toJSON),
            processedChunk = task.id.toString(16) + ":" + json + "\n";
          request.completedRegularChunks.push(processedChunk);
        }
      } else {
        var json$jscomp$0 = stringify(resolvedModel),
          processedChunk$jscomp$0 =
            task.id.toString(16) + ":" + json$jscomp$0 + "\n";
        request.completedRegularChunks.push(processedChunk$jscomp$0);
      }
      request.abortableTasks.delete(task);
      task.status = 1;
    } catch (thrownValue) {
      var x =
        thrownValue === SuspenseException
          ? getSuspendedThenable()
          : thrownValue;
      if ("object" === typeof x && null !== x && "function" === typeof x.then) {
        var ping = task.ping;
        x.then(ping, ping);
        task.thenableState = getThenableStateAfterSuspending();
      } else {
        request.abortableTasks.delete(task);
        task.status = 4;
        var digest = logRecoverableError(request, x);
        emitErrorChunk(request, task.id, digest);
      }
    } finally {
    }
}
function performWork(request) {
  var prevDispatcher = ReactSharedInternalsServer.H;
  ReactSharedInternalsServer.H = HooksDispatcher;
  var prevRequest = currentRequest;
  currentRequest$1 = currentRequest = request;
  try {
    var pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (var i = 0; i < pingedTasks.length; i++)
      retryTask(request, pingedTasks[i]);
    null !== request.destination &&
      flushCompletedChunks(request, request.destination);
  } catch (error) {
    logRecoverableError(request, error), fatalError(request, error);
  } finally {
    (ReactSharedInternalsServer.H = prevDispatcher),
      (currentRequest$1 = null),
      (currentRequest = prevRequest);
  }
}
function flushCompletedChunks(request, destination) {
  currentView = new Uint8Array(2048);
  writtenBytes = 0;
  destinationHasCapacity = !0;
  try {
    for (
      var importsChunks = request.completedImportChunks, i = 0;
      i < importsChunks.length;
      i++
    )
      if (
        (request.pendingChunks--,
        !writeChunkAndReturn(destination, importsChunks[i]))
      ) {
        request.destination = null;
        i++;
        break;
      }
    importsChunks.splice(0, i);
    var hintChunks = request.completedHintChunks;
    for (i = 0; i < hintChunks.length; i++)
      if (!writeChunkAndReturn(destination, hintChunks[i])) {
        request.destination = null;
        i++;
        break;
      }
    hintChunks.splice(0, i);
    var regularChunks = request.completedRegularChunks;
    for (i = 0; i < regularChunks.length; i++)
      if (
        (request.pendingChunks--,
        !writeChunkAndReturn(destination, regularChunks[i]))
      ) {
        request.destination = null;
        i++;
        break;
      }
    regularChunks.splice(0, i);
    var errorChunks = request.completedErrorChunks;
    for (i = 0; i < errorChunks.length; i++)
      if (
        (request.pendingChunks--,
        !writeChunkAndReturn(destination, errorChunks[i]))
      ) {
        request.destination = null;
        i++;
        break;
      }
    errorChunks.splice(0, i);
  } finally {
    (request.flushScheduled = !1),
      currentView &&
        0 < writtenBytes &&
        destination.write(currentView.subarray(0, writtenBytes)),
      (currentView = null),
      (writtenBytes = 0),
      (destinationHasCapacity = !0);
  }
  "function" === typeof destination.flush && destination.flush();
  0 === request.pendingChunks &&
    (destination.end(), (request.destination = null));
}
function startWork(request) {
  request.flushScheduled = null !== request.destination;
  setImmediate(function () {
    return requestStorage.run(request, performWork, request);
  });
}
function enqueueFlush(request) {
  if (
    !1 === request.flushScheduled &&
    0 === request.pingedTasks.length &&
    null !== request.destination
  ) {
    var destination = request.destination;
    request.flushScheduled = !0;
    setImmediate(function () {
      return flushCompletedChunks(request, destination);
    });
  }
}
function startFlowing(request, destination) {
  if (1 === request.status)
    (request.status = 2), destination.destroy(request.fatalError);
  else if (2 !== request.status && null === request.destination) {
    request.destination = destination;
    try {
      flushCompletedChunks(request, destination);
    } catch (error) {
      logRecoverableError(request, error), fatalError(request, error);
    }
  }
}
function abort(request, reason) {
  try {
    var abortableTasks = request.abortableTasks;
    if (0 < abortableTasks.size) {
      request.pendingChunks++;
      var errorId = request.nextChunkId++,
        error =
          void 0 === reason
            ? Error("The render was aborted by the server without a reason.")
            : reason,
        digest = logRecoverableError(request, error);
      emitErrorChunk(request, errorId, digest, error);
      abortableTasks.forEach(function (task) {
        task.status = 3;
        var ref = serializeByValueID(errorId);
        task = encodeReferenceChunk(request, task.id, ref);
        request.completedErrorChunks.push(task);
      });
      abortableTasks.clear();
    }
    var abortListeners = request.abortListeners;
    if (0 < abortListeners.size) {
      var error$17 =
        void 0 === reason
          ? Error("The render was aborted by the server without a reason.")
          : reason;
      abortListeners.forEach(function (callback) {
        return callback(error$17);
      });
      abortListeners.clear();
    }
    null !== request.destination &&
      flushCompletedChunks(request, request.destination);
  } catch (error$18) {
    logRecoverableError(request, error$18), fatalError(request, error$18);
  }
}
function resolveServerReference(config, id) {
  var idx = id.lastIndexOf("#"),
    exportName = id.slice(idx + 1);
  id = id.slice(0, idx);
  if (!id.startsWith(config))
    throw Error(
      "Attempted to load a Server Reference outside the hosted root."
    );
  return { specifier: id, name: exportName };
}
var asyncModuleCache = new Map();
function preloadModule(metadata) {
  var existingPromise = asyncModuleCache.get(metadata.specifier);
  if (existingPromise)
    return "fulfilled" === existingPromise.status ? null : existingPromise;
  var modulePromise = import(metadata.specifier);
  modulePromise.then(
    function (value) {
      modulePromise.status = "fulfilled";
      modulePromise.value = value;
    },
    function (reason) {
      modulePromise.status = "rejected";
      modulePromise.reason = reason;
    }
  );
  asyncModuleCache.set(metadata.specifier, modulePromise);
  return modulePromise;
}
function requireModule(metadata) {
  var moduleExports = asyncModuleCache.get(metadata.specifier);
  if ("fulfilled" === moduleExports.status) moduleExports = moduleExports.value;
  else throw moduleExports.reason;
  return moduleExports[metadata.name];
}
function Chunk(status, value, reason, response) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  this._response = response;
}
Chunk.prototype = Object.create(Promise.prototype);
Chunk.prototype.then = function (resolve, reject) {
  switch (this.status) {
    case "resolved_model":
      initializeModelChunk(this);
  }
  switch (this.status) {
    case "fulfilled":
      resolve(this.value);
      break;
    case "pending":
    case "blocked":
      resolve &&
        (null === this.value && (this.value = []), this.value.push(resolve));
      reject &&
        (null === this.reason && (this.reason = []), this.reason.push(reject));
      break;
    default:
      reject(this.reason);
  }
};
function wakeChunk(listeners, value) {
  for (var i = 0; i < listeners.length; i++) (0, listeners[i])(value);
}
function triggerErrorOnChunk(chunk, error) {
  if ("pending" === chunk.status || "blocked" === chunk.status) {
    var listeners = chunk.reason;
    chunk.status = "rejected";
    chunk.reason = error;
    null !== listeners && wakeChunk(listeners, error);
  }
}
function loadServerReference$1(
  response,
  id,
  bound,
  parentChunk,
  parentObject,
  key
) {
  var serverReference = resolveServerReference(response._bundlerConfig, id);
  response = preloadModule(serverReference);
  if (bound)
    bound = Promise.all([bound, response]).then(function (_ref) {
      _ref = _ref[0];
      var fn = requireModule(serverReference);
      return fn.bind.apply(fn, [null].concat(_ref));
    });
  else if (response)
    bound = Promise.resolve(response).then(function () {
      return requireModule(serverReference);
    });
  else return requireModule(serverReference);
  bound.then(
    createModelResolver(parentChunk, parentObject, key),
    createModelReject(parentChunk)
  );
  return null;
}
var initializingChunk = null,
  initializingChunkBlockedModel = null;
function initializeModelChunk(chunk) {
  var prevChunk = initializingChunk,
    prevBlocked = initializingChunkBlockedModel;
  initializingChunk = chunk;
  initializingChunkBlockedModel = null;
  try {
    var value = JSON.parse(chunk.value, chunk._response._fromJSON);
    null !== initializingChunkBlockedModel &&
    0 < initializingChunkBlockedModel.deps
      ? ((initializingChunkBlockedModel.value = value),
        (chunk.status = "blocked"),
        (chunk.value = null),
        (chunk.reason = null))
      : ((chunk.status = "fulfilled"), (chunk.value = value));
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  } finally {
    (initializingChunk = prevChunk),
      (initializingChunkBlockedModel = prevBlocked);
  }
}
function reportGlobalError(response, error) {
  response._chunks.forEach(function (chunk) {
    "pending" === chunk.status && triggerErrorOnChunk(chunk, error);
  });
}
function getChunk(response, id) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  chunk ||
    ((chunk = response._formData.get(response._prefix + id)),
    (chunk =
      null != chunk
        ? new Chunk("resolved_model", chunk, null, response)
        : new Chunk("pending", null, null, response)),
    chunks.set(id, chunk));
  return chunk;
}
function createModelResolver(chunk, parentObject, key) {
  if (initializingChunkBlockedModel) {
    var blocked = initializingChunkBlockedModel;
    blocked.deps++;
  } else blocked = initializingChunkBlockedModel = { deps: 1, value: null };
  return function (value) {
    parentObject[key] = value;
    blocked.deps--;
    0 === blocked.deps &&
      "blocked" === chunk.status &&
      ((value = chunk.value),
      (chunk.status = "fulfilled"),
      (chunk.value = blocked.value),
      null !== value && wakeChunk(value, blocked.value));
  };
}
function createModelReject(chunk) {
  return function (error) {
    return triggerErrorOnChunk(chunk, error);
  };
}
function getOutlinedModel(response, id) {
  response = getChunk(response, id);
  "resolved_model" === response.status && initializeModelChunk(response);
  if ("fulfilled" !== response.status) throw response.reason;
  return response.value;
}
function parseModelString(response, obj, key, value) {
  if ("$" === value[0]) {
    switch (value[1]) {
      case "$":
        return value.slice(1);
      case "@":
        return (obj = parseInt(value.slice(2), 16)), getChunk(response, obj);
      case "F":
        return (
          (value = parseInt(value.slice(2), 16)),
          (value = getOutlinedModel(response, value)),
          loadServerReference$1(
            response,
            value.id,
            value.bound,
            initializingChunk,
            obj,
            key
          )
        );
      case "T":
        return createTemporaryReference(value.slice(2));
      case "Q":
        return (
          (obj = parseInt(value.slice(2), 16)),
          (response = getOutlinedModel(response, obj)),
          new Map(response)
        );
      case "W":
        return (
          (obj = parseInt(value.slice(2), 16)),
          (response = getOutlinedModel(response, obj)),
          new Set(response)
        );
      case "K":
        obj = value.slice(2);
        var formPrefix = response._prefix + obj + "_",
          data$23 = new FormData();
        response._formData.forEach(function (entry, entryKey) {
          entryKey.startsWith(formPrefix) &&
            data$23.append(entryKey.slice(formPrefix.length), entry);
        });
        return data$23;
      case "i":
        return (
          (obj = parseInt(value.slice(2), 16)),
          getOutlinedModel(response, obj)[Symbol.iterator]()
        );
      case "I":
        return Infinity;
      case "-":
        return "$-0" === value ? -0 : -Infinity;
      case "N":
        return NaN;
      case "u":
        return;
      case "D":
        return new Date(Date.parse(value.slice(2)));
      case "n":
        return BigInt(value.slice(2));
    }
    value = parseInt(value.slice(1), 16);
    response = getChunk(response, value);
    switch (response.status) {
      case "resolved_model":
        initializeModelChunk(response);
    }
    switch (response.status) {
      case "fulfilled":
        return response.value;
      case "pending":
      case "blocked":
        return (
          (value = initializingChunk),
          response.then(
            createModelResolver(value, obj, key),
            createModelReject(value)
          ),
          null
        );
      default:
        throw response.reason;
    }
  }
  return value;
}
function createResponse(bundlerConfig, formFieldPrefix) {
  var backingFormData =
      2 < arguments.length && void 0 !== arguments[2]
        ? arguments[2]
        : new FormData(),
    chunks = new Map(),
    response = {
      _bundlerConfig: bundlerConfig,
      _prefix: formFieldPrefix,
      _formData: backingFormData,
      _chunks: chunks,
      _fromJSON: function (key, value) {
        return "string" === typeof value
          ? parseModelString(response, this, key, value)
          : value;
      }
    };
  return response;
}
function resolveField(response, key, value) {
  response._formData.append(key, value);
  var prefix = response._prefix;
  if (
    key.startsWith(prefix) &&
    ((response = response._chunks),
    (key = +key.slice(prefix.length)),
    (key = response.get(key)) &&
      "pending" === key.status &&
      ((prefix = key.value),
      (response = key.reason),
      (key.status = "resolved_model"),
      (key.value = value),
      null !== prefix))
  )
    switch ((initializeModelChunk(key), key.status)) {
      case "fulfilled":
        wakeChunk(prefix, key.value);
        break;
      case "pending":
      case "blocked":
        key.value = prefix;
        key.reason = response;
        break;
      case "rejected":
        response && wakeChunk(response, key.reason);
    }
}
function close(response) {
  reportGlobalError(response, Error("Connection closed."));
}
function loadServerReference(bundlerConfig, id, bound) {
  var serverReference = resolveServerReference(bundlerConfig, id);
  bundlerConfig = preloadModule(serverReference);
  return bound
    ? Promise.all([bound, bundlerConfig]).then(function (_ref) {
        _ref = _ref[0];
        var fn = requireModule(serverReference);
        return fn.bind.apply(fn, [null].concat(_ref));
      })
    : bundlerConfig
    ? Promise.resolve(bundlerConfig).then(function () {
        return requireModule(serverReference);
      })
    : Promise.resolve(requireModule(serverReference));
}
function decodeBoundActionMetaData(body, serverManifest, formFieldPrefix) {
  body = createResponse(serverManifest, formFieldPrefix, body);
  close(body);
  body = getChunk(body, 0);
  body.then(function () {});
  if ("fulfilled" !== body.status) throw body.reason;
  return body.value;
}
function createDrainHandler(destination, request) {
  return function () {
    return startFlowing(request, destination);
  };
}
exports.decodeAction = function (body, serverManifest) {
  var formData = new FormData(),
    action = null;
  body.forEach(function (value, key) {
    key.startsWith("$ACTION_")
      ? key.startsWith("$ACTION_REF_")
        ? ((value = "$ACTION_" + key.slice(12) + ":"),
          (value = decodeBoundActionMetaData(body, serverManifest, value)),
          (action = loadServerReference(serverManifest, value.id, value.bound)))
        : key.startsWith("$ACTION_ID_") &&
          ((value = key.slice(11)),
          (action = loadServerReference(serverManifest, value, null)))
      : formData.append(key, value);
  });
  return null === action
    ? null
    : action.then(function (fn) {
        return fn.bind(null, formData);
      });
};
exports.decodeFormState = function (actionResult, body, serverManifest) {
  var keyPath = body.get("$ACTION_KEY");
  if ("string" !== typeof keyPath) return Promise.resolve(null);
  var metaData = null;
  body.forEach(function (value, key) {
    key.startsWith("$ACTION_REF_") &&
      ((value = "$ACTION_" + key.slice(12) + ":"),
      (metaData = decodeBoundActionMetaData(body, serverManifest, value)));
  });
  if (null === metaData) return Promise.resolve(null);
  var referenceId = metaData.id;
  return Promise.resolve(metaData.bound).then(function (bound) {
    return null === bound
      ? null
      : [actionResult, keyPath, referenceId, bound.length - 1];
  });
};
exports.decodeReply = function (body, moduleBasePath) {
  if ("string" === typeof body) {
    var form = new FormData();
    form.append("0", body);
    body = form;
  }
  body = createResponse(moduleBasePath, "", body);
  moduleBasePath = getChunk(body, 0);
  close(body);
  return moduleBasePath;
};
exports.decodeReplyFromBusboy = function (busboyStream, moduleBasePath) {
  var response = createResponse(moduleBasePath, ""),
    pendingFiles = 0,
    queuedFields = [];
  busboyStream.on("field", function (name, value) {
    0 < pendingFiles
      ? queuedFields.push(name, value)
      : resolveField(response, name, value);
  });
  busboyStream.on("file", function (name, value, _ref) {
    var filename = _ref.filename,
      mimeType = _ref.mimeType;
    if ("base64" === _ref.encoding.toLowerCase())
      throw Error(
        "React doesn't accept base64 encoded file uploads because we don't expect form data passed from a browser to ever encode data that way. If that's the wrong assumption, we can easily fix it."
      );
    pendingFiles++;
    var JSCompiler_object_inline_chunks_211 = [];
    value.on("data", function (chunk) {
      JSCompiler_object_inline_chunks_211.push(chunk);
    });
    value.on("end", function () {
      var blob = new Blob(JSCompiler_object_inline_chunks_211, {
        type: mimeType
      });
      response._formData.append(name, blob, filename);
      pendingFiles--;
      if (0 === pendingFiles) {
        for (blob = 0; blob < queuedFields.length; blob += 2)
          resolveField(response, queuedFields[blob], queuedFields[blob + 1]);
        queuedFields.length = 0;
      }
    });
  });
  busboyStream.on("finish", function () {
    close(response);
  });
  busboyStream.on("error", function (err) {
    reportGlobalError(response, err);
  });
  return getChunk(response, 0);
};
exports.registerClientReference = function (
  proxyImplementation,
  id,
  exportName
) {
  return Object.defineProperties(proxyImplementation, {
    $$typeof: { value: CLIENT_REFERENCE_TAG$1 },
    $$id: { value: id + "#" + exportName }
  });
};
exports.registerServerReference = function (reference, id, exportName) {
  return Object.defineProperties(reference, {
    $$typeof: { value: SERVER_REFERENCE_TAG },
    $$id: { value: id + "#" + exportName, configurable: !0 },
    $$bound: { value: null, configurable: !0 },
    bind: { value: bind, configurable: !0 }
  });
};
exports.renderToPipeableStream = function (model, moduleBasePath, options) {
  var request = createRequest(
      model,
      moduleBasePath,
      options ? options.onError : void 0,
      options ? options.identifierPrefix : void 0,
      options ? options.onPostpone : void 0
    ),
    hasStartedFlowing = !1;
  startWork(request);
  return {
    pipe: function (destination) {
      if (hasStartedFlowing)
        throw Error(
          "React currently only supports piping to one writable stream."
        );
      hasStartedFlowing = !0;
      startFlowing(request, destination);
      destination.on("drain", createDrainHandler(destination, request));
      return destination;
    },
    abort: function (reason) {
      request.destination = null;
      abort(request, reason);
    }
  };
};
