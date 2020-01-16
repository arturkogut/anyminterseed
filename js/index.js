(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.minterWallet = {}));
}(this, (function (exports) { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

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

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var global$1 = typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};

  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
  var inited = false;

  function init() {
    inited = true;
    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;
  }

  function toByteArray(b64) {
    if (!inited) {
      init();
    }

    var i, j, l, tmp, placeHolders, arr;
    var len = b64.length;

    if (len % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4');
    } // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice


    placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0; // base64 is 4/3 + up to two characters of the original data

    arr = new Arr(len * 3 / 4 - placeHolders); // if there are placeholders, only get up to the last complete 4 chars

    l = placeHolders > 0 ? len - 4 : len;
    var L = 0;

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
      arr[L++] = tmp >> 16 & 0xFF;
      arr[L++] = tmp >> 8 & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    if (placeHolders === 2) {
      tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
      arr[L++] = tmp & 0xFF;
    } else if (placeHolders === 1) {
      tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
      arr[L++] = tmp >> 8 & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    return arr;
  }

  function tripletToBase64(num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
  }

  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];

    for (var i = start; i < end; i += 3) {
      tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
      output.push(tripletToBase64(tmp));
    }

    return output.join('');
  }

  function fromByteArray(uint8) {
    if (!inited) {
      init();
    }

    var tmp;
    var len = uint8.length;
    var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes

    var output = '';
    var parts = [];
    var maxChunkLength = 16383; // must be multiple of 3
    // go through the array every three bytes, we'll deal with trailing stuff later

    for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
    } // pad the end with zeros, but make sure to not forget the extra bytes


    if (extraBytes === 1) {
      tmp = uint8[len - 1];
      output += lookup[tmp >> 2];
      output += lookup[tmp << 4 & 0x3F];
      output += '==';
    } else if (extraBytes === 2) {
      tmp = (uint8[len - 2] << 8) + uint8[len - 1];
      output += lookup[tmp >> 10];
      output += lookup[tmp >> 4 & 0x3F];
      output += lookup[tmp << 2 & 0x3F];
      output += '=';
    }

    parts.push(output);
    return parts.join('');
  }

  function read(buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;

    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;

    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }

    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  }
  function write(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);

      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }

      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }

      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = e << mLen | m;
    eLen += mLen;

    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  }

  var toString = {}.toString;
  var isArray = Array.isArray || function (arr) {
    return toString.call(arr) == '[object Array]';
  };

  var INSPECT_MAX_BYTES = 50;
  /**
   * If `Buffer.TYPED_ARRAY_SUPPORT`:
   *   === true    Use Uint8Array implementation (fastest)
   *   === false   Use Object implementation (most compatible, even IE6)
   *
   * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
   * Opera 11.6+, iOS 4.2+.
   *
   * Due to various browser bugs, sometimes the Object implementation will be used even
   * when the browser supports typed arrays.
   *
   * Note:
   *
   *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
   *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
   *
   *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
   *
   *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
   *     incorrect length in some situations.

   * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
   * get the Object implementation, which is slower but behaves correctly.
   */

  Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined ? global$1.TYPED_ARRAY_SUPPORT : true;
  /*
   * Export kMaxLength after typed array support is determined.
   */

  var _kMaxLength = kMaxLength();

  function kMaxLength() {
    return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
  }

  function createBuffer(that, length) {
    if (kMaxLength() < length) {
      throw new RangeError('Invalid typed array length');
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = new Uint8Array(length);
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      if (that === null) {
        that = new Buffer(length);
      }

      that.length = length;
    }

    return that;
  }
  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */


  function Buffer(arg, encodingOrOffset, length) {
    if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
      return new Buffer(arg, encodingOrOffset, length);
    } // Common case.


    if (typeof arg === 'number') {
      if (typeof encodingOrOffset === 'string') {
        throw new Error('If encoding is specified then the first argument must be a string');
      }

      return allocUnsafe(this, arg);
    }

    return from(this, arg, encodingOrOffset, length);
  }
  Buffer.poolSize = 8192; // not used by this implementation
  // TODO: Legacy, not needed anymore. Remove in next major version.

  Buffer._augment = function (arr) {
    arr.__proto__ = Buffer.prototype;
    return arr;
  };

  function from(that, value, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('"value" argument must not be a number');
    }

    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
      return fromArrayBuffer(that, value, encodingOrOffset, length);
    }

    if (typeof value === 'string') {
      return fromString(that, value, encodingOrOffset);
    }

    return fromObject(that, value);
  }
  /**
   * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
   * if value is a number.
   * Buffer.from(str[, encoding])
   * Buffer.from(array)
   * Buffer.from(buffer)
   * Buffer.from(arrayBuffer[, byteOffset[, length]])
   **/


  Buffer.from = function (value, encodingOrOffset, length) {
    return from(null, value, encodingOrOffset, length);
  };

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.prototype.__proto__ = Uint8Array.prototype;
    Buffer.__proto__ = Uint8Array;
  }

  function assertSize(size) {
    if (typeof size !== 'number') {
      throw new TypeError('"size" argument must be a number');
    } else if (size < 0) {
      throw new RangeError('"size" argument must not be negative');
    }
  }

  function alloc(that, size, fill, encoding) {
    assertSize(size);

    if (size <= 0) {
      return createBuffer(that, size);
    }

    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === 'string' ? createBuffer(that, size).fill(fill, encoding) : createBuffer(that, size).fill(fill);
    }

    return createBuffer(that, size);
  }
  /**
   * Creates a new filled Buffer instance.
   * alloc(size[, fill[, encoding]])
   **/


  Buffer.alloc = function (size, fill, encoding) {
    return alloc(null, size, fill, encoding);
  };

  function allocUnsafe(that, size) {
    assertSize(size);
    that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);

    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < size; ++i) {
        that[i] = 0;
      }
    }

    return that;
  }
  /**
   * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
   * */


  Buffer.allocUnsafe = function (size) {
    return allocUnsafe(null, size);
  };
  /**
   * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
   */


  Buffer.allocUnsafeSlow = function (size) {
    return allocUnsafe(null, size);
  };

  function fromString(that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '') {
      encoding = 'utf8';
    }

    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding');
    }

    var length = byteLength(string, encoding) | 0;
    that = createBuffer(that, length);
    var actual = that.write(string, encoding);

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      that = that.slice(0, actual);
    }

    return that;
  }

  function fromArrayLike(that, array) {
    var length = array.length < 0 ? 0 : checked(array.length) | 0;
    that = createBuffer(that, length);

    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }

    return that;
  }

  function fromArrayBuffer(that, array, byteOffset, length) {
    array.byteLength; // this throws if `array` is not a valid ArrayBuffer

    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('\'offset\' is out of bounds');
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('\'length\' is out of bounds');
    }

    if (byteOffset === undefined && length === undefined) {
      array = new Uint8Array(array);
    } else if (length === undefined) {
      array = new Uint8Array(array, byteOffset);
    } else {
      array = new Uint8Array(array, byteOffset, length);
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = array;
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      that = fromArrayLike(that, array);
    }

    return that;
  }

  function fromObject(that, obj) {
    if (internalIsBuffer(obj)) {
      var len = checked(obj.length) | 0;
      that = createBuffer(that, len);

      if (that.length === 0) {
        return that;
      }

      obj.copy(that, 0, 0, len);
      return that;
    }

    if (obj) {
      if (typeof ArrayBuffer !== 'undefined' && obj.buffer instanceof ArrayBuffer || 'length' in obj) {
        if (typeof obj.length !== 'number' || isnan(obj.length)) {
          return createBuffer(that, 0);
        }

        return fromArrayLike(that, obj);
      }

      if (obj.type === 'Buffer' && isArray(obj.data)) {
        return fromArrayLike(that, obj.data);
      }
    }

    throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.');
  }

  function checked(length) {
    // Note: cannot use `length < kMaxLength()` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + kMaxLength().toString(16) + ' bytes');
    }

    return length | 0;
  }

  function SlowBuffer(length) {
    if (+length != length) {
      // eslint-disable-line eqeqeq
      length = 0;
    }

    return Buffer.alloc(+length);
  }
  Buffer.isBuffer = isBuffer;

  function internalIsBuffer(b) {
    return isBuffer(b);
  }

  Buffer.compare = function compare(a, b) {
    if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
      throw new TypeError('Arguments must be Buffers');
    }

    if (a === b) return 0;
    var x = a.length;
    var y = b.length;

    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }

    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  };

  Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'latin1':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true;

      default:
        return false;
    }
  };

  Buffer.concat = function concat(list, length) {
    if (!isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }

    if (list.length === 0) {
      return Buffer.alloc(0);
    }

    var i;

    if (length === undefined) {
      length = 0;

      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }

    var buffer = Buffer.allocUnsafe(length);
    var pos = 0;

    for (i = 0; i < list.length; ++i) {
      var buf = list[i];

      if (!internalIsBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }

      buf.copy(buffer, pos);
      pos += buf.length;
    }

    return buffer;
  };

  function byteLength(string, encoding) {
    if (internalIsBuffer(string)) {
      return string.length;
    }

    if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
      return string.byteLength;
    }

    if (typeof string !== 'string') {
      string = '' + string;
    }

    var len = string.length;
    if (len === 0) return 0; // Use a for loop to avoid recursion

    var loweredCase = false;

    for (;;) {
      switch (encoding) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return len;

        case 'utf8':
        case 'utf-8':
        case undefined:
          return utf8ToBytes(string).length;

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2;

        case 'hex':
          return len >>> 1;

        case 'base64':
          return base64ToBytes(string).length;

        default:
          if (loweredCase) return utf8ToBytes(string).length; // assume utf8

          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }

  Buffer.byteLength = byteLength;

  function slowToString(encoding, start, end) {
    var loweredCase = false; // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.
    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.

    if (start === undefined || start < 0) {
      start = 0;
    } // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.


    if (start > this.length) {
      return '';
    }

    if (end === undefined || end > this.length) {
      end = this.length;
    }

    if (end <= 0) {
      return '';
    } // Force coersion to uint32. This will also coerce falsey/NaN values to 0.


    end >>>= 0;
    start >>>= 0;

    if (end <= start) {
      return '';
    }

    if (!encoding) encoding = 'utf8';

    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end);

        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end);

        case 'ascii':
          return asciiSlice(this, start, end);

        case 'latin1':
        case 'binary':
          return latin1Slice(this, start, end);

        case 'base64':
          return base64Slice(this, start, end);

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end);

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  } // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
  // Buffer instances.


  Buffer.prototype._isBuffer = true;

  function swap(b, n, m) {
    var i = b[n];
    b[n] = b[m];
    b[m] = i;
  }

  Buffer.prototype.swap16 = function swap16() {
    var len = this.length;

    if (len % 2 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 16-bits');
    }

    for (var i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }

    return this;
  };

  Buffer.prototype.swap32 = function swap32() {
    var len = this.length;

    if (len % 4 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 32-bits');
    }

    for (var i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }

    return this;
  };

  Buffer.prototype.swap64 = function swap64() {
    var len = this.length;

    if (len % 8 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 64-bits');
    }

    for (var i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }

    return this;
  };

  Buffer.prototype.toString = function toString() {
    var length = this.length | 0;
    if (length === 0) return '';
    if (arguments.length === 0) return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };

  Buffer.prototype.equals = function equals(b) {
    if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer');
    if (this === b) return true;
    return Buffer.compare(this, b) === 0;
  };

  Buffer.prototype.inspect = function inspect() {
    var str = '';
    var max = INSPECT_MAX_BYTES;

    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max) str += ' ... ';
    }

    return '<Buffer ' + str + '>';
  };

  Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (!internalIsBuffer(target)) {
      throw new TypeError('Argument must be a Buffer');
    }

    if (start === undefined) {
      start = 0;
    }

    if (end === undefined) {
      end = target ? target.length : 0;
    }

    if (thisStart === undefined) {
      thisStart = 0;
    }

    if (thisEnd === undefined) {
      thisEnd = this.length;
    }

    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError('out of range index');
    }

    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }

    if (thisStart >= thisEnd) {
      return -1;
    }

    if (start >= end) {
      return 1;
    }

    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) return 0;
    var x = thisEnd - thisStart;
    var y = end - start;
    var len = Math.min(x, y);
    var thisCopy = this.slice(thisStart, thisEnd);
    var targetCopy = target.slice(start, end);

    for (var i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break;
      }
    }

    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  }; // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
  // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
  //
  // Arguments:
  // - buffer - a Buffer to search
  // - val - a string, Buffer, or number
  // - byteOffset - an index into `buffer`; will be clamped to an int32
  // - encoding - an optional encoding, relevant is val is a string
  // - dir - true for indexOf, false for lastIndexOf


  function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0) return -1; // Normalize byteOffset

    if (typeof byteOffset === 'string') {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 0x7fffffff) {
      byteOffset = 0x7fffffff;
    } else if (byteOffset < -0x80000000) {
      byteOffset = -0x80000000;
    }

    byteOffset = +byteOffset; // Coerce to Number.

    if (isNaN(byteOffset)) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      byteOffset = dir ? 0 : buffer.length - 1;
    } // Normalize byteOffset: negative offsets start from the end of the buffer


    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;

    if (byteOffset >= buffer.length) {
      if (dir) return -1;else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;else return -1;
    } // Normalize val


    if (typeof val === 'string') {
      val = Buffer.from(val, encoding);
    } // Finally, search either indexOf (if dir is true) or lastIndexOf


    if (internalIsBuffer(val)) {
      // Special case: looking for empty string/buffer always fails
      if (val.length === 0) {
        return -1;
      }

      return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    } else if (typeof val === 'number') {
      val = val & 0xFF; // Search for a byte value [0-255]

      if (Buffer.TYPED_ARRAY_SUPPORT && typeof Uint8Array.prototype.indexOf === 'function') {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
        }
      }

      return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }

    throw new TypeError('val must be string, number or Buffer');
  }

  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    var indexSize = 1;
    var arrLength = arr.length;
    var valLength = val.length;

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase();

      if (encoding === 'ucs2' || encoding === 'ucs-2' || encoding === 'utf16le' || encoding === 'utf-16le') {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }

        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }

    function read(buf, i) {
      if (indexSize === 1) {
        return buf[i];
      } else {
        return buf.readUInt16BE(i * indexSize);
      }
    }

    var i;

    if (dir) {
      var foundIndex = -1;

      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i;
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
        } else {
          if (foundIndex !== -1) i -= i - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;

      for (i = byteOffset; i >= 0; i--) {
        var found = true;

        for (var j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break;
          }
        }

        if (found) return i;
      }
    }

    return -1;
  }

  Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };

  Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };

  Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };

  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;

    if (!length) {
      length = remaining;
    } else {
      length = Number(length);

      if (length > remaining) {
        length = remaining;
      }
    } // must be an even number of digits


    var strLen = string.length;
    if (strLen % 2 !== 0) throw new TypeError('Invalid hex string');

    if (length > strLen / 2) {
      length = strLen / 2;
    }

    for (var i = 0; i < length; ++i) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed)) return i;
      buf[offset + i] = parsed;
    }

    return i;
  }

  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }

  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }

  function latin1Write(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
  }

  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }

  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }

  Buffer.prototype.write = function write(string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0; // Buffer#write(string, encoding)
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0; // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(offset)) {
      offset = offset | 0;

      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined) encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      } // legacy write(string, encoding, offset, length) - remove in v0.13

    } else {
      throw new Error('Buffer.write(string, encoding, offset[, length]) is no longer supported');
    }

    var remaining = this.length - offset;
    if (length === undefined || length > remaining) length = remaining;

    if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
      throw new RangeError('Attempt to write outside buffer bounds');
    }

    if (!encoding) encoding = 'utf8';
    var loweredCase = false;

    for (;;) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length);

        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length);

        case 'ascii':
          return asciiWrite(this, string, offset, length);

        case 'latin1':
        case 'binary':
          return latin1Write(this, string, offset, length);

        case 'base64':
          // Warning: maxLength not taken into account in base64Write
          return base64Write(this, string, offset, length);

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length);

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };

  Buffer.prototype.toJSON = function toJSON() {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };

  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return fromByteArray(buf);
    } else {
      return fromByteArray(buf.slice(start, end));
    }
  }

  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];
    var i = start;

    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = firstByte > 0xEF ? 4 : firstByte > 0xDF ? 3 : firstByte > 0xBF ? 2 : 1;

      if (i + bytesPerSequence <= end) {
        var secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }

            break;

          case 2:
            secondByte = buf[i + 1];

            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | secondByte & 0x3F;

              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }

            break;

          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];

            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | thirdByte & 0x3F;

              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }

            break;

          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];

            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | fourthByte & 0x3F;

              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }

        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res);
  } // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety


  var MAX_ARGUMENTS_LENGTH = 0x1000;

  function decodeCodePointsArray(codePoints) {
    var len = codePoints.length;

    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    } // Decode in chunks to avoid "call stack size exceeded".


    var res = '';
    var i = 0;

    while (i < len) {
      res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }

    return res;
  }

  function asciiSlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }

    return ret;
  }

  function latin1Slice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }

    return ret;
  }

  function hexSlice(buf, start, end) {
    var len = buf.length;
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
    var out = '';

    for (var i = start; i < end; ++i) {
      out += toHex(buf[i]);
    }

    return out;
  }

  function utf16leSlice(buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';

    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }

    return res;
  }

  Buffer.prototype.slice = function slice(start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }

    if (end < start) end = start;
    var newBuf;

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = this.subarray(start, end);
      newBuf.__proto__ = Buffer.prototype;
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);

      for (var i = 0; i < sliceLen; ++i) {
        newBuf[i] = this[i + start];
      }
    }

    return newBuf;
  };
  /*
   * Need to make sure that buffer isn't trying to write out of bounds.
   */


  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) throw new RangeError('offset is not uint');
    if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length');
  }

  Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;

    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    return val;
  };

  Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    var val = this[offset + --byteLength];
    var mul = 1;

    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }

    return val;
  };

  Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset];
  };

  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | this[offset + 1] << 8;
  };

  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] << 8 | this[offset + 1];
  };

  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 0x1000000;
  };

  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] * 0x1000000 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
  };

  Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;

    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    mul *= 0x80;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength);
    return val;
  };

  Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];

    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }

    mul *= 0x80;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength);
    return val;
  };

  Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80)) return this[offset];
    return (0xff - this[offset] + 1) * -1;
  };

  Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset] | this[offset + 1] << 8;
    return val & 0x8000 ? val | 0xFFFF0000 : val;
  };

  Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | this[offset] << 8;
    return val & 0x8000 ? val | 0xFFFF0000 : val;
  };

  Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
  };

  Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
  };

  Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, true, 23, 4);
  };

  Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, false, 23, 4);
  };

  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, true, 52, 8);
  };

  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, false, 52, 8);
  };

  function checkInt(buf, value, offset, ext, max, min) {
    if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError('Index out of range');
  }

  Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;

    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = value / mul & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;

    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = value / mul & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    this[offset] = value & 0xff;
    return offset + 1;
  };

  function objectWriteUInt16(buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffff + value + 1;

    for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
      buf[offset + i] = (value & 0xff << 8 * (littleEndian ? i : 1 - i)) >>> (littleEndian ? i : 1 - i) * 8;
    }
  }

  Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }

    return offset + 2;
  };

  Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }

    return offset + 2;
  };

  function objectWriteUInt32(buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffffffff + value + 1;

    for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
      buf[offset + i] = value >>> (littleEndian ? i : 3 - i) * 8 & 0xff;
    }
  }

  Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }

    return offset + 4;
  };

  Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }

    return offset + 4;
  };

  Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;

    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = 0;
    var mul = 1;
    var sub = 0;
    this[offset] = value & 0xFF;

    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }

      this[offset + i] = (value / mul >> 0) - sub & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;

    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = byteLength - 1;
    var mul = 1;
    var sub = 0;
    this[offset + i] = value & 0xFF;

    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }

      this[offset + i] = (value / mul >> 0) - sub & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    if (value < 0) value = 0xff + value + 1;
    this[offset] = value & 0xff;
    return offset + 1;
  };

  Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }

    return offset + 2;
  };

  Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }

    return offset + 2;
  };

  Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }

    return offset + 4;
  };

  Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0) value = 0xffffffff + value + 1;

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }

    return offset + 4;
  };

  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range');
    if (offset < 0) throw new RangeError('Index out of range');
  }

  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }

    write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }

  Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };

  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }

    write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }

  Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  }; // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)


  Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start; // Copy 0 bytes; we're done

    if (end === start) return 0;
    if (target.length === 0 || this.length === 0) return 0; // Fatal error conditions

    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds');
    }

    if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds');
    if (end < 0) throw new RangeError('sourceEnd out of bounds'); // Are we oob?

    if (end > this.length) end = this.length;

    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }

    var len = end - start;
    var i;

    if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      // ascending copy from start
      for (i = 0; i < len; ++i) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
    }

    return len;
  }; // Usage:
  //    buffer.fill(number[, offset[, end]])
  //    buffer.fill(buffer[, offset[, end]])
  //    buffer.fill(string[, offset[, end]][, encoding])


  Buffer.prototype.fill = function fill(val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === 'string') {
      if (typeof start === 'string') {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === 'string') {
        encoding = end;
        end = this.length;
      }

      if (val.length === 1) {
        var code = val.charCodeAt(0);

        if (code < 256) {
          val = code;
        }
      }

      if (encoding !== undefined && typeof encoding !== 'string') {
        throw new TypeError('encoding must be a string');
      }

      if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding);
      }
    } else if (typeof val === 'number') {
      val = val & 255;
    } // Invalid ranges are not set to a default, so can range check early.


    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError('Out of range index');
    }

    if (end <= start) {
      return this;
    }

    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;
    if (!val) val = 0;
    var i;

    if (typeof val === 'number') {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      var bytes = internalIsBuffer(val) ? val : utf8ToBytes(new Buffer(val, encoding).toString());
      var len = bytes.length;

      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }

    return this;
  }; // HELPER FUNCTIONS
  // ================


  var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

  function base64clean(str) {
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = stringtrim(str).replace(INVALID_BASE64_RE, ''); // Node converts strings with length < 2 to ''

    if (str.length < 2) return ''; // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not

    while (str.length % 4 !== 0) {
      str = str + '=';
    }

    return str;
  }

  function stringtrim(str) {
    if (str.trim) return str.trim();
    return str.replace(/^\s+|\s+$/g, '');
  }

  function toHex(n) {
    if (n < 16) return '0' + n.toString(16);
    return n.toString(16);
  }

  function utf8ToBytes(string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];

    for (var i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i); // is surrogate component

      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } // valid lead


          leadSurrogate = codePoint;
          continue;
        } // 2 leads in a row


        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          leadSurrogate = codePoint;
          continue;
        } // valid surrogate pair


        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
      }

      leadSurrogate = null; // encode utf8

      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break;
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break;
        bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break;
        bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break;
        bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else {
        throw new Error('Invalid code point');
      }
    }

    return bytes;
  }

  function asciiToBytes(str) {
    var byteArray = [];

    for (var i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }

    return byteArray;
  }

  function utf16leToBytes(str, units) {
    var c, hi, lo;
    var byteArray = [];

    for (var i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break;
      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }

    return byteArray;
  }

  function base64ToBytes(str) {
    return toByteArray(base64clean(str));
  }

  function blitBuffer(src, dst, offset, length) {
    for (var i = 0; i < length; ++i) {
      if (i + offset >= dst.length || i >= src.length) break;
      dst[i + offset] = src[i];
    }

    return i;
  }

  function isnan(val) {
    return val !== val; // eslint-disable-line no-self-compare
  } // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually


  function isBuffer(obj) {
    return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj));
  }

  function isFastBuffer(obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
  } // For Node v0.10 support. Remove this eventually.


  function isSlowBuffer(obj) {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0));
  }

  var bufferEs6 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    INSPECT_MAX_BYTES: INSPECT_MAX_BYTES,
    kMaxLength: _kMaxLength,
    Buffer: Buffer,
    SlowBuffer: SlowBuffer,
    isBuffer: isBuffer
  });

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function unwrapExports (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  function getCjsExportFromNamespace (n) {
  	return n && n['default'] || n;
  }

  var inherits_browser = createCommonjsModule(function (module) {
    if (typeof Object.create === 'function') {
      // implementation from standard node.js 'util' module
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      // old school shim for old browsers
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;

          var TempCtor = function TempCtor() {};

          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  });

  var safeBuffer = createCommonjsModule(function (module, exports) {
    /* eslint-disable node/no-deprecated-api */
    var Buffer = bufferEs6.Buffer; // alternative to using Object.keys for old browsers

    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }

    if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
      module.exports = bufferEs6;
    } else {
      // Copy properties from require('buffer')
      copyProps(bufferEs6, exports);
      exports.Buffer = SafeBuffer;
    }

    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer(arg, encodingOrOffset, length);
    }

    SafeBuffer.prototype = Object.create(Buffer.prototype); // Copy static methods from Buffer

    copyProps(Buffer, SafeBuffer);

    SafeBuffer.from = function (arg, encodingOrOffset, length) {
      if (typeof arg === 'number') {
        throw new TypeError('Argument must not be a number');
      }

      return Buffer(arg, encodingOrOffset, length);
    };

    SafeBuffer.alloc = function (size, fill, encoding) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number');
      }

      var buf = Buffer(size);

      if (fill !== undefined) {
        if (typeof encoding === 'string') {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }

      return buf;
    };

    SafeBuffer.allocUnsafe = function (size) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number');
      }

      return Buffer(size);
    };

    SafeBuffer.allocUnsafeSlow = function (size) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number');
      }

      return bufferEs6.SlowBuffer(size);
    };
  });
  var safeBuffer_1 = safeBuffer.Buffer;

  var domain; // This constructor is used to store event handlers. Instantiating this is
  // faster than explicitly calling `Object.create(null)` to get a "clean" empty
  // object (tested with v8 v4.9).

  function EventHandlers() {}

  EventHandlers.prototype = Object.create(null);

  function EventEmitter() {
    EventEmitter.init.call(this);
  }
  // require('events') === require('events').EventEmitter

  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.usingDomains = false;
  EventEmitter.prototype.domain = undefined;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined; // By default EventEmitters will print a warning if more than 10 listeners are
  // added to it. This is a useful default which helps finding memory leaks.

  EventEmitter.defaultMaxListeners = 10;

  EventEmitter.init = function () {
    this.domain = null;

    if (EventEmitter.usingDomains) {
      // if there is an active domain, then attach to it.
      if (domain.active && !(this instanceof domain.Domain)) ;
    }

    if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
      this._events = new EventHandlers();
      this._eventsCount = 0;
    }

    this._maxListeners = this._maxListeners || undefined;
  }; // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.


  EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n)) throw new TypeError('"n" argument must be a positive number');
    this._maxListeners = n;
    return this;
  };

  function $getMaxListeners(that) {
    if (that._maxListeners === undefined) return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
  }

  EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return $getMaxListeners(this);
  }; // These standalone emit* functions are used to optimize calling of event
  // handlers for fast cases because emit() itself often has a variable number of
  // arguments and can be deoptimized because of that. These functions always have
  // the same number of arguments and thus do not get deoptimized, so the code
  // inside them can execute faster.


  function emitNone(handler, isFn, self) {
    if (isFn) handler.call(self);else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);

      for (var i = 0; i < len; ++i) {
        listeners[i].call(self);
      }
    }
  }

  function emitOne(handler, isFn, self, arg1) {
    if (isFn) handler.call(self, arg1);else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);

      for (var i = 0; i < len; ++i) {
        listeners[i].call(self, arg1);
      }
    }
  }

  function emitTwo(handler, isFn, self, arg1, arg2) {
    if (isFn) handler.call(self, arg1, arg2);else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);

      for (var i = 0; i < len; ++i) {
        listeners[i].call(self, arg1, arg2);
      }
    }
  }

  function emitThree(handler, isFn, self, arg1, arg2, arg3) {
    if (isFn) handler.call(self, arg1, arg2, arg3);else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);

      for (var i = 0; i < len; ++i) {
        listeners[i].call(self, arg1, arg2, arg3);
      }
    }
  }

  function emitMany(handler, isFn, self, args) {
    if (isFn) handler.apply(self, args);else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);

      for (var i = 0; i < len; ++i) {
        listeners[i].apply(self, args);
      }
    }
  }

  EventEmitter.prototype.emit = function emit(type) {
    var er, handler, len, args, i, events, domain;
    var doError = type === 'error';
    events = this._events;
    if (events) doError = doError && events.error == null;else if (!doError) return false;
    domain = this.domain; // If there is no 'error' event listener then throw.

    if (doError) {
      er = arguments[1];

      if (domain) {
        if (!er) er = new Error('Uncaught, unspecified "error" event');
        er.domainEmitter = this;
        er.domain = domain;
        er.domainThrown = false;
        domain.emit('error', er);
      } else if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }

      return false;
    }

    handler = events[type];
    if (!handler) return false;
    var isFn = typeof handler === 'function';
    len = arguments.length;

    switch (len) {
      // fast cases
      case 1:
        emitNone(handler, isFn, this);
        break;

      case 2:
        emitOne(handler, isFn, this, arguments[1]);
        break;

      case 3:
        emitTwo(handler, isFn, this, arguments[1], arguments[2]);
        break;

      case 4:
        emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
        break;
      // slower

      default:
        args = new Array(len - 1);

        for (i = 1; i < len; i++) {
          args[i - 1] = arguments[i];
        }

        emitMany(handler, isFn, this, args);
    }
    return true;
  };

  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;
    if (typeof listener !== 'function') throw new TypeError('"listener" argument must be a function');
    events = target._events;

    if (!events) {
      events = target._events = new EventHandlers();
      target._eventsCount = 0;
    } else {
      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (events.newListener) {
        target.emit('newListener', type, listener.listener ? listener.listener : listener); // Re-assign `events` because a newListener handler could have caused the
        // this._events to be assigned to a new object

        events = target._events;
      }

      existing = events[type];
    }

    if (!existing) {
      // Optimize the case of one listener. Don't need the extra array object.
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === 'function') {
        // Adding the second element, need to change to array.
        existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      } else {
        // If we've already got an array, just append.
        if (prepend) {
          existing.unshift(listener);
        } else {
          existing.push(listener);
        }
      } // Check for listener leak


      if (!existing.warned) {
        m = $getMaxListeners(target);

        if (m && m > 0 && existing.length > m) {
          existing.warned = true;
          var w = new Error('Possible EventEmitter memory leak detected. ' + existing.length + ' ' + type + ' listeners added. ' + 'Use emitter.setMaxListeners() to increase limit');
          w.name = 'MaxListenersExceededWarning';
          w.emitter = target;
          w.type = type;
          w.count = existing.length;
          emitWarning(w);
        }
      }
    }

    return target;
  }

  function emitWarning(e) {
    typeof console.warn === 'function' ? console.warn(e) : console.log(e);
  }

  EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.prependListener = function prependListener(type, listener) {
    return _addListener(this, type, listener, true);
  };

  function _onceWrap(target, type, listener) {
    var fired = false;

    function g() {
      target.removeListener(type, g);

      if (!fired) {
        fired = true;
        listener.apply(target, arguments);
      }
    }

    g.listener = listener;
    return g;
  }

  EventEmitter.prototype.once = function once(type, listener) {
    if (typeof listener !== 'function') throw new TypeError('"listener" argument must be a function');
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };

  EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
    if (typeof listener !== 'function') throw new TypeError('"listener" argument must be a function');
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
  }; // emits a 'removeListener' event iff the listener was removed


  EventEmitter.prototype.removeListener = function removeListener(type, listener) {
    var list, events, position, i, originalListener;
    if (typeof listener !== 'function') throw new TypeError('"listener" argument must be a function');
    events = this._events;
    if (!events) return this;
    list = events[type];
    if (!list) return this;

    if (list === listener || list.listener && list.listener === listener) {
      if (--this._eventsCount === 0) this._events = new EventHandlers();else {
        delete events[type];
        if (events.removeListener) this.emit('removeListener', type, list.listener || listener);
      }
    } else if (typeof list !== 'function') {
      position = -1;

      for (i = list.length; i-- > 0;) {
        if (list[i] === listener || list[i].listener && list[i].listener === listener) {
          originalListener = list[i].listener;
          position = i;
          break;
        }
      }

      if (position < 0) return this;

      if (list.length === 1) {
        list[0] = undefined;

        if (--this._eventsCount === 0) {
          this._events = new EventHandlers();
          return this;
        } else {
          delete events[type];
        }
      } else {
        spliceOne(list, position);
      }

      if (events.removeListener) this.emit('removeListener', type, originalListener || listener);
    }

    return this;
  };

  EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
    var listeners, events;
    events = this._events;
    if (!events) return this; // not listening for removeListener, no need to emit

    if (!events.removeListener) {
      if (arguments.length === 0) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      } else if (events[type]) {
        if (--this._eventsCount === 0) this._events = new EventHandlers();else delete events[type];
      }

      return this;
    } // emit removeListener for all listeners on all events


    if (arguments.length === 0) {
      var keys = Object.keys(events);

      for (var i = 0, key; i < keys.length; ++i) {
        key = keys[i];
        if (key === 'removeListener') continue;
        this.removeAllListeners(key);
      }

      this.removeAllListeners('removeListener');
      this._events = new EventHandlers();
      this._eventsCount = 0;
      return this;
    }

    listeners = events[type];

    if (typeof listeners === 'function') {
      this.removeListener(type, listeners);
    } else if (listeners) {
      // LIFO order
      do {
        this.removeListener(type, listeners[listeners.length - 1]);
      } while (listeners[0]);
    }

    return this;
  };

  EventEmitter.prototype.listeners = function listeners(type) {
    var evlistener;
    var ret;
    var events = this._events;
    if (!events) ret = [];else {
      evlistener = events[type];
      if (!evlistener) ret = [];else if (typeof evlistener === 'function') ret = [evlistener.listener || evlistener];else ret = unwrapListeners(evlistener);
    }
    return ret;
  };

  EventEmitter.listenerCount = function (emitter, type) {
    if (typeof emitter.listenerCount === 'function') {
      return emitter.listenerCount(type);
    } else {
      return listenerCount.call(emitter, type);
    }
  };

  EventEmitter.prototype.listenerCount = listenerCount;

  function listenerCount(type) {
    var events = this._events;

    if (events) {
      var evlistener = events[type];

      if (typeof evlistener === 'function') {
        return 1;
      } else if (evlistener) {
        return evlistener.length;
      }
    }

    return 0;
  }

  EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
  }; // About 1.5x faster than the two-arg version of Array#splice().


  function spliceOne(list, index) {
    for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1) {
      list[i] = list[k];
    }

    list.pop();
  }

  function arrayClone(arr, i) {
    var copy = new Array(i);

    while (i--) {
      copy[i] = arr[i];
    }

    return copy;
  }

  function unwrapListeners(arr) {
    var ret = new Array(arr.length);

    for (var i = 0; i < ret.length; ++i) {
      ret[i] = arr[i].listener || arr[i];
    }

    return ret;
  }

  // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

  function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
  }

  function defaultClearTimeout() {
    throw new Error('clearTimeout has not been defined');
  }

  var cachedSetTimeout = defaultSetTimout;
  var cachedClearTimeout = defaultClearTimeout;

  if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
  }

  if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
  }

  function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
      //normal enviroments in sane situations
      return setTimeout(fun, 0);
    } // if setTimeout wasn't available but was latter defined


    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
      cachedSetTimeout = setTimeout;
      return setTimeout(fun, 0);
    }

    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedSetTimeout(fun, 0);
    } catch (e) {
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
        return cachedSetTimeout.call(null, fun, 0);
      } catch (e) {
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
        return cachedSetTimeout.call(this, fun, 0);
      }
    }
  }

  function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
      //normal enviroments in sane situations
      return clearTimeout(marker);
    } // if clearTimeout wasn't available but was latter defined


    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
      cachedClearTimeout = clearTimeout;
      return clearTimeout(marker);
    }

    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedClearTimeout(marker);
    } catch (e) {
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
        return cachedClearTimeout.call(null, marker);
      } catch (e) {
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
        // Some versions of I.E. have different rules for clearTimeout vs setTimeout
        return cachedClearTimeout.call(this, marker);
      }
    }
  }

  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
    if (!draining || !currentQueue) {
      return;
    }

    draining = false;

    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }

    if (queue.length) {
      drainQueue();
    }
  }

  function drainQueue() {
    if (draining) {
      return;
    }

    var timeout = runTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;

    while (len) {
      currentQueue = queue;
      queue = [];

      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }

      queueIndex = -1;
      len = queue.length;
    }

    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
  }

  function nextTick(fun) {
    var args = new Array(arguments.length - 1);

    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }

    queue.push(new Item(fun, args));

    if (queue.length === 1 && !draining) {
      runTimeout(drainQueue);
    }
  } // v8 likes predictible objects

  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }

  Item.prototype.run = function () {
    this.fun.apply(null, this.array);
  };

  var performance = global$1.performance || {};

  var performanceNow = performance.now || performance.mozNow || performance.msNow || performance.oNow || performance.webkitNow || function () {
    return new Date().getTime();
  }; // generate timestamp or delta

  var inherits;

  if (typeof Object.create === 'function') {
    inherits = function inherits(ctor, superCtor) {
      // implementation from standard node.js 'util' module
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    inherits = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;

      var TempCtor = function TempCtor() {};

      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }

  var inherits$1 = inherits;

  var formatRegExp = /%[sdj%]/g;
  function format(f) {
    if (!isString(f)) {
      var objects = [];

      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }

      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (x === '%%') return '%';
      if (i >= len) return x;

      switch (x) {
        case '%s':
          return String(args[i++]);

        case '%d':
          return Number(args[i++]);

        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }

        default:
          return x;
      }
    });

    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }

    return str;
  }
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.

  function deprecate(fn, msg) {
    // Allow for deprecating things in the process of starting up.
    if (isUndefined(global$1.process)) {
      return function () {
        return deprecate(fn, msg).apply(this, arguments);
      };
    }

    var warned = false;

    function deprecated() {
      if (!warned) {
        {
          console.error(msg);
        }

        warned = true;
      }

      return fn.apply(this, arguments);
    }

    return deprecated;
  }
  var debugs = {};
  var debugEnviron;
  function debuglog(set) {
    if (isUndefined(debugEnviron)) debugEnviron =  '';
    set = set.toUpperCase();

    if (!debugs[set]) {
      if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
        var pid = 0;

        debugs[set] = function () {
          var msg = format.apply(null, arguments);
          console.error('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function () {};
      }
    }

    return debugs[set];
  }
  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */

  /* legacy: obj, showHidden, depth, colors*/

  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    }; // legacy...

    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];

    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      _extend(ctx, opts);
    } // set default options


    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  } // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics

  inspect.colors = {
    'bold': [1, 22],
    'italic': [3, 23],
    'underline': [4, 24],
    'inverse': [7, 27],
    'white': [37, 39],
    'grey': [90, 39],
    'black': [30, 39],
    'blue': [34, 39],
    'cyan': [36, 39],
    'green': [32, 39],
    'magenta': [35, 39],
    'red': [31, 39],
    'yellow': [33, 39]
  }; // Don't use 'blue' not visible on cmd.exe

  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };

  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return "\x1B[" + inspect.colors[style][0] + 'm' + str + "\x1B[" + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }

  function stylizeNoColor(str, styleType) {
    return str;
  }

  function arrayToHash(array) {
    var hash = {};
    array.forEach(function (val, idx) {
      hash[val] = true;
    });
    return hash;
  }

  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
    value.inspect !== inspect && // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);

      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }

      return ret;
    } // Primitive types cannot have properties


    var primitive = formatPrimitive(ctx, value);

    if (primitive) {
      return primitive;
    } // Look up the keys of the object.


    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    } // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx


    if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    } // Some type of object without properties can be shortcutted.


    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }

      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }

      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }

      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '',
        array = false,
        braces = ['{', '}']; // Make Array say that they are Array

    if (isArray$1(value)) {
      array = true;
      braces = ['[', ']'];
    } // Make functions say that they are functions


    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    } // Make RegExps say that they are RegExps


    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    } // Make dates with properties first say the date


    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    } // Make error with message first say the error


    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);
    var output;

    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function (key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }

  function formatPrimitive(ctx, value) {
    if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');

    if (isString(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }

    if (isNumber(value)) return ctx.stylize('' + value, 'number');
    if (isBoolean(value)) return ctx.stylize('' + value, 'boolean'); // For some reason typeof null is "object", so special case here.

    if (isNull(value)) return ctx.stylize('null', 'null');
  }

  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }

  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];

    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push('');
      }
    }

    keys.forEach(function (key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }

  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {
      value: value[key]
    };

    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }

    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }

    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }

        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function (line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function (line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }

    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }

      name = JSON.stringify('' + key);

      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }

  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function (prev, cur) {
      if (cur.indexOf('\n') >= 0) ;
      return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  } // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.


  function isArray$1(ar) {
    return Array.isArray(ar);
  }
  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }
  function isNull(arg) {
    return arg === null;
  }
  function isNumber(arg) {
    return typeof arg === 'number';
  }
  function isString(arg) {
    return typeof arg === 'string';
  }
  function isUndefined(arg) {
    return arg === void 0;
  }
  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }
  function isObject(arg) {
    return _typeof(arg) === 'object' && arg !== null;
  }
  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }
  function isError(e) {
    return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
  }
  function isFunction(arg) {
    return typeof arg === 'function';
  }
  function isPrimitive(arg) {
    return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || _typeof(arg) === 'symbol' || // ES6 symbol
    typeof arg === 'undefined';
  }

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
  function _extend(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;
    var keys = Object.keys(add);
    var i = keys.length;

    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }

    return origin;
  }

  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  function BufferList() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function (v) {
    var entry = {
      data: v,
      next: null
    };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function (v) {
    var entry = {
      data: v,
      next: this.head
    };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function () {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function () {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function (s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;

    while (p = p.next) {
      ret += s + p.data;
    }

    return ret;
  };

  BufferList.prototype.concat = function (n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;

    while (p) {
      p.data.copy(ret, i);
      i += p.data.length;
      p = p.next;
    }

    return ret;
  };

  // Copyright Joyent, Inc. and other Node contributors.

  var isBufferEncoding = Buffer.isEncoding || function (encoding) {
    switch (encoding && encoding.toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
      case 'raw':
        return true;

      default:
        return false;
    }
  };

  function assertEncoding(encoding) {
    if (encoding && !isBufferEncoding(encoding)) {
      throw new Error('Unknown encoding: ' + encoding);
    }
  } // StringDecoder provides an interface for efficiently splitting a series of
  // buffers into a series of JS strings without breaking apart multi-byte
  // characters. CESU-8 is handled as part of the UTF-8 encoding.
  //
  // @TODO Handling all encodings inside a single object makes it very difficult
  // to reason about this code, so it should be split up in the future.
  // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
  // points as used by CESU-8.


  function StringDecoder(encoding) {
    this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
    assertEncoding(encoding);

    switch (this.encoding) {
      case 'utf8':
        // CESU-8 represents each of Surrogate Pair by 3-bytes
        this.surrogateSize = 3;
        break;

      case 'ucs2':
      case 'utf16le':
        // UTF-16 represents each of Surrogate Pair by 2-bytes
        this.surrogateSize = 2;
        this.detectIncompleteChar = utf16DetectIncompleteChar;
        break;

      case 'base64':
        // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
        this.surrogateSize = 3;
        this.detectIncompleteChar = base64DetectIncompleteChar;
        break;

      default:
        this.write = passThroughWrite;
        return;
    } // Enough space to store all bytes of a single character. UTF-8 needs 4
    // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).


    this.charBuffer = new Buffer(6); // Number of bytes received for the current incomplete multi-byte character.

    this.charReceived = 0; // Number of bytes expected for the current incomplete multi-byte character.

    this.charLength = 0;
  }
  // guaranteed to not contain any partial multi-byte characters. Any partial
  // character found at the end of the buffer is buffered up, and will be
  // returned when calling write again with the remaining bytes.
  //
  // Note: Converting a Buffer containing an orphan surrogate to a String
  // currently works, but converting a String to a Buffer (via `new Buffer`, or
  // Buffer#write) will replace incomplete surrogates with the unicode
  // replacement character. See https://codereview.chromium.org/121173009/ .

  StringDecoder.prototype.write = function (buffer) {
    var charStr = ''; // if our last write ended with an incomplete multibyte character

    while (this.charLength) {
      // determine how many remaining bytes this buffer has to offer for this char
      var available = buffer.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : buffer.length; // add the new bytes to the char buffer

      buffer.copy(this.charBuffer, this.charReceived, 0, available);
      this.charReceived += available;

      if (this.charReceived < this.charLength) {
        // still not enough chars in this buffer? wait for more ...
        return '';
      } // remove bytes belonging to the current character from the buffer


      buffer = buffer.slice(available, buffer.length); // get the character that was split

      charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding); // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character

      var charCode = charStr.charCodeAt(charStr.length - 1);

      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        this.charLength += this.surrogateSize;
        charStr = '';
        continue;
      }

      this.charReceived = this.charLength = 0; // if there are no more bytes in this buffer, just emit our char

      if (buffer.length === 0) {
        return charStr;
      }

      break;
    } // determine and set charLength / charReceived


    this.detectIncompleteChar(buffer);
    var end = buffer.length;

    if (this.charLength) {
      // buffer the incomplete character bytes we got
      buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
      end -= this.charReceived;
    }

    charStr += buffer.toString(this.encoding, 0, end);
    var end = charStr.length - 1;
    var charCode = charStr.charCodeAt(end); // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character

    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      var size = this.surrogateSize;
      this.charLength += size;
      this.charReceived += size;
      this.charBuffer.copy(this.charBuffer, size, 0, size);
      buffer.copy(this.charBuffer, 0, 0, size);
      return charStr.substring(0, end);
    } // or just emit the charStr


    return charStr;
  }; // detectIncompleteChar determines if there is an incomplete UTF-8 character at
  // the end of the given buffer. If so, it sets this.charLength to the byte
  // length that character, and sets this.charReceived to the number of bytes
  // that are available for this character.


  StringDecoder.prototype.detectIncompleteChar = function (buffer) {
    // determine how many bytes we have to check at the end of this buffer
    var i = buffer.length >= 3 ? 3 : buffer.length; // Figure out if one of the last i bytes of our buffer announces an
    // incomplete char.

    for (; i > 0; i--) {
      var c = buffer[buffer.length - i]; // See http://en.wikipedia.org/wiki/UTF-8#Description
      // 110XXXXX

      if (i == 1 && c >> 5 == 0x06) {
        this.charLength = 2;
        break;
      } // 1110XXXX


      if (i <= 2 && c >> 4 == 0x0E) {
        this.charLength = 3;
        break;
      } // 11110XXX


      if (i <= 3 && c >> 3 == 0x1E) {
        this.charLength = 4;
        break;
      }
    }

    this.charReceived = i;
  };

  StringDecoder.prototype.end = function (buffer) {
    var res = '';
    if (buffer && buffer.length) res = this.write(buffer);

    if (this.charReceived) {
      var cr = this.charReceived;
      var buf = this.charBuffer;
      var enc = this.encoding;
      res += buf.slice(0, cr).toString(enc);
    }

    return res;
  };

  function passThroughWrite(buffer) {
    return buffer.toString(this.encoding);
  }

  function utf16DetectIncompleteChar(buffer) {
    this.charReceived = buffer.length % 2;
    this.charLength = this.charReceived ? 2 : 0;
  }

  function base64DetectIncompleteChar(buffer) {
    this.charReceived = buffer.length % 3;
    this.charLength = this.charReceived ? 3 : 0;
  }

  var stringDecoder = /*#__PURE__*/Object.freeze({
    __proto__: null,
    StringDecoder: StringDecoder
  });

  Readable.ReadableState = ReadableState;
  var debug = debuglog('stream');
  inherits$1(Readable, EventEmitter);

  function prependListener(emitter, event, fn) {
    // Sadly this is not cacheable as some libraries bundle their own
    // event emitter implementation with them.
    if (typeof emitter.prependListener === 'function') {
      return emitter.prependListener(event, fn);
    } else {
      // This is a hack to make sure that our error handler is attached before any
      // userland ones.  NEVER DO THIS. This is here only because this code needs
      // to continue to work with older versions of Node.js that do not include
      // the prependListener() method. The goal is to eventually remove this hack.
      if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
    }
  }

  function listenerCount$1(emitter, type) {
    return emitter.listeners(type).length;
  }

  function ReadableState(options, stream) {
    options = options || {}; // object stream flag. Used to make read(n) ignore n and to
    // make all the buffer merging and length checks go away

    this.objectMode = !!options.objectMode;
    if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
    // Note: 0 is a valid value, means "don't call _read preemptively ever"

    var hwm = options.highWaterMark;
    var defaultHwm = this.objectMode ? 16 : 16 * 1024;
    this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm; // cast to ints.

    this.highWaterMark = ~~this.highWaterMark; // A linked list is used to store data chunks instead of an array because the
    // linked list can remove elements from the beginning faster than
    // array.shift()

    this.buffer = new BufferList();
    this.length = 0;
    this.pipes = null;
    this.pipesCount = 0;
    this.flowing = null;
    this.ended = false;
    this.endEmitted = false;
    this.reading = false; // a flag to be able to tell if the onwrite cb is called immediately,
    // or on a later tick.  We set this to true at first, because any
    // actions that shouldn't happen until "later" should generally also
    // not happen before the first write call.

    this.sync = true; // whenever we return null, then we set a flag to say
    // that we're awaiting a 'readable' event emission.

    this.needReadable = false;
    this.emittedReadable = false;
    this.readableListening = false;
    this.resumeScheduled = false; // Crypto is kind of old and crusty.  Historically, its default string
    // encoding is 'binary' so we have to make this configurable.
    // Everything else in the universe uses 'utf8', though.

    this.defaultEncoding = options.defaultEncoding || 'utf8'; // when piping, we only care about 'readable' events that happen
    // after read()ing all the bytes and not getting any pushback.

    this.ranOut = false; // the number of writers that are awaiting a drain event in .pipe()s

    this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

    this.readingMore = false;
    this.decoder = null;
    this.encoding = null;

    if (options.encoding) {
      this.decoder = new StringDecoder(options.encoding);
      this.encoding = options.encoding;
    }
  }
  function Readable(options) {
    if (!(this instanceof Readable)) return new Readable(options);
    this._readableState = new ReadableState(options, this); // legacy

    this.readable = true;
    if (options && typeof options.read === 'function') this._read = options.read;
    EventEmitter.call(this);
  } // Manually shove something into the read() buffer.
  // This returns true if the highWaterMark has not been hit yet,
  // similar to how Writable.write() returns true if you should
  // write() some more.

  Readable.prototype.push = function (chunk, encoding) {
    var state = this._readableState;

    if (!state.objectMode && typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;

      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
    }

    return readableAddChunk(this, state, chunk, encoding, false);
  }; // Unshift should *always* be something directly out of read()


  Readable.prototype.unshift = function (chunk) {
    var state = this._readableState;
    return readableAddChunk(this, state, chunk, '', true);
  };

  Readable.prototype.isPaused = function () {
    return this._readableState.flowing === false;
  };

  function readableAddChunk(stream, state, chunk, encoding, addToFront) {
    var er = chunkInvalid(state, chunk);

    if (er) {
      stream.emit('error', er);
    } else if (chunk === null) {
      state.reading = false;
      onEofChunk(stream, state);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (state.ended && !addToFront) {
        var e = new Error('stream.push() after EOF');
        stream.emit('error', e);
      } else if (state.endEmitted && addToFront) {
        var _e = new Error('stream.unshift() after end event');

        stream.emit('error', _e);
      } else {
        var skipAdd;

        if (state.decoder && !addToFront && !encoding) {
          chunk = state.decoder.write(chunk);
          skipAdd = !state.objectMode && chunk.length === 0;
        }

        if (!addToFront) state.reading = false; // Don't add to the buffer if we've decoded to an empty string chunk and
        // we're not in object mode

        if (!skipAdd) {
          // if we want the data now, just emit it.
          if (state.flowing && state.length === 0 && !state.sync) {
            stream.emit('data', chunk);
            stream.read(0);
          } else {
            // update the buffer info.
            state.length += state.objectMode ? 1 : chunk.length;
            if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
            if (state.needReadable) emitReadable(stream);
          }
        }

        maybeReadMore(stream, state);
      }
    } else if (!addToFront) {
      state.reading = false;
    }

    return needMoreData(state);
  } // if it's past the high water mark, we can push in some more.
  // Also, if we have no data yet, we can stand some
  // more bytes.  This is to work around cases where hwm=0,
  // such as the repl.  Also, if the push() triggered a
  // readable event, and the user called read(largeNumber) such that
  // needReadable was set, then we ought to push more, so that another
  // 'readable' event will be triggered.


  function needMoreData(state) {
    return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
  } // backwards compatibility.


  Readable.prototype.setEncoding = function (enc) {
    this._readableState.decoder = new StringDecoder(enc);
    this._readableState.encoding = enc;
    return this;
  }; // Don't raise the hwm > 8MB


  var MAX_HWM = 0x800000;

  function computeNewHighWaterMark(n) {
    if (n >= MAX_HWM) {
      n = MAX_HWM;
    } else {
      // Get the next highest power of 2 to prevent increasing hwm excessively in
      // tiny amounts
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }

    return n;
  } // This function is designed to be inlinable, so please take care when making
  // changes to the function body.


  function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended) return 0;
    if (state.objectMode) return 1;

    if (n !== n) {
      // Only flow one buffer at a time
      if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
    } // If we're asking for more than the current hwm, then raise the hwm.


    if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
    if (n <= state.length) return n; // Don't have enough

    if (!state.ended) {
      state.needReadable = true;
      return 0;
    }

    return state.length;
  } // you can override either this method, or the async _read(n) below.


  Readable.prototype.read = function (n) {
    debug('read', n);
    n = parseInt(n, 10);
    var state = this._readableState;
    var nOrig = n;
    if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
    // already have a bunch of data in the buffer, then just trigger
    // the 'readable' event and move on.

    if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
      debug('read: emitReadable', state.length, state.ended);
      if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
      return null;
    }

    n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

    if (n === 0 && state.ended) {
      if (state.length === 0) endReadable(this);
      return null;
    } // All the actual chunk generation logic needs to be
    // *below* the call to _read.  The reason is that in certain
    // synthetic stream cases, such as passthrough streams, _read
    // may be a completely synchronous operation which may change
    // the state of the read buffer, providing enough data when
    // before there was *not* enough.
    //
    // So, the steps are:
    // 1. Figure out what the state of things will be after we do
    // a read from the buffer.
    //
    // 2. If that resulting state will trigger a _read, then call _read.
    // Note that this may be asynchronous, or synchronous.  Yes, it is
    // deeply ugly to write APIs this way, but that still doesn't mean
    // that the Readable class should behave improperly, as streams are
    // designed to be sync/async agnostic.
    // Take note if the _read call is sync or async (ie, if the read call
    // has returned yet), so that we know whether or not it's safe to emit
    // 'readable' etc.
    //
    // 3. Actually pull the requested chunks out of the buffer and return.
    // if we need a readable event, then we need to do some reading.


    var doRead = state.needReadable;
    debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

    if (state.length === 0 || state.length - n < state.highWaterMark) {
      doRead = true;
      debug('length less than watermark', doRead);
    } // however, if we've ended, then there's no point, and if we're already
    // reading, then it's unnecessary.


    if (state.ended || state.reading) {
      doRead = false;
      debug('reading or ended', doRead);
    } else if (doRead) {
      debug('do read');
      state.reading = true;
      state.sync = true; // if the length is currently zero, then we *need* a readable event.

      if (state.length === 0) state.needReadable = true; // call internal read method

      this._read(state.highWaterMark);

      state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
      // and we need to re-evaluate how much data we can return to the user.

      if (!state.reading) n = howMuchToRead(nOrig, state);
    }

    var ret;
    if (n > 0) ret = fromList(n, state);else ret = null;

    if (ret === null) {
      state.needReadable = true;
      n = 0;
    } else {
      state.length -= n;
    }

    if (state.length === 0) {
      // If we have nothing in the buffer, then we want to know
      // as soon as we *do* get something into the buffer.
      if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

      if (nOrig !== n && state.ended) endReadable(this);
    }

    if (ret !== null) this.emit('data', ret);
    return ret;
  };

  function chunkInvalid(state, chunk) {
    var er = null;

    if (!isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
      er = new TypeError('Invalid non-string/buffer chunk');
    }

    return er;
  }

  function onEofChunk(stream, state) {
    if (state.ended) return;

    if (state.decoder) {
      var chunk = state.decoder.end();

      if (chunk && chunk.length) {
        state.buffer.push(chunk);
        state.length += state.objectMode ? 1 : chunk.length;
      }
    }

    state.ended = true; // emit 'readable' now to make sure it gets picked up.

    emitReadable(stream);
  } // Don't emit readable right away in sync mode, because this can trigger
  // another read() call => stack overflow.  This way, it might trigger
  // a nextTick recursion warning, but that's not so bad.


  function emitReadable(stream) {
    var state = stream._readableState;
    state.needReadable = false;

    if (!state.emittedReadable) {
      debug('emitReadable', state.flowing);
      state.emittedReadable = true;
      if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
    }
  }

  function emitReadable_(stream) {
    debug('emit readable');
    stream.emit('readable');
    flow(stream);
  } // at this point, the user has presumably seen the 'readable' event,
  // and called read() to consume some data.  that may have triggered
  // in turn another _read(n) call, in which case reading = true if
  // it's in progress.
  // However, if we're not ended, or reading, and the length < hwm,
  // then go ahead and try to read some more preemptively.


  function maybeReadMore(stream, state) {
    if (!state.readingMore) {
      state.readingMore = true;
      nextTick(maybeReadMore_, stream, state);
    }
  }

  function maybeReadMore_(stream, state) {
    var len = state.length;

    while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
      debug('maybeReadMore read 0');
      stream.read(0);
      if (len === state.length) // didn't get any data, stop spinning.
        break;else len = state.length;
    }

    state.readingMore = false;
  } // abstract method.  to be overridden in specific implementation classes.
  // call cb(er, data) where data is <= n in length.
  // for virtual (non-string, non-buffer) streams, "length" is somewhat
  // arbitrary, and perhaps not very meaningful.


  Readable.prototype._read = function (n) {
    this.emit('error', new Error('not implemented'));
  };

  Readable.prototype.pipe = function (dest, pipeOpts) {
    var src = this;
    var state = this._readableState;

    switch (state.pipesCount) {
      case 0:
        state.pipes = dest;
        break;

      case 1:
        state.pipes = [state.pipes, dest];
        break;

      default:
        state.pipes.push(dest);
        break;
    }

    state.pipesCount += 1;
    debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
    var doEnd = !pipeOpts || pipeOpts.end !== false;
    var endFn = doEnd ? onend : cleanup;
    if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);
    dest.on('unpipe', onunpipe);

    function onunpipe(readable) {
      debug('onunpipe');

      if (readable === src) {
        cleanup();
      }
    }

    function onend() {
      debug('onend');
      dest.end();
    } // when the dest drains, it reduces the awaitDrain counter
    // on the source.  This would be more elegant with a .once()
    // handler in flow(), but adding and removing repeatedly is
    // too slow.


    var ondrain = pipeOnDrain(src);
    dest.on('drain', ondrain);
    var cleanedUp = false;

    function cleanup() {
      debug('cleanup'); // cleanup event handlers once the pipe is broken

      dest.removeListener('close', onclose);
      dest.removeListener('finish', onfinish);
      dest.removeListener('drain', ondrain);
      dest.removeListener('error', onerror);
      dest.removeListener('unpipe', onunpipe);
      src.removeListener('end', onend);
      src.removeListener('end', cleanup);
      src.removeListener('data', ondata);
      cleanedUp = true; // if the reader is waiting for a drain event from this
      // specific writer, then it would cause it to never start
      // flowing again.
      // So, if this is awaiting a drain, then we just call it now.
      // If we don't know, then assume that we are waiting for one.

      if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
    } // If the user pushes more data while we're writing to dest then we'll end up
    // in ondata again. However, we only want to increase awaitDrain once because
    // dest will only emit one 'drain' event for the multiple writes.
    // => Introduce a guard on increasing awaitDrain.


    var increasedAwaitDrain = false;
    src.on('data', ondata);

    function ondata(chunk) {
      debug('ondata');
      increasedAwaitDrain = false;
      var ret = dest.write(chunk);

      if (false === ret && !increasedAwaitDrain) {
        // If the user unpiped during `dest.write()`, it is possible
        // to get stuck in a permanently paused state if that write
        // also returned false.
        // => Check whether `dest` is still a piping destination.
        if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
          debug('false write response, pause', src._readableState.awaitDrain);
          src._readableState.awaitDrain++;
          increasedAwaitDrain = true;
        }

        src.pause();
      }
    } // if the dest has an error, then stop piping into it.
    // however, don't suppress the throwing behavior for this.


    function onerror(er) {
      debug('onerror', er);
      unpipe();
      dest.removeListener('error', onerror);
      if (listenerCount$1(dest, 'error') === 0) dest.emit('error', er);
    } // Make sure our error handler is attached before userland ones.


    prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

    function onclose() {
      dest.removeListener('finish', onfinish);
      unpipe();
    }

    dest.once('close', onclose);

    function onfinish() {
      debug('onfinish');
      dest.removeListener('close', onclose);
      unpipe();
    }

    dest.once('finish', onfinish);

    function unpipe() {
      debug('unpipe');
      src.unpipe(dest);
    } // tell the dest that it's being piped to


    dest.emit('pipe', src); // start the flow if it hasn't been started already.

    if (!state.flowing) {
      debug('pipe resume');
      src.resume();
    }

    return dest;
  };

  function pipeOnDrain(src) {
    return function () {
      var state = src._readableState;
      debug('pipeOnDrain', state.awaitDrain);
      if (state.awaitDrain) state.awaitDrain--;

      if (state.awaitDrain === 0 && src.listeners('data').length) {
        state.flowing = true;
        flow(src);
      }
    };
  }

  Readable.prototype.unpipe = function (dest) {
    var state = this._readableState; // if we're not piping anywhere, then do nothing.

    if (state.pipesCount === 0) return this; // just one destination.  most common case.

    if (state.pipesCount === 1) {
      // passed in one, but it's not the right one.
      if (dest && dest !== state.pipes) return this;
      if (!dest) dest = state.pipes; // got a match.

      state.pipes = null;
      state.pipesCount = 0;
      state.flowing = false;
      if (dest) dest.emit('unpipe', this);
      return this;
    } // slow case. multiple pipe destinations.


    if (!dest) {
      // remove all.
      var dests = state.pipes;
      var len = state.pipesCount;
      state.pipes = null;
      state.pipesCount = 0;
      state.flowing = false;

      for (var _i = 0; _i < len; _i++) {
        dests[_i].emit('unpipe', this);
      }

      return this;
    } // try to find the right one.


    var i = indexOf(state.pipes, dest);
    if (i === -1) return this;
    state.pipes.splice(i, 1);
    state.pipesCount -= 1;
    if (state.pipesCount === 1) state.pipes = state.pipes[0];
    dest.emit('unpipe', this);
    return this;
  }; // set up data events if they are asked for
  // Ensure readable listeners eventually get something


  Readable.prototype.on = function (ev, fn) {
    var res = EventEmitter.prototype.on.call(this, ev, fn);

    if (ev === 'data') {
      // Start flowing on next tick if stream isn't explicitly paused
      if (this._readableState.flowing !== false) this.resume();
    } else if (ev === 'readable') {
      var state = this._readableState;

      if (!state.endEmitted && !state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.emittedReadable = false;

        if (!state.reading) {
          nextTick(nReadingNextTick, this);
        } else if (state.length) {
          emitReadable(this);
        }
      }
    }

    return res;
  };

  Readable.prototype.addListener = Readable.prototype.on;

  function nReadingNextTick(self) {
    debug('readable nexttick read 0');
    self.read(0);
  } // pause() and resume() are remnants of the legacy readable stream API
  // If the user uses them, then switch into old mode.


  Readable.prototype.resume = function () {
    var state = this._readableState;

    if (!state.flowing) {
      debug('resume');
      state.flowing = true;
      resume(this, state);
    }

    return this;
  };

  function resume(stream, state) {
    if (!state.resumeScheduled) {
      state.resumeScheduled = true;
      nextTick(resume_, stream, state);
    }
  }

  function resume_(stream, state) {
    if (!state.reading) {
      debug('resume read 0');
      stream.read(0);
    }

    state.resumeScheduled = false;
    state.awaitDrain = 0;
    stream.emit('resume');
    flow(stream);
    if (state.flowing && !state.reading) stream.read(0);
  }

  Readable.prototype.pause = function () {
    debug('call pause flowing=%j', this._readableState.flowing);

    if (false !== this._readableState.flowing) {
      debug('pause');
      this._readableState.flowing = false;
      this.emit('pause');
    }

    return this;
  };

  function flow(stream) {
    var state = stream._readableState;
    debug('flow', state.flowing);

    while (state.flowing && stream.read() !== null) {}
  } // wrap an old-style stream as the async data source.
  // This is *not* part of the readable stream interface.
  // It is an ugly unfortunate mess of history.


  Readable.prototype.wrap = function (stream) {
    var state = this._readableState;
    var paused = false;
    var self = this;
    stream.on('end', function () {
      debug('wrapped end');

      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) self.push(chunk);
      }

      self.push(null);
    });
    stream.on('data', function (chunk) {
      debug('wrapped data');
      if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

      if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
      var ret = self.push(chunk);

      if (!ret) {
        paused = true;
        stream.pause();
      }
    }); // proxy all the other methods.
    // important when wrapping filters and duplexes.

    for (var i in stream) {
      if (this[i] === undefined && typeof stream[i] === 'function') {
        this[i] = function (method) {
          return function () {
            return stream[method].apply(stream, arguments);
          };
        }(i);
      }
    } // proxy certain important events.


    var events = ['error', 'close', 'destroy', 'pause', 'resume'];
    forEach(events, function (ev) {
      stream.on(ev, self.emit.bind(self, ev));
    }); // when we try to consume some more bytes, simply unpause the
    // underlying stream.

    self._read = function (n) {
      debug('wrapped _read', n);

      if (paused) {
        paused = false;
        stream.resume();
      }
    };

    return self;
  }; // exposed for testing purposes only.


  Readable._fromList = fromList; // Pluck off n bytes from an array of buffers.
  // Length is the combined lengths of all the buffers in the list.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.

  function fromList(n, state) {
    // nothing buffered
    if (state.length === 0) return null;
    var ret;
    if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
      // read it all, truncate the list
      if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
      state.buffer.clear();
    } else {
      // read part of list
      ret = fromListPartial(n, state.buffer, state.decoder);
    }
    return ret;
  } // Extracts only enough buffered data to satisfy the amount requested.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.


  function fromListPartial(n, list, hasStrings) {
    var ret;

    if (n < list.head.data.length) {
      // slice is the same for buffers and strings
      ret = list.head.data.slice(0, n);
      list.head.data = list.head.data.slice(n);
    } else if (n === list.head.data.length) {
      // first chunk is a perfect match
      ret = list.shift();
    } else {
      // result spans more than one buffer
      ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
    }

    return ret;
  } // Copies a specified amount of characters from the list of buffered data
  // chunks.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.


  function copyFromBufferString(n, list) {
    var p = list.head;
    var c = 1;
    var ret = p.data;
    n -= ret.length;

    while (p = p.next) {
      var str = p.data;
      var nb = n > str.length ? str.length : n;
      if (nb === str.length) ret += str;else ret += str.slice(0, n);
      n -= nb;

      if (n === 0) {
        if (nb === str.length) {
          ++c;
          if (p.next) list.head = p.next;else list.head = list.tail = null;
        } else {
          list.head = p;
          p.data = str.slice(nb);
        }

        break;
      }

      ++c;
    }

    list.length -= c;
    return ret;
  } // Copies a specified amount of bytes from the list of buffered data chunks.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.


  function copyFromBuffer(n, list) {
    var ret = Buffer.allocUnsafe(n);
    var p = list.head;
    var c = 1;
    p.data.copy(ret);
    n -= p.data.length;

    while (p = p.next) {
      var buf = p.data;
      var nb = n > buf.length ? buf.length : n;
      buf.copy(ret, ret.length - n, 0, nb);
      n -= nb;

      if (n === 0) {
        if (nb === buf.length) {
          ++c;
          if (p.next) list.head = p.next;else list.head = list.tail = null;
        } else {
          list.head = p;
          p.data = buf.slice(nb);
        }

        break;
      }

      ++c;
    }

    list.length -= c;
    return ret;
  }

  function endReadable(stream) {
    var state = stream._readableState; // If we get here before consuming all the bytes, then that is a
    // bug in node.  Should never happen.

    if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

    if (!state.endEmitted) {
      state.ended = true;
      nextTick(endReadableNT, state, stream);
    }
  }

  function endReadableNT(state, stream) {
    // Check that we didn't get one last unshift.
    if (!state.endEmitted && state.length === 0) {
      state.endEmitted = true;
      stream.readable = false;
      stream.emit('end');
    }
  }

  function forEach(xs, f) {
    for (var i = 0, l = xs.length; i < l; i++) {
      f(xs[i], i);
    }
  }

  function indexOf(xs, x) {
    for (var i = 0, l = xs.length; i < l; i++) {
      if (xs[i] === x) return i;
    }

    return -1;
  }

  // A bit simpler than readable streams.
  Writable.WritableState = WritableState;
  inherits$1(Writable, EventEmitter);

  function nop() {}

  function WriteReq(chunk, encoding, cb) {
    this.chunk = chunk;
    this.encoding = encoding;
    this.callback = cb;
    this.next = null;
  }

  function WritableState(options, stream) {
    Object.defineProperty(this, 'buffer', {
      get: deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
    options = options || {}; // object stream flag to indicate whether or not this stream
    // contains buffers or objects.

    this.objectMode = !!options.objectMode;
    if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
    // Note: 0 is a valid value, means that we always return false if
    // the entire buffer is not flushed immediately on write()

    var hwm = options.highWaterMark;
    var defaultHwm = this.objectMode ? 16 : 16 * 1024;
    this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm; // cast to ints.

    this.highWaterMark = ~~this.highWaterMark;
    this.needDrain = false; // at the start of calling end()

    this.ending = false; // when end() has been called, and returned

    this.ended = false; // when 'finish' is emitted

    this.finished = false; // should we decode strings into buffers before passing to _write?
    // this is here so that some node-core streams can optimize string
    // handling at a lower level.

    var noDecode = options.decodeStrings === false;
    this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
    // encoding is 'binary' so we have to make this configurable.
    // Everything else in the universe uses 'utf8', though.

    this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
    // of how much we're waiting to get pushed to some underlying
    // socket or file.

    this.length = 0; // a flag to see when we're in the middle of a write.

    this.writing = false; // when true all writes will be buffered until .uncork() call

    this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
    // or on a later tick.  We set this to true at first, because any
    // actions that shouldn't happen until "later" should generally also
    // not happen before the first write call.

    this.sync = true; // a flag to know if we're processing previously buffered items, which
    // may call the _write() callback in the same tick, so that we don't
    // end up in an overlapped onwrite situation.

    this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

    this.onwrite = function (er) {
      onwrite(stream, er);
    }; // the callback that the user supplies to write(chunk,encoding,cb)


    this.writecb = null; // the amount that is being written when _write is called.

    this.writelen = 0;
    this.bufferedRequest = null;
    this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
    // this must be 0 before 'finish' can be emitted

    this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
    // This is relevant for synchronous Transform streams

    this.prefinished = false; // True if the error was already emitted and should not be thrown again

    this.errorEmitted = false; // count buffered requests

    this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
    // one allocated and free to use, and we maintain at most two

    this.corkedRequestsFree = new CorkedRequest(this);
  }

  WritableState.prototype.getBuffer = function writableStateGetBuffer() {
    var current = this.bufferedRequest;
    var out = [];

    while (current) {
      out.push(current);
      current = current.next;
    }

    return out;
  };
  function Writable(options) {
    // Writable ctor is applied to Duplexes, though they're not
    // instanceof Writable, they're instanceof Readable.
    if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);
    this._writableState = new WritableState(options, this); // legacy.

    this.writable = true;

    if (options) {
      if (typeof options.write === 'function') this._write = options.write;
      if (typeof options.writev === 'function') this._writev = options.writev;
    }

    EventEmitter.call(this);
  } // Otherwise people can pipe Writable streams, which is just wrong.

  Writable.prototype.pipe = function () {
    this.emit('error', new Error('Cannot pipe, not readable'));
  };

  function writeAfterEnd(stream, cb) {
    var er = new Error('write after end'); // TODO: defer error events consistently everywhere, not just the cb

    stream.emit('error', er);
    nextTick(cb, er);
  } // If we get something that is not a buffer, string, null, or undefined,
  // and we're not in objectMode, then that's an error.
  // Otherwise stream chunks are all considered to be of length=1, and the
  // watermarks determine how many objects to keep in the buffer, rather than
  // how many bytes or characters.


  function validChunk(stream, state, chunk, cb) {
    var valid = true;
    var er = false; // Always throw error if a null is written
    // if we are not in object mode then throw
    // if it is not a buffer, string, or undefined.

    if (chunk === null) {
      er = new TypeError('May not write null values to stream');
    } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
      er = new TypeError('Invalid non-string/buffer chunk');
    }

    if (er) {
      stream.emit('error', er);
      nextTick(cb, er);
      valid = false;
    }

    return valid;
  }

  Writable.prototype.write = function (chunk, encoding, cb) {
    var state = this._writableState;
    var ret = false;

    if (typeof encoding === 'function') {
      cb = encoding;
      encoding = null;
    }

    if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
    if (typeof cb !== 'function') cb = nop;
    if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
      state.pendingcb++;
      ret = writeOrBuffer(this, state, chunk, encoding, cb);
    }
    return ret;
  };

  Writable.prototype.cork = function () {
    var state = this._writableState;
    state.corked++;
  };

  Writable.prototype.uncork = function () {
    var state = this._writableState;

    if (state.corked) {
      state.corked--;
      if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
    }
  };

  Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    // node::ParseEncoding() requires lower case.
    if (typeof encoding === 'string') encoding = encoding.toLowerCase();
    if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
    this._writableState.defaultEncoding = encoding;
    return this;
  };

  function decodeChunk(state, chunk, encoding) {
    if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, encoding);
    }

    return chunk;
  } // if we're already writing something, then just put this
  // in the queue, and wait our turn.  Otherwise, call _write
  // If we return false, then we need a drain event, so set that flag.


  function writeOrBuffer(stream, state, chunk, encoding, cb) {
    chunk = decodeChunk(state, chunk, encoding);
    if (Buffer.isBuffer(chunk)) encoding = 'buffer';
    var len = state.objectMode ? 1 : chunk.length;
    state.length += len;
    var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

    if (!ret) state.needDrain = true;

    if (state.writing || state.corked) {
      var last = state.lastBufferedRequest;
      state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);

      if (last) {
        last.next = state.lastBufferedRequest;
      } else {
        state.bufferedRequest = state.lastBufferedRequest;
      }

      state.bufferedRequestCount += 1;
    } else {
      doWrite(stream, state, false, len, chunk, encoding, cb);
    }

    return ret;
  }

  function doWrite(stream, state, writev, len, chunk, encoding, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
    state.sync = false;
  }

  function onwriteError(stream, state, sync, er, cb) {
    --state.pendingcb;
    if (sync) nextTick(cb, er);else cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  }

  function onwriteStateUpdate(state) {
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
  }

  function onwrite(stream, er) {
    var state = stream._writableState;
    var sync = state.sync;
    var cb = state.writecb;
    onwriteStateUpdate(state);
    if (er) onwriteError(stream, state, sync, er, cb);else {
      // Check if we're actually ready to finish, but don't emit yet
      var finished = needFinish(state);

      if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
        clearBuffer(stream, state);
      }

      if (sync) {
        /*<replacement>*/
        nextTick(afterWrite, stream, state, finished, cb);
        /*</replacement>*/
      } else {
        afterWrite(stream, state, finished, cb);
      }
    }
  }

  function afterWrite(stream, state, finished, cb) {
    if (!finished) onwriteDrain(stream, state);
    state.pendingcb--;
    cb();
    finishMaybe(stream, state);
  } // Must force callback to be called on nextTick, so that we don't
  // emit 'drain' before the write() consumer gets the 'false' return
  // value, and has a chance to attach a 'drain' listener.


  function onwriteDrain(stream, state) {
    if (state.length === 0 && state.needDrain) {
      state.needDrain = false;
      stream.emit('drain');
    }
  } // if there's something in the buffer waiting, then process it


  function clearBuffer(stream, state) {
    state.bufferProcessing = true;
    var entry = state.bufferedRequest;

    if (stream._writev && entry && entry.next) {
      // Fast case, write everything using _writev()
      var l = state.bufferedRequestCount;
      var buffer = new Array(l);
      var holder = state.corkedRequestsFree;
      holder.entry = entry;
      var count = 0;

      while (entry) {
        buffer[count] = entry;
        entry = entry.next;
        count += 1;
      }

      doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
      // as the hot path ends with doWrite

      state.pendingcb++;
      state.lastBufferedRequest = null;

      if (holder.next) {
        state.corkedRequestsFree = holder.next;
        holder.next = null;
      } else {
        state.corkedRequestsFree = new CorkedRequest(state);
      }
    } else {
      // Slow case, write chunks one-by-one
      while (entry) {
        var chunk = entry.chunk;
        var encoding = entry.encoding;
        var cb = entry.callback;
        var len = state.objectMode ? 1 : chunk.length;
        doWrite(stream, state, false, len, chunk, encoding, cb);
        entry = entry.next; // if we didn't call the onwrite immediately, then
        // it means that we need to wait until it does.
        // also, that means that the chunk and cb are currently
        // being processed, so move the buffer counter past them.

        if (state.writing) {
          break;
        }
      }

      if (entry === null) state.lastBufferedRequest = null;
    }

    state.bufferedRequestCount = 0;
    state.bufferedRequest = entry;
    state.bufferProcessing = false;
  }

  Writable.prototype._write = function (chunk, encoding, cb) {
    cb(new Error('not implemented'));
  };

  Writable.prototype._writev = null;

  Writable.prototype.end = function (chunk, encoding, cb) {
    var state = this._writableState;

    if (typeof chunk === 'function') {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === 'function') {
      cb = encoding;
      encoding = null;
    }

    if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

    if (state.corked) {
      state.corked = 1;
      this.uncork();
    } // ignore unnecessary end() calls.


    if (!state.ending && !state.finished) endWritable(this, state, cb);
  };

  function needFinish(state) {
    return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
  }

  function prefinish(stream, state) {
    if (!state.prefinished) {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }

  function finishMaybe(stream, state) {
    var need = needFinish(state);

    if (need) {
      if (state.pendingcb === 0) {
        prefinish(stream, state);
        state.finished = true;
        stream.emit('finish');
      } else {
        prefinish(stream, state);
      }
    }

    return need;
  }

  function endWritable(stream, state, cb) {
    state.ending = true;
    finishMaybe(stream, state);

    if (cb) {
      if (state.finished) nextTick(cb);else stream.once('finish', cb);
    }

    state.ended = true;
    stream.writable = false;
  } // It seems a linked list but it is not
  // there will be only 2 of these for each stream


  function CorkedRequest(state) {
    var _this = this;

    this.next = null;
    this.entry = null;

    this.finish = function (err) {
      var entry = _this.entry;
      _this.entry = null;

      while (entry) {
        var cb = entry.callback;
        state.pendingcb--;
        cb(err);
        entry = entry.next;
      }

      if (state.corkedRequestsFree) {
        state.corkedRequestsFree.next = _this;
      } else {
        state.corkedRequestsFree = _this;
      }
    };
  }

  inherits$1(Duplex, Readable);
  var keys = Object.keys(Writable.prototype);

  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
  function Duplex(options) {
    if (!(this instanceof Duplex)) return new Duplex(options);
    Readable.call(this, options);
    Writable.call(this, options);
    if (options && options.readable === false) this.readable = false;
    if (options && options.writable === false) this.writable = false;
    this.allowHalfOpen = true;
    if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;
    this.once('end', onend);
  } // the no-half-open enforcer

  function onend() {
    // if we allow half-open state, or if the writable side ended,
    // then we're ok.
    if (this.allowHalfOpen || this._writableState.ended) return; // no more data can be written.
    // But allow more writes to happen in this tick.

    nextTick(onEndNT, this);
  }

  function onEndNT(self) {
    self.end();
  }

  // a transform stream is a readable/writable stream where you do
  inherits$1(Transform, Duplex);

  function TransformState(stream) {
    this.afterTransform = function (er, data) {
      return afterTransform(stream, er, data);
    };

    this.needTransform = false;
    this.transforming = false;
    this.writecb = null;
    this.writechunk = null;
    this.writeencoding = null;
  }

  function afterTransform(stream, er, data) {
    var ts = stream._transformState;
    ts.transforming = false;
    var cb = ts.writecb;
    if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));
    ts.writechunk = null;
    ts.writecb = null;
    if (data !== null && data !== undefined) stream.push(data);
    cb(er);
    var rs = stream._readableState;
    rs.reading = false;

    if (rs.needReadable || rs.length < rs.highWaterMark) {
      stream._read(rs.highWaterMark);
    }
  }
  function Transform(options) {
    if (!(this instanceof Transform)) return new Transform(options);
    Duplex.call(this, options);
    this._transformState = new TransformState(this); // when the writable side finishes, then flush out anything remaining.

    var stream = this; // start out asking for a readable event once data is transformed.

    this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
    // that Readable wants before the first _read call, so unset the
    // sync guard flag.

    this._readableState.sync = false;

    if (options) {
      if (typeof options.transform === 'function') this._transform = options.transform;
      if (typeof options.flush === 'function') this._flush = options.flush;
    }

    this.once('prefinish', function () {
      if (typeof this._flush === 'function') this._flush(function (er) {
        done(stream, er);
      });else done(stream);
    });
  }

  Transform.prototype.push = function (chunk, encoding) {
    this._transformState.needTransform = false;
    return Duplex.prototype.push.call(this, chunk, encoding);
  }; // This is the part where you do stuff!
  // override this function in implementation classes.
  // 'chunk' is an input chunk.
  //
  // Call `push(newChunk)` to pass along transformed output
  // to the readable side.  You may call 'push' zero or more times.
  //
  // Call `cb(err)` when you are done with this chunk.  If you pass
  // an error, then that'll put the hurt on the whole operation.  If you
  // never call cb(), then you'll never get another chunk.


  Transform.prototype._transform = function (chunk, encoding, cb) {
    throw new Error('Not implemented');
  };

  Transform.prototype._write = function (chunk, encoding, cb) {
    var ts = this._transformState;
    ts.writecb = cb;
    ts.writechunk = chunk;
    ts.writeencoding = encoding;

    if (!ts.transforming) {
      var rs = this._readableState;
      if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
    }
  }; // Doesn't matter what the args are here.
  // _transform does all the work.
  // That we got here means that the readable side wants more data.


  Transform.prototype._read = function (n) {
    var ts = this._transformState;

    if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
      ts.transforming = true;

      this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
    } else {
      // mark that we need a transform, so that any data that comes in
      // will get processed, now that we've asked for it.
      ts.needTransform = true;
    }
  };

  function done(stream, er) {
    if (er) return stream.emit('error', er); // if there's nothing in the write buffer, then that means
    // that nothing more will ever be provided

    var ws = stream._writableState;
    var ts = stream._transformState;
    if (ws.length) throw new Error('Calling transform done when ws.length != 0');
    if (ts.transforming) throw new Error('Calling transform done when still transforming');
    return stream.push(null);
  }

  inherits$1(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough)) return new PassThrough(options);
    Transform.call(this, options);
  }

  PassThrough.prototype._transform = function (chunk, encoding, cb) {
    cb(null, chunk);
  };

  inherits$1(Stream, EventEmitter);
  Stream.Readable = Readable;
  Stream.Writable = Writable;
  Stream.Duplex = Duplex;
  Stream.Transform = Transform;
  Stream.PassThrough = PassThrough; // Backwards-compat with node 0.4.x

  Stream.Stream = Stream;
  // part of this class) is overridden in the Readable class.

  function Stream() {
    EventEmitter.call(this);
  }

  Stream.prototype.pipe = function (dest, options) {
    var source = this;

    function ondata(chunk) {
      if (dest.writable) {
        if (false === dest.write(chunk) && source.pause) {
          source.pause();
        }
      }
    }

    source.on('data', ondata);

    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }

    dest.on('drain', ondrain); // If the 'end' option is not supplied, dest.end() will be called when
    // source gets the 'end' or 'close' events.  Only dest.end() once.

    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on('end', onend);
      source.on('close', onclose);
    }

    var didOnEnd = false;

    function onend() {
      if (didOnEnd) return;
      didOnEnd = true;
      dest.end();
    }

    function onclose() {
      if (didOnEnd) return;
      didOnEnd = true;
      if (typeof dest.destroy === 'function') dest.destroy();
    } // don't leave dangling pipes when there are errors.


    function onerror(er) {
      cleanup();

      if (EventEmitter.listenerCount(this, 'error') === 0) {
        throw er; // Unhandled stream error in pipe.
      }
    }

    source.on('error', onerror);
    dest.on('error', onerror); // remove all the event listeners that were added.

    function cleanup() {
      source.removeListener('data', ondata);
      dest.removeListener('drain', ondrain);
      source.removeListener('end', onend);
      source.removeListener('close', onclose);
      source.removeListener('error', onerror);
      dest.removeListener('error', onerror);
      source.removeListener('end', cleanup);
      source.removeListener('close', cleanup);
      dest.removeListener('close', cleanup);
    }

    source.on('end', cleanup);
    source.on('close', cleanup);
    dest.on('close', cleanup);
    dest.emit('pipe', source); // Allow for unix-like usage: A.pipe(B).pipe(C)

    return dest;
  };

  var Buffer$1 = safeBuffer.Buffer;
  var Transform$1 = Stream.Transform;

  function throwIfNotStringOrBuffer(val, prefix) {
    if (!Buffer$1.isBuffer(val) && typeof val !== 'string') {
      throw new TypeError(prefix + ' must be a string or a buffer');
    }
  }

  function HashBase(blockSize) {
    Transform$1.call(this);
    this._block = Buffer$1.allocUnsafe(blockSize);
    this._blockSize = blockSize;
    this._blockOffset = 0;
    this._length = [0, 0, 0, 0];
    this._finalized = false;
  }

  inherits_browser(HashBase, Transform$1);

  HashBase.prototype._transform = function (chunk, encoding, callback) {
    var error = null;

    try {
      this.update(chunk, encoding);
    } catch (err) {
      error = err;
    }

    callback(error);
  };

  HashBase.prototype._flush = function (callback) {
    var error = null;

    try {
      this.push(this.digest());
    } catch (err) {
      error = err;
    }

    callback(error);
  };

  HashBase.prototype.update = function (data, encoding) {
    throwIfNotStringOrBuffer(data, 'Data');
    if (this._finalized) throw new Error('Digest already called');
    if (!Buffer$1.isBuffer(data)) data = Buffer$1.from(data, encoding); // consume data

    var block = this._block;
    var offset = 0;

    while (this._blockOffset + data.length - offset >= this._blockSize) {
      for (var i = this._blockOffset; i < this._blockSize;) {
        block[i++] = data[offset++];
      }

      this._update();

      this._blockOffset = 0;
    }

    while (offset < data.length) {
      block[this._blockOffset++] = data[offset++];
    } // update length


    for (var j = 0, carry = data.length * 8; carry > 0; ++j) {
      this._length[j] += carry;
      carry = this._length[j] / 0x0100000000 | 0;
      if (carry > 0) this._length[j] -= 0x0100000000 * carry;
    }

    return this;
  };

  HashBase.prototype._update = function () {
    throw new Error('_update is not implemented');
  };

  HashBase.prototype.digest = function (encoding) {
    if (this._finalized) throw new Error('Digest already called');
    this._finalized = true;

    var digest = this._digest();

    if (encoding !== undefined) digest = digest.toString(encoding); // reset state

    this._block.fill(0);

    this._blockOffset = 0;

    for (var i = 0; i < 4; ++i) {
      this._length[i] = 0;
    }

    return digest;
  };

  HashBase.prototype._digest = function () {
    throw new Error('_digest is not implemented');
  };

  var hashBase = HashBase;

  var Buffer$2 = safeBuffer.Buffer;
  var ARRAY16 = new Array(16);

  function MD5() {
    hashBase.call(this, 64); // state

    this._a = 0x67452301;
    this._b = 0xefcdab89;
    this._c = 0x98badcfe;
    this._d = 0x10325476;
  }

  inherits_browser(MD5, hashBase);

  MD5.prototype._update = function () {
    var M = ARRAY16;

    for (var i = 0; i < 16; ++i) {
      M[i] = this._block.readInt32LE(i * 4);
    }

    var a = this._a;
    var b = this._b;
    var c = this._c;
    var d = this._d;
    a = fnF(a, b, c, d, M[0], 0xd76aa478, 7);
    d = fnF(d, a, b, c, M[1], 0xe8c7b756, 12);
    c = fnF(c, d, a, b, M[2], 0x242070db, 17);
    b = fnF(b, c, d, a, M[3], 0xc1bdceee, 22);
    a = fnF(a, b, c, d, M[4], 0xf57c0faf, 7);
    d = fnF(d, a, b, c, M[5], 0x4787c62a, 12);
    c = fnF(c, d, a, b, M[6], 0xa8304613, 17);
    b = fnF(b, c, d, a, M[7], 0xfd469501, 22);
    a = fnF(a, b, c, d, M[8], 0x698098d8, 7);
    d = fnF(d, a, b, c, M[9], 0x8b44f7af, 12);
    c = fnF(c, d, a, b, M[10], 0xffff5bb1, 17);
    b = fnF(b, c, d, a, M[11], 0x895cd7be, 22);
    a = fnF(a, b, c, d, M[12], 0x6b901122, 7);
    d = fnF(d, a, b, c, M[13], 0xfd987193, 12);
    c = fnF(c, d, a, b, M[14], 0xa679438e, 17);
    b = fnF(b, c, d, a, M[15], 0x49b40821, 22);
    a = fnG(a, b, c, d, M[1], 0xf61e2562, 5);
    d = fnG(d, a, b, c, M[6], 0xc040b340, 9);
    c = fnG(c, d, a, b, M[11], 0x265e5a51, 14);
    b = fnG(b, c, d, a, M[0], 0xe9b6c7aa, 20);
    a = fnG(a, b, c, d, M[5], 0xd62f105d, 5);
    d = fnG(d, a, b, c, M[10], 0x02441453, 9);
    c = fnG(c, d, a, b, M[15], 0xd8a1e681, 14);
    b = fnG(b, c, d, a, M[4], 0xe7d3fbc8, 20);
    a = fnG(a, b, c, d, M[9], 0x21e1cde6, 5);
    d = fnG(d, a, b, c, M[14], 0xc33707d6, 9);
    c = fnG(c, d, a, b, M[3], 0xf4d50d87, 14);
    b = fnG(b, c, d, a, M[8], 0x455a14ed, 20);
    a = fnG(a, b, c, d, M[13], 0xa9e3e905, 5);
    d = fnG(d, a, b, c, M[2], 0xfcefa3f8, 9);
    c = fnG(c, d, a, b, M[7], 0x676f02d9, 14);
    b = fnG(b, c, d, a, M[12], 0x8d2a4c8a, 20);
    a = fnH(a, b, c, d, M[5], 0xfffa3942, 4);
    d = fnH(d, a, b, c, M[8], 0x8771f681, 11);
    c = fnH(c, d, a, b, M[11], 0x6d9d6122, 16);
    b = fnH(b, c, d, a, M[14], 0xfde5380c, 23);
    a = fnH(a, b, c, d, M[1], 0xa4beea44, 4);
    d = fnH(d, a, b, c, M[4], 0x4bdecfa9, 11);
    c = fnH(c, d, a, b, M[7], 0xf6bb4b60, 16);
    b = fnH(b, c, d, a, M[10], 0xbebfbc70, 23);
    a = fnH(a, b, c, d, M[13], 0x289b7ec6, 4);
    d = fnH(d, a, b, c, M[0], 0xeaa127fa, 11);
    c = fnH(c, d, a, b, M[3], 0xd4ef3085, 16);
    b = fnH(b, c, d, a, M[6], 0x04881d05, 23);
    a = fnH(a, b, c, d, M[9], 0xd9d4d039, 4);
    d = fnH(d, a, b, c, M[12], 0xe6db99e5, 11);
    c = fnH(c, d, a, b, M[15], 0x1fa27cf8, 16);
    b = fnH(b, c, d, a, M[2], 0xc4ac5665, 23);
    a = fnI(a, b, c, d, M[0], 0xf4292244, 6);
    d = fnI(d, a, b, c, M[7], 0x432aff97, 10);
    c = fnI(c, d, a, b, M[14], 0xab9423a7, 15);
    b = fnI(b, c, d, a, M[5], 0xfc93a039, 21);
    a = fnI(a, b, c, d, M[12], 0x655b59c3, 6);
    d = fnI(d, a, b, c, M[3], 0x8f0ccc92, 10);
    c = fnI(c, d, a, b, M[10], 0xffeff47d, 15);
    b = fnI(b, c, d, a, M[1], 0x85845dd1, 21);
    a = fnI(a, b, c, d, M[8], 0x6fa87e4f, 6);
    d = fnI(d, a, b, c, M[15], 0xfe2ce6e0, 10);
    c = fnI(c, d, a, b, M[6], 0xa3014314, 15);
    b = fnI(b, c, d, a, M[13], 0x4e0811a1, 21);
    a = fnI(a, b, c, d, M[4], 0xf7537e82, 6);
    d = fnI(d, a, b, c, M[11], 0xbd3af235, 10);
    c = fnI(c, d, a, b, M[2], 0x2ad7d2bb, 15);
    b = fnI(b, c, d, a, M[9], 0xeb86d391, 21);
    this._a = this._a + a | 0;
    this._b = this._b + b | 0;
    this._c = this._c + c | 0;
    this._d = this._d + d | 0;
  };

  MD5.prototype._digest = function () {
    // create padding and handle blocks
    this._block[this._blockOffset++] = 0x80;

    if (this._blockOffset > 56) {
      this._block.fill(0, this._blockOffset, 64);

      this._update();

      this._blockOffset = 0;
    }

    this._block.fill(0, this._blockOffset, 56);

    this._block.writeUInt32LE(this._length[0], 56);

    this._block.writeUInt32LE(this._length[1], 60);

    this._update(); // produce result


    var buffer = Buffer$2.allocUnsafe(16);
    buffer.writeInt32LE(this._a, 0);
    buffer.writeInt32LE(this._b, 4);
    buffer.writeInt32LE(this._c, 8);
    buffer.writeInt32LE(this._d, 12);
    return buffer;
  };

  function rotl(x, n) {
    return x << n | x >>> 32 - n;
  }

  function fnF(a, b, c, d, m, k, s) {
    return rotl(a + (b & c | ~b & d) + m + k | 0, s) + b | 0;
  }

  function fnG(a, b, c, d, m, k, s) {
    return rotl(a + (b & d | c & ~d) + m + k | 0, s) + b | 0;
  }

  function fnH(a, b, c, d, m, k, s) {
    return rotl(a + (b ^ c ^ d) + m + k | 0, s) + b | 0;
  }

  function fnI(a, b, c, d, m, k, s) {
    return rotl(a + (c ^ (b | ~d)) + m + k | 0, s) + b | 0;
  }

  var md5_js = MD5;

  var Buffer$3 = bufferEs6.Buffer;
  var ARRAY16$1 = new Array(16);
  var zl = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
  var zr = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
  var sl = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
  var sr = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
  var hl = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
  var hr = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];

  function RIPEMD160() {
    hashBase.call(this, 64); // state

    this._a = 0x67452301;
    this._b = 0xefcdab89;
    this._c = 0x98badcfe;
    this._d = 0x10325476;
    this._e = 0xc3d2e1f0;
  }

  inherits_browser(RIPEMD160, hashBase);

  RIPEMD160.prototype._update = function () {
    var words = ARRAY16$1;

    for (var j = 0; j < 16; ++j) {
      words[j] = this._block.readInt32LE(j * 4);
    }

    var al = this._a | 0;
    var bl = this._b | 0;
    var cl = this._c | 0;
    var dl = this._d | 0;
    var el = this._e | 0;
    var ar = this._a | 0;
    var br = this._b | 0;
    var cr = this._c | 0;
    var dr = this._d | 0;
    var er = this._e | 0; // computation

    for (var i = 0; i < 80; i += 1) {
      var tl;
      var tr;

      if (i < 16) {
        tl = fn1(al, bl, cl, dl, el, words[zl[i]], hl[0], sl[i]);
        tr = fn5(ar, br, cr, dr, er, words[zr[i]], hr[0], sr[i]);
      } else if (i < 32) {
        tl = fn2(al, bl, cl, dl, el, words[zl[i]], hl[1], sl[i]);
        tr = fn4(ar, br, cr, dr, er, words[zr[i]], hr[1], sr[i]);
      } else if (i < 48) {
        tl = fn3(al, bl, cl, dl, el, words[zl[i]], hl[2], sl[i]);
        tr = fn3(ar, br, cr, dr, er, words[zr[i]], hr[2], sr[i]);
      } else if (i < 64) {
        tl = fn4(al, bl, cl, dl, el, words[zl[i]], hl[3], sl[i]);
        tr = fn2(ar, br, cr, dr, er, words[zr[i]], hr[3], sr[i]);
      } else {
        // if (i<80) {
        tl = fn5(al, bl, cl, dl, el, words[zl[i]], hl[4], sl[i]);
        tr = fn1(ar, br, cr, dr, er, words[zr[i]], hr[4], sr[i]);
      }

      al = el;
      el = dl;
      dl = rotl$1(cl, 10);
      cl = bl;
      bl = tl;
      ar = er;
      er = dr;
      dr = rotl$1(cr, 10);
      cr = br;
      br = tr;
    } // update state


    var t = this._b + cl + dr | 0;
    this._b = this._c + dl + er | 0;
    this._c = this._d + el + ar | 0;
    this._d = this._e + al + br | 0;
    this._e = this._a + bl + cr | 0;
    this._a = t;
  };

  RIPEMD160.prototype._digest = function () {
    // create padding and handle blocks
    this._block[this._blockOffset++] = 0x80;

    if (this._blockOffset > 56) {
      this._block.fill(0, this._blockOffset, 64);

      this._update();

      this._blockOffset = 0;
    }

    this._block.fill(0, this._blockOffset, 56);

    this._block.writeUInt32LE(this._length[0], 56);

    this._block.writeUInt32LE(this._length[1], 60);

    this._update(); // produce result


    var buffer = Buffer$3.alloc ? Buffer$3.alloc(20) : new Buffer$3(20);
    buffer.writeInt32LE(this._a, 0);
    buffer.writeInt32LE(this._b, 4);
    buffer.writeInt32LE(this._c, 8);
    buffer.writeInt32LE(this._d, 12);
    buffer.writeInt32LE(this._e, 16);
    return buffer;
  };

  function rotl$1(x, n) {
    return x << n | x >>> 32 - n;
  }

  function fn1(a, b, c, d, e, m, k, s) {
    return rotl$1(a + (b ^ c ^ d) + m + k | 0, s) + e | 0;
  }

  function fn2(a, b, c, d, e, m, k, s) {
    return rotl$1(a + (b & c | ~b & d) + m + k | 0, s) + e | 0;
  }

  function fn3(a, b, c, d, e, m, k, s) {
    return rotl$1(a + ((b | ~c) ^ d) + m + k | 0, s) + e | 0;
  }

  function fn4(a, b, c, d, e, m, k, s) {
    return rotl$1(a + (b & d | c & ~d) + m + k | 0, s) + e | 0;
  }

  function fn5(a, b, c, d, e, m, k, s) {
    return rotl$1(a + (b ^ (c | ~d)) + m + k | 0, s) + e | 0;
  }

  var ripemd160 = RIPEMD160;

  var Buffer$4 = safeBuffer.Buffer; // prototype class for hash functions

  function Hash(blockSize, finalSize) {
    this._block = Buffer$4.alloc(blockSize);
    this._finalSize = finalSize;
    this._blockSize = blockSize;
    this._len = 0;
  }

  Hash.prototype.update = function (data, enc) {
    if (typeof data === 'string') {
      enc = enc || 'utf8';
      data = Buffer$4.from(data, enc);
    }

    var block = this._block;
    var blockSize = this._blockSize;
    var length = data.length;
    var accum = this._len;

    for (var offset = 0; offset < length;) {
      var assigned = accum % blockSize;
      var remainder = Math.min(length - offset, blockSize - assigned);

      for (var i = 0; i < remainder; i++) {
        block[assigned + i] = data[offset + i];
      }

      accum += remainder;
      offset += remainder;

      if (accum % blockSize === 0) {
        this._update(block);
      }
    }

    this._len += length;
    return this;
  };

  Hash.prototype.digest = function (enc) {
    var rem = this._len % this._blockSize;
    this._block[rem] = 0x80; // zero (rem + 1) trailing bits, where (rem + 1) is the smallest
    // non-negative solution to the equation (length + 1 + (rem + 1)) === finalSize mod blockSize

    this._block.fill(0, rem + 1);

    if (rem >= this._finalSize) {
      this._update(this._block);

      this._block.fill(0);
    }

    var bits = this._len * 8; // uint32

    if (bits <= 0xffffffff) {
      this._block.writeUInt32BE(bits, this._blockSize - 4); // uint64

    } else {
      var lowBits = (bits & 0xffffffff) >>> 0;
      var highBits = (bits - lowBits) / 0x100000000;

      this._block.writeUInt32BE(highBits, this._blockSize - 8);

      this._block.writeUInt32BE(lowBits, this._blockSize - 4);
    }

    this._update(this._block);

    var hash = this._hash();

    return enc ? hash.toString(enc) : hash;
  };

  Hash.prototype._update = function () {
    throw new Error('_update must be implemented by subclass');
  };

  var hash = Hash;

  /*
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
   * in FIPS PUB 180-1
   * This source code is derived from sha1.js of the same repository.
   * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
   * operation was added.
   */

  var Buffer$5 = safeBuffer.Buffer;
  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];
  var W = new Array(80);

  function Sha() {
    this.init();
    this._w = W;
    hash.call(this, 64, 56);
  }

  inherits_browser(Sha, hash);

  Sha.prototype.init = function () {
    this._a = 0x67452301;
    this._b = 0xefcdab89;
    this._c = 0x98badcfe;
    this._d = 0x10325476;
    this._e = 0xc3d2e1f0;
    return this;
  };

  function rotl5(num) {
    return num << 5 | num >>> 27;
  }

  function rotl30(num) {
    return num << 30 | num >>> 2;
  }

  function ft(s, b, c, d) {
    if (s === 0) return b & c | ~b & d;
    if (s === 2) return b & c | b & d | c & d;
    return b ^ c ^ d;
  }

  Sha.prototype._update = function (M) {
    var W = this._w;
    var a = this._a | 0;
    var b = this._b | 0;
    var c = this._c | 0;
    var d = this._d | 0;
    var e = this._e | 0;

    for (var i = 0; i < 16; ++i) {
      W[i] = M.readInt32BE(i * 4);
    }

    for (; i < 80; ++i) {
      W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
    }

    for (var j = 0; j < 80; ++j) {
      var s = ~~(j / 20);
      var t = rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s] | 0;
      e = d;
      d = c;
      c = rotl30(b);
      b = a;
      a = t;
    }

    this._a = a + this._a | 0;
    this._b = b + this._b | 0;
    this._c = c + this._c | 0;
    this._d = d + this._d | 0;
    this._e = e + this._e | 0;
  };

  Sha.prototype._hash = function () {
    var H = Buffer$5.allocUnsafe(20);
    H.writeInt32BE(this._a | 0, 0);
    H.writeInt32BE(this._b | 0, 4);
    H.writeInt32BE(this._c | 0, 8);
    H.writeInt32BE(this._d | 0, 12);
    H.writeInt32BE(this._e | 0, 16);
    return H;
  };

  var sha = Sha;

  /*
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
   * in FIPS PUB 180-1
   * Version 2.1a Copyright Paul Johnston 2000 - 2002.
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   * Distributed under the BSD License
   * See http://pajhome.org.uk/crypt/md5 for details.
   */

  var Buffer$6 = safeBuffer.Buffer;
  var K$1 = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];
  var W$1 = new Array(80);

  function Sha1() {
    this.init();
    this._w = W$1;
    hash.call(this, 64, 56);
  }

  inherits_browser(Sha1, hash);

  Sha1.prototype.init = function () {
    this._a = 0x67452301;
    this._b = 0xefcdab89;
    this._c = 0x98badcfe;
    this._d = 0x10325476;
    this._e = 0xc3d2e1f0;
    return this;
  };

  function rotl1(num) {
    return num << 1 | num >>> 31;
  }

  function rotl5$1(num) {
    return num << 5 | num >>> 27;
  }

  function rotl30$1(num) {
    return num << 30 | num >>> 2;
  }

  function ft$1(s, b, c, d) {
    if (s === 0) return b & c | ~b & d;
    if (s === 2) return b & c | b & d | c & d;
    return b ^ c ^ d;
  }

  Sha1.prototype._update = function (M) {
    var W = this._w;
    var a = this._a | 0;
    var b = this._b | 0;
    var c = this._c | 0;
    var d = this._d | 0;
    var e = this._e | 0;

    for (var i = 0; i < 16; ++i) {
      W[i] = M.readInt32BE(i * 4);
    }

    for (; i < 80; ++i) {
      W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]);
    }

    for (var j = 0; j < 80; ++j) {
      var s = ~~(j / 20);
      var t = rotl5$1(a) + ft$1(s, b, c, d) + e + W[j] + K$1[s] | 0;
      e = d;
      d = c;
      c = rotl30$1(b);
      b = a;
      a = t;
    }

    this._a = a + this._a | 0;
    this._b = b + this._b | 0;
    this._c = c + this._c | 0;
    this._d = d + this._d | 0;
    this._e = e + this._e | 0;
  };

  Sha1.prototype._hash = function () {
    var H = Buffer$6.allocUnsafe(20);
    H.writeInt32BE(this._a | 0, 0);
    H.writeInt32BE(this._b | 0, 4);
    H.writeInt32BE(this._c | 0, 8);
    H.writeInt32BE(this._d | 0, 12);
    H.writeInt32BE(this._e | 0, 16);
    return H;
  };

  var sha1 = Sha1;

  /**
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
   * in FIPS 180-2
   * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   *
   */

  var Buffer$7 = safeBuffer.Buffer;
  var K$2 = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
  var W$2 = new Array(64);

  function Sha256() {
    this.init();
    this._w = W$2; // new Array(64)

    hash.call(this, 64, 56);
  }

  inherits_browser(Sha256, hash);

  Sha256.prototype.init = function () {
    this._a = 0x6a09e667;
    this._b = 0xbb67ae85;
    this._c = 0x3c6ef372;
    this._d = 0xa54ff53a;
    this._e = 0x510e527f;
    this._f = 0x9b05688c;
    this._g = 0x1f83d9ab;
    this._h = 0x5be0cd19;
    return this;
  };

  function ch(x, y, z) {
    return z ^ x & (y ^ z);
  }

  function maj(x, y, z) {
    return x & y | z & (x | y);
  }

  function sigma0(x) {
    return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10);
  }

  function sigma1(x) {
    return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7);
  }

  function gamma0(x) {
    return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ x >>> 3;
  }

  function gamma1(x) {
    return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ x >>> 10;
  }

  Sha256.prototype._update = function (M) {
    var W = this._w;
    var a = this._a | 0;
    var b = this._b | 0;
    var c = this._c | 0;
    var d = this._d | 0;
    var e = this._e | 0;
    var f = this._f | 0;
    var g = this._g | 0;
    var h = this._h | 0;

    for (var i = 0; i < 16; ++i) {
      W[i] = M.readInt32BE(i * 4);
    }

    for (; i < 64; ++i) {
      W[i] = gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16] | 0;
    }

    for (var j = 0; j < 64; ++j) {
      var T1 = h + sigma1(e) + ch(e, f, g) + K$2[j] + W[j] | 0;
      var T2 = sigma0(a) + maj(a, b, c) | 0;
      h = g;
      g = f;
      f = e;
      e = d + T1 | 0;
      d = c;
      c = b;
      b = a;
      a = T1 + T2 | 0;
    }

    this._a = a + this._a | 0;
    this._b = b + this._b | 0;
    this._c = c + this._c | 0;
    this._d = d + this._d | 0;
    this._e = e + this._e | 0;
    this._f = f + this._f | 0;
    this._g = g + this._g | 0;
    this._h = h + this._h | 0;
  };

  Sha256.prototype._hash = function () {
    var H = Buffer$7.allocUnsafe(32);
    H.writeInt32BE(this._a, 0);
    H.writeInt32BE(this._b, 4);
    H.writeInt32BE(this._c, 8);
    H.writeInt32BE(this._d, 12);
    H.writeInt32BE(this._e, 16);
    H.writeInt32BE(this._f, 20);
    H.writeInt32BE(this._g, 24);
    H.writeInt32BE(this._h, 28);
    return H;
  };

  var sha256 = Sha256;

  /**
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
   * in FIPS 180-2
   * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   *
   */

  var Buffer$8 = safeBuffer.Buffer;
  var W$3 = new Array(64);

  function Sha224() {
    this.init();
    this._w = W$3; // new Array(64)

    hash.call(this, 64, 56);
  }

  inherits_browser(Sha224, sha256);

  Sha224.prototype.init = function () {
    this._a = 0xc1059ed8;
    this._b = 0x367cd507;
    this._c = 0x3070dd17;
    this._d = 0xf70e5939;
    this._e = 0xffc00b31;
    this._f = 0x68581511;
    this._g = 0x64f98fa7;
    this._h = 0xbefa4fa4;
    return this;
  };

  Sha224.prototype._hash = function () {
    var H = Buffer$8.allocUnsafe(28);
    H.writeInt32BE(this._a, 0);
    H.writeInt32BE(this._b, 4);
    H.writeInt32BE(this._c, 8);
    H.writeInt32BE(this._d, 12);
    H.writeInt32BE(this._e, 16);
    H.writeInt32BE(this._f, 20);
    H.writeInt32BE(this._g, 24);
    return H;
  };

  var sha224 = Sha224;

  var Buffer$9 = safeBuffer.Buffer;
  var K$3 = [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];
  var W$4 = new Array(160);

  function Sha512() {
    this.init();
    this._w = W$4;
    hash.call(this, 128, 112);
  }

  inherits_browser(Sha512, hash);

  Sha512.prototype.init = function () {
    this._ah = 0x6a09e667;
    this._bh = 0xbb67ae85;
    this._ch = 0x3c6ef372;
    this._dh = 0xa54ff53a;
    this._eh = 0x510e527f;
    this._fh = 0x9b05688c;
    this._gh = 0x1f83d9ab;
    this._hh = 0x5be0cd19;
    this._al = 0xf3bcc908;
    this._bl = 0x84caa73b;
    this._cl = 0xfe94f82b;
    this._dl = 0x5f1d36f1;
    this._el = 0xade682d1;
    this._fl = 0x2b3e6c1f;
    this._gl = 0xfb41bd6b;
    this._hl = 0x137e2179;
    return this;
  };

  function Ch(x, y, z) {
    return z ^ x & (y ^ z);
  }

  function maj$1(x, y, z) {
    return x & y | z & (x | y);
  }

  function sigma0$1(x, xl) {
    return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25);
  }

  function sigma1$1(x, xl) {
    return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23);
  }

  function Gamma0(x, xl) {
    return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ x >>> 7;
  }

  function Gamma0l(x, xl) {
    return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25);
  }

  function Gamma1(x, xl) {
    return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ x >>> 6;
  }

  function Gamma1l(x, xl) {
    return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26);
  }

  function getCarry(a, b) {
    return a >>> 0 < b >>> 0 ? 1 : 0;
  }

  Sha512.prototype._update = function (M) {
    var W = this._w;
    var ah = this._ah | 0;
    var bh = this._bh | 0;
    var ch = this._ch | 0;
    var dh = this._dh | 0;
    var eh = this._eh | 0;
    var fh = this._fh | 0;
    var gh = this._gh | 0;
    var hh = this._hh | 0;
    var al = this._al | 0;
    var bl = this._bl | 0;
    var cl = this._cl | 0;
    var dl = this._dl | 0;
    var el = this._el | 0;
    var fl = this._fl | 0;
    var gl = this._gl | 0;
    var hl = this._hl | 0;

    for (var i = 0; i < 32; i += 2) {
      W[i] = M.readInt32BE(i * 4);
      W[i + 1] = M.readInt32BE(i * 4 + 4);
    }

    for (; i < 160; i += 2) {
      var xh = W[i - 15 * 2];
      var xl = W[i - 15 * 2 + 1];
      var gamma0 = Gamma0(xh, xl);
      var gamma0l = Gamma0l(xl, xh);
      xh = W[i - 2 * 2];
      xl = W[i - 2 * 2 + 1];
      var gamma1 = Gamma1(xh, xl);
      var gamma1l = Gamma1l(xl, xh); // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]

      var Wi7h = W[i - 7 * 2];
      var Wi7l = W[i - 7 * 2 + 1];
      var Wi16h = W[i - 16 * 2];
      var Wi16l = W[i - 16 * 2 + 1];
      var Wil = gamma0l + Wi7l | 0;
      var Wih = gamma0 + Wi7h + getCarry(Wil, gamma0l) | 0;
      Wil = Wil + gamma1l | 0;
      Wih = Wih + gamma1 + getCarry(Wil, gamma1l) | 0;
      Wil = Wil + Wi16l | 0;
      Wih = Wih + Wi16h + getCarry(Wil, Wi16l) | 0;
      W[i] = Wih;
      W[i + 1] = Wil;
    }

    for (var j = 0; j < 160; j += 2) {
      Wih = W[j];
      Wil = W[j + 1];
      var majh = maj$1(ah, bh, ch);
      var majl = maj$1(al, bl, cl);
      var sigma0h = sigma0$1(ah, al);
      var sigma0l = sigma0$1(al, ah);
      var sigma1h = sigma1$1(eh, el);
      var sigma1l = sigma1$1(el, eh); // t1 = h + sigma1 + ch + K[j] + W[j]

      var Kih = K$3[j];
      var Kil = K$3[j + 1];
      var chh = Ch(eh, fh, gh);
      var chl = Ch(el, fl, gl);
      var t1l = hl + sigma1l | 0;
      var t1h = hh + sigma1h + getCarry(t1l, hl) | 0;
      t1l = t1l + chl | 0;
      t1h = t1h + chh + getCarry(t1l, chl) | 0;
      t1l = t1l + Kil | 0;
      t1h = t1h + Kih + getCarry(t1l, Kil) | 0;
      t1l = t1l + Wil | 0;
      t1h = t1h + Wih + getCarry(t1l, Wil) | 0; // t2 = sigma0 + maj

      var t2l = sigma0l + majl | 0;
      var t2h = sigma0h + majh + getCarry(t2l, sigma0l) | 0;
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      el = dl + t1l | 0;
      eh = dh + t1h + getCarry(el, dl) | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      al = t1l + t2l | 0;
      ah = t1h + t2h + getCarry(al, t1l) | 0;
    }

    this._al = this._al + al | 0;
    this._bl = this._bl + bl | 0;
    this._cl = this._cl + cl | 0;
    this._dl = this._dl + dl | 0;
    this._el = this._el + el | 0;
    this._fl = this._fl + fl | 0;
    this._gl = this._gl + gl | 0;
    this._hl = this._hl + hl | 0;
    this._ah = this._ah + ah + getCarry(this._al, al) | 0;
    this._bh = this._bh + bh + getCarry(this._bl, bl) | 0;
    this._ch = this._ch + ch + getCarry(this._cl, cl) | 0;
    this._dh = this._dh + dh + getCarry(this._dl, dl) | 0;
    this._eh = this._eh + eh + getCarry(this._el, el) | 0;
    this._fh = this._fh + fh + getCarry(this._fl, fl) | 0;
    this._gh = this._gh + gh + getCarry(this._gl, gl) | 0;
    this._hh = this._hh + hh + getCarry(this._hl, hl) | 0;
  };

  Sha512.prototype._hash = function () {
    var H = Buffer$9.allocUnsafe(64);

    function writeInt64BE(h, l, offset) {
      H.writeInt32BE(h, offset);
      H.writeInt32BE(l, offset + 4);
    }

    writeInt64BE(this._ah, this._al, 0);
    writeInt64BE(this._bh, this._bl, 8);
    writeInt64BE(this._ch, this._cl, 16);
    writeInt64BE(this._dh, this._dl, 24);
    writeInt64BE(this._eh, this._el, 32);
    writeInt64BE(this._fh, this._fl, 40);
    writeInt64BE(this._gh, this._gl, 48);
    writeInt64BE(this._hh, this._hl, 56);
    return H;
  };

  var sha512 = Sha512;

  var Buffer$a = safeBuffer.Buffer;
  var W$5 = new Array(160);

  function Sha384() {
    this.init();
    this._w = W$5;
    hash.call(this, 128, 112);
  }

  inherits_browser(Sha384, sha512);

  Sha384.prototype.init = function () {
    this._ah = 0xcbbb9d5d;
    this._bh = 0x629a292a;
    this._ch = 0x9159015a;
    this._dh = 0x152fecd8;
    this._eh = 0x67332667;
    this._fh = 0x8eb44a87;
    this._gh = 0xdb0c2e0d;
    this._hh = 0x47b5481d;
    this._al = 0xc1059ed8;
    this._bl = 0x367cd507;
    this._cl = 0x3070dd17;
    this._dl = 0xf70e5939;
    this._el = 0xffc00b31;
    this._fl = 0x68581511;
    this._gl = 0x64f98fa7;
    this._hl = 0xbefa4fa4;
    return this;
  };

  Sha384.prototype._hash = function () {
    var H = Buffer$a.allocUnsafe(48);

    function writeInt64BE(h, l, offset) {
      H.writeInt32BE(h, offset);
      H.writeInt32BE(l, offset + 4);
    }

    writeInt64BE(this._ah, this._al, 0);
    writeInt64BE(this._bh, this._bl, 8);
    writeInt64BE(this._ch, this._cl, 16);
    writeInt64BE(this._dh, this._dl, 24);
    writeInt64BE(this._eh, this._el, 32);
    writeInt64BE(this._fh, this._fl, 40);
    return H;
  };

  var sha384 = Sha384;

  var sha_js = createCommonjsModule(function (module) {
    var exports = module.exports = function SHA(algorithm) {
      algorithm = algorithm.toLowerCase();
      var Algorithm = exports[algorithm];
      if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)');
      return new Algorithm();
    };

    exports.sha = sha;
    exports.sha1 = sha1;
    exports.sha224 = sha224;
    exports.sha256 = sha256;
    exports.sha384 = sha384;
    exports.sha512 = sha512;
  });

  var Buffer$b = safeBuffer.Buffer;
  var Transform$2 = Stream.Transform;
  var StringDecoder$1 = stringDecoder.StringDecoder;

  function CipherBase(hashMode) {
    Transform$2.call(this);
    this.hashMode = typeof hashMode === 'string';

    if (this.hashMode) {
      this[hashMode] = this._finalOrDigest;
    } else {
      this["final"] = this._finalOrDigest;
    }

    if (this._final) {
      this.__final = this._final;
      this._final = null;
    }

    this._decoder = null;
    this._encoding = null;
  }

  inherits_browser(CipherBase, Transform$2);

  CipherBase.prototype.update = function (data, inputEnc, outputEnc) {
    if (typeof data === 'string') {
      data = Buffer$b.from(data, inputEnc);
    }

    var outData = this._update(data);

    if (this.hashMode) return this;

    if (outputEnc) {
      outData = this._toString(outData, outputEnc);
    }

    return outData;
  };

  CipherBase.prototype.setAutoPadding = function () {};

  CipherBase.prototype.getAuthTag = function () {
    throw new Error('trying to get auth tag in unsupported state');
  };

  CipherBase.prototype.setAuthTag = function () {
    throw new Error('trying to set auth tag in unsupported state');
  };

  CipherBase.prototype.setAAD = function () {
    throw new Error('trying to set aad in unsupported state');
  };

  CipherBase.prototype._transform = function (data, _, next) {
    var err;

    try {
      if (this.hashMode) {
        this._update(data);
      } else {
        this.push(this._update(data));
      }
    } catch (e) {
      err = e;
    } finally {
      next(err);
    }
  };

  CipherBase.prototype._flush = function (done) {
    var err;

    try {
      this.push(this.__final());
    } catch (e) {
      err = e;
    }

    done(err);
  };

  CipherBase.prototype._finalOrDigest = function (outputEnc) {
    var outData = this.__final() || Buffer$b.alloc(0);

    if (outputEnc) {
      outData = this._toString(outData, outputEnc, true);
    }

    return outData;
  };

  CipherBase.prototype._toString = function (value, enc, fin) {
    if (!this._decoder) {
      this._decoder = new StringDecoder$1(enc);
      this._encoding = enc;
    }

    if (this._encoding !== enc) throw new Error('can\'t switch encodings');

    var out = this._decoder.write(value);

    if (fin) {
      out += this._decoder.end();
    }

    return out;
  };

  var cipherBase = CipherBase;

  function Hash$1(hash) {
    cipherBase.call(this, 'digest');
    this._hash = hash;
  }

  inherits_browser(Hash$1, cipherBase);

  Hash$1.prototype._update = function (data) {
    this._hash.update(data);
  };

  Hash$1.prototype._final = function () {
    return this._hash.digest();
  };

  var browser = function createHash(alg) {
    alg = alg.toLowerCase();
    if (alg === 'md5') return new md5_js();
    if (alg === 'rmd160' || alg === 'ripemd160') return new ripemd160();
    return new Hash$1(sha_js(alg));
  };

  var MAX_ALLOC = Math.pow(2, 30) - 1; // default in iojs

  function checkBuffer(buf, name) {
    if (typeof buf !== 'string' && !isBuffer(buf)) {
      throw new TypeError(name + ' must be a buffer or string');
    }
  }

  var precondition = function precondition(password, salt, iterations, keylen) {
    checkBuffer(password, 'Password');
    checkBuffer(salt, 'Salt');

    if (typeof iterations !== 'number') {
      throw new TypeError('Iterations not a number');
    }

    if (iterations < 0) {
      throw new TypeError('Bad iterations');
    }

    if (typeof keylen !== 'number') {
      throw new TypeError('Key length not a number');
    }

    if (keylen < 0 || keylen > MAX_ALLOC || keylen !== keylen) {
      /* eslint no-self-compare: 0 */
      throw new TypeError('Bad key length');
    }
  };

  var browser$1 = true;

  var defaultEncoding;
  /* istanbul ignore next */

  {
    defaultEncoding = 'utf-8';
  }

  var defaultEncoding_1 = defaultEncoding;

  var md5 = function md5(buffer) {
    return new md5_js().update(buffer).digest();
  };

  var Buffer$c = safeBuffer.Buffer;
  var ZEROS = Buffer$c.alloc(128);
  var sizes = {
    md5: 16,
    sha1: 20,
    sha224: 28,
    sha256: 32,
    sha384: 48,
    sha512: 64,
    rmd160: 20,
    ripemd160: 20
  };

  function Hmac(alg, key, saltLen) {
    var hash = getDigest(alg);
    var blocksize = alg === 'sha512' || alg === 'sha384' ? 128 : 64;

    if (key.length > blocksize) {
      key = hash(key);
    } else if (key.length < blocksize) {
      key = Buffer$c.concat([key, ZEROS], blocksize);
    }

    var ipad = Buffer$c.allocUnsafe(blocksize + sizes[alg]);
    var opad = Buffer$c.allocUnsafe(blocksize + sizes[alg]);

    for (var i = 0; i < blocksize; i++) {
      ipad[i] = key[i] ^ 0x36;
      opad[i] = key[i] ^ 0x5C;
    }

    var ipad1 = Buffer$c.allocUnsafe(blocksize + saltLen + 4);
    ipad.copy(ipad1, 0, 0, blocksize);
    this.ipad1 = ipad1;
    this.ipad2 = ipad;
    this.opad = opad;
    this.alg = alg;
    this.blocksize = blocksize;
    this.hash = hash;
    this.size = sizes[alg];
  }

  Hmac.prototype.run = function (data, ipad) {
    data.copy(ipad, this.blocksize);
    var h = this.hash(ipad);
    h.copy(this.opad, this.blocksize);
    return this.hash(this.opad);
  };

  function getDigest(alg) {
    function shaFunc(data) {
      return sha_js(alg).update(data).digest();
    }

    function rmd160Func(data) {
      return new ripemd160().update(data).digest();
    }

    if (alg === 'rmd160' || alg === 'ripemd160') return rmd160Func;
    if (alg === 'md5') return md5;
    return shaFunc;
  }

  function pbkdf2(password, salt, iterations, keylen, digest) {
    precondition(password, salt, iterations, keylen);
    if (!Buffer$c.isBuffer(password)) password = Buffer$c.from(password, defaultEncoding_1);
    if (!Buffer$c.isBuffer(salt)) salt = Buffer$c.from(salt, defaultEncoding_1);
    digest = digest || 'sha1';
    var hmac = new Hmac(digest, password, salt.length);
    var DK = Buffer$c.allocUnsafe(keylen);
    var block1 = Buffer$c.allocUnsafe(salt.length + 4);
    salt.copy(block1, 0, 0, salt.length);
    var destPos = 0;
    var hLen = sizes[digest];
    var l = Math.ceil(keylen / hLen);

    for (var i = 1; i <= l; i++) {
      block1.writeUInt32BE(i, salt.length);
      var T = hmac.run(block1, hmac.ipad1);
      var U = T;

      for (var j = 1; j < iterations; j++) {
        U = hmac.run(U, hmac.ipad2);

        for (var k = 0; k < hLen; k++) {
          T[k] ^= U[k];
        }
      }

      T.copy(DK, destPos);
      destPos += hLen;
    }

    return DK;
  }

  var syncBrowser = pbkdf2;

  var Buffer$d = safeBuffer.Buffer;
  var ZERO_BUF;
  var subtle = commonjsGlobal.crypto && commonjsGlobal.crypto.subtle;
  var toBrowser = {
    'sha': 'SHA-1',
    'sha-1': 'SHA-1',
    'sha1': 'SHA-1',
    'sha256': 'SHA-256',
    'sha-256': 'SHA-256',
    'sha384': 'SHA-384',
    'sha-384': 'SHA-384',
    'sha-512': 'SHA-512',
    'sha512': 'SHA-512'
  };
  var checks = [];

  function checkNative(algo) {
    if (commonjsGlobal.process && !commonjsGlobal.process.browser) {
      return Promise.resolve(false);
    }

    if (!subtle || !subtle.importKey || !subtle.deriveBits) {
      return Promise.resolve(false);
    }

    if (checks[algo] !== undefined) {
      return checks[algo];
    }

    ZERO_BUF = ZERO_BUF || Buffer$d.alloc(8);
    var prom = browserPbkdf2(ZERO_BUF, ZERO_BUF, 10, 128, algo).then(function () {
      return true;
    })["catch"](function () {
      return false;
    });
    checks[algo] = prom;
    return prom;
  }

  function browserPbkdf2(password, salt, iterations, length, algo) {
    return subtle.importKey('raw', password, {
      name: 'PBKDF2'
    }, false, ['deriveBits']).then(function (key) {
      return subtle.deriveBits({
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: {
          name: algo
        }
      }, key, length << 3);
    }).then(function (res) {
      return Buffer$d.from(res);
    });
  }

  function resolvePromise(promise, callback) {
    promise.then(function (out) {
      nextTick(function () {
        callback(null, out);
      });
    }, function (e) {
      nextTick(function () {
        callback(e);
      });
    });
  }

  var async = function async(password, salt, iterations, keylen, digest, callback) {
    if (typeof digest === 'function') {
      callback = digest;
      digest = undefined;
    }

    digest = digest || 'sha1';
    var algo = toBrowser[digest.toLowerCase()];

    if (!algo || typeof commonjsGlobal.Promise !== 'function') {
      return nextTick(function () {
        var out;

        try {
          out = syncBrowser(password, salt, iterations, keylen, digest);
        } catch (e) {
          return callback(e);
        }

        callback(null, out);
      });
    }

    precondition(password, salt, iterations, keylen);
    if (typeof callback !== 'function') throw new Error('No callback provided to pbkdf2');
    if (!Buffer$d.isBuffer(password)) password = Buffer$d.from(password, defaultEncoding_1);
    if (!Buffer$d.isBuffer(salt)) salt = Buffer$d.from(salt, defaultEncoding_1);
    resolvePromise(checkNative(algo).then(function (resp) {
      if (resp) return browserPbkdf2(password, salt, iterations, keylen, algo);
      return syncBrowser(password, salt, iterations, keylen, digest);
    }), callback);
  };

  var pbkdf2$1 = async;
  var pbkdf2Sync = syncBrowser;
  var browser$2 = {
    pbkdf2: pbkdf2$1,
    pbkdf2Sync: pbkdf2Sync
  };

  var browser$3 = createCommonjsModule(function (module) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues

    var MAX_BYTES = 65536; // Node supports requesting up to this number of bytes
    // https://github.com/nodejs/node/blob/master/lib/internal/crypto/random.js#L48

    var MAX_UINT32 = 4294967295;

    function oldBrowser() {
      throw new Error('Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11');
    }

    var Buffer = safeBuffer.Buffer;
    var crypto = commonjsGlobal.crypto || commonjsGlobal.msCrypto;

    if (crypto && crypto.getRandomValues) {
      module.exports = randomBytes;
    } else {
      module.exports = oldBrowser;
    }

    function randomBytes(size, cb) {
      // phantomjs needs to throw
      if (size > MAX_UINT32) throw new RangeError('requested too many random bytes');
      var bytes = Buffer.allocUnsafe(size);

      if (size > 0) {
        // getRandomValues fails on IE if size == 0
        if (size > MAX_BYTES) {
          // this is the max bytes crypto.getRandomValues
          // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
          for (var generated = 0; generated < size; generated += MAX_BYTES) {
            // buffer.slice automatically checks if the end is past the end of
            // the buffer so we don't have to here
            crypto.getRandomValues(bytes.slice(generated, generated + MAX_BYTES));
          }
        } else {
          crypto.getRandomValues(bytes);
        }
      }

      if (typeof cb === 'function') {
        return nextTick(function () {
          cb(null, bytes);
        });
      }

      return bytes;
    }
  });

  var chinese_simplified = [
  	"的",
  	"一",
  	"是",
  	"在",
  	"不",
  	"了",
  	"有",
  	"和",
  	"人",
  	"这",
  	"中",
  	"大",
  	"为",
  	"上",
  	"个",
  	"国",
  	"我",
  	"以",
  	"要",
  	"他",
  	"时",
  	"来",
  	"用",
  	"们",
  	"生",
  	"到",
  	"作",
  	"地",
  	"于",
  	"出",
  	"就",
  	"分",
  	"对",
  	"成",
  	"会",
  	"可",
  	"主",
  	"发",
  	"年",
  	"动",
  	"同",
  	"工",
  	"也",
  	"能",
  	"下",
  	"过",
  	"子",
  	"说",
  	"产",
  	"种",
  	"面",
  	"而",
  	"方",
  	"后",
  	"多",
  	"定",
  	"行",
  	"学",
  	"法",
  	"所",
  	"民",
  	"得",
  	"经",
  	"十",
  	"三",
  	"之",
  	"进",
  	"着",
  	"等",
  	"部",
  	"度",
  	"家",
  	"电",
  	"力",
  	"里",
  	"如",
  	"水",
  	"化",
  	"高",
  	"自",
  	"二",
  	"理",
  	"起",
  	"小",
  	"物",
  	"现",
  	"实",
  	"加",
  	"量",
  	"都",
  	"两",
  	"体",
  	"制",
  	"机",
  	"当",
  	"使",
  	"点",
  	"从",
  	"业",
  	"本",
  	"去",
  	"把",
  	"性",
  	"好",
  	"应",
  	"开",
  	"它",
  	"合",
  	"还",
  	"因",
  	"由",
  	"其",
  	"些",
  	"然",
  	"前",
  	"外",
  	"天",
  	"政",
  	"四",
  	"日",
  	"那",
  	"社",
  	"义",
  	"事",
  	"平",
  	"形",
  	"相",
  	"全",
  	"表",
  	"间",
  	"样",
  	"与",
  	"关",
  	"各",
  	"重",
  	"新",
  	"线",
  	"内",
  	"数",
  	"正",
  	"心",
  	"反",
  	"你",
  	"明",
  	"看",
  	"原",
  	"又",
  	"么",
  	"利",
  	"比",
  	"或",
  	"但",
  	"质",
  	"气",
  	"第",
  	"向",
  	"道",
  	"命",
  	"此",
  	"变",
  	"条",
  	"只",
  	"没",
  	"结",
  	"解",
  	"问",
  	"意",
  	"建",
  	"月",
  	"公",
  	"无",
  	"系",
  	"军",
  	"很",
  	"情",
  	"者",
  	"最",
  	"立",
  	"代",
  	"想",
  	"已",
  	"通",
  	"并",
  	"提",
  	"直",
  	"题",
  	"党",
  	"程",
  	"展",
  	"五",
  	"果",
  	"料",
  	"象",
  	"员",
  	"革",
  	"位",
  	"入",
  	"常",
  	"文",
  	"总",
  	"次",
  	"品",
  	"式",
  	"活",
  	"设",
  	"及",
  	"管",
  	"特",
  	"件",
  	"长",
  	"求",
  	"老",
  	"头",
  	"基",
  	"资",
  	"边",
  	"流",
  	"路",
  	"级",
  	"少",
  	"图",
  	"山",
  	"统",
  	"接",
  	"知",
  	"较",
  	"将",
  	"组",
  	"见",
  	"计",
  	"别",
  	"她",
  	"手",
  	"角",
  	"期",
  	"根",
  	"论",
  	"运",
  	"农",
  	"指",
  	"几",
  	"九",
  	"区",
  	"强",
  	"放",
  	"决",
  	"西",
  	"被",
  	"干",
  	"做",
  	"必",
  	"战",
  	"先",
  	"回",
  	"则",
  	"任",
  	"取",
  	"据",
  	"处",
  	"队",
  	"南",
  	"给",
  	"色",
  	"光",
  	"门",
  	"即",
  	"保",
  	"治",
  	"北",
  	"造",
  	"百",
  	"规",
  	"热",
  	"领",
  	"七",
  	"海",
  	"口",
  	"东",
  	"导",
  	"器",
  	"压",
  	"志",
  	"世",
  	"金",
  	"增",
  	"争",
  	"济",
  	"阶",
  	"油",
  	"思",
  	"术",
  	"极",
  	"交",
  	"受",
  	"联",
  	"什",
  	"认",
  	"六",
  	"共",
  	"权",
  	"收",
  	"证",
  	"改",
  	"清",
  	"美",
  	"再",
  	"采",
  	"转",
  	"更",
  	"单",
  	"风",
  	"切",
  	"打",
  	"白",
  	"教",
  	"速",
  	"花",
  	"带",
  	"安",
  	"场",
  	"身",
  	"车",
  	"例",
  	"真",
  	"务",
  	"具",
  	"万",
  	"每",
  	"目",
  	"至",
  	"达",
  	"走",
  	"积",
  	"示",
  	"议",
  	"声",
  	"报",
  	"斗",
  	"完",
  	"类",
  	"八",
  	"离",
  	"华",
  	"名",
  	"确",
  	"才",
  	"科",
  	"张",
  	"信",
  	"马",
  	"节",
  	"话",
  	"米",
  	"整",
  	"空",
  	"元",
  	"况",
  	"今",
  	"集",
  	"温",
  	"传",
  	"土",
  	"许",
  	"步",
  	"群",
  	"广",
  	"石",
  	"记",
  	"需",
  	"段",
  	"研",
  	"界",
  	"拉",
  	"林",
  	"律",
  	"叫",
  	"且",
  	"究",
  	"观",
  	"越",
  	"织",
  	"装",
  	"影",
  	"算",
  	"低",
  	"持",
  	"音",
  	"众",
  	"书",
  	"布",
  	"复",
  	"容",
  	"儿",
  	"须",
  	"际",
  	"商",
  	"非",
  	"验",
  	"连",
  	"断",
  	"深",
  	"难",
  	"近",
  	"矿",
  	"千",
  	"周",
  	"委",
  	"素",
  	"技",
  	"备",
  	"半",
  	"办",
  	"青",
  	"省",
  	"列",
  	"习",
  	"响",
  	"约",
  	"支",
  	"般",
  	"史",
  	"感",
  	"劳",
  	"便",
  	"团",
  	"往",
  	"酸",
  	"历",
  	"市",
  	"克",
  	"何",
  	"除",
  	"消",
  	"构",
  	"府",
  	"称",
  	"太",
  	"准",
  	"精",
  	"值",
  	"号",
  	"率",
  	"族",
  	"维",
  	"划",
  	"选",
  	"标",
  	"写",
  	"存",
  	"候",
  	"毛",
  	"亲",
  	"快",
  	"效",
  	"斯",
  	"院",
  	"查",
  	"江",
  	"型",
  	"眼",
  	"王",
  	"按",
  	"格",
  	"养",
  	"易",
  	"置",
  	"派",
  	"层",
  	"片",
  	"始",
  	"却",
  	"专",
  	"状",
  	"育",
  	"厂",
  	"京",
  	"识",
  	"适",
  	"属",
  	"圆",
  	"包",
  	"火",
  	"住",
  	"调",
  	"满",
  	"县",
  	"局",
  	"照",
  	"参",
  	"红",
  	"细",
  	"引",
  	"听",
  	"该",
  	"铁",
  	"价",
  	"严",
  	"首",
  	"底",
  	"液",
  	"官",
  	"德",
  	"随",
  	"病",
  	"苏",
  	"失",
  	"尔",
  	"死",
  	"讲",
  	"配",
  	"女",
  	"黄",
  	"推",
  	"显",
  	"谈",
  	"罪",
  	"神",
  	"艺",
  	"呢",
  	"席",
  	"含",
  	"企",
  	"望",
  	"密",
  	"批",
  	"营",
  	"项",
  	"防",
  	"举",
  	"球",
  	"英",
  	"氧",
  	"势",
  	"告",
  	"李",
  	"台",
  	"落",
  	"木",
  	"帮",
  	"轮",
  	"破",
  	"亚",
  	"师",
  	"围",
  	"注",
  	"远",
  	"字",
  	"材",
  	"排",
  	"供",
  	"河",
  	"态",
  	"封",
  	"另",
  	"施",
  	"减",
  	"树",
  	"溶",
  	"怎",
  	"止",
  	"案",
  	"言",
  	"士",
  	"均",
  	"武",
  	"固",
  	"叶",
  	"鱼",
  	"波",
  	"视",
  	"仅",
  	"费",
  	"紧",
  	"爱",
  	"左",
  	"章",
  	"早",
  	"朝",
  	"害",
  	"续",
  	"轻",
  	"服",
  	"试",
  	"食",
  	"充",
  	"兵",
  	"源",
  	"判",
  	"护",
  	"司",
  	"足",
  	"某",
  	"练",
  	"差",
  	"致",
  	"板",
  	"田",
  	"降",
  	"黑",
  	"犯",
  	"负",
  	"击",
  	"范",
  	"继",
  	"兴",
  	"似",
  	"余",
  	"坚",
  	"曲",
  	"输",
  	"修",
  	"故",
  	"城",
  	"夫",
  	"够",
  	"送",
  	"笔",
  	"船",
  	"占",
  	"右",
  	"财",
  	"吃",
  	"富",
  	"春",
  	"职",
  	"觉",
  	"汉",
  	"画",
  	"功",
  	"巴",
  	"跟",
  	"虽",
  	"杂",
  	"飞",
  	"检",
  	"吸",
  	"助",
  	"升",
  	"阳",
  	"互",
  	"初",
  	"创",
  	"抗",
  	"考",
  	"投",
  	"坏",
  	"策",
  	"古",
  	"径",
  	"换",
  	"未",
  	"跑",
  	"留",
  	"钢",
  	"曾",
  	"端",
  	"责",
  	"站",
  	"简",
  	"述",
  	"钱",
  	"副",
  	"尽",
  	"帝",
  	"射",
  	"草",
  	"冲",
  	"承",
  	"独",
  	"令",
  	"限",
  	"阿",
  	"宣",
  	"环",
  	"双",
  	"请",
  	"超",
  	"微",
  	"让",
  	"控",
  	"州",
  	"良",
  	"轴",
  	"找",
  	"否",
  	"纪",
  	"益",
  	"依",
  	"优",
  	"顶",
  	"础",
  	"载",
  	"倒",
  	"房",
  	"突",
  	"坐",
  	"粉",
  	"敌",
  	"略",
  	"客",
  	"袁",
  	"冷",
  	"胜",
  	"绝",
  	"析",
  	"块",
  	"剂",
  	"测",
  	"丝",
  	"协",
  	"诉",
  	"念",
  	"陈",
  	"仍",
  	"罗",
  	"盐",
  	"友",
  	"洋",
  	"错",
  	"苦",
  	"夜",
  	"刑",
  	"移",
  	"频",
  	"逐",
  	"靠",
  	"混",
  	"母",
  	"短",
  	"皮",
  	"终",
  	"聚",
  	"汽",
  	"村",
  	"云",
  	"哪",
  	"既",
  	"距",
  	"卫",
  	"停",
  	"烈",
  	"央",
  	"察",
  	"烧",
  	"迅",
  	"境",
  	"若",
  	"印",
  	"洲",
  	"刻",
  	"括",
  	"激",
  	"孔",
  	"搞",
  	"甚",
  	"室",
  	"待",
  	"核",
  	"校",
  	"散",
  	"侵",
  	"吧",
  	"甲",
  	"游",
  	"久",
  	"菜",
  	"味",
  	"旧",
  	"模",
  	"湖",
  	"货",
  	"损",
  	"预",
  	"阻",
  	"毫",
  	"普",
  	"稳",
  	"乙",
  	"妈",
  	"植",
  	"息",
  	"扩",
  	"银",
  	"语",
  	"挥",
  	"酒",
  	"守",
  	"拿",
  	"序",
  	"纸",
  	"医",
  	"缺",
  	"雨",
  	"吗",
  	"针",
  	"刘",
  	"啊",
  	"急",
  	"唱",
  	"误",
  	"训",
  	"愿",
  	"审",
  	"附",
  	"获",
  	"茶",
  	"鲜",
  	"粮",
  	"斤",
  	"孩",
  	"脱",
  	"硫",
  	"肥",
  	"善",
  	"龙",
  	"演",
  	"父",
  	"渐",
  	"血",
  	"欢",
  	"械",
  	"掌",
  	"歌",
  	"沙",
  	"刚",
  	"攻",
  	"谓",
  	"盾",
  	"讨",
  	"晚",
  	"粒",
  	"乱",
  	"燃",
  	"矛",
  	"乎",
  	"杀",
  	"药",
  	"宁",
  	"鲁",
  	"贵",
  	"钟",
  	"煤",
  	"读",
  	"班",
  	"伯",
  	"香",
  	"介",
  	"迫",
  	"句",
  	"丰",
  	"培",
  	"握",
  	"兰",
  	"担",
  	"弦",
  	"蛋",
  	"沉",
  	"假",
  	"穿",
  	"执",
  	"答",
  	"乐",
  	"谁",
  	"顺",
  	"烟",
  	"缩",
  	"征",
  	"脸",
  	"喜",
  	"松",
  	"脚",
  	"困",
  	"异",
  	"免",
  	"背",
  	"星",
  	"福",
  	"买",
  	"染",
  	"井",
  	"概",
  	"慢",
  	"怕",
  	"磁",
  	"倍",
  	"祖",
  	"皇",
  	"促",
  	"静",
  	"补",
  	"评",
  	"翻",
  	"肉",
  	"践",
  	"尼",
  	"衣",
  	"宽",
  	"扬",
  	"棉",
  	"希",
  	"伤",
  	"操",
  	"垂",
  	"秋",
  	"宜",
  	"氢",
  	"套",
  	"督",
  	"振",
  	"架",
  	"亮",
  	"末",
  	"宪",
  	"庆",
  	"编",
  	"牛",
  	"触",
  	"映",
  	"雷",
  	"销",
  	"诗",
  	"座",
  	"居",
  	"抓",
  	"裂",
  	"胞",
  	"呼",
  	"娘",
  	"景",
  	"威",
  	"绿",
  	"晶",
  	"厚",
  	"盟",
  	"衡",
  	"鸡",
  	"孙",
  	"延",
  	"危",
  	"胶",
  	"屋",
  	"乡",
  	"临",
  	"陆",
  	"顾",
  	"掉",
  	"呀",
  	"灯",
  	"岁",
  	"措",
  	"束",
  	"耐",
  	"剧",
  	"玉",
  	"赵",
  	"跳",
  	"哥",
  	"季",
  	"课",
  	"凯",
  	"胡",
  	"额",
  	"款",
  	"绍",
  	"卷",
  	"齐",
  	"伟",
  	"蒸",
  	"殖",
  	"永",
  	"宗",
  	"苗",
  	"川",
  	"炉",
  	"岩",
  	"弱",
  	"零",
  	"杨",
  	"奏",
  	"沿",
  	"露",
  	"杆",
  	"探",
  	"滑",
  	"镇",
  	"饭",
  	"浓",
  	"航",
  	"怀",
  	"赶",
  	"库",
  	"夺",
  	"伊",
  	"灵",
  	"税",
  	"途",
  	"灭",
  	"赛",
  	"归",
  	"召",
  	"鼓",
  	"播",
  	"盘",
  	"裁",
  	"险",
  	"康",
  	"唯",
  	"录",
  	"菌",
  	"纯",
  	"借",
  	"糖",
  	"盖",
  	"横",
  	"符",
  	"私",
  	"努",
  	"堂",
  	"域",
  	"枪",
  	"润",
  	"幅",
  	"哈",
  	"竟",
  	"熟",
  	"虫",
  	"泽",
  	"脑",
  	"壤",
  	"碳",
  	"欧",
  	"遍",
  	"侧",
  	"寨",
  	"敢",
  	"彻",
  	"虑",
  	"斜",
  	"薄",
  	"庭",
  	"纳",
  	"弹",
  	"饲",
  	"伸",
  	"折",
  	"麦",
  	"湿",
  	"暗",
  	"荷",
  	"瓦",
  	"塞",
  	"床",
  	"筑",
  	"恶",
  	"户",
  	"访",
  	"塔",
  	"奇",
  	"透",
  	"梁",
  	"刀",
  	"旋",
  	"迹",
  	"卡",
  	"氯",
  	"遇",
  	"份",
  	"毒",
  	"泥",
  	"退",
  	"洗",
  	"摆",
  	"灰",
  	"彩",
  	"卖",
  	"耗",
  	"夏",
  	"择",
  	"忙",
  	"铜",
  	"献",
  	"硬",
  	"予",
  	"繁",
  	"圈",
  	"雪",
  	"函",
  	"亦",
  	"抽",
  	"篇",
  	"阵",
  	"阴",
  	"丁",
  	"尺",
  	"追",
  	"堆",
  	"雄",
  	"迎",
  	"泛",
  	"爸",
  	"楼",
  	"避",
  	"谋",
  	"吨",
  	"野",
  	"猪",
  	"旗",
  	"累",
  	"偏",
  	"典",
  	"馆",
  	"索",
  	"秦",
  	"脂",
  	"潮",
  	"爷",
  	"豆",
  	"忽",
  	"托",
  	"惊",
  	"塑",
  	"遗",
  	"愈",
  	"朱",
  	"替",
  	"纤",
  	"粗",
  	"倾",
  	"尚",
  	"痛",
  	"楚",
  	"谢",
  	"奋",
  	"购",
  	"磨",
  	"君",
  	"池",
  	"旁",
  	"碎",
  	"骨",
  	"监",
  	"捕",
  	"弟",
  	"暴",
  	"割",
  	"贯",
  	"殊",
  	"释",
  	"词",
  	"亡",
  	"壁",
  	"顿",
  	"宝",
  	"午",
  	"尘",
  	"闻",
  	"揭",
  	"炮",
  	"残",
  	"冬",
  	"桥",
  	"妇",
  	"警",
  	"综",
  	"招",
  	"吴",
  	"付",
  	"浮",
  	"遭",
  	"徐",
  	"您",
  	"摇",
  	"谷",
  	"赞",
  	"箱",
  	"隔",
  	"订",
  	"男",
  	"吹",
  	"园",
  	"纷",
  	"唐",
  	"败",
  	"宋",
  	"玻",
  	"巨",
  	"耕",
  	"坦",
  	"荣",
  	"闭",
  	"湾",
  	"键",
  	"凡",
  	"驻",
  	"锅",
  	"救",
  	"恩",
  	"剥",
  	"凝",
  	"碱",
  	"齿",
  	"截",
  	"炼",
  	"麻",
  	"纺",
  	"禁",
  	"废",
  	"盛",
  	"版",
  	"缓",
  	"净",
  	"睛",
  	"昌",
  	"婚",
  	"涉",
  	"筒",
  	"嘴",
  	"插",
  	"岸",
  	"朗",
  	"庄",
  	"街",
  	"藏",
  	"姑",
  	"贸",
  	"腐",
  	"奴",
  	"啦",
  	"惯",
  	"乘",
  	"伙",
  	"恢",
  	"匀",
  	"纱",
  	"扎",
  	"辩",
  	"耳",
  	"彪",
  	"臣",
  	"亿",
  	"璃",
  	"抵",
  	"脉",
  	"秀",
  	"萨",
  	"俄",
  	"网",
  	"舞",
  	"店",
  	"喷",
  	"纵",
  	"寸",
  	"汗",
  	"挂",
  	"洪",
  	"贺",
  	"闪",
  	"柬",
  	"爆",
  	"烯",
  	"津",
  	"稻",
  	"墙",
  	"软",
  	"勇",
  	"像",
  	"滚",
  	"厘",
  	"蒙",
  	"芳",
  	"肯",
  	"坡",
  	"柱",
  	"荡",
  	"腿",
  	"仪",
  	"旅",
  	"尾",
  	"轧",
  	"冰",
  	"贡",
  	"登",
  	"黎",
  	"削",
  	"钻",
  	"勒",
  	"逃",
  	"障",
  	"氨",
  	"郭",
  	"峰",
  	"币",
  	"港",
  	"伏",
  	"轨",
  	"亩",
  	"毕",
  	"擦",
  	"莫",
  	"刺",
  	"浪",
  	"秘",
  	"援",
  	"株",
  	"健",
  	"售",
  	"股",
  	"岛",
  	"甘",
  	"泡",
  	"睡",
  	"童",
  	"铸",
  	"汤",
  	"阀",
  	"休",
  	"汇",
  	"舍",
  	"牧",
  	"绕",
  	"炸",
  	"哲",
  	"磷",
  	"绩",
  	"朋",
  	"淡",
  	"尖",
  	"启",
  	"陷",
  	"柴",
  	"呈",
  	"徒",
  	"颜",
  	"泪",
  	"稍",
  	"忘",
  	"泵",
  	"蓝",
  	"拖",
  	"洞",
  	"授",
  	"镜",
  	"辛",
  	"壮",
  	"锋",
  	"贫",
  	"虚",
  	"弯",
  	"摩",
  	"泰",
  	"幼",
  	"廷",
  	"尊",
  	"窗",
  	"纲",
  	"弄",
  	"隶",
  	"疑",
  	"氏",
  	"宫",
  	"姐",
  	"震",
  	"瑞",
  	"怪",
  	"尤",
  	"琴",
  	"循",
  	"描",
  	"膜",
  	"违",
  	"夹",
  	"腰",
  	"缘",
  	"珠",
  	"穷",
  	"森",
  	"枝",
  	"竹",
  	"沟",
  	"催",
  	"绳",
  	"忆",
  	"邦",
  	"剩",
  	"幸",
  	"浆",
  	"栏",
  	"拥",
  	"牙",
  	"贮",
  	"礼",
  	"滤",
  	"钠",
  	"纹",
  	"罢",
  	"拍",
  	"咱",
  	"喊",
  	"袖",
  	"埃",
  	"勤",
  	"罚",
  	"焦",
  	"潜",
  	"伍",
  	"墨",
  	"欲",
  	"缝",
  	"姓",
  	"刊",
  	"饱",
  	"仿",
  	"奖",
  	"铝",
  	"鬼",
  	"丽",
  	"跨",
  	"默",
  	"挖",
  	"链",
  	"扫",
  	"喝",
  	"袋",
  	"炭",
  	"污",
  	"幕",
  	"诸",
  	"弧",
  	"励",
  	"梅",
  	"奶",
  	"洁",
  	"灾",
  	"舟",
  	"鉴",
  	"苯",
  	"讼",
  	"抱",
  	"毁",
  	"懂",
  	"寒",
  	"智",
  	"埔",
  	"寄",
  	"届",
  	"跃",
  	"渡",
  	"挑",
  	"丹",
  	"艰",
  	"贝",
  	"碰",
  	"拔",
  	"爹",
  	"戴",
  	"码",
  	"梦",
  	"芽",
  	"熔",
  	"赤",
  	"渔",
  	"哭",
  	"敬",
  	"颗",
  	"奔",
  	"铅",
  	"仲",
  	"虎",
  	"稀",
  	"妹",
  	"乏",
  	"珍",
  	"申",
  	"桌",
  	"遵",
  	"允",
  	"隆",
  	"螺",
  	"仓",
  	"魏",
  	"锐",
  	"晓",
  	"氮",
  	"兼",
  	"隐",
  	"碍",
  	"赫",
  	"拨",
  	"忠",
  	"肃",
  	"缸",
  	"牵",
  	"抢",
  	"博",
  	"巧",
  	"壳",
  	"兄",
  	"杜",
  	"讯",
  	"诚",
  	"碧",
  	"祥",
  	"柯",
  	"页",
  	"巡",
  	"矩",
  	"悲",
  	"灌",
  	"龄",
  	"伦",
  	"票",
  	"寻",
  	"桂",
  	"铺",
  	"圣",
  	"恐",
  	"恰",
  	"郑",
  	"趣",
  	"抬",
  	"荒",
  	"腾",
  	"贴",
  	"柔",
  	"滴",
  	"猛",
  	"阔",
  	"辆",
  	"妻",
  	"填",
  	"撤",
  	"储",
  	"签",
  	"闹",
  	"扰",
  	"紫",
  	"砂",
  	"递",
  	"戏",
  	"吊",
  	"陶",
  	"伐",
  	"喂",
  	"疗",
  	"瓶",
  	"婆",
  	"抚",
  	"臂",
  	"摸",
  	"忍",
  	"虾",
  	"蜡",
  	"邻",
  	"胸",
  	"巩",
  	"挤",
  	"偶",
  	"弃",
  	"槽",
  	"劲",
  	"乳",
  	"邓",
  	"吉",
  	"仁",
  	"烂",
  	"砖",
  	"租",
  	"乌",
  	"舰",
  	"伴",
  	"瓜",
  	"浅",
  	"丙",
  	"暂",
  	"燥",
  	"橡",
  	"柳",
  	"迷",
  	"暖",
  	"牌",
  	"秧",
  	"胆",
  	"详",
  	"簧",
  	"踏",
  	"瓷",
  	"谱",
  	"呆",
  	"宾",
  	"糊",
  	"洛",
  	"辉",
  	"愤",
  	"竞",
  	"隙",
  	"怒",
  	"粘",
  	"乃",
  	"绪",
  	"肩",
  	"籍",
  	"敏",
  	"涂",
  	"熙",
  	"皆",
  	"侦",
  	"悬",
  	"掘",
  	"享",
  	"纠",
  	"醒",
  	"狂",
  	"锁",
  	"淀",
  	"恨",
  	"牲",
  	"霸",
  	"爬",
  	"赏",
  	"逆",
  	"玩",
  	"陵",
  	"祝",
  	"秒",
  	"浙",
  	"貌",
  	"役",
  	"彼",
  	"悉",
  	"鸭",
  	"趋",
  	"凤",
  	"晨",
  	"畜",
  	"辈",
  	"秩",
  	"卵",
  	"署",
  	"梯",
  	"炎",
  	"滩",
  	"棋",
  	"驱",
  	"筛",
  	"峡",
  	"冒",
  	"啥",
  	"寿",
  	"译",
  	"浸",
  	"泉",
  	"帽",
  	"迟",
  	"硅",
  	"疆",
  	"贷",
  	"漏",
  	"稿",
  	"冠",
  	"嫩",
  	"胁",
  	"芯",
  	"牢",
  	"叛",
  	"蚀",
  	"奥",
  	"鸣",
  	"岭",
  	"羊",
  	"凭",
  	"串",
  	"塘",
  	"绘",
  	"酵",
  	"融",
  	"盆",
  	"锡",
  	"庙",
  	"筹",
  	"冻",
  	"辅",
  	"摄",
  	"袭",
  	"筋",
  	"拒",
  	"僚",
  	"旱",
  	"钾",
  	"鸟",
  	"漆",
  	"沈",
  	"眉",
  	"疏",
  	"添",
  	"棒",
  	"穗",
  	"硝",
  	"韩",
  	"逼",
  	"扭",
  	"侨",
  	"凉",
  	"挺",
  	"碗",
  	"栽",
  	"炒",
  	"杯",
  	"患",
  	"馏",
  	"劝",
  	"豪",
  	"辽",
  	"勃",
  	"鸿",
  	"旦",
  	"吏",
  	"拜",
  	"狗",
  	"埋",
  	"辊",
  	"掩",
  	"饮",
  	"搬",
  	"骂",
  	"辞",
  	"勾",
  	"扣",
  	"估",
  	"蒋",
  	"绒",
  	"雾",
  	"丈",
  	"朵",
  	"姆",
  	"拟",
  	"宇",
  	"辑",
  	"陕",
  	"雕",
  	"偿",
  	"蓄",
  	"崇",
  	"剪",
  	"倡",
  	"厅",
  	"咬",
  	"驶",
  	"薯",
  	"刷",
  	"斥",
  	"番",
  	"赋",
  	"奉",
  	"佛",
  	"浇",
  	"漫",
  	"曼",
  	"扇",
  	"钙",
  	"桃",
  	"扶",
  	"仔",
  	"返",
  	"俗",
  	"亏",
  	"腔",
  	"鞋",
  	"棱",
  	"覆",
  	"框",
  	"悄",
  	"叔",
  	"撞",
  	"骗",
  	"勘",
  	"旺",
  	"沸",
  	"孤",
  	"吐",
  	"孟",
  	"渠",
  	"屈",
  	"疾",
  	"妙",
  	"惜",
  	"仰",
  	"狠",
  	"胀",
  	"谐",
  	"抛",
  	"霉",
  	"桑",
  	"岗",
  	"嘛",
  	"衰",
  	"盗",
  	"渗",
  	"脏",
  	"赖",
  	"涌",
  	"甜",
  	"曹",
  	"阅",
  	"肌",
  	"哩",
  	"厉",
  	"烃",
  	"纬",
  	"毅",
  	"昨",
  	"伪",
  	"症",
  	"煮",
  	"叹",
  	"钉",
  	"搭",
  	"茎",
  	"笼",
  	"酷",
  	"偷",
  	"弓",
  	"锥",
  	"恒",
  	"杰",
  	"坑",
  	"鼻",
  	"翼",
  	"纶",
  	"叙",
  	"狱",
  	"逮",
  	"罐",
  	"络",
  	"棚",
  	"抑",
  	"膨",
  	"蔬",
  	"寺",
  	"骤",
  	"穆",
  	"冶",
  	"枯",
  	"册",
  	"尸",
  	"凸",
  	"绅",
  	"坯",
  	"牺",
  	"焰",
  	"轰",
  	"欣",
  	"晋",
  	"瘦",
  	"御",
  	"锭",
  	"锦",
  	"丧",
  	"旬",
  	"锻",
  	"垄",
  	"搜",
  	"扑",
  	"邀",
  	"亭",
  	"酯",
  	"迈",
  	"舒",
  	"脆",
  	"酶",
  	"闲",
  	"忧",
  	"酚",
  	"顽",
  	"羽",
  	"涨",
  	"卸",
  	"仗",
  	"陪",
  	"辟",
  	"惩",
  	"杭",
  	"姚",
  	"肚",
  	"捉",
  	"飘",
  	"漂",
  	"昆",
  	"欺",
  	"吾",
  	"郎",
  	"烷",
  	"汁",
  	"呵",
  	"饰",
  	"萧",
  	"雅",
  	"邮",
  	"迁",
  	"燕",
  	"撒",
  	"姻",
  	"赴",
  	"宴",
  	"烦",
  	"债",
  	"帐",
  	"斑",
  	"铃",
  	"旨",
  	"醇",
  	"董",
  	"饼",
  	"雏",
  	"姿",
  	"拌",
  	"傅",
  	"腹",
  	"妥",
  	"揉",
  	"贤",
  	"拆",
  	"歪",
  	"葡",
  	"胺",
  	"丢",
  	"浩",
  	"徽",
  	"昂",
  	"垫",
  	"挡",
  	"览",
  	"贪",
  	"慰",
  	"缴",
  	"汪",
  	"慌",
  	"冯",
  	"诺",
  	"姜",
  	"谊",
  	"凶",
  	"劣",
  	"诬",
  	"耀",
  	"昏",
  	"躺",
  	"盈",
  	"骑",
  	"乔",
  	"溪",
  	"丛",
  	"卢",
  	"抹",
  	"闷",
  	"咨",
  	"刮",
  	"驾",
  	"缆",
  	"悟",
  	"摘",
  	"铒",
  	"掷",
  	"颇",
  	"幻",
  	"柄",
  	"惠",
  	"惨",
  	"佳",
  	"仇",
  	"腊",
  	"窝",
  	"涤",
  	"剑",
  	"瞧",
  	"堡",
  	"泼",
  	"葱",
  	"罩",
  	"霍",
  	"捞",
  	"胎",
  	"苍",
  	"滨",
  	"俩",
  	"捅",
  	"湘",
  	"砍",
  	"霞",
  	"邵",
  	"萄",
  	"疯",
  	"淮",
  	"遂",
  	"熊",
  	"粪",
  	"烘",
  	"宿",
  	"档",
  	"戈",
  	"驳",
  	"嫂",
  	"裕",
  	"徙",
  	"箭",
  	"捐",
  	"肠",
  	"撑",
  	"晒",
  	"辨",
  	"殿",
  	"莲",
  	"摊",
  	"搅",
  	"酱",
  	"屏",
  	"疫",
  	"哀",
  	"蔡",
  	"堵",
  	"沫",
  	"皱",
  	"畅",
  	"叠",
  	"阁",
  	"莱",
  	"敲",
  	"辖",
  	"钩",
  	"痕",
  	"坝",
  	"巷",
  	"饿",
  	"祸",
  	"丘",
  	"玄",
  	"溜",
  	"曰",
  	"逻",
  	"彭",
  	"尝",
  	"卿",
  	"妨",
  	"艇",
  	"吞",
  	"韦",
  	"怨",
  	"矮",
  	"歇"
  ];

  var chinese_simplified$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': chinese_simplified
  });

  var chinese_traditional = [
  	"的",
  	"一",
  	"是",
  	"在",
  	"不",
  	"了",
  	"有",
  	"和",
  	"人",
  	"這",
  	"中",
  	"大",
  	"為",
  	"上",
  	"個",
  	"國",
  	"我",
  	"以",
  	"要",
  	"他",
  	"時",
  	"來",
  	"用",
  	"們",
  	"生",
  	"到",
  	"作",
  	"地",
  	"於",
  	"出",
  	"就",
  	"分",
  	"對",
  	"成",
  	"會",
  	"可",
  	"主",
  	"發",
  	"年",
  	"動",
  	"同",
  	"工",
  	"也",
  	"能",
  	"下",
  	"過",
  	"子",
  	"說",
  	"產",
  	"種",
  	"面",
  	"而",
  	"方",
  	"後",
  	"多",
  	"定",
  	"行",
  	"學",
  	"法",
  	"所",
  	"民",
  	"得",
  	"經",
  	"十",
  	"三",
  	"之",
  	"進",
  	"著",
  	"等",
  	"部",
  	"度",
  	"家",
  	"電",
  	"力",
  	"裡",
  	"如",
  	"水",
  	"化",
  	"高",
  	"自",
  	"二",
  	"理",
  	"起",
  	"小",
  	"物",
  	"現",
  	"實",
  	"加",
  	"量",
  	"都",
  	"兩",
  	"體",
  	"制",
  	"機",
  	"當",
  	"使",
  	"點",
  	"從",
  	"業",
  	"本",
  	"去",
  	"把",
  	"性",
  	"好",
  	"應",
  	"開",
  	"它",
  	"合",
  	"還",
  	"因",
  	"由",
  	"其",
  	"些",
  	"然",
  	"前",
  	"外",
  	"天",
  	"政",
  	"四",
  	"日",
  	"那",
  	"社",
  	"義",
  	"事",
  	"平",
  	"形",
  	"相",
  	"全",
  	"表",
  	"間",
  	"樣",
  	"與",
  	"關",
  	"各",
  	"重",
  	"新",
  	"線",
  	"內",
  	"數",
  	"正",
  	"心",
  	"反",
  	"你",
  	"明",
  	"看",
  	"原",
  	"又",
  	"麼",
  	"利",
  	"比",
  	"或",
  	"但",
  	"質",
  	"氣",
  	"第",
  	"向",
  	"道",
  	"命",
  	"此",
  	"變",
  	"條",
  	"只",
  	"沒",
  	"結",
  	"解",
  	"問",
  	"意",
  	"建",
  	"月",
  	"公",
  	"無",
  	"系",
  	"軍",
  	"很",
  	"情",
  	"者",
  	"最",
  	"立",
  	"代",
  	"想",
  	"已",
  	"通",
  	"並",
  	"提",
  	"直",
  	"題",
  	"黨",
  	"程",
  	"展",
  	"五",
  	"果",
  	"料",
  	"象",
  	"員",
  	"革",
  	"位",
  	"入",
  	"常",
  	"文",
  	"總",
  	"次",
  	"品",
  	"式",
  	"活",
  	"設",
  	"及",
  	"管",
  	"特",
  	"件",
  	"長",
  	"求",
  	"老",
  	"頭",
  	"基",
  	"資",
  	"邊",
  	"流",
  	"路",
  	"級",
  	"少",
  	"圖",
  	"山",
  	"統",
  	"接",
  	"知",
  	"較",
  	"將",
  	"組",
  	"見",
  	"計",
  	"別",
  	"她",
  	"手",
  	"角",
  	"期",
  	"根",
  	"論",
  	"運",
  	"農",
  	"指",
  	"幾",
  	"九",
  	"區",
  	"強",
  	"放",
  	"決",
  	"西",
  	"被",
  	"幹",
  	"做",
  	"必",
  	"戰",
  	"先",
  	"回",
  	"則",
  	"任",
  	"取",
  	"據",
  	"處",
  	"隊",
  	"南",
  	"給",
  	"色",
  	"光",
  	"門",
  	"即",
  	"保",
  	"治",
  	"北",
  	"造",
  	"百",
  	"規",
  	"熱",
  	"領",
  	"七",
  	"海",
  	"口",
  	"東",
  	"導",
  	"器",
  	"壓",
  	"志",
  	"世",
  	"金",
  	"增",
  	"爭",
  	"濟",
  	"階",
  	"油",
  	"思",
  	"術",
  	"極",
  	"交",
  	"受",
  	"聯",
  	"什",
  	"認",
  	"六",
  	"共",
  	"權",
  	"收",
  	"證",
  	"改",
  	"清",
  	"美",
  	"再",
  	"採",
  	"轉",
  	"更",
  	"單",
  	"風",
  	"切",
  	"打",
  	"白",
  	"教",
  	"速",
  	"花",
  	"帶",
  	"安",
  	"場",
  	"身",
  	"車",
  	"例",
  	"真",
  	"務",
  	"具",
  	"萬",
  	"每",
  	"目",
  	"至",
  	"達",
  	"走",
  	"積",
  	"示",
  	"議",
  	"聲",
  	"報",
  	"鬥",
  	"完",
  	"類",
  	"八",
  	"離",
  	"華",
  	"名",
  	"確",
  	"才",
  	"科",
  	"張",
  	"信",
  	"馬",
  	"節",
  	"話",
  	"米",
  	"整",
  	"空",
  	"元",
  	"況",
  	"今",
  	"集",
  	"溫",
  	"傳",
  	"土",
  	"許",
  	"步",
  	"群",
  	"廣",
  	"石",
  	"記",
  	"需",
  	"段",
  	"研",
  	"界",
  	"拉",
  	"林",
  	"律",
  	"叫",
  	"且",
  	"究",
  	"觀",
  	"越",
  	"織",
  	"裝",
  	"影",
  	"算",
  	"低",
  	"持",
  	"音",
  	"眾",
  	"書",
  	"布",
  	"复",
  	"容",
  	"兒",
  	"須",
  	"際",
  	"商",
  	"非",
  	"驗",
  	"連",
  	"斷",
  	"深",
  	"難",
  	"近",
  	"礦",
  	"千",
  	"週",
  	"委",
  	"素",
  	"技",
  	"備",
  	"半",
  	"辦",
  	"青",
  	"省",
  	"列",
  	"習",
  	"響",
  	"約",
  	"支",
  	"般",
  	"史",
  	"感",
  	"勞",
  	"便",
  	"團",
  	"往",
  	"酸",
  	"歷",
  	"市",
  	"克",
  	"何",
  	"除",
  	"消",
  	"構",
  	"府",
  	"稱",
  	"太",
  	"準",
  	"精",
  	"值",
  	"號",
  	"率",
  	"族",
  	"維",
  	"劃",
  	"選",
  	"標",
  	"寫",
  	"存",
  	"候",
  	"毛",
  	"親",
  	"快",
  	"效",
  	"斯",
  	"院",
  	"查",
  	"江",
  	"型",
  	"眼",
  	"王",
  	"按",
  	"格",
  	"養",
  	"易",
  	"置",
  	"派",
  	"層",
  	"片",
  	"始",
  	"卻",
  	"專",
  	"狀",
  	"育",
  	"廠",
  	"京",
  	"識",
  	"適",
  	"屬",
  	"圓",
  	"包",
  	"火",
  	"住",
  	"調",
  	"滿",
  	"縣",
  	"局",
  	"照",
  	"參",
  	"紅",
  	"細",
  	"引",
  	"聽",
  	"該",
  	"鐵",
  	"價",
  	"嚴",
  	"首",
  	"底",
  	"液",
  	"官",
  	"德",
  	"隨",
  	"病",
  	"蘇",
  	"失",
  	"爾",
  	"死",
  	"講",
  	"配",
  	"女",
  	"黃",
  	"推",
  	"顯",
  	"談",
  	"罪",
  	"神",
  	"藝",
  	"呢",
  	"席",
  	"含",
  	"企",
  	"望",
  	"密",
  	"批",
  	"營",
  	"項",
  	"防",
  	"舉",
  	"球",
  	"英",
  	"氧",
  	"勢",
  	"告",
  	"李",
  	"台",
  	"落",
  	"木",
  	"幫",
  	"輪",
  	"破",
  	"亞",
  	"師",
  	"圍",
  	"注",
  	"遠",
  	"字",
  	"材",
  	"排",
  	"供",
  	"河",
  	"態",
  	"封",
  	"另",
  	"施",
  	"減",
  	"樹",
  	"溶",
  	"怎",
  	"止",
  	"案",
  	"言",
  	"士",
  	"均",
  	"武",
  	"固",
  	"葉",
  	"魚",
  	"波",
  	"視",
  	"僅",
  	"費",
  	"緊",
  	"愛",
  	"左",
  	"章",
  	"早",
  	"朝",
  	"害",
  	"續",
  	"輕",
  	"服",
  	"試",
  	"食",
  	"充",
  	"兵",
  	"源",
  	"判",
  	"護",
  	"司",
  	"足",
  	"某",
  	"練",
  	"差",
  	"致",
  	"板",
  	"田",
  	"降",
  	"黑",
  	"犯",
  	"負",
  	"擊",
  	"范",
  	"繼",
  	"興",
  	"似",
  	"餘",
  	"堅",
  	"曲",
  	"輸",
  	"修",
  	"故",
  	"城",
  	"夫",
  	"夠",
  	"送",
  	"筆",
  	"船",
  	"佔",
  	"右",
  	"財",
  	"吃",
  	"富",
  	"春",
  	"職",
  	"覺",
  	"漢",
  	"畫",
  	"功",
  	"巴",
  	"跟",
  	"雖",
  	"雜",
  	"飛",
  	"檢",
  	"吸",
  	"助",
  	"昇",
  	"陽",
  	"互",
  	"初",
  	"創",
  	"抗",
  	"考",
  	"投",
  	"壞",
  	"策",
  	"古",
  	"徑",
  	"換",
  	"未",
  	"跑",
  	"留",
  	"鋼",
  	"曾",
  	"端",
  	"責",
  	"站",
  	"簡",
  	"述",
  	"錢",
  	"副",
  	"盡",
  	"帝",
  	"射",
  	"草",
  	"衝",
  	"承",
  	"獨",
  	"令",
  	"限",
  	"阿",
  	"宣",
  	"環",
  	"雙",
  	"請",
  	"超",
  	"微",
  	"讓",
  	"控",
  	"州",
  	"良",
  	"軸",
  	"找",
  	"否",
  	"紀",
  	"益",
  	"依",
  	"優",
  	"頂",
  	"礎",
  	"載",
  	"倒",
  	"房",
  	"突",
  	"坐",
  	"粉",
  	"敵",
  	"略",
  	"客",
  	"袁",
  	"冷",
  	"勝",
  	"絕",
  	"析",
  	"塊",
  	"劑",
  	"測",
  	"絲",
  	"協",
  	"訴",
  	"念",
  	"陳",
  	"仍",
  	"羅",
  	"鹽",
  	"友",
  	"洋",
  	"錯",
  	"苦",
  	"夜",
  	"刑",
  	"移",
  	"頻",
  	"逐",
  	"靠",
  	"混",
  	"母",
  	"短",
  	"皮",
  	"終",
  	"聚",
  	"汽",
  	"村",
  	"雲",
  	"哪",
  	"既",
  	"距",
  	"衛",
  	"停",
  	"烈",
  	"央",
  	"察",
  	"燒",
  	"迅",
  	"境",
  	"若",
  	"印",
  	"洲",
  	"刻",
  	"括",
  	"激",
  	"孔",
  	"搞",
  	"甚",
  	"室",
  	"待",
  	"核",
  	"校",
  	"散",
  	"侵",
  	"吧",
  	"甲",
  	"遊",
  	"久",
  	"菜",
  	"味",
  	"舊",
  	"模",
  	"湖",
  	"貨",
  	"損",
  	"預",
  	"阻",
  	"毫",
  	"普",
  	"穩",
  	"乙",
  	"媽",
  	"植",
  	"息",
  	"擴",
  	"銀",
  	"語",
  	"揮",
  	"酒",
  	"守",
  	"拿",
  	"序",
  	"紙",
  	"醫",
  	"缺",
  	"雨",
  	"嗎",
  	"針",
  	"劉",
  	"啊",
  	"急",
  	"唱",
  	"誤",
  	"訓",
  	"願",
  	"審",
  	"附",
  	"獲",
  	"茶",
  	"鮮",
  	"糧",
  	"斤",
  	"孩",
  	"脫",
  	"硫",
  	"肥",
  	"善",
  	"龍",
  	"演",
  	"父",
  	"漸",
  	"血",
  	"歡",
  	"械",
  	"掌",
  	"歌",
  	"沙",
  	"剛",
  	"攻",
  	"謂",
  	"盾",
  	"討",
  	"晚",
  	"粒",
  	"亂",
  	"燃",
  	"矛",
  	"乎",
  	"殺",
  	"藥",
  	"寧",
  	"魯",
  	"貴",
  	"鐘",
  	"煤",
  	"讀",
  	"班",
  	"伯",
  	"香",
  	"介",
  	"迫",
  	"句",
  	"豐",
  	"培",
  	"握",
  	"蘭",
  	"擔",
  	"弦",
  	"蛋",
  	"沉",
  	"假",
  	"穿",
  	"執",
  	"答",
  	"樂",
  	"誰",
  	"順",
  	"煙",
  	"縮",
  	"徵",
  	"臉",
  	"喜",
  	"松",
  	"腳",
  	"困",
  	"異",
  	"免",
  	"背",
  	"星",
  	"福",
  	"買",
  	"染",
  	"井",
  	"概",
  	"慢",
  	"怕",
  	"磁",
  	"倍",
  	"祖",
  	"皇",
  	"促",
  	"靜",
  	"補",
  	"評",
  	"翻",
  	"肉",
  	"踐",
  	"尼",
  	"衣",
  	"寬",
  	"揚",
  	"棉",
  	"希",
  	"傷",
  	"操",
  	"垂",
  	"秋",
  	"宜",
  	"氫",
  	"套",
  	"督",
  	"振",
  	"架",
  	"亮",
  	"末",
  	"憲",
  	"慶",
  	"編",
  	"牛",
  	"觸",
  	"映",
  	"雷",
  	"銷",
  	"詩",
  	"座",
  	"居",
  	"抓",
  	"裂",
  	"胞",
  	"呼",
  	"娘",
  	"景",
  	"威",
  	"綠",
  	"晶",
  	"厚",
  	"盟",
  	"衡",
  	"雞",
  	"孫",
  	"延",
  	"危",
  	"膠",
  	"屋",
  	"鄉",
  	"臨",
  	"陸",
  	"顧",
  	"掉",
  	"呀",
  	"燈",
  	"歲",
  	"措",
  	"束",
  	"耐",
  	"劇",
  	"玉",
  	"趙",
  	"跳",
  	"哥",
  	"季",
  	"課",
  	"凱",
  	"胡",
  	"額",
  	"款",
  	"紹",
  	"卷",
  	"齊",
  	"偉",
  	"蒸",
  	"殖",
  	"永",
  	"宗",
  	"苗",
  	"川",
  	"爐",
  	"岩",
  	"弱",
  	"零",
  	"楊",
  	"奏",
  	"沿",
  	"露",
  	"桿",
  	"探",
  	"滑",
  	"鎮",
  	"飯",
  	"濃",
  	"航",
  	"懷",
  	"趕",
  	"庫",
  	"奪",
  	"伊",
  	"靈",
  	"稅",
  	"途",
  	"滅",
  	"賽",
  	"歸",
  	"召",
  	"鼓",
  	"播",
  	"盤",
  	"裁",
  	"險",
  	"康",
  	"唯",
  	"錄",
  	"菌",
  	"純",
  	"借",
  	"糖",
  	"蓋",
  	"橫",
  	"符",
  	"私",
  	"努",
  	"堂",
  	"域",
  	"槍",
  	"潤",
  	"幅",
  	"哈",
  	"竟",
  	"熟",
  	"蟲",
  	"澤",
  	"腦",
  	"壤",
  	"碳",
  	"歐",
  	"遍",
  	"側",
  	"寨",
  	"敢",
  	"徹",
  	"慮",
  	"斜",
  	"薄",
  	"庭",
  	"納",
  	"彈",
  	"飼",
  	"伸",
  	"折",
  	"麥",
  	"濕",
  	"暗",
  	"荷",
  	"瓦",
  	"塞",
  	"床",
  	"築",
  	"惡",
  	"戶",
  	"訪",
  	"塔",
  	"奇",
  	"透",
  	"梁",
  	"刀",
  	"旋",
  	"跡",
  	"卡",
  	"氯",
  	"遇",
  	"份",
  	"毒",
  	"泥",
  	"退",
  	"洗",
  	"擺",
  	"灰",
  	"彩",
  	"賣",
  	"耗",
  	"夏",
  	"擇",
  	"忙",
  	"銅",
  	"獻",
  	"硬",
  	"予",
  	"繁",
  	"圈",
  	"雪",
  	"函",
  	"亦",
  	"抽",
  	"篇",
  	"陣",
  	"陰",
  	"丁",
  	"尺",
  	"追",
  	"堆",
  	"雄",
  	"迎",
  	"泛",
  	"爸",
  	"樓",
  	"避",
  	"謀",
  	"噸",
  	"野",
  	"豬",
  	"旗",
  	"累",
  	"偏",
  	"典",
  	"館",
  	"索",
  	"秦",
  	"脂",
  	"潮",
  	"爺",
  	"豆",
  	"忽",
  	"托",
  	"驚",
  	"塑",
  	"遺",
  	"愈",
  	"朱",
  	"替",
  	"纖",
  	"粗",
  	"傾",
  	"尚",
  	"痛",
  	"楚",
  	"謝",
  	"奮",
  	"購",
  	"磨",
  	"君",
  	"池",
  	"旁",
  	"碎",
  	"骨",
  	"監",
  	"捕",
  	"弟",
  	"暴",
  	"割",
  	"貫",
  	"殊",
  	"釋",
  	"詞",
  	"亡",
  	"壁",
  	"頓",
  	"寶",
  	"午",
  	"塵",
  	"聞",
  	"揭",
  	"炮",
  	"殘",
  	"冬",
  	"橋",
  	"婦",
  	"警",
  	"綜",
  	"招",
  	"吳",
  	"付",
  	"浮",
  	"遭",
  	"徐",
  	"您",
  	"搖",
  	"谷",
  	"贊",
  	"箱",
  	"隔",
  	"訂",
  	"男",
  	"吹",
  	"園",
  	"紛",
  	"唐",
  	"敗",
  	"宋",
  	"玻",
  	"巨",
  	"耕",
  	"坦",
  	"榮",
  	"閉",
  	"灣",
  	"鍵",
  	"凡",
  	"駐",
  	"鍋",
  	"救",
  	"恩",
  	"剝",
  	"凝",
  	"鹼",
  	"齒",
  	"截",
  	"煉",
  	"麻",
  	"紡",
  	"禁",
  	"廢",
  	"盛",
  	"版",
  	"緩",
  	"淨",
  	"睛",
  	"昌",
  	"婚",
  	"涉",
  	"筒",
  	"嘴",
  	"插",
  	"岸",
  	"朗",
  	"莊",
  	"街",
  	"藏",
  	"姑",
  	"貿",
  	"腐",
  	"奴",
  	"啦",
  	"慣",
  	"乘",
  	"夥",
  	"恢",
  	"勻",
  	"紗",
  	"扎",
  	"辯",
  	"耳",
  	"彪",
  	"臣",
  	"億",
  	"璃",
  	"抵",
  	"脈",
  	"秀",
  	"薩",
  	"俄",
  	"網",
  	"舞",
  	"店",
  	"噴",
  	"縱",
  	"寸",
  	"汗",
  	"掛",
  	"洪",
  	"賀",
  	"閃",
  	"柬",
  	"爆",
  	"烯",
  	"津",
  	"稻",
  	"牆",
  	"軟",
  	"勇",
  	"像",
  	"滾",
  	"厘",
  	"蒙",
  	"芳",
  	"肯",
  	"坡",
  	"柱",
  	"盪",
  	"腿",
  	"儀",
  	"旅",
  	"尾",
  	"軋",
  	"冰",
  	"貢",
  	"登",
  	"黎",
  	"削",
  	"鑽",
  	"勒",
  	"逃",
  	"障",
  	"氨",
  	"郭",
  	"峰",
  	"幣",
  	"港",
  	"伏",
  	"軌",
  	"畝",
  	"畢",
  	"擦",
  	"莫",
  	"刺",
  	"浪",
  	"秘",
  	"援",
  	"株",
  	"健",
  	"售",
  	"股",
  	"島",
  	"甘",
  	"泡",
  	"睡",
  	"童",
  	"鑄",
  	"湯",
  	"閥",
  	"休",
  	"匯",
  	"舍",
  	"牧",
  	"繞",
  	"炸",
  	"哲",
  	"磷",
  	"績",
  	"朋",
  	"淡",
  	"尖",
  	"啟",
  	"陷",
  	"柴",
  	"呈",
  	"徒",
  	"顏",
  	"淚",
  	"稍",
  	"忘",
  	"泵",
  	"藍",
  	"拖",
  	"洞",
  	"授",
  	"鏡",
  	"辛",
  	"壯",
  	"鋒",
  	"貧",
  	"虛",
  	"彎",
  	"摩",
  	"泰",
  	"幼",
  	"廷",
  	"尊",
  	"窗",
  	"綱",
  	"弄",
  	"隸",
  	"疑",
  	"氏",
  	"宮",
  	"姐",
  	"震",
  	"瑞",
  	"怪",
  	"尤",
  	"琴",
  	"循",
  	"描",
  	"膜",
  	"違",
  	"夾",
  	"腰",
  	"緣",
  	"珠",
  	"窮",
  	"森",
  	"枝",
  	"竹",
  	"溝",
  	"催",
  	"繩",
  	"憶",
  	"邦",
  	"剩",
  	"幸",
  	"漿",
  	"欄",
  	"擁",
  	"牙",
  	"貯",
  	"禮",
  	"濾",
  	"鈉",
  	"紋",
  	"罷",
  	"拍",
  	"咱",
  	"喊",
  	"袖",
  	"埃",
  	"勤",
  	"罰",
  	"焦",
  	"潛",
  	"伍",
  	"墨",
  	"欲",
  	"縫",
  	"姓",
  	"刊",
  	"飽",
  	"仿",
  	"獎",
  	"鋁",
  	"鬼",
  	"麗",
  	"跨",
  	"默",
  	"挖",
  	"鏈",
  	"掃",
  	"喝",
  	"袋",
  	"炭",
  	"污",
  	"幕",
  	"諸",
  	"弧",
  	"勵",
  	"梅",
  	"奶",
  	"潔",
  	"災",
  	"舟",
  	"鑑",
  	"苯",
  	"訟",
  	"抱",
  	"毀",
  	"懂",
  	"寒",
  	"智",
  	"埔",
  	"寄",
  	"屆",
  	"躍",
  	"渡",
  	"挑",
  	"丹",
  	"艱",
  	"貝",
  	"碰",
  	"拔",
  	"爹",
  	"戴",
  	"碼",
  	"夢",
  	"芽",
  	"熔",
  	"赤",
  	"漁",
  	"哭",
  	"敬",
  	"顆",
  	"奔",
  	"鉛",
  	"仲",
  	"虎",
  	"稀",
  	"妹",
  	"乏",
  	"珍",
  	"申",
  	"桌",
  	"遵",
  	"允",
  	"隆",
  	"螺",
  	"倉",
  	"魏",
  	"銳",
  	"曉",
  	"氮",
  	"兼",
  	"隱",
  	"礙",
  	"赫",
  	"撥",
  	"忠",
  	"肅",
  	"缸",
  	"牽",
  	"搶",
  	"博",
  	"巧",
  	"殼",
  	"兄",
  	"杜",
  	"訊",
  	"誠",
  	"碧",
  	"祥",
  	"柯",
  	"頁",
  	"巡",
  	"矩",
  	"悲",
  	"灌",
  	"齡",
  	"倫",
  	"票",
  	"尋",
  	"桂",
  	"鋪",
  	"聖",
  	"恐",
  	"恰",
  	"鄭",
  	"趣",
  	"抬",
  	"荒",
  	"騰",
  	"貼",
  	"柔",
  	"滴",
  	"猛",
  	"闊",
  	"輛",
  	"妻",
  	"填",
  	"撤",
  	"儲",
  	"簽",
  	"鬧",
  	"擾",
  	"紫",
  	"砂",
  	"遞",
  	"戲",
  	"吊",
  	"陶",
  	"伐",
  	"餵",
  	"療",
  	"瓶",
  	"婆",
  	"撫",
  	"臂",
  	"摸",
  	"忍",
  	"蝦",
  	"蠟",
  	"鄰",
  	"胸",
  	"鞏",
  	"擠",
  	"偶",
  	"棄",
  	"槽",
  	"勁",
  	"乳",
  	"鄧",
  	"吉",
  	"仁",
  	"爛",
  	"磚",
  	"租",
  	"烏",
  	"艦",
  	"伴",
  	"瓜",
  	"淺",
  	"丙",
  	"暫",
  	"燥",
  	"橡",
  	"柳",
  	"迷",
  	"暖",
  	"牌",
  	"秧",
  	"膽",
  	"詳",
  	"簧",
  	"踏",
  	"瓷",
  	"譜",
  	"呆",
  	"賓",
  	"糊",
  	"洛",
  	"輝",
  	"憤",
  	"競",
  	"隙",
  	"怒",
  	"粘",
  	"乃",
  	"緒",
  	"肩",
  	"籍",
  	"敏",
  	"塗",
  	"熙",
  	"皆",
  	"偵",
  	"懸",
  	"掘",
  	"享",
  	"糾",
  	"醒",
  	"狂",
  	"鎖",
  	"淀",
  	"恨",
  	"牲",
  	"霸",
  	"爬",
  	"賞",
  	"逆",
  	"玩",
  	"陵",
  	"祝",
  	"秒",
  	"浙",
  	"貌",
  	"役",
  	"彼",
  	"悉",
  	"鴨",
  	"趨",
  	"鳳",
  	"晨",
  	"畜",
  	"輩",
  	"秩",
  	"卵",
  	"署",
  	"梯",
  	"炎",
  	"灘",
  	"棋",
  	"驅",
  	"篩",
  	"峽",
  	"冒",
  	"啥",
  	"壽",
  	"譯",
  	"浸",
  	"泉",
  	"帽",
  	"遲",
  	"矽",
  	"疆",
  	"貸",
  	"漏",
  	"稿",
  	"冠",
  	"嫩",
  	"脅",
  	"芯",
  	"牢",
  	"叛",
  	"蝕",
  	"奧",
  	"鳴",
  	"嶺",
  	"羊",
  	"憑",
  	"串",
  	"塘",
  	"繪",
  	"酵",
  	"融",
  	"盆",
  	"錫",
  	"廟",
  	"籌",
  	"凍",
  	"輔",
  	"攝",
  	"襲",
  	"筋",
  	"拒",
  	"僚",
  	"旱",
  	"鉀",
  	"鳥",
  	"漆",
  	"沈",
  	"眉",
  	"疏",
  	"添",
  	"棒",
  	"穗",
  	"硝",
  	"韓",
  	"逼",
  	"扭",
  	"僑",
  	"涼",
  	"挺",
  	"碗",
  	"栽",
  	"炒",
  	"杯",
  	"患",
  	"餾",
  	"勸",
  	"豪",
  	"遼",
  	"勃",
  	"鴻",
  	"旦",
  	"吏",
  	"拜",
  	"狗",
  	"埋",
  	"輥",
  	"掩",
  	"飲",
  	"搬",
  	"罵",
  	"辭",
  	"勾",
  	"扣",
  	"估",
  	"蔣",
  	"絨",
  	"霧",
  	"丈",
  	"朵",
  	"姆",
  	"擬",
  	"宇",
  	"輯",
  	"陝",
  	"雕",
  	"償",
  	"蓄",
  	"崇",
  	"剪",
  	"倡",
  	"廳",
  	"咬",
  	"駛",
  	"薯",
  	"刷",
  	"斥",
  	"番",
  	"賦",
  	"奉",
  	"佛",
  	"澆",
  	"漫",
  	"曼",
  	"扇",
  	"鈣",
  	"桃",
  	"扶",
  	"仔",
  	"返",
  	"俗",
  	"虧",
  	"腔",
  	"鞋",
  	"棱",
  	"覆",
  	"框",
  	"悄",
  	"叔",
  	"撞",
  	"騙",
  	"勘",
  	"旺",
  	"沸",
  	"孤",
  	"吐",
  	"孟",
  	"渠",
  	"屈",
  	"疾",
  	"妙",
  	"惜",
  	"仰",
  	"狠",
  	"脹",
  	"諧",
  	"拋",
  	"黴",
  	"桑",
  	"崗",
  	"嘛",
  	"衰",
  	"盜",
  	"滲",
  	"臟",
  	"賴",
  	"湧",
  	"甜",
  	"曹",
  	"閱",
  	"肌",
  	"哩",
  	"厲",
  	"烴",
  	"緯",
  	"毅",
  	"昨",
  	"偽",
  	"症",
  	"煮",
  	"嘆",
  	"釘",
  	"搭",
  	"莖",
  	"籠",
  	"酷",
  	"偷",
  	"弓",
  	"錐",
  	"恆",
  	"傑",
  	"坑",
  	"鼻",
  	"翼",
  	"綸",
  	"敘",
  	"獄",
  	"逮",
  	"罐",
  	"絡",
  	"棚",
  	"抑",
  	"膨",
  	"蔬",
  	"寺",
  	"驟",
  	"穆",
  	"冶",
  	"枯",
  	"冊",
  	"屍",
  	"凸",
  	"紳",
  	"坯",
  	"犧",
  	"焰",
  	"轟",
  	"欣",
  	"晉",
  	"瘦",
  	"禦",
  	"錠",
  	"錦",
  	"喪",
  	"旬",
  	"鍛",
  	"壟",
  	"搜",
  	"撲",
  	"邀",
  	"亭",
  	"酯",
  	"邁",
  	"舒",
  	"脆",
  	"酶",
  	"閒",
  	"憂",
  	"酚",
  	"頑",
  	"羽",
  	"漲",
  	"卸",
  	"仗",
  	"陪",
  	"闢",
  	"懲",
  	"杭",
  	"姚",
  	"肚",
  	"捉",
  	"飄",
  	"漂",
  	"昆",
  	"欺",
  	"吾",
  	"郎",
  	"烷",
  	"汁",
  	"呵",
  	"飾",
  	"蕭",
  	"雅",
  	"郵",
  	"遷",
  	"燕",
  	"撒",
  	"姻",
  	"赴",
  	"宴",
  	"煩",
  	"債",
  	"帳",
  	"斑",
  	"鈴",
  	"旨",
  	"醇",
  	"董",
  	"餅",
  	"雛",
  	"姿",
  	"拌",
  	"傅",
  	"腹",
  	"妥",
  	"揉",
  	"賢",
  	"拆",
  	"歪",
  	"葡",
  	"胺",
  	"丟",
  	"浩",
  	"徽",
  	"昂",
  	"墊",
  	"擋",
  	"覽",
  	"貪",
  	"慰",
  	"繳",
  	"汪",
  	"慌",
  	"馮",
  	"諾",
  	"姜",
  	"誼",
  	"兇",
  	"劣",
  	"誣",
  	"耀",
  	"昏",
  	"躺",
  	"盈",
  	"騎",
  	"喬",
  	"溪",
  	"叢",
  	"盧",
  	"抹",
  	"悶",
  	"諮",
  	"刮",
  	"駕",
  	"纜",
  	"悟",
  	"摘",
  	"鉺",
  	"擲",
  	"頗",
  	"幻",
  	"柄",
  	"惠",
  	"慘",
  	"佳",
  	"仇",
  	"臘",
  	"窩",
  	"滌",
  	"劍",
  	"瞧",
  	"堡",
  	"潑",
  	"蔥",
  	"罩",
  	"霍",
  	"撈",
  	"胎",
  	"蒼",
  	"濱",
  	"倆",
  	"捅",
  	"湘",
  	"砍",
  	"霞",
  	"邵",
  	"萄",
  	"瘋",
  	"淮",
  	"遂",
  	"熊",
  	"糞",
  	"烘",
  	"宿",
  	"檔",
  	"戈",
  	"駁",
  	"嫂",
  	"裕",
  	"徙",
  	"箭",
  	"捐",
  	"腸",
  	"撐",
  	"曬",
  	"辨",
  	"殿",
  	"蓮",
  	"攤",
  	"攪",
  	"醬",
  	"屏",
  	"疫",
  	"哀",
  	"蔡",
  	"堵",
  	"沫",
  	"皺",
  	"暢",
  	"疊",
  	"閣",
  	"萊",
  	"敲",
  	"轄",
  	"鉤",
  	"痕",
  	"壩",
  	"巷",
  	"餓",
  	"禍",
  	"丘",
  	"玄",
  	"溜",
  	"曰",
  	"邏",
  	"彭",
  	"嘗",
  	"卿",
  	"妨",
  	"艇",
  	"吞",
  	"韋",
  	"怨",
  	"矮",
  	"歇"
  ];

  var chinese_traditional$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': chinese_traditional
  });

  var korean = [
  	"가격",
  	"가끔",
  	"가난",
  	"가능",
  	"가득",
  	"가르침",
  	"가뭄",
  	"가방",
  	"가상",
  	"가슴",
  	"가운데",
  	"가을",
  	"가이드",
  	"가입",
  	"가장",
  	"가정",
  	"가족",
  	"가죽",
  	"각오",
  	"각자",
  	"간격",
  	"간부",
  	"간섭",
  	"간장",
  	"간접",
  	"간판",
  	"갈등",
  	"갈비",
  	"갈색",
  	"갈증",
  	"감각",
  	"감기",
  	"감소",
  	"감수성",
  	"감자",
  	"감정",
  	"갑자기",
  	"강남",
  	"강당",
  	"강도",
  	"강력히",
  	"강변",
  	"강북",
  	"강사",
  	"강수량",
  	"강아지",
  	"강원도",
  	"강의",
  	"강제",
  	"강조",
  	"같이",
  	"개구리",
  	"개나리",
  	"개방",
  	"개별",
  	"개선",
  	"개성",
  	"개인",
  	"객관적",
  	"거실",
  	"거액",
  	"거울",
  	"거짓",
  	"거품",
  	"걱정",
  	"건강",
  	"건물",
  	"건설",
  	"건조",
  	"건축",
  	"걸음",
  	"검사",
  	"검토",
  	"게시판",
  	"게임",
  	"겨울",
  	"견해",
  	"결과",
  	"결국",
  	"결론",
  	"결석",
  	"결승",
  	"결심",
  	"결정",
  	"결혼",
  	"경계",
  	"경고",
  	"경기",
  	"경력",
  	"경복궁",
  	"경비",
  	"경상도",
  	"경영",
  	"경우",
  	"경쟁",
  	"경제",
  	"경주",
  	"경찰",
  	"경치",
  	"경향",
  	"경험",
  	"계곡",
  	"계단",
  	"계란",
  	"계산",
  	"계속",
  	"계약",
  	"계절",
  	"계층",
  	"계획",
  	"고객",
  	"고구려",
  	"고궁",
  	"고급",
  	"고등학생",
  	"고무신",
  	"고민",
  	"고양이",
  	"고장",
  	"고전",
  	"고집",
  	"고춧가루",
  	"고통",
  	"고향",
  	"곡식",
  	"골목",
  	"골짜기",
  	"골프",
  	"공간",
  	"공개",
  	"공격",
  	"공군",
  	"공급",
  	"공기",
  	"공동",
  	"공무원",
  	"공부",
  	"공사",
  	"공식",
  	"공업",
  	"공연",
  	"공원",
  	"공장",
  	"공짜",
  	"공책",
  	"공통",
  	"공포",
  	"공항",
  	"공휴일",
  	"과목",
  	"과일",
  	"과장",
  	"과정",
  	"과학",
  	"관객",
  	"관계",
  	"관광",
  	"관념",
  	"관람",
  	"관련",
  	"관리",
  	"관습",
  	"관심",
  	"관점",
  	"관찰",
  	"광경",
  	"광고",
  	"광장",
  	"광주",
  	"괴로움",
  	"굉장히",
  	"교과서",
  	"교문",
  	"교복",
  	"교실",
  	"교양",
  	"교육",
  	"교장",
  	"교직",
  	"교통",
  	"교환",
  	"교훈",
  	"구경",
  	"구름",
  	"구멍",
  	"구별",
  	"구분",
  	"구석",
  	"구성",
  	"구속",
  	"구역",
  	"구입",
  	"구청",
  	"구체적",
  	"국가",
  	"국기",
  	"국내",
  	"국립",
  	"국물",
  	"국민",
  	"국수",
  	"국어",
  	"국왕",
  	"국적",
  	"국제",
  	"국회",
  	"군대",
  	"군사",
  	"군인",
  	"궁극적",
  	"권리",
  	"권위",
  	"권투",
  	"귀국",
  	"귀신",
  	"규정",
  	"규칙",
  	"균형",
  	"그날",
  	"그냥",
  	"그늘",
  	"그러나",
  	"그룹",
  	"그릇",
  	"그림",
  	"그제서야",
  	"그토록",
  	"극복",
  	"극히",
  	"근거",
  	"근교",
  	"근래",
  	"근로",
  	"근무",
  	"근본",
  	"근원",
  	"근육",
  	"근처",
  	"글씨",
  	"글자",
  	"금강산",
  	"금고",
  	"금년",
  	"금메달",
  	"금액",
  	"금연",
  	"금요일",
  	"금지",
  	"긍정적",
  	"기간",
  	"기관",
  	"기념",
  	"기능",
  	"기독교",
  	"기둥",
  	"기록",
  	"기름",
  	"기법",
  	"기본",
  	"기분",
  	"기쁨",
  	"기숙사",
  	"기술",
  	"기억",
  	"기업",
  	"기온",
  	"기운",
  	"기원",
  	"기적",
  	"기준",
  	"기침",
  	"기혼",
  	"기획",
  	"긴급",
  	"긴장",
  	"길이",
  	"김밥",
  	"김치",
  	"김포공항",
  	"깍두기",
  	"깜빡",
  	"깨달음",
  	"깨소금",
  	"껍질",
  	"꼭대기",
  	"꽃잎",
  	"나들이",
  	"나란히",
  	"나머지",
  	"나물",
  	"나침반",
  	"나흘",
  	"낙엽",
  	"난방",
  	"날개",
  	"날씨",
  	"날짜",
  	"남녀",
  	"남대문",
  	"남매",
  	"남산",
  	"남자",
  	"남편",
  	"남학생",
  	"낭비",
  	"낱말",
  	"내년",
  	"내용",
  	"내일",
  	"냄비",
  	"냄새",
  	"냇물",
  	"냉동",
  	"냉면",
  	"냉방",
  	"냉장고",
  	"넥타이",
  	"넷째",
  	"노동",
  	"노란색",
  	"노력",
  	"노인",
  	"녹음",
  	"녹차",
  	"녹화",
  	"논리",
  	"논문",
  	"논쟁",
  	"놀이",
  	"농구",
  	"농담",
  	"농민",
  	"농부",
  	"농업",
  	"농장",
  	"농촌",
  	"높이",
  	"눈동자",
  	"눈물",
  	"눈썹",
  	"뉴욕",
  	"느낌",
  	"늑대",
  	"능동적",
  	"능력",
  	"다방",
  	"다양성",
  	"다음",
  	"다이어트",
  	"다행",
  	"단계",
  	"단골",
  	"단독",
  	"단맛",
  	"단순",
  	"단어",
  	"단위",
  	"단점",
  	"단체",
  	"단추",
  	"단편",
  	"단풍",
  	"달걀",
  	"달러",
  	"달력",
  	"달리",
  	"닭고기",
  	"담당",
  	"담배",
  	"담요",
  	"담임",
  	"답변",
  	"답장",
  	"당근",
  	"당분간",
  	"당연히",
  	"당장",
  	"대규모",
  	"대낮",
  	"대단히",
  	"대답",
  	"대도시",
  	"대략",
  	"대량",
  	"대륙",
  	"대문",
  	"대부분",
  	"대신",
  	"대응",
  	"대장",
  	"대전",
  	"대접",
  	"대중",
  	"대책",
  	"대출",
  	"대충",
  	"대통령",
  	"대학",
  	"대한민국",
  	"대합실",
  	"대형",
  	"덩어리",
  	"데이트",
  	"도대체",
  	"도덕",
  	"도둑",
  	"도망",
  	"도서관",
  	"도심",
  	"도움",
  	"도입",
  	"도자기",
  	"도저히",
  	"도전",
  	"도중",
  	"도착",
  	"독감",
  	"독립",
  	"독서",
  	"독일",
  	"독창적",
  	"동화책",
  	"뒷모습",
  	"뒷산",
  	"딸아이",
  	"마누라",
  	"마늘",
  	"마당",
  	"마라톤",
  	"마련",
  	"마무리",
  	"마사지",
  	"마약",
  	"마요네즈",
  	"마을",
  	"마음",
  	"마이크",
  	"마중",
  	"마지막",
  	"마찬가지",
  	"마찰",
  	"마흔",
  	"막걸리",
  	"막내",
  	"막상",
  	"만남",
  	"만두",
  	"만세",
  	"만약",
  	"만일",
  	"만점",
  	"만족",
  	"만화",
  	"많이",
  	"말기",
  	"말씀",
  	"말투",
  	"맘대로",
  	"망원경",
  	"매년",
  	"매달",
  	"매력",
  	"매번",
  	"매스컴",
  	"매일",
  	"매장",
  	"맥주",
  	"먹이",
  	"먼저",
  	"먼지",
  	"멀리",
  	"메일",
  	"며느리",
  	"며칠",
  	"면담",
  	"멸치",
  	"명단",
  	"명령",
  	"명예",
  	"명의",
  	"명절",
  	"명칭",
  	"명함",
  	"모금",
  	"모니터",
  	"모델",
  	"모든",
  	"모범",
  	"모습",
  	"모양",
  	"모임",
  	"모조리",
  	"모집",
  	"모퉁이",
  	"목걸이",
  	"목록",
  	"목사",
  	"목소리",
  	"목숨",
  	"목적",
  	"목표",
  	"몰래",
  	"몸매",
  	"몸무게",
  	"몸살",
  	"몸속",
  	"몸짓",
  	"몸통",
  	"몹시",
  	"무관심",
  	"무궁화",
  	"무더위",
  	"무덤",
  	"무릎",
  	"무슨",
  	"무엇",
  	"무역",
  	"무용",
  	"무조건",
  	"무지개",
  	"무척",
  	"문구",
  	"문득",
  	"문법",
  	"문서",
  	"문제",
  	"문학",
  	"문화",
  	"물가",
  	"물건",
  	"물결",
  	"물고기",
  	"물론",
  	"물리학",
  	"물음",
  	"물질",
  	"물체",
  	"미국",
  	"미디어",
  	"미사일",
  	"미술",
  	"미역",
  	"미용실",
  	"미움",
  	"미인",
  	"미팅",
  	"미혼",
  	"민간",
  	"민족",
  	"민주",
  	"믿음",
  	"밀가루",
  	"밀리미터",
  	"밑바닥",
  	"바가지",
  	"바구니",
  	"바나나",
  	"바늘",
  	"바닥",
  	"바닷가",
  	"바람",
  	"바이러스",
  	"바탕",
  	"박물관",
  	"박사",
  	"박수",
  	"반대",
  	"반드시",
  	"반말",
  	"반발",
  	"반성",
  	"반응",
  	"반장",
  	"반죽",
  	"반지",
  	"반찬",
  	"받침",
  	"발가락",
  	"발걸음",
  	"발견",
  	"발달",
  	"발레",
  	"발목",
  	"발바닥",
  	"발생",
  	"발음",
  	"발자국",
  	"발전",
  	"발톱",
  	"발표",
  	"밤하늘",
  	"밥그릇",
  	"밥맛",
  	"밥상",
  	"밥솥",
  	"방금",
  	"방면",
  	"방문",
  	"방바닥",
  	"방법",
  	"방송",
  	"방식",
  	"방안",
  	"방울",
  	"방지",
  	"방학",
  	"방해",
  	"방향",
  	"배경",
  	"배꼽",
  	"배달",
  	"배드민턴",
  	"백두산",
  	"백색",
  	"백성",
  	"백인",
  	"백제",
  	"백화점",
  	"버릇",
  	"버섯",
  	"버튼",
  	"번개",
  	"번역",
  	"번지",
  	"번호",
  	"벌금",
  	"벌레",
  	"벌써",
  	"범위",
  	"범인",
  	"범죄",
  	"법률",
  	"법원",
  	"법적",
  	"법칙",
  	"베이징",
  	"벨트",
  	"변경",
  	"변동",
  	"변명",
  	"변신",
  	"변호사",
  	"변화",
  	"별도",
  	"별명",
  	"별일",
  	"병실",
  	"병아리",
  	"병원",
  	"보관",
  	"보너스",
  	"보라색",
  	"보람",
  	"보름",
  	"보상",
  	"보안",
  	"보자기",
  	"보장",
  	"보전",
  	"보존",
  	"보통",
  	"보편적",
  	"보험",
  	"복도",
  	"복사",
  	"복숭아",
  	"복습",
  	"볶음",
  	"본격적",
  	"본래",
  	"본부",
  	"본사",
  	"본성",
  	"본인",
  	"본질",
  	"볼펜",
  	"봉사",
  	"봉지",
  	"봉투",
  	"부근",
  	"부끄러움",
  	"부담",
  	"부동산",
  	"부문",
  	"부분",
  	"부산",
  	"부상",
  	"부엌",
  	"부인",
  	"부작용",
  	"부장",
  	"부정",
  	"부족",
  	"부지런히",
  	"부친",
  	"부탁",
  	"부품",
  	"부회장",
  	"북부",
  	"북한",
  	"분노",
  	"분량",
  	"분리",
  	"분명",
  	"분석",
  	"분야",
  	"분위기",
  	"분필",
  	"분홍색",
  	"불고기",
  	"불과",
  	"불교",
  	"불꽃",
  	"불만",
  	"불법",
  	"불빛",
  	"불안",
  	"불이익",
  	"불행",
  	"브랜드",
  	"비극",
  	"비난",
  	"비닐",
  	"비둘기",
  	"비디오",
  	"비로소",
  	"비만",
  	"비명",
  	"비밀",
  	"비바람",
  	"비빔밥",
  	"비상",
  	"비용",
  	"비율",
  	"비중",
  	"비타민",
  	"비판",
  	"빌딩",
  	"빗물",
  	"빗방울",
  	"빗줄기",
  	"빛깔",
  	"빨간색",
  	"빨래",
  	"빨리",
  	"사건",
  	"사계절",
  	"사나이",
  	"사냥",
  	"사람",
  	"사랑",
  	"사립",
  	"사모님",
  	"사물",
  	"사방",
  	"사상",
  	"사생활",
  	"사설",
  	"사슴",
  	"사실",
  	"사업",
  	"사용",
  	"사월",
  	"사장",
  	"사전",
  	"사진",
  	"사촌",
  	"사춘기",
  	"사탕",
  	"사투리",
  	"사흘",
  	"산길",
  	"산부인과",
  	"산업",
  	"산책",
  	"살림",
  	"살인",
  	"살짝",
  	"삼계탕",
  	"삼국",
  	"삼십",
  	"삼월",
  	"삼촌",
  	"상관",
  	"상금",
  	"상대",
  	"상류",
  	"상반기",
  	"상상",
  	"상식",
  	"상업",
  	"상인",
  	"상자",
  	"상점",
  	"상처",
  	"상추",
  	"상태",
  	"상표",
  	"상품",
  	"상황",
  	"새벽",
  	"색깔",
  	"색연필",
  	"생각",
  	"생명",
  	"생물",
  	"생방송",
  	"생산",
  	"생선",
  	"생신",
  	"생일",
  	"생활",
  	"서랍",
  	"서른",
  	"서명",
  	"서민",
  	"서비스",
  	"서양",
  	"서울",
  	"서적",
  	"서점",
  	"서쪽",
  	"서클",
  	"석사",
  	"석유",
  	"선거",
  	"선물",
  	"선배",
  	"선생",
  	"선수",
  	"선원",
  	"선장",
  	"선전",
  	"선택",
  	"선풍기",
  	"설거지",
  	"설날",
  	"설렁탕",
  	"설명",
  	"설문",
  	"설사",
  	"설악산",
  	"설치",
  	"설탕",
  	"섭씨",
  	"성공",
  	"성당",
  	"성명",
  	"성별",
  	"성인",
  	"성장",
  	"성적",
  	"성질",
  	"성함",
  	"세금",
  	"세미나",
  	"세상",
  	"세월",
  	"세종대왕",
  	"세탁",
  	"센터",
  	"센티미터",
  	"셋째",
  	"소규모",
  	"소극적",
  	"소금",
  	"소나기",
  	"소년",
  	"소득",
  	"소망",
  	"소문",
  	"소설",
  	"소속",
  	"소아과",
  	"소용",
  	"소원",
  	"소음",
  	"소중히",
  	"소지품",
  	"소질",
  	"소풍",
  	"소형",
  	"속담",
  	"속도",
  	"속옷",
  	"손가락",
  	"손길",
  	"손녀",
  	"손님",
  	"손등",
  	"손목",
  	"손뼉",
  	"손실",
  	"손질",
  	"손톱",
  	"손해",
  	"솔직히",
  	"솜씨",
  	"송아지",
  	"송이",
  	"송편",
  	"쇠고기",
  	"쇼핑",
  	"수건",
  	"수년",
  	"수단",
  	"수돗물",
  	"수동적",
  	"수면",
  	"수명",
  	"수박",
  	"수상",
  	"수석",
  	"수술",
  	"수시로",
  	"수업",
  	"수염",
  	"수영",
  	"수입",
  	"수준",
  	"수집",
  	"수출",
  	"수컷",
  	"수필",
  	"수학",
  	"수험생",
  	"수화기",
  	"숙녀",
  	"숙소",
  	"숙제",
  	"순간",
  	"순서",
  	"순수",
  	"순식간",
  	"순위",
  	"숟가락",
  	"술병",
  	"술집",
  	"숫자",
  	"스님",
  	"스물",
  	"스스로",
  	"스승",
  	"스웨터",
  	"스위치",
  	"스케이트",
  	"스튜디오",
  	"스트레스",
  	"스포츠",
  	"슬쩍",
  	"슬픔",
  	"습관",
  	"습기",
  	"승객",
  	"승리",
  	"승부",
  	"승용차",
  	"승진",
  	"시각",
  	"시간",
  	"시골",
  	"시금치",
  	"시나리오",
  	"시댁",
  	"시리즈",
  	"시멘트",
  	"시민",
  	"시부모",
  	"시선",
  	"시설",
  	"시스템",
  	"시아버지",
  	"시어머니",
  	"시월",
  	"시인",
  	"시일",
  	"시작",
  	"시장",
  	"시절",
  	"시점",
  	"시중",
  	"시즌",
  	"시집",
  	"시청",
  	"시합",
  	"시험",
  	"식구",
  	"식기",
  	"식당",
  	"식량",
  	"식료품",
  	"식물",
  	"식빵",
  	"식사",
  	"식생활",
  	"식초",
  	"식탁",
  	"식품",
  	"신고",
  	"신규",
  	"신념",
  	"신문",
  	"신발",
  	"신비",
  	"신사",
  	"신세",
  	"신용",
  	"신제품",
  	"신청",
  	"신체",
  	"신화",
  	"실감",
  	"실내",
  	"실력",
  	"실례",
  	"실망",
  	"실수",
  	"실습",
  	"실시",
  	"실장",
  	"실정",
  	"실질적",
  	"실천",
  	"실체",
  	"실컷",
  	"실태",
  	"실패",
  	"실험",
  	"실현",
  	"심리",
  	"심부름",
  	"심사",
  	"심장",
  	"심정",
  	"심판",
  	"쌍둥이",
  	"씨름",
  	"씨앗",
  	"아가씨",
  	"아나운서",
  	"아드님",
  	"아들",
  	"아쉬움",
  	"아스팔트",
  	"아시아",
  	"아울러",
  	"아저씨",
  	"아줌마",
  	"아직",
  	"아침",
  	"아파트",
  	"아프리카",
  	"아픔",
  	"아홉",
  	"아흔",
  	"악기",
  	"악몽",
  	"악수",
  	"안개",
  	"안경",
  	"안과",
  	"안내",
  	"안녕",
  	"안동",
  	"안방",
  	"안부",
  	"안주",
  	"알루미늄",
  	"알코올",
  	"암시",
  	"암컷",
  	"압력",
  	"앞날",
  	"앞문",
  	"애인",
  	"애정",
  	"액수",
  	"앨범",
  	"야간",
  	"야단",
  	"야옹",
  	"약간",
  	"약국",
  	"약속",
  	"약수",
  	"약점",
  	"약품",
  	"약혼녀",
  	"양념",
  	"양력",
  	"양말",
  	"양배추",
  	"양주",
  	"양파",
  	"어둠",
  	"어려움",
  	"어른",
  	"어젯밤",
  	"어쨌든",
  	"어쩌다가",
  	"어쩐지",
  	"언니",
  	"언덕",
  	"언론",
  	"언어",
  	"얼굴",
  	"얼른",
  	"얼음",
  	"얼핏",
  	"엄마",
  	"업무",
  	"업종",
  	"업체",
  	"엉덩이",
  	"엉망",
  	"엉터리",
  	"엊그제",
  	"에너지",
  	"에어컨",
  	"엔진",
  	"여건",
  	"여고생",
  	"여관",
  	"여군",
  	"여권",
  	"여대생",
  	"여덟",
  	"여동생",
  	"여든",
  	"여론",
  	"여름",
  	"여섯",
  	"여성",
  	"여왕",
  	"여인",
  	"여전히",
  	"여직원",
  	"여학생",
  	"여행",
  	"역사",
  	"역시",
  	"역할",
  	"연결",
  	"연구",
  	"연극",
  	"연기",
  	"연락",
  	"연설",
  	"연세",
  	"연속",
  	"연습",
  	"연애",
  	"연예인",
  	"연인",
  	"연장",
  	"연주",
  	"연출",
  	"연필",
  	"연합",
  	"연휴",
  	"열기",
  	"열매",
  	"열쇠",
  	"열심히",
  	"열정",
  	"열차",
  	"열흘",
  	"염려",
  	"엽서",
  	"영국",
  	"영남",
  	"영상",
  	"영양",
  	"영역",
  	"영웅",
  	"영원히",
  	"영하",
  	"영향",
  	"영혼",
  	"영화",
  	"옆구리",
  	"옆방",
  	"옆집",
  	"예감",
  	"예금",
  	"예방",
  	"예산",
  	"예상",
  	"예선",
  	"예술",
  	"예습",
  	"예식장",
  	"예약",
  	"예전",
  	"예절",
  	"예정",
  	"예컨대",
  	"옛날",
  	"오늘",
  	"오락",
  	"오랫동안",
  	"오렌지",
  	"오로지",
  	"오른발",
  	"오븐",
  	"오십",
  	"오염",
  	"오월",
  	"오전",
  	"오직",
  	"오징어",
  	"오페라",
  	"오피스텔",
  	"오히려",
  	"옥상",
  	"옥수수",
  	"온갖",
  	"온라인",
  	"온몸",
  	"온종일",
  	"온통",
  	"올가을",
  	"올림픽",
  	"올해",
  	"옷차림",
  	"와이셔츠",
  	"와인",
  	"완성",
  	"완전",
  	"왕비",
  	"왕자",
  	"왜냐하면",
  	"왠지",
  	"외갓집",
  	"외국",
  	"외로움",
  	"외삼촌",
  	"외출",
  	"외침",
  	"외할머니",
  	"왼발",
  	"왼손",
  	"왼쪽",
  	"요금",
  	"요일",
  	"요즘",
  	"요청",
  	"용기",
  	"용서",
  	"용어",
  	"우산",
  	"우선",
  	"우승",
  	"우연히",
  	"우정",
  	"우체국",
  	"우편",
  	"운동",
  	"운명",
  	"운반",
  	"운전",
  	"운행",
  	"울산",
  	"울음",
  	"움직임",
  	"웃어른",
  	"웃음",
  	"워낙",
  	"원고",
  	"원래",
  	"원서",
  	"원숭이",
  	"원인",
  	"원장",
  	"원피스",
  	"월급",
  	"월드컵",
  	"월세",
  	"월요일",
  	"웨이터",
  	"위반",
  	"위법",
  	"위성",
  	"위원",
  	"위험",
  	"위협",
  	"윗사람",
  	"유난히",
  	"유럽",
  	"유명",
  	"유물",
  	"유산",
  	"유적",
  	"유치원",
  	"유학",
  	"유행",
  	"유형",
  	"육군",
  	"육상",
  	"육십",
  	"육체",
  	"은행",
  	"음력",
  	"음료",
  	"음반",
  	"음성",
  	"음식",
  	"음악",
  	"음주",
  	"의견",
  	"의논",
  	"의문",
  	"의복",
  	"의식",
  	"의심",
  	"의외로",
  	"의욕",
  	"의원",
  	"의학",
  	"이것",
  	"이곳",
  	"이념",
  	"이놈",
  	"이달",
  	"이대로",
  	"이동",
  	"이렇게",
  	"이력서",
  	"이론적",
  	"이름",
  	"이민",
  	"이발소",
  	"이별",
  	"이불",
  	"이빨",
  	"이상",
  	"이성",
  	"이슬",
  	"이야기",
  	"이용",
  	"이웃",
  	"이월",
  	"이윽고",
  	"이익",
  	"이전",
  	"이중",
  	"이튿날",
  	"이틀",
  	"이혼",
  	"인간",
  	"인격",
  	"인공",
  	"인구",
  	"인근",
  	"인기",
  	"인도",
  	"인류",
  	"인물",
  	"인생",
  	"인쇄",
  	"인연",
  	"인원",
  	"인재",
  	"인종",
  	"인천",
  	"인체",
  	"인터넷",
  	"인하",
  	"인형",
  	"일곱",
  	"일기",
  	"일단",
  	"일대",
  	"일등",
  	"일반",
  	"일본",
  	"일부",
  	"일상",
  	"일생",
  	"일손",
  	"일요일",
  	"일월",
  	"일정",
  	"일종",
  	"일주일",
  	"일찍",
  	"일체",
  	"일치",
  	"일행",
  	"일회용",
  	"임금",
  	"임무",
  	"입대",
  	"입력",
  	"입맛",
  	"입사",
  	"입술",
  	"입시",
  	"입원",
  	"입장",
  	"입학",
  	"자가용",
  	"자격",
  	"자극",
  	"자동",
  	"자랑",
  	"자부심",
  	"자식",
  	"자신",
  	"자연",
  	"자원",
  	"자율",
  	"자전거",
  	"자정",
  	"자존심",
  	"자판",
  	"작가",
  	"작년",
  	"작성",
  	"작업",
  	"작용",
  	"작은딸",
  	"작품",
  	"잔디",
  	"잔뜩",
  	"잔치",
  	"잘못",
  	"잠깐",
  	"잠수함",
  	"잠시",
  	"잠옷",
  	"잠자리",
  	"잡지",
  	"장관",
  	"장군",
  	"장기간",
  	"장래",
  	"장례",
  	"장르",
  	"장마",
  	"장면",
  	"장모",
  	"장미",
  	"장비",
  	"장사",
  	"장소",
  	"장식",
  	"장애인",
  	"장인",
  	"장점",
  	"장차",
  	"장학금",
  	"재능",
  	"재빨리",
  	"재산",
  	"재생",
  	"재작년",
  	"재정",
  	"재채기",
  	"재판",
  	"재학",
  	"재활용",
  	"저것",
  	"저고리",
  	"저곳",
  	"저녁",
  	"저런",
  	"저렇게",
  	"저번",
  	"저울",
  	"저절로",
  	"저축",
  	"적극",
  	"적당히",
  	"적성",
  	"적용",
  	"적응",
  	"전개",
  	"전공",
  	"전기",
  	"전달",
  	"전라도",
  	"전망",
  	"전문",
  	"전반",
  	"전부",
  	"전세",
  	"전시",
  	"전용",
  	"전자",
  	"전쟁",
  	"전주",
  	"전철",
  	"전체",
  	"전통",
  	"전혀",
  	"전후",
  	"절대",
  	"절망",
  	"절반",
  	"절약",
  	"절차",
  	"점검",
  	"점수",
  	"점심",
  	"점원",
  	"점점",
  	"점차",
  	"접근",
  	"접시",
  	"접촉",
  	"젓가락",
  	"정거장",
  	"정도",
  	"정류장",
  	"정리",
  	"정말",
  	"정면",
  	"정문",
  	"정반대",
  	"정보",
  	"정부",
  	"정비",
  	"정상",
  	"정성",
  	"정오",
  	"정원",
  	"정장",
  	"정지",
  	"정치",
  	"정확히",
  	"제공",
  	"제과점",
  	"제대로",
  	"제목",
  	"제발",
  	"제법",
  	"제삿날",
  	"제안",
  	"제일",
  	"제작",
  	"제주도",
  	"제출",
  	"제품",
  	"제한",
  	"조각",
  	"조건",
  	"조금",
  	"조깅",
  	"조명",
  	"조미료",
  	"조상",
  	"조선",
  	"조용히",
  	"조절",
  	"조정",
  	"조직",
  	"존댓말",
  	"존재",
  	"졸업",
  	"졸음",
  	"종교",
  	"종로",
  	"종류",
  	"종소리",
  	"종업원",
  	"종종",
  	"종합",
  	"좌석",
  	"죄인",
  	"주관적",
  	"주름",
  	"주말",
  	"주머니",
  	"주먹",
  	"주문",
  	"주민",
  	"주방",
  	"주변",
  	"주식",
  	"주인",
  	"주일",
  	"주장",
  	"주전자",
  	"주택",
  	"준비",
  	"줄거리",
  	"줄기",
  	"줄무늬",
  	"중간",
  	"중계방송",
  	"중국",
  	"중년",
  	"중단",
  	"중독",
  	"중반",
  	"중부",
  	"중세",
  	"중소기업",
  	"중순",
  	"중앙",
  	"중요",
  	"중학교",
  	"즉석",
  	"즉시",
  	"즐거움",
  	"증가",
  	"증거",
  	"증권",
  	"증상",
  	"증세",
  	"지각",
  	"지갑",
  	"지경",
  	"지극히",
  	"지금",
  	"지급",
  	"지능",
  	"지름길",
  	"지리산",
  	"지방",
  	"지붕",
  	"지식",
  	"지역",
  	"지우개",
  	"지원",
  	"지적",
  	"지점",
  	"지진",
  	"지출",
  	"직선",
  	"직업",
  	"직원",
  	"직장",
  	"진급",
  	"진동",
  	"진로",
  	"진료",
  	"진리",
  	"진짜",
  	"진찰",
  	"진출",
  	"진통",
  	"진행",
  	"질문",
  	"질병",
  	"질서",
  	"짐작",
  	"집단",
  	"집안",
  	"집중",
  	"짜증",
  	"찌꺼기",
  	"차남",
  	"차라리",
  	"차량",
  	"차림",
  	"차별",
  	"차선",
  	"차츰",
  	"착각",
  	"찬물",
  	"찬성",
  	"참가",
  	"참기름",
  	"참새",
  	"참석",
  	"참여",
  	"참외",
  	"참조",
  	"찻잔",
  	"창가",
  	"창고",
  	"창구",
  	"창문",
  	"창밖",
  	"창작",
  	"창조",
  	"채널",
  	"채점",
  	"책가방",
  	"책방",
  	"책상",
  	"책임",
  	"챔피언",
  	"처벌",
  	"처음",
  	"천국",
  	"천둥",
  	"천장",
  	"천재",
  	"천천히",
  	"철도",
  	"철저히",
  	"철학",
  	"첫날",
  	"첫째",
  	"청년",
  	"청바지",
  	"청소",
  	"청춘",
  	"체계",
  	"체력",
  	"체온",
  	"체육",
  	"체중",
  	"체험",
  	"초등학생",
  	"초반",
  	"초밥",
  	"초상화",
  	"초순",
  	"초여름",
  	"초원",
  	"초저녁",
  	"초점",
  	"초청",
  	"초콜릿",
  	"촛불",
  	"총각",
  	"총리",
  	"총장",
  	"촬영",
  	"최근",
  	"최상",
  	"최선",
  	"최신",
  	"최악",
  	"최종",
  	"추석",
  	"추억",
  	"추진",
  	"추천",
  	"추측",
  	"축구",
  	"축소",
  	"축제",
  	"축하",
  	"출근",
  	"출발",
  	"출산",
  	"출신",
  	"출연",
  	"출입",
  	"출장",
  	"출판",
  	"충격",
  	"충고",
  	"충돌",
  	"충분히",
  	"충청도",
  	"취업",
  	"취직",
  	"취향",
  	"치약",
  	"친구",
  	"친척",
  	"칠십",
  	"칠월",
  	"칠판",
  	"침대",
  	"침묵",
  	"침실",
  	"칫솔",
  	"칭찬",
  	"카메라",
  	"카운터",
  	"칼국수",
  	"캐릭터",
  	"캠퍼스",
  	"캠페인",
  	"커튼",
  	"컨디션",
  	"컬러",
  	"컴퓨터",
  	"코끼리",
  	"코미디",
  	"콘서트",
  	"콜라",
  	"콤플렉스",
  	"콩나물",
  	"쾌감",
  	"쿠데타",
  	"크림",
  	"큰길",
  	"큰딸",
  	"큰소리",
  	"큰아들",
  	"큰어머니",
  	"큰일",
  	"큰절",
  	"클래식",
  	"클럽",
  	"킬로",
  	"타입",
  	"타자기",
  	"탁구",
  	"탁자",
  	"탄생",
  	"태권도",
  	"태양",
  	"태풍",
  	"택시",
  	"탤런트",
  	"터널",
  	"터미널",
  	"테니스",
  	"테스트",
  	"테이블",
  	"텔레비전",
  	"토론",
  	"토마토",
  	"토요일",
  	"통계",
  	"통과",
  	"통로",
  	"통신",
  	"통역",
  	"통일",
  	"통장",
  	"통제",
  	"통증",
  	"통합",
  	"통화",
  	"퇴근",
  	"퇴원",
  	"퇴직금",
  	"튀김",
  	"트럭",
  	"특급",
  	"특별",
  	"특성",
  	"특수",
  	"특징",
  	"특히",
  	"튼튼히",
  	"티셔츠",
  	"파란색",
  	"파일",
  	"파출소",
  	"판결",
  	"판단",
  	"판매",
  	"판사",
  	"팔십",
  	"팔월",
  	"팝송",
  	"패션",
  	"팩스",
  	"팩시밀리",
  	"팬티",
  	"퍼센트",
  	"페인트",
  	"편견",
  	"편의",
  	"편지",
  	"편히",
  	"평가",
  	"평균",
  	"평생",
  	"평소",
  	"평양",
  	"평일",
  	"평화",
  	"포스터",
  	"포인트",
  	"포장",
  	"포함",
  	"표면",
  	"표정",
  	"표준",
  	"표현",
  	"품목",
  	"품질",
  	"풍경",
  	"풍속",
  	"풍습",
  	"프랑스",
  	"프린터",
  	"플라스틱",
  	"피곤",
  	"피망",
  	"피아노",
  	"필름",
  	"필수",
  	"필요",
  	"필자",
  	"필통",
  	"핑계",
  	"하느님",
  	"하늘",
  	"하드웨어",
  	"하룻밤",
  	"하반기",
  	"하숙집",
  	"하순",
  	"하여튼",
  	"하지만",
  	"하천",
  	"하품",
  	"하필",
  	"학과",
  	"학교",
  	"학급",
  	"학기",
  	"학년",
  	"학력",
  	"학번",
  	"학부모",
  	"학비",
  	"학생",
  	"학술",
  	"학습",
  	"학용품",
  	"학원",
  	"학위",
  	"학자",
  	"학점",
  	"한계",
  	"한글",
  	"한꺼번에",
  	"한낮",
  	"한눈",
  	"한동안",
  	"한때",
  	"한라산",
  	"한마디",
  	"한문",
  	"한번",
  	"한복",
  	"한식",
  	"한여름",
  	"한쪽",
  	"할머니",
  	"할아버지",
  	"할인",
  	"함께",
  	"함부로",
  	"합격",
  	"합리적",
  	"항공",
  	"항구",
  	"항상",
  	"항의",
  	"해결",
  	"해군",
  	"해답",
  	"해당",
  	"해물",
  	"해석",
  	"해설",
  	"해수욕장",
  	"해안",
  	"핵심",
  	"핸드백",
  	"햄버거",
  	"햇볕",
  	"햇살",
  	"행동",
  	"행복",
  	"행사",
  	"행운",
  	"행위",
  	"향기",
  	"향상",
  	"향수",
  	"허락",
  	"허용",
  	"헬기",
  	"현관",
  	"현금",
  	"현대",
  	"현상",
  	"현실",
  	"현장",
  	"현재",
  	"현지",
  	"혈액",
  	"협력",
  	"형부",
  	"형사",
  	"형수",
  	"형식",
  	"형제",
  	"형태",
  	"형편",
  	"혜택",
  	"호기심",
  	"호남",
  	"호랑이",
  	"호박",
  	"호텔",
  	"호흡",
  	"혹시",
  	"홀로",
  	"홈페이지",
  	"홍보",
  	"홍수",
  	"홍차",
  	"화면",
  	"화분",
  	"화살",
  	"화요일",
  	"화장",
  	"화학",
  	"확보",
  	"확인",
  	"확장",
  	"확정",
  	"환갑",
  	"환경",
  	"환영",
  	"환율",
  	"환자",
  	"활기",
  	"활동",
  	"활발히",
  	"활용",
  	"활짝",
  	"회견",
  	"회관",
  	"회복",
  	"회색",
  	"회원",
  	"회장",
  	"회전",
  	"횟수",
  	"횡단보도",
  	"효율적",
  	"후반",
  	"후춧가루",
  	"훈련",
  	"훨씬",
  	"휴식",
  	"휴일",
  	"흉내",
  	"흐름",
  	"흑백",
  	"흑인",
  	"흔적",
  	"흔히",
  	"흥미",
  	"흥분",
  	"희곡",
  	"희망",
  	"희생",
  	"흰색",
  	"힘껏"
  ];

  var korean$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': korean
  });

  var french = [
  	"abaisser",
  	"abandon",
  	"abdiquer",
  	"abeille",
  	"abolir",
  	"aborder",
  	"aboutir",
  	"aboyer",
  	"abrasif",
  	"abreuver",
  	"abriter",
  	"abroger",
  	"abrupt",
  	"absence",
  	"absolu",
  	"absurde",
  	"abusif",
  	"abyssal",
  	"académie",
  	"acajou",
  	"acarien",
  	"accabler",
  	"accepter",
  	"acclamer",
  	"accolade",
  	"accroche",
  	"accuser",
  	"acerbe",
  	"achat",
  	"acheter",
  	"aciduler",
  	"acier",
  	"acompte",
  	"acquérir",
  	"acronyme",
  	"acteur",
  	"actif",
  	"actuel",
  	"adepte",
  	"adéquat",
  	"adhésif",
  	"adjectif",
  	"adjuger",
  	"admettre",
  	"admirer",
  	"adopter",
  	"adorer",
  	"adoucir",
  	"adresse",
  	"adroit",
  	"adulte",
  	"adverbe",
  	"aérer",
  	"aéronef",
  	"affaire",
  	"affecter",
  	"affiche",
  	"affreux",
  	"affubler",
  	"agacer",
  	"agencer",
  	"agile",
  	"agiter",
  	"agrafer",
  	"agréable",
  	"agrume",
  	"aider",
  	"aiguille",
  	"ailier",
  	"aimable",
  	"aisance",
  	"ajouter",
  	"ajuster",
  	"alarmer",
  	"alchimie",
  	"alerte",
  	"algèbre",
  	"algue",
  	"aliéner",
  	"aliment",
  	"alléger",
  	"alliage",
  	"allouer",
  	"allumer",
  	"alourdir",
  	"alpaga",
  	"altesse",
  	"alvéole",
  	"amateur",
  	"ambigu",
  	"ambre",
  	"aménager",
  	"amertume",
  	"amidon",
  	"amiral",
  	"amorcer",
  	"amour",
  	"amovible",
  	"amphibie",
  	"ampleur",
  	"amusant",
  	"analyse",
  	"anaphore",
  	"anarchie",
  	"anatomie",
  	"ancien",
  	"anéantir",
  	"angle",
  	"angoisse",
  	"anguleux",
  	"animal",
  	"annexer",
  	"annonce",
  	"annuel",
  	"anodin",
  	"anomalie",
  	"anonyme",
  	"anormal",
  	"antenne",
  	"antidote",
  	"anxieux",
  	"apaiser",
  	"apéritif",
  	"aplanir",
  	"apologie",
  	"appareil",
  	"appeler",
  	"apporter",
  	"appuyer",
  	"aquarium",
  	"aqueduc",
  	"arbitre",
  	"arbuste",
  	"ardeur",
  	"ardoise",
  	"argent",
  	"arlequin",
  	"armature",
  	"armement",
  	"armoire",
  	"armure",
  	"arpenter",
  	"arracher",
  	"arriver",
  	"arroser",
  	"arsenic",
  	"artériel",
  	"article",
  	"aspect",
  	"asphalte",
  	"aspirer",
  	"assaut",
  	"asservir",
  	"assiette",
  	"associer",
  	"assurer",
  	"asticot",
  	"astre",
  	"astuce",
  	"atelier",
  	"atome",
  	"atrium",
  	"atroce",
  	"attaque",
  	"attentif",
  	"attirer",
  	"attraper",
  	"aubaine",
  	"auberge",
  	"audace",
  	"audible",
  	"augurer",
  	"aurore",
  	"automne",
  	"autruche",
  	"avaler",
  	"avancer",
  	"avarice",
  	"avenir",
  	"averse",
  	"aveugle",
  	"aviateur",
  	"avide",
  	"avion",
  	"aviser",
  	"avoine",
  	"avouer",
  	"avril",
  	"axial",
  	"axiome",
  	"badge",
  	"bafouer",
  	"bagage",
  	"baguette",
  	"baignade",
  	"balancer",
  	"balcon",
  	"baleine",
  	"balisage",
  	"bambin",
  	"bancaire",
  	"bandage",
  	"banlieue",
  	"bannière",
  	"banquier",
  	"barbier",
  	"baril",
  	"baron",
  	"barque",
  	"barrage",
  	"bassin",
  	"bastion",
  	"bataille",
  	"bateau",
  	"batterie",
  	"baudrier",
  	"bavarder",
  	"belette",
  	"bélier",
  	"belote",
  	"bénéfice",
  	"berceau",
  	"berger",
  	"berline",
  	"bermuda",
  	"besace",
  	"besogne",
  	"bétail",
  	"beurre",
  	"biberon",
  	"bicycle",
  	"bidule",
  	"bijou",
  	"bilan",
  	"bilingue",
  	"billard",
  	"binaire",
  	"biologie",
  	"biopsie",
  	"biotype",
  	"biscuit",
  	"bison",
  	"bistouri",
  	"bitume",
  	"bizarre",
  	"blafard",
  	"blague",
  	"blanchir",
  	"blessant",
  	"blinder",
  	"blond",
  	"bloquer",
  	"blouson",
  	"bobard",
  	"bobine",
  	"boire",
  	"boiser",
  	"bolide",
  	"bonbon",
  	"bondir",
  	"bonheur",
  	"bonifier",
  	"bonus",
  	"bordure",
  	"borne",
  	"botte",
  	"boucle",
  	"boueux",
  	"bougie",
  	"boulon",
  	"bouquin",
  	"bourse",
  	"boussole",
  	"boutique",
  	"boxeur",
  	"branche",
  	"brasier",
  	"brave",
  	"brebis",
  	"brèche",
  	"breuvage",
  	"bricoler",
  	"brigade",
  	"brillant",
  	"brioche",
  	"brique",
  	"brochure",
  	"broder",
  	"bronzer",
  	"brousse",
  	"broyeur",
  	"brume",
  	"brusque",
  	"brutal",
  	"bruyant",
  	"buffle",
  	"buisson",
  	"bulletin",
  	"bureau",
  	"burin",
  	"bustier",
  	"butiner",
  	"butoir",
  	"buvable",
  	"buvette",
  	"cabanon",
  	"cabine",
  	"cachette",
  	"cadeau",
  	"cadre",
  	"caféine",
  	"caillou",
  	"caisson",
  	"calculer",
  	"calepin",
  	"calibre",
  	"calmer",
  	"calomnie",
  	"calvaire",
  	"camarade",
  	"caméra",
  	"camion",
  	"campagne",
  	"canal",
  	"caneton",
  	"canon",
  	"cantine",
  	"canular",
  	"capable",
  	"caporal",
  	"caprice",
  	"capsule",
  	"capter",
  	"capuche",
  	"carabine",
  	"carbone",
  	"caresser",
  	"caribou",
  	"carnage",
  	"carotte",
  	"carreau",
  	"carton",
  	"cascade",
  	"casier",
  	"casque",
  	"cassure",
  	"causer",
  	"caution",
  	"cavalier",
  	"caverne",
  	"caviar",
  	"cédille",
  	"ceinture",
  	"céleste",
  	"cellule",
  	"cendrier",
  	"censurer",
  	"central",
  	"cercle",
  	"cérébral",
  	"cerise",
  	"cerner",
  	"cerveau",
  	"cesser",
  	"chagrin",
  	"chaise",
  	"chaleur",
  	"chambre",
  	"chance",
  	"chapitre",
  	"charbon",
  	"chasseur",
  	"chaton",
  	"chausson",
  	"chavirer",
  	"chemise",
  	"chenille",
  	"chéquier",
  	"chercher",
  	"cheval",
  	"chien",
  	"chiffre",
  	"chignon",
  	"chimère",
  	"chiot",
  	"chlorure",
  	"chocolat",
  	"choisir",
  	"chose",
  	"chouette",
  	"chrome",
  	"chute",
  	"cigare",
  	"cigogne",
  	"cimenter",
  	"cinéma",
  	"cintrer",
  	"circuler",
  	"cirer",
  	"cirque",
  	"citerne",
  	"citoyen",
  	"citron",
  	"civil",
  	"clairon",
  	"clameur",
  	"claquer",
  	"classe",
  	"clavier",
  	"client",
  	"cligner",
  	"climat",
  	"clivage",
  	"cloche",
  	"clonage",
  	"cloporte",
  	"cobalt",
  	"cobra",
  	"cocasse",
  	"cocotier",
  	"coder",
  	"codifier",
  	"coffre",
  	"cogner",
  	"cohésion",
  	"coiffer",
  	"coincer",
  	"colère",
  	"colibri",
  	"colline",
  	"colmater",
  	"colonel",
  	"combat",
  	"comédie",
  	"commande",
  	"compact",
  	"concert",
  	"conduire",
  	"confier",
  	"congeler",
  	"connoter",
  	"consonne",
  	"contact",
  	"convexe",
  	"copain",
  	"copie",
  	"corail",
  	"corbeau",
  	"cordage",
  	"corniche",
  	"corpus",
  	"correct",
  	"cortège",
  	"cosmique",
  	"costume",
  	"coton",
  	"coude",
  	"coupure",
  	"courage",
  	"couteau",
  	"couvrir",
  	"coyote",
  	"crabe",
  	"crainte",
  	"cravate",
  	"crayon",
  	"créature",
  	"créditer",
  	"crémeux",
  	"creuser",
  	"crevette",
  	"cribler",
  	"crier",
  	"cristal",
  	"critère",
  	"croire",
  	"croquer",
  	"crotale",
  	"crucial",
  	"cruel",
  	"crypter",
  	"cubique",
  	"cueillir",
  	"cuillère",
  	"cuisine",
  	"cuivre",
  	"culminer",
  	"cultiver",
  	"cumuler",
  	"cupide",
  	"curatif",
  	"curseur",
  	"cyanure",
  	"cycle",
  	"cylindre",
  	"cynique",
  	"daigner",
  	"damier",
  	"danger",
  	"danseur",
  	"dauphin",
  	"débattre",
  	"débiter",
  	"déborder",
  	"débrider",
  	"débutant",
  	"décaler",
  	"décembre",
  	"déchirer",
  	"décider",
  	"déclarer",
  	"décorer",
  	"décrire",
  	"décupler",
  	"dédale",
  	"déductif",
  	"déesse",
  	"défensif",
  	"défiler",
  	"défrayer",
  	"dégager",
  	"dégivrer",
  	"déglutir",
  	"dégrafer",
  	"déjeuner",
  	"délice",
  	"déloger",
  	"demander",
  	"demeurer",
  	"démolir",
  	"dénicher",
  	"dénouer",
  	"dentelle",
  	"dénuder",
  	"départ",
  	"dépenser",
  	"déphaser",
  	"déplacer",
  	"déposer",
  	"déranger",
  	"dérober",
  	"désastre",
  	"descente",
  	"désert",
  	"désigner",
  	"désobéir",
  	"dessiner",
  	"destrier",
  	"détacher",
  	"détester",
  	"détourer",
  	"détresse",
  	"devancer",
  	"devenir",
  	"deviner",
  	"devoir",
  	"diable",
  	"dialogue",
  	"diamant",
  	"dicter",
  	"différer",
  	"digérer",
  	"digital",
  	"digne",
  	"diluer",
  	"dimanche",
  	"diminuer",
  	"dioxyde",
  	"directif",
  	"diriger",
  	"discuter",
  	"disposer",
  	"dissiper",
  	"distance",
  	"divertir",
  	"diviser",
  	"docile",
  	"docteur",
  	"dogme",
  	"doigt",
  	"domaine",
  	"domicile",
  	"dompter",
  	"donateur",
  	"donjon",
  	"donner",
  	"dopamine",
  	"dortoir",
  	"dorure",
  	"dosage",
  	"doseur",
  	"dossier",
  	"dotation",
  	"douanier",
  	"double",
  	"douceur",
  	"douter",
  	"doyen",
  	"dragon",
  	"draper",
  	"dresser",
  	"dribbler",
  	"droiture",
  	"duperie",
  	"duplexe",
  	"durable",
  	"durcir",
  	"dynastie",
  	"éblouir",
  	"écarter",
  	"écharpe",
  	"échelle",
  	"éclairer",
  	"éclipse",
  	"éclore",
  	"écluse",
  	"école",
  	"économie",
  	"écorce",
  	"écouter",
  	"écraser",
  	"écrémer",
  	"écrivain",
  	"écrou",
  	"écume",
  	"écureuil",
  	"édifier",
  	"éduquer",
  	"effacer",
  	"effectif",
  	"effigie",
  	"effort",
  	"effrayer",
  	"effusion",
  	"égaliser",
  	"égarer",
  	"éjecter",
  	"élaborer",
  	"élargir",
  	"électron",
  	"élégant",
  	"éléphant",
  	"élève",
  	"éligible",
  	"élitisme",
  	"éloge",
  	"élucider",
  	"éluder",
  	"emballer",
  	"embellir",
  	"embryon",
  	"émeraude",
  	"émission",
  	"emmener",
  	"émotion",
  	"émouvoir",
  	"empereur",
  	"employer",
  	"emporter",
  	"emprise",
  	"émulsion",
  	"encadrer",
  	"enchère",
  	"enclave",
  	"encoche",
  	"endiguer",
  	"endosser",
  	"endroit",
  	"enduire",
  	"énergie",
  	"enfance",
  	"enfermer",
  	"enfouir",
  	"engager",
  	"engin",
  	"englober",
  	"énigme",
  	"enjamber",
  	"enjeu",
  	"enlever",
  	"ennemi",
  	"ennuyeux",
  	"enrichir",
  	"enrobage",
  	"enseigne",
  	"entasser",
  	"entendre",
  	"entier",
  	"entourer",
  	"entraver",
  	"énumérer",
  	"envahir",
  	"enviable",
  	"envoyer",
  	"enzyme",
  	"éolien",
  	"épaissir",
  	"épargne",
  	"épatant",
  	"épaule",
  	"épicerie",
  	"épidémie",
  	"épier",
  	"épilogue",
  	"épine",
  	"épisode",
  	"épitaphe",
  	"époque",
  	"épreuve",
  	"éprouver",
  	"épuisant",
  	"équerre",
  	"équipe",
  	"ériger",
  	"érosion",
  	"erreur",
  	"éruption",
  	"escalier",
  	"espadon",
  	"espèce",
  	"espiègle",
  	"espoir",
  	"esprit",
  	"esquiver",
  	"essayer",
  	"essence",
  	"essieu",
  	"essorer",
  	"estime",
  	"estomac",
  	"estrade",
  	"étagère",
  	"étaler",
  	"étanche",
  	"étatique",
  	"éteindre",
  	"étendoir",
  	"éternel",
  	"éthanol",
  	"éthique",
  	"ethnie",
  	"étirer",
  	"étoffer",
  	"étoile",
  	"étonnant",
  	"étourdir",
  	"étrange",
  	"étroit",
  	"étude",
  	"euphorie",
  	"évaluer",
  	"évasion",
  	"éventail",
  	"évidence",
  	"éviter",
  	"évolutif",
  	"évoquer",
  	"exact",
  	"exagérer",
  	"exaucer",
  	"exceller",
  	"excitant",
  	"exclusif",
  	"excuse",
  	"exécuter",
  	"exemple",
  	"exercer",
  	"exhaler",
  	"exhorter",
  	"exigence",
  	"exiler",
  	"exister",
  	"exotique",
  	"expédier",
  	"explorer",
  	"exposer",
  	"exprimer",
  	"exquis",
  	"extensif",
  	"extraire",
  	"exulter",
  	"fable",
  	"fabuleux",
  	"facette",
  	"facile",
  	"facture",
  	"faiblir",
  	"falaise",
  	"fameux",
  	"famille",
  	"farceur",
  	"farfelu",
  	"farine",
  	"farouche",
  	"fasciner",
  	"fatal",
  	"fatigue",
  	"faucon",
  	"fautif",
  	"faveur",
  	"favori",
  	"fébrile",
  	"féconder",
  	"fédérer",
  	"félin",
  	"femme",
  	"fémur",
  	"fendoir",
  	"féodal",
  	"fermer",
  	"féroce",
  	"ferveur",
  	"festival",
  	"feuille",
  	"feutre",
  	"février",
  	"fiasco",
  	"ficeler",
  	"fictif",
  	"fidèle",
  	"figure",
  	"filature",
  	"filetage",
  	"filière",
  	"filleul",
  	"filmer",
  	"filou",
  	"filtrer",
  	"financer",
  	"finir",
  	"fiole",
  	"firme",
  	"fissure",
  	"fixer",
  	"flairer",
  	"flamme",
  	"flasque",
  	"flatteur",
  	"fléau",
  	"flèche",
  	"fleur",
  	"flexion",
  	"flocon",
  	"flore",
  	"fluctuer",
  	"fluide",
  	"fluvial",
  	"folie",
  	"fonderie",
  	"fongible",
  	"fontaine",
  	"forcer",
  	"forgeron",
  	"formuler",
  	"fortune",
  	"fossile",
  	"foudre",
  	"fougère",
  	"fouiller",
  	"foulure",
  	"fourmi",
  	"fragile",
  	"fraise",
  	"franchir",
  	"frapper",
  	"frayeur",
  	"frégate",
  	"freiner",
  	"frelon",
  	"frémir",
  	"frénésie",
  	"frère",
  	"friable",
  	"friction",
  	"frisson",
  	"frivole",
  	"froid",
  	"fromage",
  	"frontal",
  	"frotter",
  	"fruit",
  	"fugitif",
  	"fuite",
  	"fureur",
  	"furieux",
  	"furtif",
  	"fusion",
  	"futur",
  	"gagner",
  	"galaxie",
  	"galerie",
  	"gambader",
  	"garantir",
  	"gardien",
  	"garnir",
  	"garrigue",
  	"gazelle",
  	"gazon",
  	"géant",
  	"gélatine",
  	"gélule",
  	"gendarme",
  	"général",
  	"génie",
  	"genou",
  	"gentil",
  	"géologie",
  	"géomètre",
  	"géranium",
  	"germe",
  	"gestuel",
  	"geyser",
  	"gibier",
  	"gicler",
  	"girafe",
  	"givre",
  	"glace",
  	"glaive",
  	"glisser",
  	"globe",
  	"gloire",
  	"glorieux",
  	"golfeur",
  	"gomme",
  	"gonfler",
  	"gorge",
  	"gorille",
  	"goudron",
  	"gouffre",
  	"goulot",
  	"goupille",
  	"gourmand",
  	"goutte",
  	"graduel",
  	"graffiti",
  	"graine",
  	"grand",
  	"grappin",
  	"gratuit",
  	"gravir",
  	"grenat",
  	"griffure",
  	"griller",
  	"grimper",
  	"grogner",
  	"gronder",
  	"grotte",
  	"groupe",
  	"gruger",
  	"grutier",
  	"gruyère",
  	"guépard",
  	"guerrier",
  	"guide",
  	"guimauve",
  	"guitare",
  	"gustatif",
  	"gymnaste",
  	"gyrostat",
  	"habitude",
  	"hachoir",
  	"halte",
  	"hameau",
  	"hangar",
  	"hanneton",
  	"haricot",
  	"harmonie",
  	"harpon",
  	"hasard",
  	"hélium",
  	"hématome",
  	"herbe",
  	"hérisson",
  	"hermine",
  	"héron",
  	"hésiter",
  	"heureux",
  	"hiberner",
  	"hibou",
  	"hilarant",
  	"histoire",
  	"hiver",
  	"homard",
  	"hommage",
  	"homogène",
  	"honneur",
  	"honorer",
  	"honteux",
  	"horde",
  	"horizon",
  	"horloge",
  	"hormone",
  	"horrible",
  	"houleux",
  	"housse",
  	"hublot",
  	"huileux",
  	"humain",
  	"humble",
  	"humide",
  	"humour",
  	"hurler",
  	"hydromel",
  	"hygiène",
  	"hymne",
  	"hypnose",
  	"idylle",
  	"ignorer",
  	"iguane",
  	"illicite",
  	"illusion",
  	"image",
  	"imbiber",
  	"imiter",
  	"immense",
  	"immobile",
  	"immuable",
  	"impact",
  	"impérial",
  	"implorer",
  	"imposer",
  	"imprimer",
  	"imputer",
  	"incarner",
  	"incendie",
  	"incident",
  	"incliner",
  	"incolore",
  	"indexer",
  	"indice",
  	"inductif",
  	"inédit",
  	"ineptie",
  	"inexact",
  	"infini",
  	"infliger",
  	"informer",
  	"infusion",
  	"ingérer",
  	"inhaler",
  	"inhiber",
  	"injecter",
  	"injure",
  	"innocent",
  	"inoculer",
  	"inonder",
  	"inscrire",
  	"insecte",
  	"insigne",
  	"insolite",
  	"inspirer",
  	"instinct",
  	"insulter",
  	"intact",
  	"intense",
  	"intime",
  	"intrigue",
  	"intuitif",
  	"inutile",
  	"invasion",
  	"inventer",
  	"inviter",
  	"invoquer",
  	"ironique",
  	"irradier",
  	"irréel",
  	"irriter",
  	"isoler",
  	"ivoire",
  	"ivresse",
  	"jaguar",
  	"jaillir",
  	"jambe",
  	"janvier",
  	"jardin",
  	"jauger",
  	"jaune",
  	"javelot",
  	"jetable",
  	"jeton",
  	"jeudi",
  	"jeunesse",
  	"joindre",
  	"joncher",
  	"jongler",
  	"joueur",
  	"jouissif",
  	"journal",
  	"jovial",
  	"joyau",
  	"joyeux",
  	"jubiler",
  	"jugement",
  	"junior",
  	"jupon",
  	"juriste",
  	"justice",
  	"juteux",
  	"juvénile",
  	"kayak",
  	"kimono",
  	"kiosque",
  	"label",
  	"labial",
  	"labourer",
  	"lacérer",
  	"lactose",
  	"lagune",
  	"laine",
  	"laisser",
  	"laitier",
  	"lambeau",
  	"lamelle",
  	"lampe",
  	"lanceur",
  	"langage",
  	"lanterne",
  	"lapin",
  	"largeur",
  	"larme",
  	"laurier",
  	"lavabo",
  	"lavoir",
  	"lecture",
  	"légal",
  	"léger",
  	"légume",
  	"lessive",
  	"lettre",
  	"levier",
  	"lexique",
  	"lézard",
  	"liasse",
  	"libérer",
  	"libre",
  	"licence",
  	"licorne",
  	"liège",
  	"lièvre",
  	"ligature",
  	"ligoter",
  	"ligue",
  	"limer",
  	"limite",
  	"limonade",
  	"limpide",
  	"linéaire",
  	"lingot",
  	"lionceau",
  	"liquide",
  	"lisière",
  	"lister",
  	"lithium",
  	"litige",
  	"littoral",
  	"livreur",
  	"logique",
  	"lointain",
  	"loisir",
  	"lombric",
  	"loterie",
  	"louer",
  	"lourd",
  	"loutre",
  	"louve",
  	"loyal",
  	"lubie",
  	"lucide",
  	"lucratif",
  	"lueur",
  	"lugubre",
  	"luisant",
  	"lumière",
  	"lunaire",
  	"lundi",
  	"luron",
  	"lutter",
  	"luxueux",
  	"machine",
  	"magasin",
  	"magenta",
  	"magique",
  	"maigre",
  	"maillon",
  	"maintien",
  	"mairie",
  	"maison",
  	"majorer",
  	"malaxer",
  	"maléfice",
  	"malheur",
  	"malice",
  	"mallette",
  	"mammouth",
  	"mandater",
  	"maniable",
  	"manquant",
  	"manteau",
  	"manuel",
  	"marathon",
  	"marbre",
  	"marchand",
  	"mardi",
  	"maritime",
  	"marqueur",
  	"marron",
  	"marteler",
  	"mascotte",
  	"massif",
  	"matériel",
  	"matière",
  	"matraque",
  	"maudire",
  	"maussade",
  	"mauve",
  	"maximal",
  	"méchant",
  	"méconnu",
  	"médaille",
  	"médecin",
  	"méditer",
  	"méduse",
  	"meilleur",
  	"mélange",
  	"mélodie",
  	"membre",
  	"mémoire",
  	"menacer",
  	"mener",
  	"menhir",
  	"mensonge",
  	"mentor",
  	"mercredi",
  	"mérite",
  	"merle",
  	"messager",
  	"mesure",
  	"métal",
  	"météore",
  	"méthode",
  	"métier",
  	"meuble",
  	"miauler",
  	"microbe",
  	"miette",
  	"mignon",
  	"migrer",
  	"milieu",
  	"million",
  	"mimique",
  	"mince",
  	"minéral",
  	"minimal",
  	"minorer",
  	"minute",
  	"miracle",
  	"miroiter",
  	"missile",
  	"mixte",
  	"mobile",
  	"moderne",
  	"moelleux",
  	"mondial",
  	"moniteur",
  	"monnaie",
  	"monotone",
  	"monstre",
  	"montagne",
  	"monument",
  	"moqueur",
  	"morceau",
  	"morsure",
  	"mortier",
  	"moteur",
  	"motif",
  	"mouche",
  	"moufle",
  	"moulin",
  	"mousson",
  	"mouton",
  	"mouvant",
  	"multiple",
  	"munition",
  	"muraille",
  	"murène",
  	"murmure",
  	"muscle",
  	"muséum",
  	"musicien",
  	"mutation",
  	"muter",
  	"mutuel",
  	"myriade",
  	"myrtille",
  	"mystère",
  	"mythique",
  	"nageur",
  	"nappe",
  	"narquois",
  	"narrer",
  	"natation",
  	"nation",
  	"nature",
  	"naufrage",
  	"nautique",
  	"navire",
  	"nébuleux",
  	"nectar",
  	"néfaste",
  	"négation",
  	"négliger",
  	"négocier",
  	"neige",
  	"nerveux",
  	"nettoyer",
  	"neurone",
  	"neutron",
  	"neveu",
  	"niche",
  	"nickel",
  	"nitrate",
  	"niveau",
  	"noble",
  	"nocif",
  	"nocturne",
  	"noirceur",
  	"noisette",
  	"nomade",
  	"nombreux",
  	"nommer",
  	"normatif",
  	"notable",
  	"notifier",
  	"notoire",
  	"nourrir",
  	"nouveau",
  	"novateur",
  	"novembre",
  	"novice",
  	"nuage",
  	"nuancer",
  	"nuire",
  	"nuisible",
  	"numéro",
  	"nuptial",
  	"nuque",
  	"nutritif",
  	"obéir",
  	"objectif",
  	"obliger",
  	"obscur",
  	"observer",
  	"obstacle",
  	"obtenir",
  	"obturer",
  	"occasion",
  	"occuper",
  	"océan",
  	"octobre",
  	"octroyer",
  	"octupler",
  	"oculaire",
  	"odeur",
  	"odorant",
  	"offenser",
  	"officier",
  	"offrir",
  	"ogive",
  	"oiseau",
  	"oisillon",
  	"olfactif",
  	"olivier",
  	"ombrage",
  	"omettre",
  	"onctueux",
  	"onduler",
  	"onéreux",
  	"onirique",
  	"opale",
  	"opaque",
  	"opérer",
  	"opinion",
  	"opportun",
  	"opprimer",
  	"opter",
  	"optique",
  	"orageux",
  	"orange",
  	"orbite",
  	"ordonner",
  	"oreille",
  	"organe",
  	"orgueil",
  	"orifice",
  	"ornement",
  	"orque",
  	"ortie",
  	"osciller",
  	"osmose",
  	"ossature",
  	"otarie",
  	"ouragan",
  	"ourson",
  	"outil",
  	"outrager",
  	"ouvrage",
  	"ovation",
  	"oxyde",
  	"oxygène",
  	"ozone",
  	"paisible",
  	"palace",
  	"palmarès",
  	"palourde",
  	"palper",
  	"panache",
  	"panda",
  	"pangolin",
  	"paniquer",
  	"panneau",
  	"panorama",
  	"pantalon",
  	"papaye",
  	"papier",
  	"papoter",
  	"papyrus",
  	"paradoxe",
  	"parcelle",
  	"paresse",
  	"parfumer",
  	"parler",
  	"parole",
  	"parrain",
  	"parsemer",
  	"partager",
  	"parure",
  	"parvenir",
  	"passion",
  	"pastèque",
  	"paternel",
  	"patience",
  	"patron",
  	"pavillon",
  	"pavoiser",
  	"payer",
  	"paysage",
  	"peigne",
  	"peintre",
  	"pelage",
  	"pélican",
  	"pelle",
  	"pelouse",
  	"peluche",
  	"pendule",
  	"pénétrer",
  	"pénible",
  	"pensif",
  	"pénurie",
  	"pépite",
  	"péplum",
  	"perdrix",
  	"perforer",
  	"période",
  	"permuter",
  	"perplexe",
  	"persil",
  	"perte",
  	"peser",
  	"pétale",
  	"petit",
  	"pétrir",
  	"peuple",
  	"pharaon",
  	"phobie",
  	"phoque",
  	"photon",
  	"phrase",
  	"physique",
  	"piano",
  	"pictural",
  	"pièce",
  	"pierre",
  	"pieuvre",
  	"pilote",
  	"pinceau",
  	"pipette",
  	"piquer",
  	"pirogue",
  	"piscine",
  	"piston",
  	"pivoter",
  	"pixel",
  	"pizza",
  	"placard",
  	"plafond",
  	"plaisir",
  	"planer",
  	"plaque",
  	"plastron",
  	"plateau",
  	"pleurer",
  	"plexus",
  	"pliage",
  	"plomb",
  	"plonger",
  	"pluie",
  	"plumage",
  	"pochette",
  	"poésie",
  	"poète",
  	"pointe",
  	"poirier",
  	"poisson",
  	"poivre",
  	"polaire",
  	"policier",
  	"pollen",
  	"polygone",
  	"pommade",
  	"pompier",
  	"ponctuel",
  	"pondérer",
  	"poney",
  	"portique",
  	"position",
  	"posséder",
  	"posture",
  	"potager",
  	"poteau",
  	"potion",
  	"pouce",
  	"poulain",
  	"poumon",
  	"pourpre",
  	"poussin",
  	"pouvoir",
  	"prairie",
  	"pratique",
  	"précieux",
  	"prédire",
  	"préfixe",
  	"prélude",
  	"prénom",
  	"présence",
  	"prétexte",
  	"prévoir",
  	"primitif",
  	"prince",
  	"prison",
  	"priver",
  	"problème",
  	"procéder",
  	"prodige",
  	"profond",
  	"progrès",
  	"proie",
  	"projeter",
  	"prologue",
  	"promener",
  	"propre",
  	"prospère",
  	"protéger",
  	"prouesse",
  	"proverbe",
  	"prudence",
  	"pruneau",
  	"psychose",
  	"public",
  	"puceron",
  	"puiser",
  	"pulpe",
  	"pulsar",
  	"punaise",
  	"punitif",
  	"pupitre",
  	"purifier",
  	"puzzle",
  	"pyramide",
  	"quasar",
  	"querelle",
  	"question",
  	"quiétude",
  	"quitter",
  	"quotient",
  	"racine",
  	"raconter",
  	"radieux",
  	"ragondin",
  	"raideur",
  	"raisin",
  	"ralentir",
  	"rallonge",
  	"ramasser",
  	"rapide",
  	"rasage",
  	"ratisser",
  	"ravager",
  	"ravin",
  	"rayonner",
  	"réactif",
  	"réagir",
  	"réaliser",
  	"réanimer",
  	"recevoir",
  	"réciter",
  	"réclamer",
  	"récolter",
  	"recruter",
  	"reculer",
  	"recycler",
  	"rédiger",
  	"redouter",
  	"refaire",
  	"réflexe",
  	"réformer",
  	"refrain",
  	"refuge",
  	"régalien",
  	"région",
  	"réglage",
  	"régulier",
  	"réitérer",
  	"rejeter",
  	"rejouer",
  	"relatif",
  	"relever",
  	"relief",
  	"remarque",
  	"remède",
  	"remise",
  	"remonter",
  	"remplir",
  	"remuer",
  	"renard",
  	"renfort",
  	"renifler",
  	"renoncer",
  	"rentrer",
  	"renvoi",
  	"replier",
  	"reporter",
  	"reprise",
  	"reptile",
  	"requin",
  	"réserve",
  	"résineux",
  	"résoudre",
  	"respect",
  	"rester",
  	"résultat",
  	"rétablir",
  	"retenir",
  	"réticule",
  	"retomber",
  	"retracer",
  	"réunion",
  	"réussir",
  	"revanche",
  	"revivre",
  	"révolte",
  	"révulsif",
  	"richesse",
  	"rideau",
  	"rieur",
  	"rigide",
  	"rigoler",
  	"rincer",
  	"riposter",
  	"risible",
  	"risque",
  	"rituel",
  	"rival",
  	"rivière",
  	"rocheux",
  	"romance",
  	"rompre",
  	"ronce",
  	"rondin",
  	"roseau",
  	"rosier",
  	"rotatif",
  	"rotor",
  	"rotule",
  	"rouge",
  	"rouille",
  	"rouleau",
  	"routine",
  	"royaume",
  	"ruban",
  	"rubis",
  	"ruche",
  	"ruelle",
  	"rugueux",
  	"ruiner",
  	"ruisseau",
  	"ruser",
  	"rustique",
  	"rythme",
  	"sabler",
  	"saboter",
  	"sabre",
  	"sacoche",
  	"safari",
  	"sagesse",
  	"saisir",
  	"salade",
  	"salive",
  	"salon",
  	"saluer",
  	"samedi",
  	"sanction",
  	"sanglier",
  	"sarcasme",
  	"sardine",
  	"saturer",
  	"saugrenu",
  	"saumon",
  	"sauter",
  	"sauvage",
  	"savant",
  	"savonner",
  	"scalpel",
  	"scandale",
  	"scélérat",
  	"scénario",
  	"sceptre",
  	"schéma",
  	"science",
  	"scinder",
  	"score",
  	"scrutin",
  	"sculpter",
  	"séance",
  	"sécable",
  	"sécher",
  	"secouer",
  	"sécréter",
  	"sédatif",
  	"séduire",
  	"seigneur",
  	"séjour",
  	"sélectif",
  	"semaine",
  	"sembler",
  	"semence",
  	"séminal",
  	"sénateur",
  	"sensible",
  	"sentence",
  	"séparer",
  	"séquence",
  	"serein",
  	"sergent",
  	"sérieux",
  	"serrure",
  	"sérum",
  	"service",
  	"sésame",
  	"sévir",
  	"sevrage",
  	"sextuple",
  	"sidéral",
  	"siècle",
  	"siéger",
  	"siffler",
  	"sigle",
  	"signal",
  	"silence",
  	"silicium",
  	"simple",
  	"sincère",
  	"sinistre",
  	"siphon",
  	"sirop",
  	"sismique",
  	"situer",
  	"skier",
  	"social",
  	"socle",
  	"sodium",
  	"soigneux",
  	"soldat",
  	"soleil",
  	"solitude",
  	"soluble",
  	"sombre",
  	"sommeil",
  	"somnoler",
  	"sonde",
  	"songeur",
  	"sonnette",
  	"sonore",
  	"sorcier",
  	"sortir",
  	"sosie",
  	"sottise",
  	"soucieux",
  	"soudure",
  	"souffle",
  	"soulever",
  	"soupape",
  	"source",
  	"soutirer",
  	"souvenir",
  	"spacieux",
  	"spatial",
  	"spécial",
  	"sphère",
  	"spiral",
  	"stable",
  	"station",
  	"sternum",
  	"stimulus",
  	"stipuler",
  	"strict",
  	"studieux",
  	"stupeur",
  	"styliste",
  	"sublime",
  	"substrat",
  	"subtil",
  	"subvenir",
  	"succès",
  	"sucre",
  	"suffixe",
  	"suggérer",
  	"suiveur",
  	"sulfate",
  	"superbe",
  	"supplier",
  	"surface",
  	"suricate",
  	"surmener",
  	"surprise",
  	"sursaut",
  	"survie",
  	"suspect",
  	"syllabe",
  	"symbole",
  	"symétrie",
  	"synapse",
  	"syntaxe",
  	"système",
  	"tabac",
  	"tablier",
  	"tactile",
  	"tailler",
  	"talent",
  	"talisman",
  	"talonner",
  	"tambour",
  	"tamiser",
  	"tangible",
  	"tapis",
  	"taquiner",
  	"tarder",
  	"tarif",
  	"tartine",
  	"tasse",
  	"tatami",
  	"tatouage",
  	"taupe",
  	"taureau",
  	"taxer",
  	"témoin",
  	"temporel",
  	"tenaille",
  	"tendre",
  	"teneur",
  	"tenir",
  	"tension",
  	"terminer",
  	"terne",
  	"terrible",
  	"tétine",
  	"texte",
  	"thème",
  	"théorie",
  	"thérapie",
  	"thorax",
  	"tibia",
  	"tiède",
  	"timide",
  	"tirelire",
  	"tiroir",
  	"tissu",
  	"titane",
  	"titre",
  	"tituber",
  	"toboggan",
  	"tolérant",
  	"tomate",
  	"tonique",
  	"tonneau",
  	"toponyme",
  	"torche",
  	"tordre",
  	"tornade",
  	"torpille",
  	"torrent",
  	"torse",
  	"tortue",
  	"totem",
  	"toucher",
  	"tournage",
  	"tousser",
  	"toxine",
  	"traction",
  	"trafic",
  	"tragique",
  	"trahir",
  	"train",
  	"trancher",
  	"travail",
  	"trèfle",
  	"tremper",
  	"trésor",
  	"treuil",
  	"triage",
  	"tribunal",
  	"tricoter",
  	"trilogie",
  	"triomphe",
  	"tripler",
  	"triturer",
  	"trivial",
  	"trombone",
  	"tronc",
  	"tropical",
  	"troupeau",
  	"tuile",
  	"tulipe",
  	"tumulte",
  	"tunnel",
  	"turbine",
  	"tuteur",
  	"tutoyer",
  	"tuyau",
  	"tympan",
  	"typhon",
  	"typique",
  	"tyran",
  	"ubuesque",
  	"ultime",
  	"ultrason",
  	"unanime",
  	"unifier",
  	"union",
  	"unique",
  	"unitaire",
  	"univers",
  	"uranium",
  	"urbain",
  	"urticant",
  	"usage",
  	"usine",
  	"usuel",
  	"usure",
  	"utile",
  	"utopie",
  	"vacarme",
  	"vaccin",
  	"vagabond",
  	"vague",
  	"vaillant",
  	"vaincre",
  	"vaisseau",
  	"valable",
  	"valise",
  	"vallon",
  	"valve",
  	"vampire",
  	"vanille",
  	"vapeur",
  	"varier",
  	"vaseux",
  	"vassal",
  	"vaste",
  	"vecteur",
  	"vedette",
  	"végétal",
  	"véhicule",
  	"veinard",
  	"véloce",
  	"vendredi",
  	"vénérer",
  	"venger",
  	"venimeux",
  	"ventouse",
  	"verdure",
  	"vérin",
  	"vernir",
  	"verrou",
  	"verser",
  	"vertu",
  	"veston",
  	"vétéran",
  	"vétuste",
  	"vexant",
  	"vexer",
  	"viaduc",
  	"viande",
  	"victoire",
  	"vidange",
  	"vidéo",
  	"vignette",
  	"vigueur",
  	"vilain",
  	"village",
  	"vinaigre",
  	"violon",
  	"vipère",
  	"virement",
  	"virtuose",
  	"virus",
  	"visage",
  	"viseur",
  	"vision",
  	"visqueux",
  	"visuel",
  	"vital",
  	"vitesse",
  	"viticole",
  	"vitrine",
  	"vivace",
  	"vivipare",
  	"vocation",
  	"voguer",
  	"voile",
  	"voisin",
  	"voiture",
  	"volaille",
  	"volcan",
  	"voltiger",
  	"volume",
  	"vorace",
  	"vortex",
  	"voter",
  	"vouloir",
  	"voyage",
  	"voyelle",
  	"wagon",
  	"xénon",
  	"yacht",
  	"zèbre",
  	"zénith",
  	"zeste",
  	"zoologie"
  ];

  var french$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': french
  });

  var italian = [
  	"abaco",
  	"abbaglio",
  	"abbinato",
  	"abete",
  	"abisso",
  	"abolire",
  	"abrasivo",
  	"abrogato",
  	"accadere",
  	"accenno",
  	"accusato",
  	"acetone",
  	"achille",
  	"acido",
  	"acqua",
  	"acre",
  	"acrilico",
  	"acrobata",
  	"acuto",
  	"adagio",
  	"addebito",
  	"addome",
  	"adeguato",
  	"aderire",
  	"adipe",
  	"adottare",
  	"adulare",
  	"affabile",
  	"affetto",
  	"affisso",
  	"affranto",
  	"aforisma",
  	"afoso",
  	"africano",
  	"agave",
  	"agente",
  	"agevole",
  	"aggancio",
  	"agire",
  	"agitare",
  	"agonismo",
  	"agricolo",
  	"agrumeto",
  	"aguzzo",
  	"alabarda",
  	"alato",
  	"albatro",
  	"alberato",
  	"albo",
  	"albume",
  	"alce",
  	"alcolico",
  	"alettone",
  	"alfa",
  	"algebra",
  	"aliante",
  	"alibi",
  	"alimento",
  	"allagato",
  	"allegro",
  	"allievo",
  	"allodola",
  	"allusivo",
  	"almeno",
  	"alogeno",
  	"alpaca",
  	"alpestre",
  	"altalena",
  	"alterno",
  	"alticcio",
  	"altrove",
  	"alunno",
  	"alveolo",
  	"alzare",
  	"amalgama",
  	"amanita",
  	"amarena",
  	"ambito",
  	"ambrato",
  	"ameba",
  	"america",
  	"ametista",
  	"amico",
  	"ammasso",
  	"ammenda",
  	"ammirare",
  	"ammonito",
  	"amore",
  	"ampio",
  	"ampliare",
  	"amuleto",
  	"anacardo",
  	"anagrafe",
  	"analista",
  	"anarchia",
  	"anatra",
  	"anca",
  	"ancella",
  	"ancora",
  	"andare",
  	"andrea",
  	"anello",
  	"angelo",
  	"angolare",
  	"angusto",
  	"anima",
  	"annegare",
  	"annidato",
  	"anno",
  	"annuncio",
  	"anonimo",
  	"anticipo",
  	"anzi",
  	"apatico",
  	"apertura",
  	"apode",
  	"apparire",
  	"appetito",
  	"appoggio",
  	"approdo",
  	"appunto",
  	"aprile",
  	"arabica",
  	"arachide",
  	"aragosta",
  	"araldica",
  	"arancio",
  	"aratura",
  	"arazzo",
  	"arbitro",
  	"archivio",
  	"ardito",
  	"arenile",
  	"argento",
  	"argine",
  	"arguto",
  	"aria",
  	"armonia",
  	"arnese",
  	"arredato",
  	"arringa",
  	"arrosto",
  	"arsenico",
  	"arso",
  	"artefice",
  	"arzillo",
  	"asciutto",
  	"ascolto",
  	"asepsi",
  	"asettico",
  	"asfalto",
  	"asino",
  	"asola",
  	"aspirato",
  	"aspro",
  	"assaggio",
  	"asse",
  	"assoluto",
  	"assurdo",
  	"asta",
  	"astenuto",
  	"astice",
  	"astratto",
  	"atavico",
  	"ateismo",
  	"atomico",
  	"atono",
  	"attesa",
  	"attivare",
  	"attorno",
  	"attrito",
  	"attuale",
  	"ausilio",
  	"austria",
  	"autista",
  	"autonomo",
  	"autunno",
  	"avanzato",
  	"avere",
  	"avvenire",
  	"avviso",
  	"avvolgere",
  	"azione",
  	"azoto",
  	"azzimo",
  	"azzurro",
  	"babele",
  	"baccano",
  	"bacino",
  	"baco",
  	"badessa",
  	"badilata",
  	"bagnato",
  	"baita",
  	"balcone",
  	"baldo",
  	"balena",
  	"ballata",
  	"balzano",
  	"bambino",
  	"bandire",
  	"baraonda",
  	"barbaro",
  	"barca",
  	"baritono",
  	"barlume",
  	"barocco",
  	"basilico",
  	"basso",
  	"batosta",
  	"battuto",
  	"baule",
  	"bava",
  	"bavosa",
  	"becco",
  	"beffa",
  	"belgio",
  	"belva",
  	"benda",
  	"benevole",
  	"benigno",
  	"benzina",
  	"bere",
  	"berlina",
  	"beta",
  	"bibita",
  	"bici",
  	"bidone",
  	"bifido",
  	"biga",
  	"bilancia",
  	"bimbo",
  	"binocolo",
  	"biologo",
  	"bipede",
  	"bipolare",
  	"birbante",
  	"birra",
  	"biscotto",
  	"bisesto",
  	"bisnonno",
  	"bisonte",
  	"bisturi",
  	"bizzarro",
  	"blando",
  	"blatta",
  	"bollito",
  	"bonifico",
  	"bordo",
  	"bosco",
  	"botanico",
  	"bottino",
  	"bozzolo",
  	"braccio",
  	"bradipo",
  	"brama",
  	"branca",
  	"bravura",
  	"bretella",
  	"brevetto",
  	"brezza",
  	"briglia",
  	"brillante",
  	"brindare",
  	"broccolo",
  	"brodo",
  	"bronzina",
  	"brullo",
  	"bruno",
  	"bubbone",
  	"buca",
  	"budino",
  	"buffone",
  	"buio",
  	"bulbo",
  	"buono",
  	"burlone",
  	"burrasca",
  	"bussola",
  	"busta",
  	"cadetto",
  	"caduco",
  	"calamaro",
  	"calcolo",
  	"calesse",
  	"calibro",
  	"calmo",
  	"caloria",
  	"cambusa",
  	"camerata",
  	"camicia",
  	"cammino",
  	"camola",
  	"campale",
  	"canapa",
  	"candela",
  	"cane",
  	"canino",
  	"canotto",
  	"cantina",
  	"capace",
  	"capello",
  	"capitolo",
  	"capogiro",
  	"cappero",
  	"capra",
  	"capsula",
  	"carapace",
  	"carcassa",
  	"cardo",
  	"carisma",
  	"carovana",
  	"carretto",
  	"cartolina",
  	"casaccio",
  	"cascata",
  	"caserma",
  	"caso",
  	"cassone",
  	"castello",
  	"casuale",
  	"catasta",
  	"catena",
  	"catrame",
  	"cauto",
  	"cavillo",
  	"cedibile",
  	"cedrata",
  	"cefalo",
  	"celebre",
  	"cellulare",
  	"cena",
  	"cenone",
  	"centesimo",
  	"ceramica",
  	"cercare",
  	"certo",
  	"cerume",
  	"cervello",
  	"cesoia",
  	"cespo",
  	"ceto",
  	"chela",
  	"chiaro",
  	"chicca",
  	"chiedere",
  	"chimera",
  	"china",
  	"chirurgo",
  	"chitarra",
  	"ciao",
  	"ciclismo",
  	"cifrare",
  	"cigno",
  	"cilindro",
  	"ciottolo",
  	"circa",
  	"cirrosi",
  	"citrico",
  	"cittadino",
  	"ciuffo",
  	"civetta",
  	"civile",
  	"classico",
  	"clinica",
  	"cloro",
  	"cocco",
  	"codardo",
  	"codice",
  	"coerente",
  	"cognome",
  	"collare",
  	"colmato",
  	"colore",
  	"colposo",
  	"coltivato",
  	"colza",
  	"coma",
  	"cometa",
  	"commando",
  	"comodo",
  	"computer",
  	"comune",
  	"conciso",
  	"condurre",
  	"conferma",
  	"congelare",
  	"coniuge",
  	"connesso",
  	"conoscere",
  	"consumo",
  	"continuo",
  	"convegno",
  	"coperto",
  	"copione",
  	"coppia",
  	"copricapo",
  	"corazza",
  	"cordata",
  	"coricato",
  	"cornice",
  	"corolla",
  	"corpo",
  	"corredo",
  	"corsia",
  	"cortese",
  	"cosmico",
  	"costante",
  	"cottura",
  	"covato",
  	"cratere",
  	"cravatta",
  	"creato",
  	"credere",
  	"cremoso",
  	"crescita",
  	"creta",
  	"criceto",
  	"crinale",
  	"crisi",
  	"critico",
  	"croce",
  	"cronaca",
  	"crostata",
  	"cruciale",
  	"crusca",
  	"cucire",
  	"cuculo",
  	"cugino",
  	"cullato",
  	"cupola",
  	"curatore",
  	"cursore",
  	"curvo",
  	"cuscino",
  	"custode",
  	"dado",
  	"daino",
  	"dalmata",
  	"damerino",
  	"daniela",
  	"dannoso",
  	"danzare",
  	"datato",
  	"davanti",
  	"davvero",
  	"debutto",
  	"decennio",
  	"deciso",
  	"declino",
  	"decollo",
  	"decreto",
  	"dedicato",
  	"definito",
  	"deforme",
  	"degno",
  	"delegare",
  	"delfino",
  	"delirio",
  	"delta",
  	"demenza",
  	"denotato",
  	"dentro",
  	"deposito",
  	"derapata",
  	"derivare",
  	"deroga",
  	"descritto",
  	"deserto",
  	"desiderio",
  	"desumere",
  	"detersivo",
  	"devoto",
  	"diametro",
  	"dicembre",
  	"diedro",
  	"difeso",
  	"diffuso",
  	"digerire",
  	"digitale",
  	"diluvio",
  	"dinamico",
  	"dinnanzi",
  	"dipinto",
  	"diploma",
  	"dipolo",
  	"diradare",
  	"dire",
  	"dirotto",
  	"dirupo",
  	"disagio",
  	"discreto",
  	"disfare",
  	"disgelo",
  	"disposto",
  	"distanza",
  	"disumano",
  	"dito",
  	"divano",
  	"divelto",
  	"dividere",
  	"divorato",
  	"doblone",
  	"docente",
  	"doganale",
  	"dogma",
  	"dolce",
  	"domato",
  	"domenica",
  	"dominare",
  	"dondolo",
  	"dono",
  	"dormire",
  	"dote",
  	"dottore",
  	"dovuto",
  	"dozzina",
  	"drago",
  	"druido",
  	"dubbio",
  	"dubitare",
  	"ducale",
  	"duna",
  	"duomo",
  	"duplice",
  	"duraturo",
  	"ebano",
  	"eccesso",
  	"ecco",
  	"eclissi",
  	"economia",
  	"edera",
  	"edicola",
  	"edile",
  	"editoria",
  	"educare",
  	"egemonia",
  	"egli",
  	"egoismo",
  	"egregio",
  	"elaborato",
  	"elargire",
  	"elegante",
  	"elencato",
  	"eletto",
  	"elevare",
  	"elfico",
  	"elica",
  	"elmo",
  	"elsa",
  	"eluso",
  	"emanato",
  	"emblema",
  	"emesso",
  	"emiro",
  	"emotivo",
  	"emozione",
  	"empirico",
  	"emulo",
  	"endemico",
  	"enduro",
  	"energia",
  	"enfasi",
  	"enoteca",
  	"entrare",
  	"enzima",
  	"epatite",
  	"epilogo",
  	"episodio",
  	"epocale",
  	"eppure",
  	"equatore",
  	"erario",
  	"erba",
  	"erboso",
  	"erede",
  	"eremita",
  	"erigere",
  	"ermetico",
  	"eroe",
  	"erosivo",
  	"errante",
  	"esagono",
  	"esame",
  	"esanime",
  	"esaudire",
  	"esca",
  	"esempio",
  	"esercito",
  	"esibito",
  	"esigente",
  	"esistere",
  	"esito",
  	"esofago",
  	"esortato",
  	"esoso",
  	"espanso",
  	"espresso",
  	"essenza",
  	"esso",
  	"esteso",
  	"estimare",
  	"estonia",
  	"estroso",
  	"esultare",
  	"etilico",
  	"etnico",
  	"etrusco",
  	"etto",
  	"euclideo",
  	"europa",
  	"evaso",
  	"evidenza",
  	"evitato",
  	"evoluto",
  	"evviva",
  	"fabbrica",
  	"faccenda",
  	"fachiro",
  	"falco",
  	"famiglia",
  	"fanale",
  	"fanfara",
  	"fango",
  	"fantasma",
  	"fare",
  	"farfalla",
  	"farinoso",
  	"farmaco",
  	"fascia",
  	"fastoso",
  	"fasullo",
  	"faticare",
  	"fato",
  	"favoloso",
  	"febbre",
  	"fecola",
  	"fede",
  	"fegato",
  	"felpa",
  	"feltro",
  	"femmina",
  	"fendere",
  	"fenomeno",
  	"fermento",
  	"ferro",
  	"fertile",
  	"fessura",
  	"festivo",
  	"fetta",
  	"feudo",
  	"fiaba",
  	"fiducia",
  	"fifa",
  	"figurato",
  	"filo",
  	"finanza",
  	"finestra",
  	"finire",
  	"fiore",
  	"fiscale",
  	"fisico",
  	"fiume",
  	"flacone",
  	"flamenco",
  	"flebo",
  	"flemma",
  	"florido",
  	"fluente",
  	"fluoro",
  	"fobico",
  	"focaccia",
  	"focoso",
  	"foderato",
  	"foglio",
  	"folata",
  	"folclore",
  	"folgore",
  	"fondente",
  	"fonetico",
  	"fonia",
  	"fontana",
  	"forbito",
  	"forchetta",
  	"foresta",
  	"formica",
  	"fornaio",
  	"foro",
  	"fortezza",
  	"forzare",
  	"fosfato",
  	"fosso",
  	"fracasso",
  	"frana",
  	"frassino",
  	"fratello",
  	"freccetta",
  	"frenata",
  	"fresco",
  	"frigo",
  	"frollino",
  	"fronde",
  	"frugale",
  	"frutta",
  	"fucilata",
  	"fucsia",
  	"fuggente",
  	"fulmine",
  	"fulvo",
  	"fumante",
  	"fumetto",
  	"fumoso",
  	"fune",
  	"funzione",
  	"fuoco",
  	"furbo",
  	"furgone",
  	"furore",
  	"fuso",
  	"futile",
  	"gabbiano",
  	"gaffe",
  	"galateo",
  	"gallina",
  	"galoppo",
  	"gambero",
  	"gamma",
  	"garanzia",
  	"garbo",
  	"garofano",
  	"garzone",
  	"gasdotto",
  	"gasolio",
  	"gastrico",
  	"gatto",
  	"gaudio",
  	"gazebo",
  	"gazzella",
  	"geco",
  	"gelatina",
  	"gelso",
  	"gemello",
  	"gemmato",
  	"gene",
  	"genitore",
  	"gennaio",
  	"genotipo",
  	"gergo",
  	"ghepardo",
  	"ghiaccio",
  	"ghisa",
  	"giallo",
  	"gilda",
  	"ginepro",
  	"giocare",
  	"gioiello",
  	"giorno",
  	"giove",
  	"girato",
  	"girone",
  	"gittata",
  	"giudizio",
  	"giurato",
  	"giusto",
  	"globulo",
  	"glutine",
  	"gnomo",
  	"gobba",
  	"golf",
  	"gomito",
  	"gommone",
  	"gonfio",
  	"gonna",
  	"governo",
  	"gracile",
  	"grado",
  	"grafico",
  	"grammo",
  	"grande",
  	"grattare",
  	"gravoso",
  	"grazia",
  	"greca",
  	"gregge",
  	"grifone",
  	"grigio",
  	"grinza",
  	"grotta",
  	"gruppo",
  	"guadagno",
  	"guaio",
  	"guanto",
  	"guardare",
  	"gufo",
  	"guidare",
  	"ibernato",
  	"icona",
  	"identico",
  	"idillio",
  	"idolo",
  	"idra",
  	"idrico",
  	"idrogeno",
  	"igiene",
  	"ignaro",
  	"ignorato",
  	"ilare",
  	"illeso",
  	"illogico",
  	"illudere",
  	"imballo",
  	"imbevuto",
  	"imbocco",
  	"imbuto",
  	"immane",
  	"immerso",
  	"immolato",
  	"impacco",
  	"impeto",
  	"impiego",
  	"importo",
  	"impronta",
  	"inalare",
  	"inarcare",
  	"inattivo",
  	"incanto",
  	"incendio",
  	"inchino",
  	"incisivo",
  	"incluso",
  	"incontro",
  	"incrocio",
  	"incubo",
  	"indagine",
  	"india",
  	"indole",
  	"inedito",
  	"infatti",
  	"infilare",
  	"inflitto",
  	"ingaggio",
  	"ingegno",
  	"inglese",
  	"ingordo",
  	"ingrosso",
  	"innesco",
  	"inodore",
  	"inoltrare",
  	"inondato",
  	"insano",
  	"insetto",
  	"insieme",
  	"insonnia",
  	"insulina",
  	"intasato",
  	"intero",
  	"intonaco",
  	"intuito",
  	"inumidire",
  	"invalido",
  	"invece",
  	"invito",
  	"iperbole",
  	"ipnotico",
  	"ipotesi",
  	"ippica",
  	"iride",
  	"irlanda",
  	"ironico",
  	"irrigato",
  	"irrorare",
  	"isolato",
  	"isotopo",
  	"isterico",
  	"istituto",
  	"istrice",
  	"italia",
  	"iterare",
  	"labbro",
  	"labirinto",
  	"lacca",
  	"lacerato",
  	"lacrima",
  	"lacuna",
  	"laddove",
  	"lago",
  	"lampo",
  	"lancetta",
  	"lanterna",
  	"lardoso",
  	"larga",
  	"laringe",
  	"lastra",
  	"latenza",
  	"latino",
  	"lattuga",
  	"lavagna",
  	"lavoro",
  	"legale",
  	"leggero",
  	"lembo",
  	"lentezza",
  	"lenza",
  	"leone",
  	"lepre",
  	"lesivo",
  	"lessato",
  	"lesto",
  	"letterale",
  	"leva",
  	"levigato",
  	"libero",
  	"lido",
  	"lievito",
  	"lilla",
  	"limatura",
  	"limitare",
  	"limpido",
  	"lineare",
  	"lingua",
  	"liquido",
  	"lira",
  	"lirica",
  	"lisca",
  	"lite",
  	"litigio",
  	"livrea",
  	"locanda",
  	"lode",
  	"logica",
  	"lombare",
  	"londra",
  	"longevo",
  	"loquace",
  	"lorenzo",
  	"loto",
  	"lotteria",
  	"luce",
  	"lucidato",
  	"lumaca",
  	"luminoso",
  	"lungo",
  	"lupo",
  	"luppolo",
  	"lusinga",
  	"lusso",
  	"lutto",
  	"macabro",
  	"macchina",
  	"macero",
  	"macinato",
  	"madama",
  	"magico",
  	"maglia",
  	"magnete",
  	"magro",
  	"maiolica",
  	"malafede",
  	"malgrado",
  	"malinteso",
  	"malsano",
  	"malto",
  	"malumore",
  	"mana",
  	"mancia",
  	"mandorla",
  	"mangiare",
  	"manifesto",
  	"mannaro",
  	"manovra",
  	"mansarda",
  	"mantide",
  	"manubrio",
  	"mappa",
  	"maratona",
  	"marcire",
  	"maretta",
  	"marmo",
  	"marsupio",
  	"maschera",
  	"massaia",
  	"mastino",
  	"materasso",
  	"matricola",
  	"mattone",
  	"maturo",
  	"mazurca",
  	"meandro",
  	"meccanico",
  	"mecenate",
  	"medesimo",
  	"meditare",
  	"mega",
  	"melassa",
  	"melis",
  	"melodia",
  	"meninge",
  	"meno",
  	"mensola",
  	"mercurio",
  	"merenda",
  	"merlo",
  	"meschino",
  	"mese",
  	"messere",
  	"mestolo",
  	"metallo",
  	"metodo",
  	"mettere",
  	"miagolare",
  	"mica",
  	"micelio",
  	"michele",
  	"microbo",
  	"midollo",
  	"miele",
  	"migliore",
  	"milano",
  	"milite",
  	"mimosa",
  	"minerale",
  	"mini",
  	"minore",
  	"mirino",
  	"mirtillo",
  	"miscela",
  	"missiva",
  	"misto",
  	"misurare",
  	"mitezza",
  	"mitigare",
  	"mitra",
  	"mittente",
  	"mnemonico",
  	"modello",
  	"modifica",
  	"modulo",
  	"mogano",
  	"mogio",
  	"mole",
  	"molosso",
  	"monastero",
  	"monco",
  	"mondina",
  	"monetario",
  	"monile",
  	"monotono",
  	"monsone",
  	"montato",
  	"monviso",
  	"mora",
  	"mordere",
  	"morsicato",
  	"mostro",
  	"motivato",
  	"motosega",
  	"motto",
  	"movenza",
  	"movimento",
  	"mozzo",
  	"mucca",
  	"mucosa",
  	"muffa",
  	"mughetto",
  	"mugnaio",
  	"mulatto",
  	"mulinello",
  	"multiplo",
  	"mummia",
  	"munto",
  	"muovere",
  	"murale",
  	"musa",
  	"muscolo",
  	"musica",
  	"mutevole",
  	"muto",
  	"nababbo",
  	"nafta",
  	"nanometro",
  	"narciso",
  	"narice",
  	"narrato",
  	"nascere",
  	"nastrare",
  	"naturale",
  	"nautica",
  	"naviglio",
  	"nebulosa",
  	"necrosi",
  	"negativo",
  	"negozio",
  	"nemmeno",
  	"neofita",
  	"neretto",
  	"nervo",
  	"nessuno",
  	"nettuno",
  	"neutrale",
  	"neve",
  	"nevrotico",
  	"nicchia",
  	"ninfa",
  	"nitido",
  	"nobile",
  	"nocivo",
  	"nodo",
  	"nome",
  	"nomina",
  	"nordico",
  	"normale",
  	"norvegese",
  	"nostrano",
  	"notare",
  	"notizia",
  	"notturno",
  	"novella",
  	"nucleo",
  	"nulla",
  	"numero",
  	"nuovo",
  	"nutrire",
  	"nuvola",
  	"nuziale",
  	"oasi",
  	"obbedire",
  	"obbligo",
  	"obelisco",
  	"oblio",
  	"obolo",
  	"obsoleto",
  	"occasione",
  	"occhio",
  	"occidente",
  	"occorrere",
  	"occultare",
  	"ocra",
  	"oculato",
  	"odierno",
  	"odorare",
  	"offerta",
  	"offrire",
  	"offuscato",
  	"oggetto",
  	"oggi",
  	"ognuno",
  	"olandese",
  	"olfatto",
  	"oliato",
  	"oliva",
  	"ologramma",
  	"oltre",
  	"omaggio",
  	"ombelico",
  	"ombra",
  	"omega",
  	"omissione",
  	"ondoso",
  	"onere",
  	"onice",
  	"onnivoro",
  	"onorevole",
  	"onta",
  	"operato",
  	"opinione",
  	"opposto",
  	"oracolo",
  	"orafo",
  	"ordine",
  	"orecchino",
  	"orefice",
  	"orfano",
  	"organico",
  	"origine",
  	"orizzonte",
  	"orma",
  	"ormeggio",
  	"ornativo",
  	"orologio",
  	"orrendo",
  	"orribile",
  	"ortensia",
  	"ortica",
  	"orzata",
  	"orzo",
  	"osare",
  	"oscurare",
  	"osmosi",
  	"ospedale",
  	"ospite",
  	"ossa",
  	"ossidare",
  	"ostacolo",
  	"oste",
  	"otite",
  	"otre",
  	"ottagono",
  	"ottimo",
  	"ottobre",
  	"ovale",
  	"ovest",
  	"ovino",
  	"oviparo",
  	"ovocito",
  	"ovunque",
  	"ovviare",
  	"ozio",
  	"pacchetto",
  	"pace",
  	"pacifico",
  	"padella",
  	"padrone",
  	"paese",
  	"paga",
  	"pagina",
  	"palazzina",
  	"palesare",
  	"pallido",
  	"palo",
  	"palude",
  	"pandoro",
  	"pannello",
  	"paolo",
  	"paonazzo",
  	"paprica",
  	"parabola",
  	"parcella",
  	"parere",
  	"pargolo",
  	"pari",
  	"parlato",
  	"parola",
  	"partire",
  	"parvenza",
  	"parziale",
  	"passivo",
  	"pasticca",
  	"patacca",
  	"patologia",
  	"pattume",
  	"pavone",
  	"peccato",
  	"pedalare",
  	"pedonale",
  	"peggio",
  	"peloso",
  	"penare",
  	"pendice",
  	"penisola",
  	"pennuto",
  	"penombra",
  	"pensare",
  	"pentola",
  	"pepe",
  	"pepita",
  	"perbene",
  	"percorso",
  	"perdonato",
  	"perforare",
  	"pergamena",
  	"periodo",
  	"permesso",
  	"perno",
  	"perplesso",
  	"persuaso",
  	"pertugio",
  	"pervaso",
  	"pesatore",
  	"pesista",
  	"peso",
  	"pestifero",
  	"petalo",
  	"pettine",
  	"petulante",
  	"pezzo",
  	"piacere",
  	"pianta",
  	"piattino",
  	"piccino",
  	"picozza",
  	"piega",
  	"pietra",
  	"piffero",
  	"pigiama",
  	"pigolio",
  	"pigro",
  	"pila",
  	"pilifero",
  	"pillola",
  	"pilota",
  	"pimpante",
  	"pineta",
  	"pinna",
  	"pinolo",
  	"pioggia",
  	"piombo",
  	"piramide",
  	"piretico",
  	"pirite",
  	"pirolisi",
  	"pitone",
  	"pizzico",
  	"placebo",
  	"planare",
  	"plasma",
  	"platano",
  	"plenario",
  	"pochezza",
  	"poderoso",
  	"podismo",
  	"poesia",
  	"poggiare",
  	"polenta",
  	"poligono",
  	"pollice",
  	"polmonite",
  	"polpetta",
  	"polso",
  	"poltrona",
  	"polvere",
  	"pomice",
  	"pomodoro",
  	"ponte",
  	"popoloso",
  	"porfido",
  	"poroso",
  	"porpora",
  	"porre",
  	"portata",
  	"posa",
  	"positivo",
  	"possesso",
  	"postulato",
  	"potassio",
  	"potere",
  	"pranzo",
  	"prassi",
  	"pratica",
  	"precluso",
  	"predica",
  	"prefisso",
  	"pregiato",
  	"prelievo",
  	"premere",
  	"prenotare",
  	"preparato",
  	"presenza",
  	"pretesto",
  	"prevalso",
  	"prima",
  	"principe",
  	"privato",
  	"problema",
  	"procura",
  	"produrre",
  	"profumo",
  	"progetto",
  	"prolunga",
  	"promessa",
  	"pronome",
  	"proposta",
  	"proroga",
  	"proteso",
  	"prova",
  	"prudente",
  	"prugna",
  	"prurito",
  	"psiche",
  	"pubblico",
  	"pudica",
  	"pugilato",
  	"pugno",
  	"pulce",
  	"pulito",
  	"pulsante",
  	"puntare",
  	"pupazzo",
  	"pupilla",
  	"puro",
  	"quadro",
  	"qualcosa",
  	"quasi",
  	"querela",
  	"quota",
  	"raccolto",
  	"raddoppio",
  	"radicale",
  	"radunato",
  	"raffica",
  	"ragazzo",
  	"ragione",
  	"ragno",
  	"ramarro",
  	"ramingo",
  	"ramo",
  	"randagio",
  	"rantolare",
  	"rapato",
  	"rapina",
  	"rappreso",
  	"rasatura",
  	"raschiato",
  	"rasente",
  	"rassegna",
  	"rastrello",
  	"rata",
  	"ravveduto",
  	"reale",
  	"recepire",
  	"recinto",
  	"recluta",
  	"recondito",
  	"recupero",
  	"reddito",
  	"redimere",
  	"regalato",
  	"registro",
  	"regola",
  	"regresso",
  	"relazione",
  	"remare",
  	"remoto",
  	"renna",
  	"replica",
  	"reprimere",
  	"reputare",
  	"resa",
  	"residente",
  	"responso",
  	"restauro",
  	"rete",
  	"retina",
  	"retorica",
  	"rettifica",
  	"revocato",
  	"riassunto",
  	"ribadire",
  	"ribelle",
  	"ribrezzo",
  	"ricarica",
  	"ricco",
  	"ricevere",
  	"riciclato",
  	"ricordo",
  	"ricreduto",
  	"ridicolo",
  	"ridurre",
  	"rifasare",
  	"riflesso",
  	"riforma",
  	"rifugio",
  	"rigare",
  	"rigettato",
  	"righello",
  	"rilassato",
  	"rilevato",
  	"rimanere",
  	"rimbalzo",
  	"rimedio",
  	"rimorchio",
  	"rinascita",
  	"rincaro",
  	"rinforzo",
  	"rinnovo",
  	"rinomato",
  	"rinsavito",
  	"rintocco",
  	"rinuncia",
  	"rinvenire",
  	"riparato",
  	"ripetuto",
  	"ripieno",
  	"riportare",
  	"ripresa",
  	"ripulire",
  	"risata",
  	"rischio",
  	"riserva",
  	"risibile",
  	"riso",
  	"rispetto",
  	"ristoro",
  	"risultato",
  	"risvolto",
  	"ritardo",
  	"ritegno",
  	"ritmico",
  	"ritrovo",
  	"riunione",
  	"riva",
  	"riverso",
  	"rivincita",
  	"rivolto",
  	"rizoma",
  	"roba",
  	"robotico",
  	"robusto",
  	"roccia",
  	"roco",
  	"rodaggio",
  	"rodere",
  	"roditore",
  	"rogito",
  	"rollio",
  	"romantico",
  	"rompere",
  	"ronzio",
  	"rosolare",
  	"rospo",
  	"rotante",
  	"rotondo",
  	"rotula",
  	"rovescio",
  	"rubizzo",
  	"rubrica",
  	"ruga",
  	"rullino",
  	"rumine",
  	"rumoroso",
  	"ruolo",
  	"rupe",
  	"russare",
  	"rustico",
  	"sabato",
  	"sabbiare",
  	"sabotato",
  	"sagoma",
  	"salasso",
  	"saldatura",
  	"salgemma",
  	"salivare",
  	"salmone",
  	"salone",
  	"saltare",
  	"saluto",
  	"salvo",
  	"sapere",
  	"sapido",
  	"saporito",
  	"saraceno",
  	"sarcasmo",
  	"sarto",
  	"sassoso",
  	"satellite",
  	"satira",
  	"satollo",
  	"saturno",
  	"savana",
  	"savio",
  	"saziato",
  	"sbadiglio",
  	"sbalzo",
  	"sbancato",
  	"sbarra",
  	"sbattere",
  	"sbavare",
  	"sbendare",
  	"sbirciare",
  	"sbloccato",
  	"sbocciato",
  	"sbrinare",
  	"sbruffone",
  	"sbuffare",
  	"scabroso",
  	"scadenza",
  	"scala",
  	"scambiare",
  	"scandalo",
  	"scapola",
  	"scarso",
  	"scatenare",
  	"scavato",
  	"scelto",
  	"scenico",
  	"scettro",
  	"scheda",
  	"schiena",
  	"sciarpa",
  	"scienza",
  	"scindere",
  	"scippo",
  	"sciroppo",
  	"scivolo",
  	"sclerare",
  	"scodella",
  	"scolpito",
  	"scomparto",
  	"sconforto",
  	"scoprire",
  	"scorta",
  	"scossone",
  	"scozzese",
  	"scriba",
  	"scrollare",
  	"scrutinio",
  	"scuderia",
  	"scultore",
  	"scuola",
  	"scuro",
  	"scusare",
  	"sdebitare",
  	"sdoganare",
  	"seccatura",
  	"secondo",
  	"sedano",
  	"seggiola",
  	"segnalato",
  	"segregato",
  	"seguito",
  	"selciato",
  	"selettivo",
  	"sella",
  	"selvaggio",
  	"semaforo",
  	"sembrare",
  	"seme",
  	"seminato",
  	"sempre",
  	"senso",
  	"sentire",
  	"sepolto",
  	"sequenza",
  	"serata",
  	"serbato",
  	"sereno",
  	"serio",
  	"serpente",
  	"serraglio",
  	"servire",
  	"sestina",
  	"setola",
  	"settimana",
  	"sfacelo",
  	"sfaldare",
  	"sfamato",
  	"sfarzoso",
  	"sfaticato",
  	"sfera",
  	"sfida",
  	"sfilato",
  	"sfinge",
  	"sfocato",
  	"sfoderare",
  	"sfogo",
  	"sfoltire",
  	"sforzato",
  	"sfratto",
  	"sfruttato",
  	"sfuggito",
  	"sfumare",
  	"sfuso",
  	"sgabello",
  	"sgarbato",
  	"sgonfiare",
  	"sgorbio",
  	"sgrassato",
  	"sguardo",
  	"sibilo",
  	"siccome",
  	"sierra",
  	"sigla",
  	"signore",
  	"silenzio",
  	"sillaba",
  	"simbolo",
  	"simpatico",
  	"simulato",
  	"sinfonia",
  	"singolo",
  	"sinistro",
  	"sino",
  	"sintesi",
  	"sinusoide",
  	"sipario",
  	"sisma",
  	"sistole",
  	"situato",
  	"slitta",
  	"slogatura",
  	"sloveno",
  	"smarrito",
  	"smemorato",
  	"smentito",
  	"smeraldo",
  	"smilzo",
  	"smontare",
  	"smottato",
  	"smussato",
  	"snellire",
  	"snervato",
  	"snodo",
  	"sobbalzo",
  	"sobrio",
  	"soccorso",
  	"sociale",
  	"sodale",
  	"soffitto",
  	"sogno",
  	"soldato",
  	"solenne",
  	"solido",
  	"sollazzo",
  	"solo",
  	"solubile",
  	"solvente",
  	"somatico",
  	"somma",
  	"sonda",
  	"sonetto",
  	"sonnifero",
  	"sopire",
  	"soppeso",
  	"sopra",
  	"sorgere",
  	"sorpasso",
  	"sorriso",
  	"sorso",
  	"sorteggio",
  	"sorvolato",
  	"sospiro",
  	"sosta",
  	"sottile",
  	"spada",
  	"spalla",
  	"spargere",
  	"spatola",
  	"spavento",
  	"spazzola",
  	"specie",
  	"spedire",
  	"spegnere",
  	"spelatura",
  	"speranza",
  	"spessore",
  	"spettrale",
  	"spezzato",
  	"spia",
  	"spigoloso",
  	"spillato",
  	"spinoso",
  	"spirale",
  	"splendido",
  	"sportivo",
  	"sposo",
  	"spranga",
  	"sprecare",
  	"spronato",
  	"spruzzo",
  	"spuntino",
  	"squillo",
  	"sradicare",
  	"srotolato",
  	"stabile",
  	"stacco",
  	"staffa",
  	"stagnare",
  	"stampato",
  	"stantio",
  	"starnuto",
  	"stasera",
  	"statuto",
  	"stelo",
  	"steppa",
  	"sterzo",
  	"stiletto",
  	"stima",
  	"stirpe",
  	"stivale",
  	"stizzoso",
  	"stonato",
  	"storico",
  	"strappo",
  	"stregato",
  	"stridulo",
  	"strozzare",
  	"strutto",
  	"stuccare",
  	"stufo",
  	"stupendo",
  	"subentro",
  	"succoso",
  	"sudore",
  	"suggerito",
  	"sugo",
  	"sultano",
  	"suonare",
  	"superbo",
  	"supporto",
  	"surgelato",
  	"surrogato",
  	"sussurro",
  	"sutura",
  	"svagare",
  	"svedese",
  	"sveglio",
  	"svelare",
  	"svenuto",
  	"svezia",
  	"sviluppo",
  	"svista",
  	"svizzera",
  	"svolta",
  	"svuotare",
  	"tabacco",
  	"tabulato",
  	"tacciare",
  	"taciturno",
  	"tale",
  	"talismano",
  	"tampone",
  	"tannino",
  	"tara",
  	"tardivo",
  	"targato",
  	"tariffa",
  	"tarpare",
  	"tartaruga",
  	"tasto",
  	"tattico",
  	"taverna",
  	"tavolata",
  	"tazza",
  	"teca",
  	"tecnico",
  	"telefono",
  	"temerario",
  	"tempo",
  	"temuto",
  	"tendone",
  	"tenero",
  	"tensione",
  	"tentacolo",
  	"teorema",
  	"terme",
  	"terrazzo",
  	"terzetto",
  	"tesi",
  	"tesserato",
  	"testato",
  	"tetro",
  	"tettoia",
  	"tifare",
  	"tigella",
  	"timbro",
  	"tinto",
  	"tipico",
  	"tipografo",
  	"tiraggio",
  	"tiro",
  	"titanio",
  	"titolo",
  	"titubante",
  	"tizio",
  	"tizzone",
  	"toccare",
  	"tollerare",
  	"tolto",
  	"tombola",
  	"tomo",
  	"tonfo",
  	"tonsilla",
  	"topazio",
  	"topologia",
  	"toppa",
  	"torba",
  	"tornare",
  	"torrone",
  	"tortora",
  	"toscano",
  	"tossire",
  	"tostatura",
  	"totano",
  	"trabocco",
  	"trachea",
  	"trafila",
  	"tragedia",
  	"tralcio",
  	"tramonto",
  	"transito",
  	"trapano",
  	"trarre",
  	"trasloco",
  	"trattato",
  	"trave",
  	"treccia",
  	"tremolio",
  	"trespolo",
  	"tributo",
  	"tricheco",
  	"trifoglio",
  	"trillo",
  	"trincea",
  	"trio",
  	"tristezza",
  	"triturato",
  	"trivella",
  	"tromba",
  	"trono",
  	"troppo",
  	"trottola",
  	"trovare",
  	"truccato",
  	"tubatura",
  	"tuffato",
  	"tulipano",
  	"tumulto",
  	"tunisia",
  	"turbare",
  	"turchino",
  	"tuta",
  	"tutela",
  	"ubicato",
  	"uccello",
  	"uccisore",
  	"udire",
  	"uditivo",
  	"uffa",
  	"ufficio",
  	"uguale",
  	"ulisse",
  	"ultimato",
  	"umano",
  	"umile",
  	"umorismo",
  	"uncinetto",
  	"ungere",
  	"ungherese",
  	"unicorno",
  	"unificato",
  	"unisono",
  	"unitario",
  	"unte",
  	"uovo",
  	"upupa",
  	"uragano",
  	"urgenza",
  	"urlo",
  	"usanza",
  	"usato",
  	"uscito",
  	"usignolo",
  	"usuraio",
  	"utensile",
  	"utilizzo",
  	"utopia",
  	"vacante",
  	"vaccinato",
  	"vagabondo",
  	"vagliato",
  	"valanga",
  	"valgo",
  	"valico",
  	"valletta",
  	"valoroso",
  	"valutare",
  	"valvola",
  	"vampata",
  	"vangare",
  	"vanitoso",
  	"vano",
  	"vantaggio",
  	"vanvera",
  	"vapore",
  	"varano",
  	"varcato",
  	"variante",
  	"vasca",
  	"vedetta",
  	"vedova",
  	"veduto",
  	"vegetale",
  	"veicolo",
  	"velcro",
  	"velina",
  	"velluto",
  	"veloce",
  	"venato",
  	"vendemmia",
  	"vento",
  	"verace",
  	"verbale",
  	"vergogna",
  	"verifica",
  	"vero",
  	"verruca",
  	"verticale",
  	"vescica",
  	"vessillo",
  	"vestale",
  	"veterano",
  	"vetrina",
  	"vetusto",
  	"viandante",
  	"vibrante",
  	"vicenda",
  	"vichingo",
  	"vicinanza",
  	"vidimare",
  	"vigilia",
  	"vigneto",
  	"vigore",
  	"vile",
  	"villano",
  	"vimini",
  	"vincitore",
  	"viola",
  	"vipera",
  	"virgola",
  	"virologo",
  	"virulento",
  	"viscoso",
  	"visione",
  	"vispo",
  	"vissuto",
  	"visura",
  	"vita",
  	"vitello",
  	"vittima",
  	"vivanda",
  	"vivido",
  	"viziare",
  	"voce",
  	"voga",
  	"volatile",
  	"volere",
  	"volpe",
  	"voragine",
  	"vulcano",
  	"zampogna",
  	"zanna",
  	"zappato",
  	"zattera",
  	"zavorra",
  	"zefiro",
  	"zelante",
  	"zelo",
  	"zenzero",
  	"zerbino",
  	"zibetto",
  	"zinco",
  	"zircone",
  	"zitto",
  	"zolla",
  	"zotico",
  	"zucchero",
  	"zufolo",
  	"zulu",
  	"zuppa"
  ];

  var italian$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': italian
  });

  var spanish = [
  	"ábaco",
  	"abdomen",
  	"abeja",
  	"abierto",
  	"abogado",
  	"abono",
  	"aborto",
  	"abrazo",
  	"abrir",
  	"abuelo",
  	"abuso",
  	"acabar",
  	"academia",
  	"acceso",
  	"acción",
  	"aceite",
  	"acelga",
  	"acento",
  	"aceptar",
  	"ácido",
  	"aclarar",
  	"acné",
  	"acoger",
  	"acoso",
  	"activo",
  	"acto",
  	"actriz",
  	"actuar",
  	"acudir",
  	"acuerdo",
  	"acusar",
  	"adicto",
  	"admitir",
  	"adoptar",
  	"adorno",
  	"aduana",
  	"adulto",
  	"aéreo",
  	"afectar",
  	"afición",
  	"afinar",
  	"afirmar",
  	"ágil",
  	"agitar",
  	"agonía",
  	"agosto",
  	"agotar",
  	"agregar",
  	"agrio",
  	"agua",
  	"agudo",
  	"águila",
  	"aguja",
  	"ahogo",
  	"ahorro",
  	"aire",
  	"aislar",
  	"ajedrez",
  	"ajeno",
  	"ajuste",
  	"alacrán",
  	"alambre",
  	"alarma",
  	"alba",
  	"álbum",
  	"alcalde",
  	"aldea",
  	"alegre",
  	"alejar",
  	"alerta",
  	"aleta",
  	"alfiler",
  	"alga",
  	"algodón",
  	"aliado",
  	"aliento",
  	"alivio",
  	"alma",
  	"almeja",
  	"almíbar",
  	"altar",
  	"alteza",
  	"altivo",
  	"alto",
  	"altura",
  	"alumno",
  	"alzar",
  	"amable",
  	"amante",
  	"amapola",
  	"amargo",
  	"amasar",
  	"ámbar",
  	"ámbito",
  	"ameno",
  	"amigo",
  	"amistad",
  	"amor",
  	"amparo",
  	"amplio",
  	"ancho",
  	"anciano",
  	"ancla",
  	"andar",
  	"andén",
  	"anemia",
  	"ángulo",
  	"anillo",
  	"ánimo",
  	"anís",
  	"anotar",
  	"antena",
  	"antiguo",
  	"antojo",
  	"anual",
  	"anular",
  	"anuncio",
  	"añadir",
  	"añejo",
  	"año",
  	"apagar",
  	"aparato",
  	"apetito",
  	"apio",
  	"aplicar",
  	"apodo",
  	"aporte",
  	"apoyo",
  	"aprender",
  	"aprobar",
  	"apuesta",
  	"apuro",
  	"arado",
  	"araña",
  	"arar",
  	"árbitro",
  	"árbol",
  	"arbusto",
  	"archivo",
  	"arco",
  	"arder",
  	"ardilla",
  	"arduo",
  	"área",
  	"árido",
  	"aries",
  	"armonía",
  	"arnés",
  	"aroma",
  	"arpa",
  	"arpón",
  	"arreglo",
  	"arroz",
  	"arruga",
  	"arte",
  	"artista",
  	"asa",
  	"asado",
  	"asalto",
  	"ascenso",
  	"asegurar",
  	"aseo",
  	"asesor",
  	"asiento",
  	"asilo",
  	"asistir",
  	"asno",
  	"asombro",
  	"áspero",
  	"astilla",
  	"astro",
  	"astuto",
  	"asumir",
  	"asunto",
  	"atajo",
  	"ataque",
  	"atar",
  	"atento",
  	"ateo",
  	"ático",
  	"atleta",
  	"átomo",
  	"atraer",
  	"atroz",
  	"atún",
  	"audaz",
  	"audio",
  	"auge",
  	"aula",
  	"aumento",
  	"ausente",
  	"autor",
  	"aval",
  	"avance",
  	"avaro",
  	"ave",
  	"avellana",
  	"avena",
  	"avestruz",
  	"avión",
  	"aviso",
  	"ayer",
  	"ayuda",
  	"ayuno",
  	"azafrán",
  	"azar",
  	"azote",
  	"azúcar",
  	"azufre",
  	"azul",
  	"baba",
  	"babor",
  	"bache",
  	"bahía",
  	"baile",
  	"bajar",
  	"balanza",
  	"balcón",
  	"balde",
  	"bambú",
  	"banco",
  	"banda",
  	"baño",
  	"barba",
  	"barco",
  	"barniz",
  	"barro",
  	"báscula",
  	"bastón",
  	"basura",
  	"batalla",
  	"batería",
  	"batir",
  	"batuta",
  	"baúl",
  	"bazar",
  	"bebé",
  	"bebida",
  	"bello",
  	"besar",
  	"beso",
  	"bestia",
  	"bicho",
  	"bien",
  	"bingo",
  	"blanco",
  	"bloque",
  	"blusa",
  	"boa",
  	"bobina",
  	"bobo",
  	"boca",
  	"bocina",
  	"boda",
  	"bodega",
  	"boina",
  	"bola",
  	"bolero",
  	"bolsa",
  	"bomba",
  	"bondad",
  	"bonito",
  	"bono",
  	"bonsái",
  	"borde",
  	"borrar",
  	"bosque",
  	"bote",
  	"botín",
  	"bóveda",
  	"bozal",
  	"bravo",
  	"brazo",
  	"brecha",
  	"breve",
  	"brillo",
  	"brinco",
  	"brisa",
  	"broca",
  	"broma",
  	"bronce",
  	"brote",
  	"bruja",
  	"brusco",
  	"bruto",
  	"buceo",
  	"bucle",
  	"bueno",
  	"buey",
  	"bufanda",
  	"bufón",
  	"búho",
  	"buitre",
  	"bulto",
  	"burbuja",
  	"burla",
  	"burro",
  	"buscar",
  	"butaca",
  	"buzón",
  	"caballo",
  	"cabeza",
  	"cabina",
  	"cabra",
  	"cacao",
  	"cadáver",
  	"cadena",
  	"caer",
  	"café",
  	"caída",
  	"caimán",
  	"caja",
  	"cajón",
  	"cal",
  	"calamar",
  	"calcio",
  	"caldo",
  	"calidad",
  	"calle",
  	"calma",
  	"calor",
  	"calvo",
  	"cama",
  	"cambio",
  	"camello",
  	"camino",
  	"campo",
  	"cáncer",
  	"candil",
  	"canela",
  	"canguro",
  	"canica",
  	"canto",
  	"caña",
  	"cañón",
  	"caoba",
  	"caos",
  	"capaz",
  	"capitán",
  	"capote",
  	"captar",
  	"capucha",
  	"cara",
  	"carbón",
  	"cárcel",
  	"careta",
  	"carga",
  	"cariño",
  	"carne",
  	"carpeta",
  	"carro",
  	"carta",
  	"casa",
  	"casco",
  	"casero",
  	"caspa",
  	"castor",
  	"catorce",
  	"catre",
  	"caudal",
  	"causa",
  	"cazo",
  	"cebolla",
  	"ceder",
  	"cedro",
  	"celda",
  	"célebre",
  	"celoso",
  	"célula",
  	"cemento",
  	"ceniza",
  	"centro",
  	"cerca",
  	"cerdo",
  	"cereza",
  	"cero",
  	"cerrar",
  	"certeza",
  	"césped",
  	"cetro",
  	"chacal",
  	"chaleco",
  	"champú",
  	"chancla",
  	"chapa",
  	"charla",
  	"chico",
  	"chiste",
  	"chivo",
  	"choque",
  	"choza",
  	"chuleta",
  	"chupar",
  	"ciclón",
  	"ciego",
  	"cielo",
  	"cien",
  	"cierto",
  	"cifra",
  	"cigarro",
  	"cima",
  	"cinco",
  	"cine",
  	"cinta",
  	"ciprés",
  	"circo",
  	"ciruela",
  	"cisne",
  	"cita",
  	"ciudad",
  	"clamor",
  	"clan",
  	"claro",
  	"clase",
  	"clave",
  	"cliente",
  	"clima",
  	"clínica",
  	"cobre",
  	"cocción",
  	"cochino",
  	"cocina",
  	"coco",
  	"código",
  	"codo",
  	"cofre",
  	"coger",
  	"cohete",
  	"cojín",
  	"cojo",
  	"cola",
  	"colcha",
  	"colegio",
  	"colgar",
  	"colina",
  	"collar",
  	"colmo",
  	"columna",
  	"combate",
  	"comer",
  	"comida",
  	"cómodo",
  	"compra",
  	"conde",
  	"conejo",
  	"conga",
  	"conocer",
  	"consejo",
  	"contar",
  	"copa",
  	"copia",
  	"corazón",
  	"corbata",
  	"corcho",
  	"cordón",
  	"corona",
  	"correr",
  	"coser",
  	"cosmos",
  	"costa",
  	"cráneo",
  	"cráter",
  	"crear",
  	"crecer",
  	"creído",
  	"crema",
  	"cría",
  	"crimen",
  	"cripta",
  	"crisis",
  	"cromo",
  	"crónica",
  	"croqueta",
  	"crudo",
  	"cruz",
  	"cuadro",
  	"cuarto",
  	"cuatro",
  	"cubo",
  	"cubrir",
  	"cuchara",
  	"cuello",
  	"cuento",
  	"cuerda",
  	"cuesta",
  	"cueva",
  	"cuidar",
  	"culebra",
  	"culpa",
  	"culto",
  	"cumbre",
  	"cumplir",
  	"cuna",
  	"cuneta",
  	"cuota",
  	"cupón",
  	"cúpula",
  	"curar",
  	"curioso",
  	"curso",
  	"curva",
  	"cutis",
  	"dama",
  	"danza",
  	"dar",
  	"dardo",
  	"dátil",
  	"deber",
  	"débil",
  	"década",
  	"decir",
  	"dedo",
  	"defensa",
  	"definir",
  	"dejar",
  	"delfín",
  	"delgado",
  	"delito",
  	"demora",
  	"denso",
  	"dental",
  	"deporte",
  	"derecho",
  	"derrota",
  	"desayuno",
  	"deseo",
  	"desfile",
  	"desnudo",
  	"destino",
  	"desvío",
  	"detalle",
  	"detener",
  	"deuda",
  	"día",
  	"diablo",
  	"diadema",
  	"diamante",
  	"diana",
  	"diario",
  	"dibujo",
  	"dictar",
  	"diente",
  	"dieta",
  	"diez",
  	"difícil",
  	"digno",
  	"dilema",
  	"diluir",
  	"dinero",
  	"directo",
  	"dirigir",
  	"disco",
  	"diseño",
  	"disfraz",
  	"diva",
  	"divino",
  	"doble",
  	"doce",
  	"dolor",
  	"domingo",
  	"don",
  	"donar",
  	"dorado",
  	"dormir",
  	"dorso",
  	"dos",
  	"dosis",
  	"dragón",
  	"droga",
  	"ducha",
  	"duda",
  	"duelo",
  	"dueño",
  	"dulce",
  	"dúo",
  	"duque",
  	"durar",
  	"dureza",
  	"duro",
  	"ébano",
  	"ebrio",
  	"echar",
  	"eco",
  	"ecuador",
  	"edad",
  	"edición",
  	"edificio",
  	"editor",
  	"educar",
  	"efecto",
  	"eficaz",
  	"eje",
  	"ejemplo",
  	"elefante",
  	"elegir",
  	"elemento",
  	"elevar",
  	"elipse",
  	"élite",
  	"elixir",
  	"elogio",
  	"eludir",
  	"embudo",
  	"emitir",
  	"emoción",
  	"empate",
  	"empeño",
  	"empleo",
  	"empresa",
  	"enano",
  	"encargo",
  	"enchufe",
  	"encía",
  	"enemigo",
  	"enero",
  	"enfado",
  	"enfermo",
  	"engaño",
  	"enigma",
  	"enlace",
  	"enorme",
  	"enredo",
  	"ensayo",
  	"enseñar",
  	"entero",
  	"entrar",
  	"envase",
  	"envío",
  	"época",
  	"equipo",
  	"erizo",
  	"escala",
  	"escena",
  	"escolar",
  	"escribir",
  	"escudo",
  	"esencia",
  	"esfera",
  	"esfuerzo",
  	"espada",
  	"espejo",
  	"espía",
  	"esposa",
  	"espuma",
  	"esquí",
  	"estar",
  	"este",
  	"estilo",
  	"estufa",
  	"etapa",
  	"eterno",
  	"ética",
  	"etnia",
  	"evadir",
  	"evaluar",
  	"evento",
  	"evitar",
  	"exacto",
  	"examen",
  	"exceso",
  	"excusa",
  	"exento",
  	"exigir",
  	"exilio",
  	"existir",
  	"éxito",
  	"experto",
  	"explicar",
  	"exponer",
  	"extremo",
  	"fábrica",
  	"fábula",
  	"fachada",
  	"fácil",
  	"factor",
  	"faena",
  	"faja",
  	"falda",
  	"fallo",
  	"falso",
  	"faltar",
  	"fama",
  	"familia",
  	"famoso",
  	"faraón",
  	"farmacia",
  	"farol",
  	"farsa",
  	"fase",
  	"fatiga",
  	"fauna",
  	"favor",
  	"fax",
  	"febrero",
  	"fecha",
  	"feliz",
  	"feo",
  	"feria",
  	"feroz",
  	"fértil",
  	"fervor",
  	"festín",
  	"fiable",
  	"fianza",
  	"fiar",
  	"fibra",
  	"ficción",
  	"ficha",
  	"fideo",
  	"fiebre",
  	"fiel",
  	"fiera",
  	"fiesta",
  	"figura",
  	"fijar",
  	"fijo",
  	"fila",
  	"filete",
  	"filial",
  	"filtro",
  	"fin",
  	"finca",
  	"fingir",
  	"finito",
  	"firma",
  	"flaco",
  	"flauta",
  	"flecha",
  	"flor",
  	"flota",
  	"fluir",
  	"flujo",
  	"flúor",
  	"fobia",
  	"foca",
  	"fogata",
  	"fogón",
  	"folio",
  	"folleto",
  	"fondo",
  	"forma",
  	"forro",
  	"fortuna",
  	"forzar",
  	"fosa",
  	"foto",
  	"fracaso",
  	"frágil",
  	"franja",
  	"frase",
  	"fraude",
  	"freír",
  	"freno",
  	"fresa",
  	"frío",
  	"frito",
  	"fruta",
  	"fuego",
  	"fuente",
  	"fuerza",
  	"fuga",
  	"fumar",
  	"función",
  	"funda",
  	"furgón",
  	"furia",
  	"fusil",
  	"fútbol",
  	"futuro",
  	"gacela",
  	"gafas",
  	"gaita",
  	"gajo",
  	"gala",
  	"galería",
  	"gallo",
  	"gamba",
  	"ganar",
  	"gancho",
  	"ganga",
  	"ganso",
  	"garaje",
  	"garza",
  	"gasolina",
  	"gastar",
  	"gato",
  	"gavilán",
  	"gemelo",
  	"gemir",
  	"gen",
  	"género",
  	"genio",
  	"gente",
  	"geranio",
  	"gerente",
  	"germen",
  	"gesto",
  	"gigante",
  	"gimnasio",
  	"girar",
  	"giro",
  	"glaciar",
  	"globo",
  	"gloria",
  	"gol",
  	"golfo",
  	"goloso",
  	"golpe",
  	"goma",
  	"gordo",
  	"gorila",
  	"gorra",
  	"gota",
  	"goteo",
  	"gozar",
  	"grada",
  	"gráfico",
  	"grano",
  	"grasa",
  	"gratis",
  	"grave",
  	"grieta",
  	"grillo",
  	"gripe",
  	"gris",
  	"grito",
  	"grosor",
  	"grúa",
  	"grueso",
  	"grumo",
  	"grupo",
  	"guante",
  	"guapo",
  	"guardia",
  	"guerra",
  	"guía",
  	"guiño",
  	"guion",
  	"guiso",
  	"guitarra",
  	"gusano",
  	"gustar",
  	"haber",
  	"hábil",
  	"hablar",
  	"hacer",
  	"hacha",
  	"hada",
  	"hallar",
  	"hamaca",
  	"harina",
  	"haz",
  	"hazaña",
  	"hebilla",
  	"hebra",
  	"hecho",
  	"helado",
  	"helio",
  	"hembra",
  	"herir",
  	"hermano",
  	"héroe",
  	"hervir",
  	"hielo",
  	"hierro",
  	"hígado",
  	"higiene",
  	"hijo",
  	"himno",
  	"historia",
  	"hocico",
  	"hogar",
  	"hoguera",
  	"hoja",
  	"hombre",
  	"hongo",
  	"honor",
  	"honra",
  	"hora",
  	"hormiga",
  	"horno",
  	"hostil",
  	"hoyo",
  	"hueco",
  	"huelga",
  	"huerta",
  	"hueso",
  	"huevo",
  	"huida",
  	"huir",
  	"humano",
  	"húmedo",
  	"humilde",
  	"humo",
  	"hundir",
  	"huracán",
  	"hurto",
  	"icono",
  	"ideal",
  	"idioma",
  	"ídolo",
  	"iglesia",
  	"iglú",
  	"igual",
  	"ilegal",
  	"ilusión",
  	"imagen",
  	"imán",
  	"imitar",
  	"impar",
  	"imperio",
  	"imponer",
  	"impulso",
  	"incapaz",
  	"índice",
  	"inerte",
  	"infiel",
  	"informe",
  	"ingenio",
  	"inicio",
  	"inmenso",
  	"inmune",
  	"innato",
  	"insecto",
  	"instante",
  	"interés",
  	"íntimo",
  	"intuir",
  	"inútil",
  	"invierno",
  	"ira",
  	"iris",
  	"ironía",
  	"isla",
  	"islote",
  	"jabalí",
  	"jabón",
  	"jamón",
  	"jarabe",
  	"jardín",
  	"jarra",
  	"jaula",
  	"jazmín",
  	"jefe",
  	"jeringa",
  	"jinete",
  	"jornada",
  	"joroba",
  	"joven",
  	"joya",
  	"juerga",
  	"jueves",
  	"juez",
  	"jugador",
  	"jugo",
  	"juguete",
  	"juicio",
  	"junco",
  	"jungla",
  	"junio",
  	"juntar",
  	"júpiter",
  	"jurar",
  	"justo",
  	"juvenil",
  	"juzgar",
  	"kilo",
  	"koala",
  	"labio",
  	"lacio",
  	"lacra",
  	"lado",
  	"ladrón",
  	"lagarto",
  	"lágrima",
  	"laguna",
  	"laico",
  	"lamer",
  	"lámina",
  	"lámpara",
  	"lana",
  	"lancha",
  	"langosta",
  	"lanza",
  	"lápiz",
  	"largo",
  	"larva",
  	"lástima",
  	"lata",
  	"látex",
  	"latir",
  	"laurel",
  	"lavar",
  	"lazo",
  	"leal",
  	"lección",
  	"leche",
  	"lector",
  	"leer",
  	"legión",
  	"legumbre",
  	"lejano",
  	"lengua",
  	"lento",
  	"leña",
  	"león",
  	"leopardo",
  	"lesión",
  	"letal",
  	"letra",
  	"leve",
  	"leyenda",
  	"libertad",
  	"libro",
  	"licor",
  	"líder",
  	"lidiar",
  	"lienzo",
  	"liga",
  	"ligero",
  	"lima",
  	"límite",
  	"limón",
  	"limpio",
  	"lince",
  	"lindo",
  	"línea",
  	"lingote",
  	"lino",
  	"linterna",
  	"líquido",
  	"liso",
  	"lista",
  	"litera",
  	"litio",
  	"litro",
  	"llaga",
  	"llama",
  	"llanto",
  	"llave",
  	"llegar",
  	"llenar",
  	"llevar",
  	"llorar",
  	"llover",
  	"lluvia",
  	"lobo",
  	"loción",
  	"loco",
  	"locura",
  	"lógica",
  	"logro",
  	"lombriz",
  	"lomo",
  	"lonja",
  	"lote",
  	"lucha",
  	"lucir",
  	"lugar",
  	"lujo",
  	"luna",
  	"lunes",
  	"lupa",
  	"lustro",
  	"luto",
  	"luz",
  	"maceta",
  	"macho",
  	"madera",
  	"madre",
  	"maduro",
  	"maestro",
  	"mafia",
  	"magia",
  	"mago",
  	"maíz",
  	"maldad",
  	"maleta",
  	"malla",
  	"malo",
  	"mamá",
  	"mambo",
  	"mamut",
  	"manco",
  	"mando",
  	"manejar",
  	"manga",
  	"maniquí",
  	"manjar",
  	"mano",
  	"manso",
  	"manta",
  	"mañana",
  	"mapa",
  	"máquina",
  	"mar",
  	"marco",
  	"marea",
  	"marfil",
  	"margen",
  	"marido",
  	"mármol",
  	"marrón",
  	"martes",
  	"marzo",
  	"masa",
  	"máscara",
  	"masivo",
  	"matar",
  	"materia",
  	"matiz",
  	"matriz",
  	"máximo",
  	"mayor",
  	"mazorca",
  	"mecha",
  	"medalla",
  	"medio",
  	"médula",
  	"mejilla",
  	"mejor",
  	"melena",
  	"melón",
  	"memoria",
  	"menor",
  	"mensaje",
  	"mente",
  	"menú",
  	"mercado",
  	"merengue",
  	"mérito",
  	"mes",
  	"mesón",
  	"meta",
  	"meter",
  	"método",
  	"metro",
  	"mezcla",
  	"miedo",
  	"miel",
  	"miembro",
  	"miga",
  	"mil",
  	"milagro",
  	"militar",
  	"millón",
  	"mimo",
  	"mina",
  	"minero",
  	"mínimo",
  	"minuto",
  	"miope",
  	"mirar",
  	"misa",
  	"miseria",
  	"misil",
  	"mismo",
  	"mitad",
  	"mito",
  	"mochila",
  	"moción",
  	"moda",
  	"modelo",
  	"moho",
  	"mojar",
  	"molde",
  	"moler",
  	"molino",
  	"momento",
  	"momia",
  	"monarca",
  	"moneda",
  	"monja",
  	"monto",
  	"moño",
  	"morada",
  	"morder",
  	"moreno",
  	"morir",
  	"morro",
  	"morsa",
  	"mortal",
  	"mosca",
  	"mostrar",
  	"motivo",
  	"mover",
  	"móvil",
  	"mozo",
  	"mucho",
  	"mudar",
  	"mueble",
  	"muela",
  	"muerte",
  	"muestra",
  	"mugre",
  	"mujer",
  	"mula",
  	"muleta",
  	"multa",
  	"mundo",
  	"muñeca",
  	"mural",
  	"muro",
  	"músculo",
  	"museo",
  	"musgo",
  	"música",
  	"muslo",
  	"nácar",
  	"nación",
  	"nadar",
  	"naipe",
  	"naranja",
  	"nariz",
  	"narrar",
  	"nasal",
  	"natal",
  	"nativo",
  	"natural",
  	"náusea",
  	"naval",
  	"nave",
  	"navidad",
  	"necio",
  	"néctar",
  	"negar",
  	"negocio",
  	"negro",
  	"neón",
  	"nervio",
  	"neto",
  	"neutro",
  	"nevar",
  	"nevera",
  	"nicho",
  	"nido",
  	"niebla",
  	"nieto",
  	"niñez",
  	"niño",
  	"nítido",
  	"nivel",
  	"nobleza",
  	"noche",
  	"nómina",
  	"noria",
  	"norma",
  	"norte",
  	"nota",
  	"noticia",
  	"novato",
  	"novela",
  	"novio",
  	"nube",
  	"nuca",
  	"núcleo",
  	"nudillo",
  	"nudo",
  	"nuera",
  	"nueve",
  	"nuez",
  	"nulo",
  	"número",
  	"nutria",
  	"oasis",
  	"obeso",
  	"obispo",
  	"objeto",
  	"obra",
  	"obrero",
  	"observar",
  	"obtener",
  	"obvio",
  	"oca",
  	"ocaso",
  	"océano",
  	"ochenta",
  	"ocho",
  	"ocio",
  	"ocre",
  	"octavo",
  	"octubre",
  	"oculto",
  	"ocupar",
  	"ocurrir",
  	"odiar",
  	"odio",
  	"odisea",
  	"oeste",
  	"ofensa",
  	"oferta",
  	"oficio",
  	"ofrecer",
  	"ogro",
  	"oído",
  	"oír",
  	"ojo",
  	"ola",
  	"oleada",
  	"olfato",
  	"olivo",
  	"olla",
  	"olmo",
  	"olor",
  	"olvido",
  	"ombligo",
  	"onda",
  	"onza",
  	"opaco",
  	"opción",
  	"ópera",
  	"opinar",
  	"oponer",
  	"optar",
  	"óptica",
  	"opuesto",
  	"oración",
  	"orador",
  	"oral",
  	"órbita",
  	"orca",
  	"orden",
  	"oreja",
  	"órgano",
  	"orgía",
  	"orgullo",
  	"oriente",
  	"origen",
  	"orilla",
  	"oro",
  	"orquesta",
  	"oruga",
  	"osadía",
  	"oscuro",
  	"osezno",
  	"oso",
  	"ostra",
  	"otoño",
  	"otro",
  	"oveja",
  	"óvulo",
  	"óxido",
  	"oxígeno",
  	"oyente",
  	"ozono",
  	"pacto",
  	"padre",
  	"paella",
  	"página",
  	"pago",
  	"país",
  	"pájaro",
  	"palabra",
  	"palco",
  	"paleta",
  	"pálido",
  	"palma",
  	"paloma",
  	"palpar",
  	"pan",
  	"panal",
  	"pánico",
  	"pantera",
  	"pañuelo",
  	"papá",
  	"papel",
  	"papilla",
  	"paquete",
  	"parar",
  	"parcela",
  	"pared",
  	"parir",
  	"paro",
  	"párpado",
  	"parque",
  	"párrafo",
  	"parte",
  	"pasar",
  	"paseo",
  	"pasión",
  	"paso",
  	"pasta",
  	"pata",
  	"patio",
  	"patria",
  	"pausa",
  	"pauta",
  	"pavo",
  	"payaso",
  	"peatón",
  	"pecado",
  	"pecera",
  	"pecho",
  	"pedal",
  	"pedir",
  	"pegar",
  	"peine",
  	"pelar",
  	"peldaño",
  	"pelea",
  	"peligro",
  	"pellejo",
  	"pelo",
  	"peluca",
  	"pena",
  	"pensar",
  	"peñón",
  	"peón",
  	"peor",
  	"pepino",
  	"pequeño",
  	"pera",
  	"percha",
  	"perder",
  	"pereza",
  	"perfil",
  	"perico",
  	"perla",
  	"permiso",
  	"perro",
  	"persona",
  	"pesa",
  	"pesca",
  	"pésimo",
  	"pestaña",
  	"pétalo",
  	"petróleo",
  	"pez",
  	"pezuña",
  	"picar",
  	"pichón",
  	"pie",
  	"piedra",
  	"pierna",
  	"pieza",
  	"pijama",
  	"pilar",
  	"piloto",
  	"pimienta",
  	"pino",
  	"pintor",
  	"pinza",
  	"piña",
  	"piojo",
  	"pipa",
  	"pirata",
  	"pisar",
  	"piscina",
  	"piso",
  	"pista",
  	"pitón",
  	"pizca",
  	"placa",
  	"plan",
  	"plata",
  	"playa",
  	"plaza",
  	"pleito",
  	"pleno",
  	"plomo",
  	"pluma",
  	"plural",
  	"pobre",
  	"poco",
  	"poder",
  	"podio",
  	"poema",
  	"poesía",
  	"poeta",
  	"polen",
  	"policía",
  	"pollo",
  	"polvo",
  	"pomada",
  	"pomelo",
  	"pomo",
  	"pompa",
  	"poner",
  	"porción",
  	"portal",
  	"posada",
  	"poseer",
  	"posible",
  	"poste",
  	"potencia",
  	"potro",
  	"pozo",
  	"prado",
  	"precoz",
  	"pregunta",
  	"premio",
  	"prensa",
  	"preso",
  	"previo",
  	"primo",
  	"príncipe",
  	"prisión",
  	"privar",
  	"proa",
  	"probar",
  	"proceso",
  	"producto",
  	"proeza",
  	"profesor",
  	"programa",
  	"prole",
  	"promesa",
  	"pronto",
  	"propio",
  	"próximo",
  	"prueba",
  	"público",
  	"puchero",
  	"pudor",
  	"pueblo",
  	"puerta",
  	"puesto",
  	"pulga",
  	"pulir",
  	"pulmón",
  	"pulpo",
  	"pulso",
  	"puma",
  	"punto",
  	"puñal",
  	"puño",
  	"pupa",
  	"pupila",
  	"puré",
  	"quedar",
  	"queja",
  	"quemar",
  	"querer",
  	"queso",
  	"quieto",
  	"química",
  	"quince",
  	"quitar",
  	"rábano",
  	"rabia",
  	"rabo",
  	"ración",
  	"radical",
  	"raíz",
  	"rama",
  	"rampa",
  	"rancho",
  	"rango",
  	"rapaz",
  	"rápido",
  	"rapto",
  	"rasgo",
  	"raspa",
  	"rato",
  	"rayo",
  	"raza",
  	"razón",
  	"reacción",
  	"realidad",
  	"rebaño",
  	"rebote",
  	"recaer",
  	"receta",
  	"rechazo",
  	"recoger",
  	"recreo",
  	"recto",
  	"recurso",
  	"red",
  	"redondo",
  	"reducir",
  	"reflejo",
  	"reforma",
  	"refrán",
  	"refugio",
  	"regalo",
  	"regir",
  	"regla",
  	"regreso",
  	"rehén",
  	"reino",
  	"reír",
  	"reja",
  	"relato",
  	"relevo",
  	"relieve",
  	"relleno",
  	"reloj",
  	"remar",
  	"remedio",
  	"remo",
  	"rencor",
  	"rendir",
  	"renta",
  	"reparto",
  	"repetir",
  	"reposo",
  	"reptil",
  	"res",
  	"rescate",
  	"resina",
  	"respeto",
  	"resto",
  	"resumen",
  	"retiro",
  	"retorno",
  	"retrato",
  	"reunir",
  	"revés",
  	"revista",
  	"rey",
  	"rezar",
  	"rico",
  	"riego",
  	"rienda",
  	"riesgo",
  	"rifa",
  	"rígido",
  	"rigor",
  	"rincón",
  	"riñón",
  	"río",
  	"riqueza",
  	"risa",
  	"ritmo",
  	"rito",
  	"rizo",
  	"roble",
  	"roce",
  	"rociar",
  	"rodar",
  	"rodeo",
  	"rodilla",
  	"roer",
  	"rojizo",
  	"rojo",
  	"romero",
  	"romper",
  	"ron",
  	"ronco",
  	"ronda",
  	"ropa",
  	"ropero",
  	"rosa",
  	"rosca",
  	"rostro",
  	"rotar",
  	"rubí",
  	"rubor",
  	"rudo",
  	"rueda",
  	"rugir",
  	"ruido",
  	"ruina",
  	"ruleta",
  	"rulo",
  	"rumbo",
  	"rumor",
  	"ruptura",
  	"ruta",
  	"rutina",
  	"sábado",
  	"saber",
  	"sabio",
  	"sable",
  	"sacar",
  	"sagaz",
  	"sagrado",
  	"sala",
  	"saldo",
  	"salero",
  	"salir",
  	"salmón",
  	"salón",
  	"salsa",
  	"salto",
  	"salud",
  	"salvar",
  	"samba",
  	"sanción",
  	"sandía",
  	"sanear",
  	"sangre",
  	"sanidad",
  	"sano",
  	"santo",
  	"sapo",
  	"saque",
  	"sardina",
  	"sartén",
  	"sastre",
  	"satán",
  	"sauna",
  	"saxofón",
  	"sección",
  	"seco",
  	"secreto",
  	"secta",
  	"sed",
  	"seguir",
  	"seis",
  	"sello",
  	"selva",
  	"semana",
  	"semilla",
  	"senda",
  	"sensor",
  	"señal",
  	"señor",
  	"separar",
  	"sepia",
  	"sequía",
  	"ser",
  	"serie",
  	"sermón",
  	"servir",
  	"sesenta",
  	"sesión",
  	"seta",
  	"setenta",
  	"severo",
  	"sexo",
  	"sexto",
  	"sidra",
  	"siesta",
  	"siete",
  	"siglo",
  	"signo",
  	"sílaba",
  	"silbar",
  	"silencio",
  	"silla",
  	"símbolo",
  	"simio",
  	"sirena",
  	"sistema",
  	"sitio",
  	"situar",
  	"sobre",
  	"socio",
  	"sodio",
  	"sol",
  	"solapa",
  	"soldado",
  	"soledad",
  	"sólido",
  	"soltar",
  	"solución",
  	"sombra",
  	"sondeo",
  	"sonido",
  	"sonoro",
  	"sonrisa",
  	"sopa",
  	"soplar",
  	"soporte",
  	"sordo",
  	"sorpresa",
  	"sorteo",
  	"sostén",
  	"sótano",
  	"suave",
  	"subir",
  	"suceso",
  	"sudor",
  	"suegra",
  	"suelo",
  	"sueño",
  	"suerte",
  	"sufrir",
  	"sujeto",
  	"sultán",
  	"sumar",
  	"superar",
  	"suplir",
  	"suponer",
  	"supremo",
  	"sur",
  	"surco",
  	"sureño",
  	"surgir",
  	"susto",
  	"sutil",
  	"tabaco",
  	"tabique",
  	"tabla",
  	"tabú",
  	"taco",
  	"tacto",
  	"tajo",
  	"talar",
  	"talco",
  	"talento",
  	"talla",
  	"talón",
  	"tamaño",
  	"tambor",
  	"tango",
  	"tanque",
  	"tapa",
  	"tapete",
  	"tapia",
  	"tapón",
  	"taquilla",
  	"tarde",
  	"tarea",
  	"tarifa",
  	"tarjeta",
  	"tarot",
  	"tarro",
  	"tarta",
  	"tatuaje",
  	"tauro",
  	"taza",
  	"tazón",
  	"teatro",
  	"techo",
  	"tecla",
  	"técnica",
  	"tejado",
  	"tejer",
  	"tejido",
  	"tela",
  	"teléfono",
  	"tema",
  	"temor",
  	"templo",
  	"tenaz",
  	"tender",
  	"tener",
  	"tenis",
  	"tenso",
  	"teoría",
  	"terapia",
  	"terco",
  	"término",
  	"ternura",
  	"terror",
  	"tesis",
  	"tesoro",
  	"testigo",
  	"tetera",
  	"texto",
  	"tez",
  	"tibio",
  	"tiburón",
  	"tiempo",
  	"tienda",
  	"tierra",
  	"tieso",
  	"tigre",
  	"tijera",
  	"tilde",
  	"timbre",
  	"tímido",
  	"timo",
  	"tinta",
  	"tío",
  	"típico",
  	"tipo",
  	"tira",
  	"tirón",
  	"titán",
  	"títere",
  	"título",
  	"tiza",
  	"toalla",
  	"tobillo",
  	"tocar",
  	"tocino",
  	"todo",
  	"toga",
  	"toldo",
  	"tomar",
  	"tono",
  	"tonto",
  	"topar",
  	"tope",
  	"toque",
  	"tórax",
  	"torero",
  	"tormenta",
  	"torneo",
  	"toro",
  	"torpedo",
  	"torre",
  	"torso",
  	"tortuga",
  	"tos",
  	"tosco",
  	"toser",
  	"tóxico",
  	"trabajo",
  	"tractor",
  	"traer",
  	"tráfico",
  	"trago",
  	"traje",
  	"tramo",
  	"trance",
  	"trato",
  	"trauma",
  	"trazar",
  	"trébol",
  	"tregua",
  	"treinta",
  	"tren",
  	"trepar",
  	"tres",
  	"tribu",
  	"trigo",
  	"tripa",
  	"triste",
  	"triunfo",
  	"trofeo",
  	"trompa",
  	"tronco",
  	"tropa",
  	"trote",
  	"trozo",
  	"truco",
  	"trueno",
  	"trufa",
  	"tubería",
  	"tubo",
  	"tuerto",
  	"tumba",
  	"tumor",
  	"túnel",
  	"túnica",
  	"turbina",
  	"turismo",
  	"turno",
  	"tutor",
  	"ubicar",
  	"úlcera",
  	"umbral",
  	"unidad",
  	"unir",
  	"universo",
  	"uno",
  	"untar",
  	"uña",
  	"urbano",
  	"urbe",
  	"urgente",
  	"urna",
  	"usar",
  	"usuario",
  	"útil",
  	"utopía",
  	"uva",
  	"vaca",
  	"vacío",
  	"vacuna",
  	"vagar",
  	"vago",
  	"vaina",
  	"vajilla",
  	"vale",
  	"válido",
  	"valle",
  	"valor",
  	"válvula",
  	"vampiro",
  	"vara",
  	"variar",
  	"varón",
  	"vaso",
  	"vecino",
  	"vector",
  	"vehículo",
  	"veinte",
  	"vejez",
  	"vela",
  	"velero",
  	"veloz",
  	"vena",
  	"vencer",
  	"venda",
  	"veneno",
  	"vengar",
  	"venir",
  	"venta",
  	"venus",
  	"ver",
  	"verano",
  	"verbo",
  	"verde",
  	"vereda",
  	"verja",
  	"verso",
  	"verter",
  	"vía",
  	"viaje",
  	"vibrar",
  	"vicio",
  	"víctima",
  	"vida",
  	"vídeo",
  	"vidrio",
  	"viejo",
  	"viernes",
  	"vigor",
  	"vil",
  	"villa",
  	"vinagre",
  	"vino",
  	"viñedo",
  	"violín",
  	"viral",
  	"virgo",
  	"virtud",
  	"visor",
  	"víspera",
  	"vista",
  	"vitamina",
  	"viudo",
  	"vivaz",
  	"vivero",
  	"vivir",
  	"vivo",
  	"volcán",
  	"volumen",
  	"volver",
  	"voraz",
  	"votar",
  	"voto",
  	"voz",
  	"vuelo",
  	"vulgar",
  	"yacer",
  	"yate",
  	"yegua",
  	"yema",
  	"yerno",
  	"yeso",
  	"yodo",
  	"yoga",
  	"yogur",
  	"zafiro",
  	"zanja",
  	"zapato",
  	"zarza",
  	"zona",
  	"zorro",
  	"zumo",
  	"zurdo"
  ];

  var spanish$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': spanish
  });

  var japanese = [
  	"あいこくしん",
  	"あいさつ",
  	"あいだ",
  	"あおぞら",
  	"あかちゃん",
  	"あきる",
  	"あけがた",
  	"あける",
  	"あこがれる",
  	"あさい",
  	"あさひ",
  	"あしあと",
  	"あじわう",
  	"あずかる",
  	"あずき",
  	"あそぶ",
  	"あたえる",
  	"あたためる",
  	"あたりまえ",
  	"あたる",
  	"あつい",
  	"あつかう",
  	"あっしゅく",
  	"あつまり",
  	"あつめる",
  	"あてな",
  	"あてはまる",
  	"あひる",
  	"あぶら",
  	"あぶる",
  	"あふれる",
  	"あまい",
  	"あまど",
  	"あまやかす",
  	"あまり",
  	"あみもの",
  	"あめりか",
  	"あやまる",
  	"あゆむ",
  	"あらいぐま",
  	"あらし",
  	"あらすじ",
  	"あらためる",
  	"あらゆる",
  	"あらわす",
  	"ありがとう",
  	"あわせる",
  	"あわてる",
  	"あんい",
  	"あんがい",
  	"あんこ",
  	"あんぜん",
  	"あんてい",
  	"あんない",
  	"あんまり",
  	"いいだす",
  	"いおん",
  	"いがい",
  	"いがく",
  	"いきおい",
  	"いきなり",
  	"いきもの",
  	"いきる",
  	"いくじ",
  	"いくぶん",
  	"いけばな",
  	"いけん",
  	"いこう",
  	"いこく",
  	"いこつ",
  	"いさましい",
  	"いさん",
  	"いしき",
  	"いじゅう",
  	"いじょう",
  	"いじわる",
  	"いずみ",
  	"いずれ",
  	"いせい",
  	"いせえび",
  	"いせかい",
  	"いせき",
  	"いぜん",
  	"いそうろう",
  	"いそがしい",
  	"いだい",
  	"いだく",
  	"いたずら",
  	"いたみ",
  	"いたりあ",
  	"いちおう",
  	"いちじ",
  	"いちど",
  	"いちば",
  	"いちぶ",
  	"いちりゅう",
  	"いつか",
  	"いっしゅん",
  	"いっせい",
  	"いっそう",
  	"いったん",
  	"いっち",
  	"いってい",
  	"いっぽう",
  	"いてざ",
  	"いてん",
  	"いどう",
  	"いとこ",
  	"いない",
  	"いなか",
  	"いねむり",
  	"いのち",
  	"いのる",
  	"いはつ",
  	"いばる",
  	"いはん",
  	"いびき",
  	"いひん",
  	"いふく",
  	"いへん",
  	"いほう",
  	"いみん",
  	"いもうと",
  	"いもたれ",
  	"いもり",
  	"いやがる",
  	"いやす",
  	"いよかん",
  	"いよく",
  	"いらい",
  	"いらすと",
  	"いりぐち",
  	"いりょう",
  	"いれい",
  	"いれもの",
  	"いれる",
  	"いろえんぴつ",
  	"いわい",
  	"いわう",
  	"いわかん",
  	"いわば",
  	"いわゆる",
  	"いんげんまめ",
  	"いんさつ",
  	"いんしょう",
  	"いんよう",
  	"うえき",
  	"うえる",
  	"うおざ",
  	"うがい",
  	"うかぶ",
  	"うかべる",
  	"うきわ",
  	"うくらいな",
  	"うくれれ",
  	"うけたまわる",
  	"うけつけ",
  	"うけとる",
  	"うけもつ",
  	"うける",
  	"うごかす",
  	"うごく",
  	"うこん",
  	"うさぎ",
  	"うしなう",
  	"うしろがみ",
  	"うすい",
  	"うすぎ",
  	"うすぐらい",
  	"うすめる",
  	"うせつ",
  	"うちあわせ",
  	"うちがわ",
  	"うちき",
  	"うちゅう",
  	"うっかり",
  	"うつくしい",
  	"うったえる",
  	"うつる",
  	"うどん",
  	"うなぎ",
  	"うなじ",
  	"うなずく",
  	"うなる",
  	"うねる",
  	"うのう",
  	"うぶげ",
  	"うぶごえ",
  	"うまれる",
  	"うめる",
  	"うもう",
  	"うやまう",
  	"うよく",
  	"うらがえす",
  	"うらぐち",
  	"うらない",
  	"うりあげ",
  	"うりきれ",
  	"うるさい",
  	"うれしい",
  	"うれゆき",
  	"うれる",
  	"うろこ",
  	"うわき",
  	"うわさ",
  	"うんこう",
  	"うんちん",
  	"うんてん",
  	"うんどう",
  	"えいえん",
  	"えいが",
  	"えいきょう",
  	"えいご",
  	"えいせい",
  	"えいぶん",
  	"えいよう",
  	"えいわ",
  	"えおり",
  	"えがお",
  	"えがく",
  	"えきたい",
  	"えくせる",
  	"えしゃく",
  	"えすて",
  	"えつらん",
  	"えのぐ",
  	"えほうまき",
  	"えほん",
  	"えまき",
  	"えもじ",
  	"えもの",
  	"えらい",
  	"えらぶ",
  	"えりあ",
  	"えんえん",
  	"えんかい",
  	"えんぎ",
  	"えんげき",
  	"えんしゅう",
  	"えんぜつ",
  	"えんそく",
  	"えんちょう",
  	"えんとつ",
  	"おいかける",
  	"おいこす",
  	"おいしい",
  	"おいつく",
  	"おうえん",
  	"おうさま",
  	"おうじ",
  	"おうせつ",
  	"おうたい",
  	"おうふく",
  	"おうべい",
  	"おうよう",
  	"おえる",
  	"おおい",
  	"おおう",
  	"おおどおり",
  	"おおや",
  	"おおよそ",
  	"おかえり",
  	"おかず",
  	"おがむ",
  	"おかわり",
  	"おぎなう",
  	"おきる",
  	"おくさま",
  	"おくじょう",
  	"おくりがな",
  	"おくる",
  	"おくれる",
  	"おこす",
  	"おこなう",
  	"おこる",
  	"おさえる",
  	"おさない",
  	"おさめる",
  	"おしいれ",
  	"おしえる",
  	"おじぎ",
  	"おじさん",
  	"おしゃれ",
  	"おそらく",
  	"おそわる",
  	"おたがい",
  	"おたく",
  	"おだやか",
  	"おちつく",
  	"おっと",
  	"おつり",
  	"おでかけ",
  	"おとしもの",
  	"おとなしい",
  	"おどり",
  	"おどろかす",
  	"おばさん",
  	"おまいり",
  	"おめでとう",
  	"おもいで",
  	"おもう",
  	"おもたい",
  	"おもちゃ",
  	"おやつ",
  	"おやゆび",
  	"およぼす",
  	"おらんだ",
  	"おろす",
  	"おんがく",
  	"おんけい",
  	"おんしゃ",
  	"おんせん",
  	"おんだん",
  	"おんちゅう",
  	"おんどけい",
  	"かあつ",
  	"かいが",
  	"がいき",
  	"がいけん",
  	"がいこう",
  	"かいさつ",
  	"かいしゃ",
  	"かいすいよく",
  	"かいぜん",
  	"かいぞうど",
  	"かいつう",
  	"かいてん",
  	"かいとう",
  	"かいふく",
  	"がいへき",
  	"かいほう",
  	"かいよう",
  	"がいらい",
  	"かいわ",
  	"かえる",
  	"かおり",
  	"かかえる",
  	"かがく",
  	"かがし",
  	"かがみ",
  	"かくご",
  	"かくとく",
  	"かざる",
  	"がぞう",
  	"かたい",
  	"かたち",
  	"がちょう",
  	"がっきゅう",
  	"がっこう",
  	"がっさん",
  	"がっしょう",
  	"かなざわし",
  	"かのう",
  	"がはく",
  	"かぶか",
  	"かほう",
  	"かほご",
  	"かまう",
  	"かまぼこ",
  	"かめれおん",
  	"かゆい",
  	"かようび",
  	"からい",
  	"かるい",
  	"かろう",
  	"かわく",
  	"かわら",
  	"がんか",
  	"かんけい",
  	"かんこう",
  	"かんしゃ",
  	"かんそう",
  	"かんたん",
  	"かんち",
  	"がんばる",
  	"きあい",
  	"きあつ",
  	"きいろ",
  	"ぎいん",
  	"きうい",
  	"きうん",
  	"きえる",
  	"きおう",
  	"きおく",
  	"きおち",
  	"きおん",
  	"きかい",
  	"きかく",
  	"きかんしゃ",
  	"ききて",
  	"きくばり",
  	"きくらげ",
  	"きけんせい",
  	"きこう",
  	"きこえる",
  	"きこく",
  	"きさい",
  	"きさく",
  	"きさま",
  	"きさらぎ",
  	"ぎじかがく",
  	"ぎしき",
  	"ぎじたいけん",
  	"ぎじにってい",
  	"ぎじゅつしゃ",
  	"きすう",
  	"きせい",
  	"きせき",
  	"きせつ",
  	"きそう",
  	"きぞく",
  	"きぞん",
  	"きたえる",
  	"きちょう",
  	"きつえん",
  	"ぎっちり",
  	"きつつき",
  	"きつね",
  	"きてい",
  	"きどう",
  	"きどく",
  	"きない",
  	"きなが",
  	"きなこ",
  	"きぬごし",
  	"きねん",
  	"きのう",
  	"きのした",
  	"きはく",
  	"きびしい",
  	"きひん",
  	"きふく",
  	"きぶん",
  	"きぼう",
  	"きほん",
  	"きまる",
  	"きみつ",
  	"きむずかしい",
  	"きめる",
  	"きもだめし",
  	"きもち",
  	"きもの",
  	"きゃく",
  	"きやく",
  	"ぎゅうにく",
  	"きよう",
  	"きょうりゅう",
  	"きらい",
  	"きらく",
  	"きりん",
  	"きれい",
  	"きれつ",
  	"きろく",
  	"ぎろん",
  	"きわめる",
  	"ぎんいろ",
  	"きんかくじ",
  	"きんじょ",
  	"きんようび",
  	"ぐあい",
  	"くいず",
  	"くうかん",
  	"くうき",
  	"くうぐん",
  	"くうこう",
  	"ぐうせい",
  	"くうそう",
  	"ぐうたら",
  	"くうふく",
  	"くうぼ",
  	"くかん",
  	"くきょう",
  	"くげん",
  	"ぐこう",
  	"くさい",
  	"くさき",
  	"くさばな",
  	"くさる",
  	"くしゃみ",
  	"くしょう",
  	"くすのき",
  	"くすりゆび",
  	"くせげ",
  	"くせん",
  	"ぐたいてき",
  	"くださる",
  	"くたびれる",
  	"くちこみ",
  	"くちさき",
  	"くつした",
  	"ぐっすり",
  	"くつろぐ",
  	"くとうてん",
  	"くどく",
  	"くなん",
  	"くねくね",
  	"くのう",
  	"くふう",
  	"くみあわせ",
  	"くみたてる",
  	"くめる",
  	"くやくしょ",
  	"くらす",
  	"くらべる",
  	"くるま",
  	"くれる",
  	"くろう",
  	"くわしい",
  	"ぐんかん",
  	"ぐんしょく",
  	"ぐんたい",
  	"ぐんて",
  	"けあな",
  	"けいかく",
  	"けいけん",
  	"けいこ",
  	"けいさつ",
  	"げいじゅつ",
  	"けいたい",
  	"げいのうじん",
  	"けいれき",
  	"けいろ",
  	"けおとす",
  	"けおりもの",
  	"げきか",
  	"げきげん",
  	"げきだん",
  	"げきちん",
  	"げきとつ",
  	"げきは",
  	"げきやく",
  	"げこう",
  	"げこくじょう",
  	"げざい",
  	"けさき",
  	"げざん",
  	"けしき",
  	"けしごむ",
  	"けしょう",
  	"げすと",
  	"けたば",
  	"けちゃっぷ",
  	"けちらす",
  	"けつあつ",
  	"けつい",
  	"けつえき",
  	"けっこん",
  	"けつじょ",
  	"けっせき",
  	"けってい",
  	"けつまつ",
  	"げつようび",
  	"げつれい",
  	"けつろん",
  	"げどく",
  	"けとばす",
  	"けとる",
  	"けなげ",
  	"けなす",
  	"けなみ",
  	"けぬき",
  	"げねつ",
  	"けねん",
  	"けはい",
  	"げひん",
  	"けぶかい",
  	"げぼく",
  	"けまり",
  	"けみかる",
  	"けむし",
  	"けむり",
  	"けもの",
  	"けらい",
  	"けろけろ",
  	"けわしい",
  	"けんい",
  	"けんえつ",
  	"けんお",
  	"けんか",
  	"げんき",
  	"けんげん",
  	"けんこう",
  	"けんさく",
  	"けんしゅう",
  	"けんすう",
  	"げんそう",
  	"けんちく",
  	"けんてい",
  	"けんとう",
  	"けんない",
  	"けんにん",
  	"げんぶつ",
  	"けんま",
  	"けんみん",
  	"けんめい",
  	"けんらん",
  	"けんり",
  	"こあくま",
  	"こいぬ",
  	"こいびと",
  	"ごうい",
  	"こうえん",
  	"こうおん",
  	"こうかん",
  	"ごうきゅう",
  	"ごうけい",
  	"こうこう",
  	"こうさい",
  	"こうじ",
  	"こうすい",
  	"ごうせい",
  	"こうそく",
  	"こうたい",
  	"こうちゃ",
  	"こうつう",
  	"こうてい",
  	"こうどう",
  	"こうない",
  	"こうはい",
  	"ごうほう",
  	"ごうまん",
  	"こうもく",
  	"こうりつ",
  	"こえる",
  	"こおり",
  	"ごかい",
  	"ごがつ",
  	"ごかん",
  	"こくご",
  	"こくさい",
  	"こくとう",
  	"こくない",
  	"こくはく",
  	"こぐま",
  	"こけい",
  	"こける",
  	"ここのか",
  	"こころ",
  	"こさめ",
  	"こしつ",
  	"こすう",
  	"こせい",
  	"こせき",
  	"こぜん",
  	"こそだて",
  	"こたい",
  	"こたえる",
  	"こたつ",
  	"こちょう",
  	"こっか",
  	"こつこつ",
  	"こつばん",
  	"こつぶ",
  	"こてい",
  	"こてん",
  	"ことがら",
  	"ことし",
  	"ことば",
  	"ことり",
  	"こなごな",
  	"こねこね",
  	"このまま",
  	"このみ",
  	"このよ",
  	"ごはん",
  	"こひつじ",
  	"こふう",
  	"こふん",
  	"こぼれる",
  	"ごまあぶら",
  	"こまかい",
  	"ごますり",
  	"こまつな",
  	"こまる",
  	"こむぎこ",
  	"こもじ",
  	"こもち",
  	"こもの",
  	"こもん",
  	"こやく",
  	"こやま",
  	"こゆう",
  	"こゆび",
  	"こよい",
  	"こよう",
  	"こりる",
  	"これくしょん",
  	"ころっけ",
  	"こわもて",
  	"こわれる",
  	"こんいん",
  	"こんかい",
  	"こんき",
  	"こんしゅう",
  	"こんすい",
  	"こんだて",
  	"こんとん",
  	"こんなん",
  	"こんびに",
  	"こんぽん",
  	"こんまけ",
  	"こんや",
  	"こんれい",
  	"こんわく",
  	"ざいえき",
  	"さいかい",
  	"さいきん",
  	"ざいげん",
  	"ざいこ",
  	"さいしょ",
  	"さいせい",
  	"ざいたく",
  	"ざいちゅう",
  	"さいてき",
  	"ざいりょう",
  	"さうな",
  	"さかいし",
  	"さがす",
  	"さかな",
  	"さかみち",
  	"さがる",
  	"さぎょう",
  	"さくし",
  	"さくひん",
  	"さくら",
  	"さこく",
  	"さこつ",
  	"さずかる",
  	"ざせき",
  	"さたん",
  	"さつえい",
  	"ざつおん",
  	"ざっか",
  	"ざつがく",
  	"さっきょく",
  	"ざっし",
  	"さつじん",
  	"ざっそう",
  	"さつたば",
  	"さつまいも",
  	"さてい",
  	"さといも",
  	"さとう",
  	"さとおや",
  	"さとし",
  	"さとる",
  	"さのう",
  	"さばく",
  	"さびしい",
  	"さべつ",
  	"さほう",
  	"さほど",
  	"さます",
  	"さみしい",
  	"さみだれ",
  	"さむけ",
  	"さめる",
  	"さやえんどう",
  	"さゆう",
  	"さよう",
  	"さよく",
  	"さらだ",
  	"ざるそば",
  	"さわやか",
  	"さわる",
  	"さんいん",
  	"さんか",
  	"さんきゃく",
  	"さんこう",
  	"さんさい",
  	"ざんしょ",
  	"さんすう",
  	"さんせい",
  	"さんそ",
  	"さんち",
  	"さんま",
  	"さんみ",
  	"さんらん",
  	"しあい",
  	"しあげ",
  	"しあさって",
  	"しあわせ",
  	"しいく",
  	"しいん",
  	"しうち",
  	"しえい",
  	"しおけ",
  	"しかい",
  	"しかく",
  	"じかん",
  	"しごと",
  	"しすう",
  	"じだい",
  	"したうけ",
  	"したぎ",
  	"したて",
  	"したみ",
  	"しちょう",
  	"しちりん",
  	"しっかり",
  	"しつじ",
  	"しつもん",
  	"してい",
  	"してき",
  	"してつ",
  	"じてん",
  	"じどう",
  	"しなぎれ",
  	"しなもの",
  	"しなん",
  	"しねま",
  	"しねん",
  	"しのぐ",
  	"しのぶ",
  	"しはい",
  	"しばかり",
  	"しはつ",
  	"しはらい",
  	"しはん",
  	"しひょう",
  	"しふく",
  	"じぶん",
  	"しへい",
  	"しほう",
  	"しほん",
  	"しまう",
  	"しまる",
  	"しみん",
  	"しむける",
  	"じむしょ",
  	"しめい",
  	"しめる",
  	"しもん",
  	"しゃいん",
  	"しゃうん",
  	"しゃおん",
  	"じゃがいも",
  	"しやくしょ",
  	"しゃくほう",
  	"しゃけん",
  	"しゃこ",
  	"しゃざい",
  	"しゃしん",
  	"しゃせん",
  	"しゃそう",
  	"しゃたい",
  	"しゃちょう",
  	"しゃっきん",
  	"じゃま",
  	"しゃりん",
  	"しゃれい",
  	"じゆう",
  	"じゅうしょ",
  	"しゅくはく",
  	"じゅしん",
  	"しゅっせき",
  	"しゅみ",
  	"しゅらば",
  	"じゅんばん",
  	"しょうかい",
  	"しょくたく",
  	"しょっけん",
  	"しょどう",
  	"しょもつ",
  	"しらせる",
  	"しらべる",
  	"しんか",
  	"しんこう",
  	"じんじゃ",
  	"しんせいじ",
  	"しんちく",
  	"しんりん",
  	"すあげ",
  	"すあし",
  	"すあな",
  	"ずあん",
  	"すいえい",
  	"すいか",
  	"すいとう",
  	"ずいぶん",
  	"すいようび",
  	"すうがく",
  	"すうじつ",
  	"すうせん",
  	"すおどり",
  	"すきま",
  	"すくう",
  	"すくない",
  	"すける",
  	"すごい",
  	"すこし",
  	"ずさん",
  	"すずしい",
  	"すすむ",
  	"すすめる",
  	"すっかり",
  	"ずっしり",
  	"ずっと",
  	"すてき",
  	"すてる",
  	"すねる",
  	"すのこ",
  	"すはだ",
  	"すばらしい",
  	"ずひょう",
  	"ずぶぬれ",
  	"すぶり",
  	"すふれ",
  	"すべて",
  	"すべる",
  	"ずほう",
  	"すぼん",
  	"すまい",
  	"すめし",
  	"すもう",
  	"すやき",
  	"すらすら",
  	"するめ",
  	"すれちがう",
  	"すろっと",
  	"すわる",
  	"すんぜん",
  	"すんぽう",
  	"せあぶら",
  	"せいかつ",
  	"せいげん",
  	"せいじ",
  	"せいよう",
  	"せおう",
  	"せかいかん",
  	"せきにん",
  	"せきむ",
  	"せきゆ",
  	"せきらんうん",
  	"せけん",
  	"せこう",
  	"せすじ",
  	"せたい",
  	"せたけ",
  	"せっかく",
  	"せっきゃく",
  	"ぜっく",
  	"せっけん",
  	"せっこつ",
  	"せっさたくま",
  	"せつぞく",
  	"せつだん",
  	"せつでん",
  	"せっぱん",
  	"せつび",
  	"せつぶん",
  	"せつめい",
  	"せつりつ",
  	"せなか",
  	"せのび",
  	"せはば",
  	"せびろ",
  	"せぼね",
  	"せまい",
  	"せまる",
  	"せめる",
  	"せもたれ",
  	"せりふ",
  	"ぜんあく",
  	"せんい",
  	"せんえい",
  	"せんか",
  	"せんきょ",
  	"せんく",
  	"せんげん",
  	"ぜんご",
  	"せんさい",
  	"せんしゅ",
  	"せんすい",
  	"せんせい",
  	"せんぞ",
  	"せんたく",
  	"せんちょう",
  	"せんてい",
  	"せんとう",
  	"せんぬき",
  	"せんねん",
  	"せんぱい",
  	"ぜんぶ",
  	"ぜんぽう",
  	"せんむ",
  	"せんめんじょ",
  	"せんもん",
  	"せんやく",
  	"せんゆう",
  	"せんよう",
  	"ぜんら",
  	"ぜんりゃく",
  	"せんれい",
  	"せんろ",
  	"そあく",
  	"そいとげる",
  	"そいね",
  	"そうがんきょう",
  	"そうき",
  	"そうご",
  	"そうしん",
  	"そうだん",
  	"そうなん",
  	"そうび",
  	"そうめん",
  	"そうり",
  	"そえもの",
  	"そえん",
  	"そがい",
  	"そげき",
  	"そこう",
  	"そこそこ",
  	"そざい",
  	"そしな",
  	"そせい",
  	"そせん",
  	"そそぐ",
  	"そだてる",
  	"そつう",
  	"そつえん",
  	"そっかん",
  	"そつぎょう",
  	"そっけつ",
  	"そっこう",
  	"そっせん",
  	"そっと",
  	"そとがわ",
  	"そとづら",
  	"そなえる",
  	"そなた",
  	"そふぼ",
  	"そぼく",
  	"そぼろ",
  	"そまつ",
  	"そまる",
  	"そむく",
  	"そむりえ",
  	"そめる",
  	"そもそも",
  	"そよかぜ",
  	"そらまめ",
  	"そろう",
  	"そんかい",
  	"そんけい",
  	"そんざい",
  	"そんしつ",
  	"そんぞく",
  	"そんちょう",
  	"ぞんび",
  	"ぞんぶん",
  	"そんみん",
  	"たあい",
  	"たいいん",
  	"たいうん",
  	"たいえき",
  	"たいおう",
  	"だいがく",
  	"たいき",
  	"たいぐう",
  	"たいけん",
  	"たいこ",
  	"たいざい",
  	"だいじょうぶ",
  	"だいすき",
  	"たいせつ",
  	"たいそう",
  	"だいたい",
  	"たいちょう",
  	"たいてい",
  	"だいどころ",
  	"たいない",
  	"たいねつ",
  	"たいのう",
  	"たいはん",
  	"だいひょう",
  	"たいふう",
  	"たいへん",
  	"たいほ",
  	"たいまつばな",
  	"たいみんぐ",
  	"たいむ",
  	"たいめん",
  	"たいやき",
  	"たいよう",
  	"たいら",
  	"たいりょく",
  	"たいる",
  	"たいわん",
  	"たうえ",
  	"たえる",
  	"たおす",
  	"たおる",
  	"たおれる",
  	"たかい",
  	"たかね",
  	"たきび",
  	"たくさん",
  	"たこく",
  	"たこやき",
  	"たさい",
  	"たしざん",
  	"だじゃれ",
  	"たすける",
  	"たずさわる",
  	"たそがれ",
  	"たたかう",
  	"たたく",
  	"ただしい",
  	"たたみ",
  	"たちばな",
  	"だっかい",
  	"だっきゃく",
  	"だっこ",
  	"だっしゅつ",
  	"だったい",
  	"たてる",
  	"たとえる",
  	"たなばた",
  	"たにん",
  	"たぬき",
  	"たのしみ",
  	"たはつ",
  	"たぶん",
  	"たべる",
  	"たぼう",
  	"たまご",
  	"たまる",
  	"だむる",
  	"ためいき",
  	"ためす",
  	"ためる",
  	"たもつ",
  	"たやすい",
  	"たよる",
  	"たらす",
  	"たりきほんがん",
  	"たりょう",
  	"たりる",
  	"たると",
  	"たれる",
  	"たれんと",
  	"たろっと",
  	"たわむれる",
  	"だんあつ",
  	"たんい",
  	"たんおん",
  	"たんか",
  	"たんき",
  	"たんけん",
  	"たんご",
  	"たんさん",
  	"たんじょうび",
  	"だんせい",
  	"たんそく",
  	"たんたい",
  	"だんち",
  	"たんてい",
  	"たんとう",
  	"だんな",
  	"たんにん",
  	"だんねつ",
  	"たんのう",
  	"たんぴん",
  	"だんぼう",
  	"たんまつ",
  	"たんめい",
  	"だんれつ",
  	"だんろ",
  	"だんわ",
  	"ちあい",
  	"ちあん",
  	"ちいき",
  	"ちいさい",
  	"ちえん",
  	"ちかい",
  	"ちから",
  	"ちきゅう",
  	"ちきん",
  	"ちけいず",
  	"ちけん",
  	"ちこく",
  	"ちさい",
  	"ちしき",
  	"ちしりょう",
  	"ちせい",
  	"ちそう",
  	"ちたい",
  	"ちたん",
  	"ちちおや",
  	"ちつじょ",
  	"ちてき",
  	"ちてん",
  	"ちぬき",
  	"ちぬり",
  	"ちのう",
  	"ちひょう",
  	"ちへいせん",
  	"ちほう",
  	"ちまた",
  	"ちみつ",
  	"ちみどろ",
  	"ちめいど",
  	"ちゃんこなべ",
  	"ちゅうい",
  	"ちゆりょく",
  	"ちょうし",
  	"ちょさくけん",
  	"ちらし",
  	"ちらみ",
  	"ちりがみ",
  	"ちりょう",
  	"ちるど",
  	"ちわわ",
  	"ちんたい",
  	"ちんもく",
  	"ついか",
  	"ついたち",
  	"つうか",
  	"つうじょう",
  	"つうはん",
  	"つうわ",
  	"つかう",
  	"つかれる",
  	"つくね",
  	"つくる",
  	"つけね",
  	"つける",
  	"つごう",
  	"つたえる",
  	"つづく",
  	"つつじ",
  	"つつむ",
  	"つとめる",
  	"つながる",
  	"つなみ",
  	"つねづね",
  	"つのる",
  	"つぶす",
  	"つまらない",
  	"つまる",
  	"つみき",
  	"つめたい",
  	"つもり",
  	"つもる",
  	"つよい",
  	"つるぼ",
  	"つるみく",
  	"つわもの",
  	"つわり",
  	"てあし",
  	"てあて",
  	"てあみ",
  	"ていおん",
  	"ていか",
  	"ていき",
  	"ていけい",
  	"ていこく",
  	"ていさつ",
  	"ていし",
  	"ていせい",
  	"ていたい",
  	"ていど",
  	"ていねい",
  	"ていひょう",
  	"ていへん",
  	"ていぼう",
  	"てうち",
  	"ておくれ",
  	"てきとう",
  	"てくび",
  	"でこぼこ",
  	"てさぎょう",
  	"てさげ",
  	"てすり",
  	"てそう",
  	"てちがい",
  	"てちょう",
  	"てつがく",
  	"てつづき",
  	"でっぱ",
  	"てつぼう",
  	"てつや",
  	"でぬかえ",
  	"てぬき",
  	"てぬぐい",
  	"てのひら",
  	"てはい",
  	"てぶくろ",
  	"てふだ",
  	"てほどき",
  	"てほん",
  	"てまえ",
  	"てまきずし",
  	"てみじか",
  	"てみやげ",
  	"てらす",
  	"てれび",
  	"てわけ",
  	"てわたし",
  	"でんあつ",
  	"てんいん",
  	"てんかい",
  	"てんき",
  	"てんぐ",
  	"てんけん",
  	"てんごく",
  	"てんさい",
  	"てんし",
  	"てんすう",
  	"でんち",
  	"てんてき",
  	"てんとう",
  	"てんない",
  	"てんぷら",
  	"てんぼうだい",
  	"てんめつ",
  	"てんらんかい",
  	"でんりょく",
  	"でんわ",
  	"どあい",
  	"といれ",
  	"どうかん",
  	"とうきゅう",
  	"どうぐ",
  	"とうし",
  	"とうむぎ",
  	"とおい",
  	"とおか",
  	"とおく",
  	"とおす",
  	"とおる",
  	"とかい",
  	"とかす",
  	"ときおり",
  	"ときどき",
  	"とくい",
  	"とくしゅう",
  	"とくてん",
  	"とくに",
  	"とくべつ",
  	"とけい",
  	"とける",
  	"とこや",
  	"とさか",
  	"としょかん",
  	"とそう",
  	"とたん",
  	"とちゅう",
  	"とっきゅう",
  	"とっくん",
  	"とつぜん",
  	"とつにゅう",
  	"とどける",
  	"ととのえる",
  	"とない",
  	"となえる",
  	"となり",
  	"とのさま",
  	"とばす",
  	"どぶがわ",
  	"とほう",
  	"とまる",
  	"とめる",
  	"ともだち",
  	"ともる",
  	"どようび",
  	"とらえる",
  	"とんかつ",
  	"どんぶり",
  	"ないかく",
  	"ないこう",
  	"ないしょ",
  	"ないす",
  	"ないせん",
  	"ないそう",
  	"なおす",
  	"ながい",
  	"なくす",
  	"なげる",
  	"なこうど",
  	"なさけ",
  	"なたでここ",
  	"なっとう",
  	"なつやすみ",
  	"ななおし",
  	"なにごと",
  	"なにもの",
  	"なにわ",
  	"なのか",
  	"なふだ",
  	"なまいき",
  	"なまえ",
  	"なまみ",
  	"なみだ",
  	"なめらか",
  	"なめる",
  	"なやむ",
  	"ならう",
  	"ならび",
  	"ならぶ",
  	"なれる",
  	"なわとび",
  	"なわばり",
  	"にあう",
  	"にいがた",
  	"にうけ",
  	"におい",
  	"にかい",
  	"にがて",
  	"にきび",
  	"にくしみ",
  	"にくまん",
  	"にげる",
  	"にさんかたんそ",
  	"にしき",
  	"にせもの",
  	"にちじょう",
  	"にちようび",
  	"にっか",
  	"にっき",
  	"にっけい",
  	"にっこう",
  	"にっさん",
  	"にっしょく",
  	"にっすう",
  	"にっせき",
  	"にってい",
  	"になう",
  	"にほん",
  	"にまめ",
  	"にもつ",
  	"にやり",
  	"にゅういん",
  	"にりんしゃ",
  	"にわとり",
  	"にんい",
  	"にんか",
  	"にんき",
  	"にんげん",
  	"にんしき",
  	"にんずう",
  	"にんそう",
  	"にんたい",
  	"にんち",
  	"にんてい",
  	"にんにく",
  	"にんぷ",
  	"にんまり",
  	"にんむ",
  	"にんめい",
  	"にんよう",
  	"ぬいくぎ",
  	"ぬかす",
  	"ぬぐいとる",
  	"ぬぐう",
  	"ぬくもり",
  	"ぬすむ",
  	"ぬまえび",
  	"ぬめり",
  	"ぬらす",
  	"ぬんちゃく",
  	"ねあげ",
  	"ねいき",
  	"ねいる",
  	"ねいろ",
  	"ねぐせ",
  	"ねくたい",
  	"ねくら",
  	"ねこぜ",
  	"ねこむ",
  	"ねさげ",
  	"ねすごす",
  	"ねそべる",
  	"ねだん",
  	"ねつい",
  	"ねっしん",
  	"ねつぞう",
  	"ねったいぎょ",
  	"ねぶそく",
  	"ねふだ",
  	"ねぼう",
  	"ねほりはほり",
  	"ねまき",
  	"ねまわし",
  	"ねみみ",
  	"ねむい",
  	"ねむたい",
  	"ねもと",
  	"ねらう",
  	"ねわざ",
  	"ねんいり",
  	"ねんおし",
  	"ねんかん",
  	"ねんきん",
  	"ねんぐ",
  	"ねんざ",
  	"ねんし",
  	"ねんちゃく",
  	"ねんど",
  	"ねんぴ",
  	"ねんぶつ",
  	"ねんまつ",
  	"ねんりょう",
  	"ねんれい",
  	"のいず",
  	"のおづま",
  	"のがす",
  	"のきなみ",
  	"のこぎり",
  	"のこす",
  	"のこる",
  	"のせる",
  	"のぞく",
  	"のぞむ",
  	"のたまう",
  	"のちほど",
  	"のっく",
  	"のばす",
  	"のはら",
  	"のべる",
  	"のぼる",
  	"のみもの",
  	"のやま",
  	"のらいぬ",
  	"のらねこ",
  	"のりもの",
  	"のりゆき",
  	"のれん",
  	"のんき",
  	"ばあい",
  	"はあく",
  	"ばあさん",
  	"ばいか",
  	"ばいく",
  	"はいけん",
  	"はいご",
  	"はいしん",
  	"はいすい",
  	"はいせん",
  	"はいそう",
  	"はいち",
  	"ばいばい",
  	"はいれつ",
  	"はえる",
  	"はおる",
  	"はかい",
  	"ばかり",
  	"はかる",
  	"はくしゅ",
  	"はけん",
  	"はこぶ",
  	"はさみ",
  	"はさん",
  	"はしご",
  	"ばしょ",
  	"はしる",
  	"はせる",
  	"ぱそこん",
  	"はそん",
  	"はたん",
  	"はちみつ",
  	"はつおん",
  	"はっかく",
  	"はづき",
  	"はっきり",
  	"はっくつ",
  	"はっけん",
  	"はっこう",
  	"はっさん",
  	"はっしん",
  	"はったつ",
  	"はっちゅう",
  	"はってん",
  	"はっぴょう",
  	"はっぽう",
  	"はなす",
  	"はなび",
  	"はにかむ",
  	"はぶらし",
  	"はみがき",
  	"はむかう",
  	"はめつ",
  	"はやい",
  	"はやし",
  	"はらう",
  	"はろうぃん",
  	"はわい",
  	"はんい",
  	"はんえい",
  	"はんおん",
  	"はんかく",
  	"はんきょう",
  	"ばんぐみ",
  	"はんこ",
  	"はんしゃ",
  	"はんすう",
  	"はんだん",
  	"ぱんち",
  	"ぱんつ",
  	"はんてい",
  	"はんとし",
  	"はんのう",
  	"はんぱ",
  	"はんぶん",
  	"はんぺん",
  	"はんぼうき",
  	"はんめい",
  	"はんらん",
  	"はんろん",
  	"ひいき",
  	"ひうん",
  	"ひえる",
  	"ひかく",
  	"ひかり",
  	"ひかる",
  	"ひかん",
  	"ひくい",
  	"ひけつ",
  	"ひこうき",
  	"ひこく",
  	"ひさい",
  	"ひさしぶり",
  	"ひさん",
  	"びじゅつかん",
  	"ひしょ",
  	"ひそか",
  	"ひそむ",
  	"ひたむき",
  	"ひだり",
  	"ひたる",
  	"ひつぎ",
  	"ひっこし",
  	"ひっし",
  	"ひつじゅひん",
  	"ひっす",
  	"ひつぜん",
  	"ぴったり",
  	"ぴっちり",
  	"ひつよう",
  	"ひてい",
  	"ひとごみ",
  	"ひなまつり",
  	"ひなん",
  	"ひねる",
  	"ひはん",
  	"ひびく",
  	"ひひょう",
  	"ひほう",
  	"ひまわり",
  	"ひまん",
  	"ひみつ",
  	"ひめい",
  	"ひめじし",
  	"ひやけ",
  	"ひやす",
  	"ひよう",
  	"びょうき",
  	"ひらがな",
  	"ひらく",
  	"ひりつ",
  	"ひりょう",
  	"ひるま",
  	"ひるやすみ",
  	"ひれい",
  	"ひろい",
  	"ひろう",
  	"ひろき",
  	"ひろゆき",
  	"ひんかく",
  	"ひんけつ",
  	"ひんこん",
  	"ひんしゅ",
  	"ひんそう",
  	"ぴんち",
  	"ひんぱん",
  	"びんぼう",
  	"ふあん",
  	"ふいうち",
  	"ふうけい",
  	"ふうせん",
  	"ぷうたろう",
  	"ふうとう",
  	"ふうふ",
  	"ふえる",
  	"ふおん",
  	"ふかい",
  	"ふきん",
  	"ふくざつ",
  	"ふくぶくろ",
  	"ふこう",
  	"ふさい",
  	"ふしぎ",
  	"ふじみ",
  	"ふすま",
  	"ふせい",
  	"ふせぐ",
  	"ふそく",
  	"ぶたにく",
  	"ふたん",
  	"ふちょう",
  	"ふつう",
  	"ふつか",
  	"ふっかつ",
  	"ふっき",
  	"ふっこく",
  	"ぶどう",
  	"ふとる",
  	"ふとん",
  	"ふのう",
  	"ふはい",
  	"ふひょう",
  	"ふへん",
  	"ふまん",
  	"ふみん",
  	"ふめつ",
  	"ふめん",
  	"ふよう",
  	"ふりこ",
  	"ふりる",
  	"ふるい",
  	"ふんいき",
  	"ぶんがく",
  	"ぶんぐ",
  	"ふんしつ",
  	"ぶんせき",
  	"ふんそう",
  	"ぶんぽう",
  	"へいあん",
  	"へいおん",
  	"へいがい",
  	"へいき",
  	"へいげん",
  	"へいこう",
  	"へいさ",
  	"へいしゃ",
  	"へいせつ",
  	"へいそ",
  	"へいたく",
  	"へいてん",
  	"へいねつ",
  	"へいわ",
  	"へきが",
  	"へこむ",
  	"べにいろ",
  	"べにしょうが",
  	"へらす",
  	"へんかん",
  	"べんきょう",
  	"べんごし",
  	"へんさい",
  	"へんたい",
  	"べんり",
  	"ほあん",
  	"ほいく",
  	"ぼうぎょ",
  	"ほうこく",
  	"ほうそう",
  	"ほうほう",
  	"ほうもん",
  	"ほうりつ",
  	"ほえる",
  	"ほおん",
  	"ほかん",
  	"ほきょう",
  	"ぼきん",
  	"ほくろ",
  	"ほけつ",
  	"ほけん",
  	"ほこう",
  	"ほこる",
  	"ほしい",
  	"ほしつ",
  	"ほしゅ",
  	"ほしょう",
  	"ほせい",
  	"ほそい",
  	"ほそく",
  	"ほたて",
  	"ほたる",
  	"ぽちぶくろ",
  	"ほっきょく",
  	"ほっさ",
  	"ほったん",
  	"ほとんど",
  	"ほめる",
  	"ほんい",
  	"ほんき",
  	"ほんけ",
  	"ほんしつ",
  	"ほんやく",
  	"まいにち",
  	"まかい",
  	"まかせる",
  	"まがる",
  	"まける",
  	"まこと",
  	"まさつ",
  	"まじめ",
  	"ますく",
  	"まぜる",
  	"まつり",
  	"まとめ",
  	"まなぶ",
  	"まぬけ",
  	"まねく",
  	"まほう",
  	"まもる",
  	"まゆげ",
  	"まよう",
  	"まろやか",
  	"まわす",
  	"まわり",
  	"まわる",
  	"まんが",
  	"まんきつ",
  	"まんぞく",
  	"まんなか",
  	"みいら",
  	"みうち",
  	"みえる",
  	"みがく",
  	"みかた",
  	"みかん",
  	"みけん",
  	"みこん",
  	"みじかい",
  	"みすい",
  	"みすえる",
  	"みせる",
  	"みっか",
  	"みつかる",
  	"みつける",
  	"みてい",
  	"みとめる",
  	"みなと",
  	"みなみかさい",
  	"みねらる",
  	"みのう",
  	"みのがす",
  	"みほん",
  	"みもと",
  	"みやげ",
  	"みらい",
  	"みりょく",
  	"みわく",
  	"みんか",
  	"みんぞく",
  	"むいか",
  	"むえき",
  	"むえん",
  	"むかい",
  	"むかう",
  	"むかえ",
  	"むかし",
  	"むぎちゃ",
  	"むける",
  	"むげん",
  	"むさぼる",
  	"むしあつい",
  	"むしば",
  	"むじゅん",
  	"むしろ",
  	"むすう",
  	"むすこ",
  	"むすぶ",
  	"むすめ",
  	"むせる",
  	"むせん",
  	"むちゅう",
  	"むなしい",
  	"むのう",
  	"むやみ",
  	"むよう",
  	"むらさき",
  	"むりょう",
  	"むろん",
  	"めいあん",
  	"めいうん",
  	"めいえん",
  	"めいかく",
  	"めいきょく",
  	"めいさい",
  	"めいし",
  	"めいそう",
  	"めいぶつ",
  	"めいれい",
  	"めいわく",
  	"めぐまれる",
  	"めざす",
  	"めした",
  	"めずらしい",
  	"めだつ",
  	"めまい",
  	"めやす",
  	"めんきょ",
  	"めんせき",
  	"めんどう",
  	"もうしあげる",
  	"もうどうけん",
  	"もえる",
  	"もくし",
  	"もくてき",
  	"もくようび",
  	"もちろん",
  	"もどる",
  	"もらう",
  	"もんく",
  	"もんだい",
  	"やおや",
  	"やける",
  	"やさい",
  	"やさしい",
  	"やすい",
  	"やすたろう",
  	"やすみ",
  	"やせる",
  	"やそう",
  	"やたい",
  	"やちん",
  	"やっと",
  	"やっぱり",
  	"やぶる",
  	"やめる",
  	"ややこしい",
  	"やよい",
  	"やわらかい",
  	"ゆうき",
  	"ゆうびんきょく",
  	"ゆうべ",
  	"ゆうめい",
  	"ゆけつ",
  	"ゆしゅつ",
  	"ゆせん",
  	"ゆそう",
  	"ゆたか",
  	"ゆちゃく",
  	"ゆでる",
  	"ゆにゅう",
  	"ゆびわ",
  	"ゆらい",
  	"ゆれる",
  	"ようい",
  	"ようか",
  	"ようきゅう",
  	"ようじ",
  	"ようす",
  	"ようちえん",
  	"よかぜ",
  	"よかん",
  	"よきん",
  	"よくせい",
  	"よくぼう",
  	"よけい",
  	"よごれる",
  	"よさん",
  	"よしゅう",
  	"よそう",
  	"よそく",
  	"よっか",
  	"よてい",
  	"よどがわく",
  	"よねつ",
  	"よやく",
  	"よゆう",
  	"よろこぶ",
  	"よろしい",
  	"らいう",
  	"らくがき",
  	"らくご",
  	"らくさつ",
  	"らくだ",
  	"らしんばん",
  	"らせん",
  	"らぞく",
  	"らたい",
  	"らっか",
  	"られつ",
  	"りえき",
  	"りかい",
  	"りきさく",
  	"りきせつ",
  	"りくぐん",
  	"りくつ",
  	"りけん",
  	"りこう",
  	"りせい",
  	"りそう",
  	"りそく",
  	"りてん",
  	"りねん",
  	"りゆう",
  	"りゅうがく",
  	"りよう",
  	"りょうり",
  	"りょかん",
  	"りょくちゃ",
  	"りょこう",
  	"りりく",
  	"りれき",
  	"りろん",
  	"りんご",
  	"るいけい",
  	"るいさい",
  	"るいじ",
  	"るいせき",
  	"るすばん",
  	"るりがわら",
  	"れいかん",
  	"れいぎ",
  	"れいせい",
  	"れいぞうこ",
  	"れいとう",
  	"れいぼう",
  	"れきし",
  	"れきだい",
  	"れんあい",
  	"れんけい",
  	"れんこん",
  	"れんさい",
  	"れんしゅう",
  	"れんぞく",
  	"れんらく",
  	"ろうか",
  	"ろうご",
  	"ろうじん",
  	"ろうそく",
  	"ろくが",
  	"ろこつ",
  	"ろじうら",
  	"ろしゅつ",
  	"ろせん",
  	"ろてん",
  	"ろめん",
  	"ろれつ",
  	"ろんぎ",
  	"ろんぱ",
  	"ろんぶん",
  	"ろんり",
  	"わかす",
  	"わかめ",
  	"わかやま",
  	"わかれる",
  	"わしつ",
  	"わじまし",
  	"わすれもの",
  	"わらう",
  	"われる"
  ];

  var japanese$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': japanese
  });

  var english = [
  	"abandon",
  	"ability",
  	"able",
  	"about",
  	"above",
  	"absent",
  	"absorb",
  	"abstract",
  	"absurd",
  	"abuse",
  	"access",
  	"accident",
  	"account",
  	"accuse",
  	"achieve",
  	"acid",
  	"acoustic",
  	"acquire",
  	"across",
  	"act",
  	"action",
  	"actor",
  	"actress",
  	"actual",
  	"adapt",
  	"add",
  	"addict",
  	"address",
  	"adjust",
  	"admit",
  	"adult",
  	"advance",
  	"advice",
  	"aerobic",
  	"affair",
  	"afford",
  	"afraid",
  	"again",
  	"age",
  	"agent",
  	"agree",
  	"ahead",
  	"aim",
  	"air",
  	"airport",
  	"aisle",
  	"alarm",
  	"album",
  	"alcohol",
  	"alert",
  	"alien",
  	"all",
  	"alley",
  	"allow",
  	"almost",
  	"alone",
  	"alpha",
  	"already",
  	"also",
  	"alter",
  	"always",
  	"amateur",
  	"amazing",
  	"among",
  	"amount",
  	"amused",
  	"analyst",
  	"anchor",
  	"ancient",
  	"anger",
  	"angle",
  	"angry",
  	"animal",
  	"ankle",
  	"announce",
  	"annual",
  	"another",
  	"answer",
  	"antenna",
  	"antique",
  	"anxiety",
  	"any",
  	"apart",
  	"apology",
  	"appear",
  	"apple",
  	"approve",
  	"april",
  	"arch",
  	"arctic",
  	"area",
  	"arena",
  	"argue",
  	"arm",
  	"armed",
  	"armor",
  	"army",
  	"around",
  	"arrange",
  	"arrest",
  	"arrive",
  	"arrow",
  	"art",
  	"artefact",
  	"artist",
  	"artwork",
  	"ask",
  	"aspect",
  	"assault",
  	"asset",
  	"assist",
  	"assume",
  	"asthma",
  	"athlete",
  	"atom",
  	"attack",
  	"attend",
  	"attitude",
  	"attract",
  	"auction",
  	"audit",
  	"august",
  	"aunt",
  	"author",
  	"auto",
  	"autumn",
  	"average",
  	"avocado",
  	"avoid",
  	"awake",
  	"aware",
  	"away",
  	"awesome",
  	"awful",
  	"awkward",
  	"axis",
  	"baby",
  	"bachelor",
  	"bacon",
  	"badge",
  	"bag",
  	"balance",
  	"balcony",
  	"ball",
  	"bamboo",
  	"banana",
  	"banner",
  	"bar",
  	"barely",
  	"bargain",
  	"barrel",
  	"base",
  	"basic",
  	"basket",
  	"battle",
  	"beach",
  	"bean",
  	"beauty",
  	"because",
  	"become",
  	"beef",
  	"before",
  	"begin",
  	"behave",
  	"behind",
  	"believe",
  	"below",
  	"belt",
  	"bench",
  	"benefit",
  	"best",
  	"betray",
  	"better",
  	"between",
  	"beyond",
  	"bicycle",
  	"bid",
  	"bike",
  	"bind",
  	"biology",
  	"bird",
  	"birth",
  	"bitter",
  	"black",
  	"blade",
  	"blame",
  	"blanket",
  	"blast",
  	"bleak",
  	"bless",
  	"blind",
  	"blood",
  	"blossom",
  	"blouse",
  	"blue",
  	"blur",
  	"blush",
  	"board",
  	"boat",
  	"body",
  	"boil",
  	"bomb",
  	"bone",
  	"bonus",
  	"book",
  	"boost",
  	"border",
  	"boring",
  	"borrow",
  	"boss",
  	"bottom",
  	"bounce",
  	"box",
  	"boy",
  	"bracket",
  	"brain",
  	"brand",
  	"brass",
  	"brave",
  	"bread",
  	"breeze",
  	"brick",
  	"bridge",
  	"brief",
  	"bright",
  	"bring",
  	"brisk",
  	"broccoli",
  	"broken",
  	"bronze",
  	"broom",
  	"brother",
  	"brown",
  	"brush",
  	"bubble",
  	"buddy",
  	"budget",
  	"buffalo",
  	"build",
  	"bulb",
  	"bulk",
  	"bullet",
  	"bundle",
  	"bunker",
  	"burden",
  	"burger",
  	"burst",
  	"bus",
  	"business",
  	"busy",
  	"butter",
  	"buyer",
  	"buzz",
  	"cabbage",
  	"cabin",
  	"cable",
  	"cactus",
  	"cage",
  	"cake",
  	"call",
  	"calm",
  	"camera",
  	"camp",
  	"can",
  	"canal",
  	"cancel",
  	"candy",
  	"cannon",
  	"canoe",
  	"canvas",
  	"canyon",
  	"capable",
  	"capital",
  	"captain",
  	"car",
  	"carbon",
  	"card",
  	"cargo",
  	"carpet",
  	"carry",
  	"cart",
  	"case",
  	"cash",
  	"casino",
  	"castle",
  	"casual",
  	"cat",
  	"catalog",
  	"catch",
  	"category",
  	"cattle",
  	"caught",
  	"cause",
  	"caution",
  	"cave",
  	"ceiling",
  	"celery",
  	"cement",
  	"census",
  	"century",
  	"cereal",
  	"certain",
  	"chair",
  	"chalk",
  	"champion",
  	"change",
  	"chaos",
  	"chapter",
  	"charge",
  	"chase",
  	"chat",
  	"cheap",
  	"check",
  	"cheese",
  	"chef",
  	"cherry",
  	"chest",
  	"chicken",
  	"chief",
  	"child",
  	"chimney",
  	"choice",
  	"choose",
  	"chronic",
  	"chuckle",
  	"chunk",
  	"churn",
  	"cigar",
  	"cinnamon",
  	"circle",
  	"citizen",
  	"city",
  	"civil",
  	"claim",
  	"clap",
  	"clarify",
  	"claw",
  	"clay",
  	"clean",
  	"clerk",
  	"clever",
  	"click",
  	"client",
  	"cliff",
  	"climb",
  	"clinic",
  	"clip",
  	"clock",
  	"clog",
  	"close",
  	"cloth",
  	"cloud",
  	"clown",
  	"club",
  	"clump",
  	"cluster",
  	"clutch",
  	"coach",
  	"coast",
  	"coconut",
  	"code",
  	"coffee",
  	"coil",
  	"coin",
  	"collect",
  	"color",
  	"column",
  	"combine",
  	"come",
  	"comfort",
  	"comic",
  	"common",
  	"company",
  	"concert",
  	"conduct",
  	"confirm",
  	"congress",
  	"connect",
  	"consider",
  	"control",
  	"convince",
  	"cook",
  	"cool",
  	"copper",
  	"copy",
  	"coral",
  	"core",
  	"corn",
  	"correct",
  	"cost",
  	"cotton",
  	"couch",
  	"country",
  	"couple",
  	"course",
  	"cousin",
  	"cover",
  	"coyote",
  	"crack",
  	"cradle",
  	"craft",
  	"cram",
  	"crane",
  	"crash",
  	"crater",
  	"crawl",
  	"crazy",
  	"cream",
  	"credit",
  	"creek",
  	"crew",
  	"cricket",
  	"crime",
  	"crisp",
  	"critic",
  	"crop",
  	"cross",
  	"crouch",
  	"crowd",
  	"crucial",
  	"cruel",
  	"cruise",
  	"crumble",
  	"crunch",
  	"crush",
  	"cry",
  	"crystal",
  	"cube",
  	"culture",
  	"cup",
  	"cupboard",
  	"curious",
  	"current",
  	"curtain",
  	"curve",
  	"cushion",
  	"custom",
  	"cute",
  	"cycle",
  	"dad",
  	"damage",
  	"damp",
  	"dance",
  	"danger",
  	"daring",
  	"dash",
  	"daughter",
  	"dawn",
  	"day",
  	"deal",
  	"debate",
  	"debris",
  	"decade",
  	"december",
  	"decide",
  	"decline",
  	"decorate",
  	"decrease",
  	"deer",
  	"defense",
  	"define",
  	"defy",
  	"degree",
  	"delay",
  	"deliver",
  	"demand",
  	"demise",
  	"denial",
  	"dentist",
  	"deny",
  	"depart",
  	"depend",
  	"deposit",
  	"depth",
  	"deputy",
  	"derive",
  	"describe",
  	"desert",
  	"design",
  	"desk",
  	"despair",
  	"destroy",
  	"detail",
  	"detect",
  	"develop",
  	"device",
  	"devote",
  	"diagram",
  	"dial",
  	"diamond",
  	"diary",
  	"dice",
  	"diesel",
  	"diet",
  	"differ",
  	"digital",
  	"dignity",
  	"dilemma",
  	"dinner",
  	"dinosaur",
  	"direct",
  	"dirt",
  	"disagree",
  	"discover",
  	"disease",
  	"dish",
  	"dismiss",
  	"disorder",
  	"display",
  	"distance",
  	"divert",
  	"divide",
  	"divorce",
  	"dizzy",
  	"doctor",
  	"document",
  	"dog",
  	"doll",
  	"dolphin",
  	"domain",
  	"donate",
  	"donkey",
  	"donor",
  	"door",
  	"dose",
  	"double",
  	"dove",
  	"draft",
  	"dragon",
  	"drama",
  	"drastic",
  	"draw",
  	"dream",
  	"dress",
  	"drift",
  	"drill",
  	"drink",
  	"drip",
  	"drive",
  	"drop",
  	"drum",
  	"dry",
  	"duck",
  	"dumb",
  	"dune",
  	"during",
  	"dust",
  	"dutch",
  	"duty",
  	"dwarf",
  	"dynamic",
  	"eager",
  	"eagle",
  	"early",
  	"earn",
  	"earth",
  	"easily",
  	"east",
  	"easy",
  	"echo",
  	"ecology",
  	"economy",
  	"edge",
  	"edit",
  	"educate",
  	"effort",
  	"egg",
  	"eight",
  	"either",
  	"elbow",
  	"elder",
  	"electric",
  	"elegant",
  	"element",
  	"elephant",
  	"elevator",
  	"elite",
  	"else",
  	"embark",
  	"embody",
  	"embrace",
  	"emerge",
  	"emotion",
  	"employ",
  	"empower",
  	"empty",
  	"enable",
  	"enact",
  	"end",
  	"endless",
  	"endorse",
  	"enemy",
  	"energy",
  	"enforce",
  	"engage",
  	"engine",
  	"enhance",
  	"enjoy",
  	"enlist",
  	"enough",
  	"enrich",
  	"enroll",
  	"ensure",
  	"enter",
  	"entire",
  	"entry",
  	"envelope",
  	"episode",
  	"equal",
  	"equip",
  	"era",
  	"erase",
  	"erode",
  	"erosion",
  	"error",
  	"erupt",
  	"escape",
  	"essay",
  	"essence",
  	"estate",
  	"eternal",
  	"ethics",
  	"evidence",
  	"evil",
  	"evoke",
  	"evolve",
  	"exact",
  	"example",
  	"excess",
  	"exchange",
  	"excite",
  	"exclude",
  	"excuse",
  	"execute",
  	"exercise",
  	"exhaust",
  	"exhibit",
  	"exile",
  	"exist",
  	"exit",
  	"exotic",
  	"expand",
  	"expect",
  	"expire",
  	"explain",
  	"expose",
  	"express",
  	"extend",
  	"extra",
  	"eye",
  	"eyebrow",
  	"fabric",
  	"face",
  	"faculty",
  	"fade",
  	"faint",
  	"faith",
  	"fall",
  	"false",
  	"fame",
  	"family",
  	"famous",
  	"fan",
  	"fancy",
  	"fantasy",
  	"farm",
  	"fashion",
  	"fat",
  	"fatal",
  	"father",
  	"fatigue",
  	"fault",
  	"favorite",
  	"feature",
  	"february",
  	"federal",
  	"fee",
  	"feed",
  	"feel",
  	"female",
  	"fence",
  	"festival",
  	"fetch",
  	"fever",
  	"few",
  	"fiber",
  	"fiction",
  	"field",
  	"figure",
  	"file",
  	"film",
  	"filter",
  	"final",
  	"find",
  	"fine",
  	"finger",
  	"finish",
  	"fire",
  	"firm",
  	"first",
  	"fiscal",
  	"fish",
  	"fit",
  	"fitness",
  	"fix",
  	"flag",
  	"flame",
  	"flash",
  	"flat",
  	"flavor",
  	"flee",
  	"flight",
  	"flip",
  	"float",
  	"flock",
  	"floor",
  	"flower",
  	"fluid",
  	"flush",
  	"fly",
  	"foam",
  	"focus",
  	"fog",
  	"foil",
  	"fold",
  	"follow",
  	"food",
  	"foot",
  	"force",
  	"forest",
  	"forget",
  	"fork",
  	"fortune",
  	"forum",
  	"forward",
  	"fossil",
  	"foster",
  	"found",
  	"fox",
  	"fragile",
  	"frame",
  	"frequent",
  	"fresh",
  	"friend",
  	"fringe",
  	"frog",
  	"front",
  	"frost",
  	"frown",
  	"frozen",
  	"fruit",
  	"fuel",
  	"fun",
  	"funny",
  	"furnace",
  	"fury",
  	"future",
  	"gadget",
  	"gain",
  	"galaxy",
  	"gallery",
  	"game",
  	"gap",
  	"garage",
  	"garbage",
  	"garden",
  	"garlic",
  	"garment",
  	"gas",
  	"gasp",
  	"gate",
  	"gather",
  	"gauge",
  	"gaze",
  	"general",
  	"genius",
  	"genre",
  	"gentle",
  	"genuine",
  	"gesture",
  	"ghost",
  	"giant",
  	"gift",
  	"giggle",
  	"ginger",
  	"giraffe",
  	"girl",
  	"give",
  	"glad",
  	"glance",
  	"glare",
  	"glass",
  	"glide",
  	"glimpse",
  	"globe",
  	"gloom",
  	"glory",
  	"glove",
  	"glow",
  	"glue",
  	"goat",
  	"goddess",
  	"gold",
  	"good",
  	"goose",
  	"gorilla",
  	"gospel",
  	"gossip",
  	"govern",
  	"gown",
  	"grab",
  	"grace",
  	"grain",
  	"grant",
  	"grape",
  	"grass",
  	"gravity",
  	"great",
  	"green",
  	"grid",
  	"grief",
  	"grit",
  	"grocery",
  	"group",
  	"grow",
  	"grunt",
  	"guard",
  	"guess",
  	"guide",
  	"guilt",
  	"guitar",
  	"gun",
  	"gym",
  	"habit",
  	"hair",
  	"half",
  	"hammer",
  	"hamster",
  	"hand",
  	"happy",
  	"harbor",
  	"hard",
  	"harsh",
  	"harvest",
  	"hat",
  	"have",
  	"hawk",
  	"hazard",
  	"head",
  	"health",
  	"heart",
  	"heavy",
  	"hedgehog",
  	"height",
  	"hello",
  	"helmet",
  	"help",
  	"hen",
  	"hero",
  	"hidden",
  	"high",
  	"hill",
  	"hint",
  	"hip",
  	"hire",
  	"history",
  	"hobby",
  	"hockey",
  	"hold",
  	"hole",
  	"holiday",
  	"hollow",
  	"home",
  	"honey",
  	"hood",
  	"hope",
  	"horn",
  	"horror",
  	"horse",
  	"hospital",
  	"host",
  	"hotel",
  	"hour",
  	"hover",
  	"hub",
  	"huge",
  	"human",
  	"humble",
  	"humor",
  	"hundred",
  	"hungry",
  	"hunt",
  	"hurdle",
  	"hurry",
  	"hurt",
  	"husband",
  	"hybrid",
  	"ice",
  	"icon",
  	"idea",
  	"identify",
  	"idle",
  	"ignore",
  	"ill",
  	"illegal",
  	"illness",
  	"image",
  	"imitate",
  	"immense",
  	"immune",
  	"impact",
  	"impose",
  	"improve",
  	"impulse",
  	"inch",
  	"include",
  	"income",
  	"increase",
  	"index",
  	"indicate",
  	"indoor",
  	"industry",
  	"infant",
  	"inflict",
  	"inform",
  	"inhale",
  	"inherit",
  	"initial",
  	"inject",
  	"injury",
  	"inmate",
  	"inner",
  	"innocent",
  	"input",
  	"inquiry",
  	"insane",
  	"insect",
  	"inside",
  	"inspire",
  	"install",
  	"intact",
  	"interest",
  	"into",
  	"invest",
  	"invite",
  	"involve",
  	"iron",
  	"island",
  	"isolate",
  	"issue",
  	"item",
  	"ivory",
  	"jacket",
  	"jaguar",
  	"jar",
  	"jazz",
  	"jealous",
  	"jeans",
  	"jelly",
  	"jewel",
  	"job",
  	"join",
  	"joke",
  	"journey",
  	"joy",
  	"judge",
  	"juice",
  	"jump",
  	"jungle",
  	"junior",
  	"junk",
  	"just",
  	"kangaroo",
  	"keen",
  	"keep",
  	"ketchup",
  	"key",
  	"kick",
  	"kid",
  	"kidney",
  	"kind",
  	"kingdom",
  	"kiss",
  	"kit",
  	"kitchen",
  	"kite",
  	"kitten",
  	"kiwi",
  	"knee",
  	"knife",
  	"knock",
  	"know",
  	"lab",
  	"label",
  	"labor",
  	"ladder",
  	"lady",
  	"lake",
  	"lamp",
  	"language",
  	"laptop",
  	"large",
  	"later",
  	"latin",
  	"laugh",
  	"laundry",
  	"lava",
  	"law",
  	"lawn",
  	"lawsuit",
  	"layer",
  	"lazy",
  	"leader",
  	"leaf",
  	"learn",
  	"leave",
  	"lecture",
  	"left",
  	"leg",
  	"legal",
  	"legend",
  	"leisure",
  	"lemon",
  	"lend",
  	"length",
  	"lens",
  	"leopard",
  	"lesson",
  	"letter",
  	"level",
  	"liar",
  	"liberty",
  	"library",
  	"license",
  	"life",
  	"lift",
  	"light",
  	"like",
  	"limb",
  	"limit",
  	"link",
  	"lion",
  	"liquid",
  	"list",
  	"little",
  	"live",
  	"lizard",
  	"load",
  	"loan",
  	"lobster",
  	"local",
  	"lock",
  	"logic",
  	"lonely",
  	"long",
  	"loop",
  	"lottery",
  	"loud",
  	"lounge",
  	"love",
  	"loyal",
  	"lucky",
  	"luggage",
  	"lumber",
  	"lunar",
  	"lunch",
  	"luxury",
  	"lyrics",
  	"machine",
  	"mad",
  	"magic",
  	"magnet",
  	"maid",
  	"mail",
  	"main",
  	"major",
  	"make",
  	"mammal",
  	"man",
  	"manage",
  	"mandate",
  	"mango",
  	"mansion",
  	"manual",
  	"maple",
  	"marble",
  	"march",
  	"margin",
  	"marine",
  	"market",
  	"marriage",
  	"mask",
  	"mass",
  	"master",
  	"match",
  	"material",
  	"math",
  	"matrix",
  	"matter",
  	"maximum",
  	"maze",
  	"meadow",
  	"mean",
  	"measure",
  	"meat",
  	"mechanic",
  	"medal",
  	"media",
  	"melody",
  	"melt",
  	"member",
  	"memory",
  	"mention",
  	"menu",
  	"mercy",
  	"merge",
  	"merit",
  	"merry",
  	"mesh",
  	"message",
  	"metal",
  	"method",
  	"middle",
  	"midnight",
  	"milk",
  	"million",
  	"mimic",
  	"mind",
  	"minimum",
  	"minor",
  	"minute",
  	"miracle",
  	"mirror",
  	"misery",
  	"miss",
  	"mistake",
  	"mix",
  	"mixed",
  	"mixture",
  	"mobile",
  	"model",
  	"modify",
  	"mom",
  	"moment",
  	"monitor",
  	"monkey",
  	"monster",
  	"month",
  	"moon",
  	"moral",
  	"more",
  	"morning",
  	"mosquito",
  	"mother",
  	"motion",
  	"motor",
  	"mountain",
  	"mouse",
  	"move",
  	"movie",
  	"much",
  	"muffin",
  	"mule",
  	"multiply",
  	"muscle",
  	"museum",
  	"mushroom",
  	"music",
  	"must",
  	"mutual",
  	"myself",
  	"mystery",
  	"myth",
  	"naive",
  	"name",
  	"napkin",
  	"narrow",
  	"nasty",
  	"nation",
  	"nature",
  	"near",
  	"neck",
  	"need",
  	"negative",
  	"neglect",
  	"neither",
  	"nephew",
  	"nerve",
  	"nest",
  	"net",
  	"network",
  	"neutral",
  	"never",
  	"news",
  	"next",
  	"nice",
  	"night",
  	"noble",
  	"noise",
  	"nominee",
  	"noodle",
  	"normal",
  	"north",
  	"nose",
  	"notable",
  	"note",
  	"nothing",
  	"notice",
  	"novel",
  	"now",
  	"nuclear",
  	"number",
  	"nurse",
  	"nut",
  	"oak",
  	"obey",
  	"object",
  	"oblige",
  	"obscure",
  	"observe",
  	"obtain",
  	"obvious",
  	"occur",
  	"ocean",
  	"october",
  	"odor",
  	"off",
  	"offer",
  	"office",
  	"often",
  	"oil",
  	"okay",
  	"old",
  	"olive",
  	"olympic",
  	"omit",
  	"once",
  	"one",
  	"onion",
  	"online",
  	"only",
  	"open",
  	"opera",
  	"opinion",
  	"oppose",
  	"option",
  	"orange",
  	"orbit",
  	"orchard",
  	"order",
  	"ordinary",
  	"organ",
  	"orient",
  	"original",
  	"orphan",
  	"ostrich",
  	"other",
  	"outdoor",
  	"outer",
  	"output",
  	"outside",
  	"oval",
  	"oven",
  	"over",
  	"own",
  	"owner",
  	"oxygen",
  	"oyster",
  	"ozone",
  	"pact",
  	"paddle",
  	"page",
  	"pair",
  	"palace",
  	"palm",
  	"panda",
  	"panel",
  	"panic",
  	"panther",
  	"paper",
  	"parade",
  	"parent",
  	"park",
  	"parrot",
  	"party",
  	"pass",
  	"patch",
  	"path",
  	"patient",
  	"patrol",
  	"pattern",
  	"pause",
  	"pave",
  	"payment",
  	"peace",
  	"peanut",
  	"pear",
  	"peasant",
  	"pelican",
  	"pen",
  	"penalty",
  	"pencil",
  	"people",
  	"pepper",
  	"perfect",
  	"permit",
  	"person",
  	"pet",
  	"phone",
  	"photo",
  	"phrase",
  	"physical",
  	"piano",
  	"picnic",
  	"picture",
  	"piece",
  	"pig",
  	"pigeon",
  	"pill",
  	"pilot",
  	"pink",
  	"pioneer",
  	"pipe",
  	"pistol",
  	"pitch",
  	"pizza",
  	"place",
  	"planet",
  	"plastic",
  	"plate",
  	"play",
  	"please",
  	"pledge",
  	"pluck",
  	"plug",
  	"plunge",
  	"poem",
  	"poet",
  	"point",
  	"polar",
  	"pole",
  	"police",
  	"pond",
  	"pony",
  	"pool",
  	"popular",
  	"portion",
  	"position",
  	"possible",
  	"post",
  	"potato",
  	"pottery",
  	"poverty",
  	"powder",
  	"power",
  	"practice",
  	"praise",
  	"predict",
  	"prefer",
  	"prepare",
  	"present",
  	"pretty",
  	"prevent",
  	"price",
  	"pride",
  	"primary",
  	"print",
  	"priority",
  	"prison",
  	"private",
  	"prize",
  	"problem",
  	"process",
  	"produce",
  	"profit",
  	"program",
  	"project",
  	"promote",
  	"proof",
  	"property",
  	"prosper",
  	"protect",
  	"proud",
  	"provide",
  	"public",
  	"pudding",
  	"pull",
  	"pulp",
  	"pulse",
  	"pumpkin",
  	"punch",
  	"pupil",
  	"puppy",
  	"purchase",
  	"purity",
  	"purpose",
  	"purse",
  	"push",
  	"put",
  	"puzzle",
  	"pyramid",
  	"quality",
  	"quantum",
  	"quarter",
  	"question",
  	"quick",
  	"quit",
  	"quiz",
  	"quote",
  	"rabbit",
  	"raccoon",
  	"race",
  	"rack",
  	"radar",
  	"radio",
  	"rail",
  	"rain",
  	"raise",
  	"rally",
  	"ramp",
  	"ranch",
  	"random",
  	"range",
  	"rapid",
  	"rare",
  	"rate",
  	"rather",
  	"raven",
  	"raw",
  	"razor",
  	"ready",
  	"real",
  	"reason",
  	"rebel",
  	"rebuild",
  	"recall",
  	"receive",
  	"recipe",
  	"record",
  	"recycle",
  	"reduce",
  	"reflect",
  	"reform",
  	"refuse",
  	"region",
  	"regret",
  	"regular",
  	"reject",
  	"relax",
  	"release",
  	"relief",
  	"rely",
  	"remain",
  	"remember",
  	"remind",
  	"remove",
  	"render",
  	"renew",
  	"rent",
  	"reopen",
  	"repair",
  	"repeat",
  	"replace",
  	"report",
  	"require",
  	"rescue",
  	"resemble",
  	"resist",
  	"resource",
  	"response",
  	"result",
  	"retire",
  	"retreat",
  	"return",
  	"reunion",
  	"reveal",
  	"review",
  	"reward",
  	"rhythm",
  	"rib",
  	"ribbon",
  	"rice",
  	"rich",
  	"ride",
  	"ridge",
  	"rifle",
  	"right",
  	"rigid",
  	"ring",
  	"riot",
  	"ripple",
  	"risk",
  	"ritual",
  	"rival",
  	"river",
  	"road",
  	"roast",
  	"robot",
  	"robust",
  	"rocket",
  	"romance",
  	"roof",
  	"rookie",
  	"room",
  	"rose",
  	"rotate",
  	"rough",
  	"round",
  	"route",
  	"royal",
  	"rubber",
  	"rude",
  	"rug",
  	"rule",
  	"run",
  	"runway",
  	"rural",
  	"sad",
  	"saddle",
  	"sadness",
  	"safe",
  	"sail",
  	"salad",
  	"salmon",
  	"salon",
  	"salt",
  	"salute",
  	"same",
  	"sample",
  	"sand",
  	"satisfy",
  	"satoshi",
  	"sauce",
  	"sausage",
  	"save",
  	"say",
  	"scale",
  	"scan",
  	"scare",
  	"scatter",
  	"scene",
  	"scheme",
  	"school",
  	"science",
  	"scissors",
  	"scorpion",
  	"scout",
  	"scrap",
  	"screen",
  	"script",
  	"scrub",
  	"sea",
  	"search",
  	"season",
  	"seat",
  	"second",
  	"secret",
  	"section",
  	"security",
  	"seed",
  	"seek",
  	"segment",
  	"select",
  	"sell",
  	"seminar",
  	"senior",
  	"sense",
  	"sentence",
  	"series",
  	"service",
  	"session",
  	"settle",
  	"setup",
  	"seven",
  	"shadow",
  	"shaft",
  	"shallow",
  	"share",
  	"shed",
  	"shell",
  	"sheriff",
  	"shield",
  	"shift",
  	"shine",
  	"ship",
  	"shiver",
  	"shock",
  	"shoe",
  	"shoot",
  	"shop",
  	"short",
  	"shoulder",
  	"shove",
  	"shrimp",
  	"shrug",
  	"shuffle",
  	"shy",
  	"sibling",
  	"sick",
  	"side",
  	"siege",
  	"sight",
  	"sign",
  	"silent",
  	"silk",
  	"silly",
  	"silver",
  	"similar",
  	"simple",
  	"since",
  	"sing",
  	"siren",
  	"sister",
  	"situate",
  	"six",
  	"size",
  	"skate",
  	"sketch",
  	"ski",
  	"skill",
  	"skin",
  	"skirt",
  	"skull",
  	"slab",
  	"slam",
  	"sleep",
  	"slender",
  	"slice",
  	"slide",
  	"slight",
  	"slim",
  	"slogan",
  	"slot",
  	"slow",
  	"slush",
  	"small",
  	"smart",
  	"smile",
  	"smoke",
  	"smooth",
  	"snack",
  	"snake",
  	"snap",
  	"sniff",
  	"snow",
  	"soap",
  	"soccer",
  	"social",
  	"sock",
  	"soda",
  	"soft",
  	"solar",
  	"soldier",
  	"solid",
  	"solution",
  	"solve",
  	"someone",
  	"song",
  	"soon",
  	"sorry",
  	"sort",
  	"soul",
  	"sound",
  	"soup",
  	"source",
  	"south",
  	"space",
  	"spare",
  	"spatial",
  	"spawn",
  	"speak",
  	"special",
  	"speed",
  	"spell",
  	"spend",
  	"sphere",
  	"spice",
  	"spider",
  	"spike",
  	"spin",
  	"spirit",
  	"split",
  	"spoil",
  	"sponsor",
  	"spoon",
  	"sport",
  	"spot",
  	"spray",
  	"spread",
  	"spring",
  	"spy",
  	"square",
  	"squeeze",
  	"squirrel",
  	"stable",
  	"stadium",
  	"staff",
  	"stage",
  	"stairs",
  	"stamp",
  	"stand",
  	"start",
  	"state",
  	"stay",
  	"steak",
  	"steel",
  	"stem",
  	"step",
  	"stereo",
  	"stick",
  	"still",
  	"sting",
  	"stock",
  	"stomach",
  	"stone",
  	"stool",
  	"story",
  	"stove",
  	"strategy",
  	"street",
  	"strike",
  	"strong",
  	"struggle",
  	"student",
  	"stuff",
  	"stumble",
  	"style",
  	"subject",
  	"submit",
  	"subway",
  	"success",
  	"such",
  	"sudden",
  	"suffer",
  	"sugar",
  	"suggest",
  	"suit",
  	"summer",
  	"sun",
  	"sunny",
  	"sunset",
  	"super",
  	"supply",
  	"supreme",
  	"sure",
  	"surface",
  	"surge",
  	"surprise",
  	"surround",
  	"survey",
  	"suspect",
  	"sustain",
  	"swallow",
  	"swamp",
  	"swap",
  	"swarm",
  	"swear",
  	"sweet",
  	"swift",
  	"swim",
  	"swing",
  	"switch",
  	"sword",
  	"symbol",
  	"symptom",
  	"syrup",
  	"system",
  	"table",
  	"tackle",
  	"tag",
  	"tail",
  	"talent",
  	"talk",
  	"tank",
  	"tape",
  	"target",
  	"task",
  	"taste",
  	"tattoo",
  	"taxi",
  	"teach",
  	"team",
  	"tell",
  	"ten",
  	"tenant",
  	"tennis",
  	"tent",
  	"term",
  	"test",
  	"text",
  	"thank",
  	"that",
  	"theme",
  	"then",
  	"theory",
  	"there",
  	"they",
  	"thing",
  	"this",
  	"thought",
  	"three",
  	"thrive",
  	"throw",
  	"thumb",
  	"thunder",
  	"ticket",
  	"tide",
  	"tiger",
  	"tilt",
  	"timber",
  	"time",
  	"tiny",
  	"tip",
  	"tired",
  	"tissue",
  	"title",
  	"toast",
  	"tobacco",
  	"today",
  	"toddler",
  	"toe",
  	"together",
  	"toilet",
  	"token",
  	"tomato",
  	"tomorrow",
  	"tone",
  	"tongue",
  	"tonight",
  	"tool",
  	"tooth",
  	"top",
  	"topic",
  	"topple",
  	"torch",
  	"tornado",
  	"tortoise",
  	"toss",
  	"total",
  	"tourist",
  	"toward",
  	"tower",
  	"town",
  	"toy",
  	"track",
  	"trade",
  	"traffic",
  	"tragic",
  	"train",
  	"transfer",
  	"trap",
  	"trash",
  	"travel",
  	"tray",
  	"treat",
  	"tree",
  	"trend",
  	"trial",
  	"tribe",
  	"trick",
  	"trigger",
  	"trim",
  	"trip",
  	"trophy",
  	"trouble",
  	"truck",
  	"true",
  	"truly",
  	"trumpet",
  	"trust",
  	"truth",
  	"try",
  	"tube",
  	"tuition",
  	"tumble",
  	"tuna",
  	"tunnel",
  	"turkey",
  	"turn",
  	"turtle",
  	"twelve",
  	"twenty",
  	"twice",
  	"twin",
  	"twist",
  	"two",
  	"type",
  	"typical",
  	"ugly",
  	"umbrella",
  	"unable",
  	"unaware",
  	"uncle",
  	"uncover",
  	"under",
  	"undo",
  	"unfair",
  	"unfold",
  	"unhappy",
  	"uniform",
  	"unique",
  	"unit",
  	"universe",
  	"unknown",
  	"unlock",
  	"until",
  	"unusual",
  	"unveil",
  	"update",
  	"upgrade",
  	"uphold",
  	"upon",
  	"upper",
  	"upset",
  	"urban",
  	"urge",
  	"usage",
  	"use",
  	"used",
  	"useful",
  	"useless",
  	"usual",
  	"utility",
  	"vacant",
  	"vacuum",
  	"vague",
  	"valid",
  	"valley",
  	"valve",
  	"van",
  	"vanish",
  	"vapor",
  	"various",
  	"vast",
  	"vault",
  	"vehicle",
  	"velvet",
  	"vendor",
  	"venture",
  	"venue",
  	"verb",
  	"verify",
  	"version",
  	"very",
  	"vessel",
  	"veteran",
  	"viable",
  	"vibrant",
  	"vicious",
  	"victory",
  	"video",
  	"view",
  	"village",
  	"vintage",
  	"violin",
  	"virtual",
  	"virus",
  	"visa",
  	"visit",
  	"visual",
  	"vital",
  	"vivid",
  	"vocal",
  	"voice",
  	"void",
  	"volcano",
  	"volume",
  	"vote",
  	"voyage",
  	"wage",
  	"wagon",
  	"wait",
  	"walk",
  	"wall",
  	"walnut",
  	"want",
  	"warfare",
  	"warm",
  	"warrior",
  	"wash",
  	"wasp",
  	"waste",
  	"water",
  	"wave",
  	"way",
  	"wealth",
  	"weapon",
  	"wear",
  	"weasel",
  	"weather",
  	"web",
  	"wedding",
  	"weekend",
  	"weird",
  	"welcome",
  	"west",
  	"wet",
  	"whale",
  	"what",
  	"wheat",
  	"wheel",
  	"when",
  	"where",
  	"whip",
  	"whisper",
  	"wide",
  	"width",
  	"wife",
  	"wild",
  	"will",
  	"win",
  	"window",
  	"wine",
  	"wing",
  	"wink",
  	"winner",
  	"winter",
  	"wire",
  	"wisdom",
  	"wise",
  	"wish",
  	"witness",
  	"wolf",
  	"woman",
  	"wonder",
  	"wood",
  	"wool",
  	"word",
  	"work",
  	"world",
  	"worry",
  	"worth",
  	"wrap",
  	"wreck",
  	"wrestle",
  	"wrist",
  	"write",
  	"wrong",
  	"yard",
  	"year",
  	"yellow",
  	"you",
  	"young",
  	"youth",
  	"zebra",
  	"zero",
  	"zone",
  	"zoo"
  ];

  var english$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': english
  });

  var require$$0 = getCjsExportFromNamespace(chinese_simplified$1);

  var require$$1 = getCjsExportFromNamespace(chinese_traditional$1);

  var require$$2 = getCjsExportFromNamespace(korean$1);

  var require$$3 = getCjsExportFromNamespace(french$1);

  var require$$4 = getCjsExportFromNamespace(italian$1);

  var require$$5 = getCjsExportFromNamespace(spanish$1);

  var require$$6 = getCjsExportFromNamespace(japanese$1);

  var require$$7 = getCjsExportFromNamespace(english$1);

  var _wordlists = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    }); // browserify by default only pulls in files that are hard coded in requires
    // In order of last to first in this file, the default wordlist will be chosen
    // based on what is present. (Bundles may remove wordlists they don't need)

    var wordlists = {};
    exports.wordlists = wordlists;

    var _default;

    exports._default = _default;

    try {
      exports._default = _default = require$$0;
      wordlists.chinese_simplified = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$1;
      wordlists.chinese_traditional = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$2;
      wordlists.korean = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$3;
      wordlists.french = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$4;
      wordlists.italian = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$5;
      wordlists.spanish = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$6;
      wordlists.japanese = _default;
      wordlists.JA = _default;
    } catch (err) {}

    try {
      exports._default = _default = require$$7;
      wordlists.english = _default;
      wordlists.EN = _default;
    } catch (err) {}
  });

  unwrapExports(_wordlists);
  var _wordlists_1 = _wordlists.wordlists;
  var _wordlists_2 = _wordlists._default;

  var src = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var DEFAULT_WORDLIST = _wordlists._default;
    var INVALID_MNEMONIC = 'Invalid mnemonic';
    var INVALID_ENTROPY = 'Invalid entropy';
    var INVALID_CHECKSUM = 'Invalid mnemonic checksum';
    var WORDLIST_REQUIRED = 'A wordlist is required but a default could not be found.\n' + 'Please explicitly pass a 2048 word array explicitly.';

    function lpad(str, padString, length) {
      while (str.length < length) {
        str = padString + str;
      }

      return str;
    }

    function binaryToByte(bin) {
      return parseInt(bin, 2);
    }

    function bytesToBinary(bytes) {
      return bytes.map(function (x) {
        return lpad(x.toString(2), '0', 8);
      }).join('');
    }

    function deriveChecksumBits(entropyBuffer) {
      var ENT = entropyBuffer.length * 8;
      var CS = ENT / 32;
      var hash = browser('sha256').update(entropyBuffer).digest();
      return bytesToBinary(_toConsumableArray(hash)).slice(0, CS);
    }

    function salt(password) {
      return 'mnemonic' + (password || '');
    }

    function mnemonicToSeedSync(mnemonic, password) {
      var mnemonicBuffer = Buffer.from((mnemonic || '').normalize('NFKD'), 'utf8');
      var saltBuffer = Buffer.from(salt((password || '').normalize('NFKD')), 'utf8');
      return browser$2.pbkdf2Sync(mnemonicBuffer, saltBuffer, 2048, 64, 'sha512');
    }

    exports.mnemonicToSeedSync = mnemonicToSeedSync;

    function mnemonicToSeed(mnemonic, password) {
      return new Promise(function (resolve, reject) {
        try {
          var mnemonicBuffer = Buffer.from((mnemonic || '').normalize('NFKD'), 'utf8');
          var saltBuffer = Buffer.from(salt((password || '').normalize('NFKD')), 'utf8');
          browser$2.pbkdf2(mnemonicBuffer, saltBuffer, 2048, 64, 'sha512', function (err, data) {
            if (err) return reject(err);else return resolve(data);
          });
        } catch (error) {
          return reject(error);
        }
      });
    }

    exports.mnemonicToSeed = mnemonicToSeed;

    function mnemonicToEntropy(mnemonic, wordlist) {
      wordlist = wordlist || DEFAULT_WORDLIST;

      if (!wordlist) {
        throw new Error(WORDLIST_REQUIRED);
      }

      var words = (mnemonic || '').normalize('NFKD').split(' ');
      if (words.length % 3 !== 0) throw new Error(INVALID_MNEMONIC); // convert word indices to 11 bit binary strings

      var bits = words.map(function (word) {
        var index = wordlist.indexOf(word);
        if (index === -1) throw new Error(INVALID_MNEMONIC);
        return lpad(index.toString(2), '0', 11);
      }).join(''); // split the binary string into ENT/CS

      var dividerIndex = Math.floor(bits.length / 33) * 32;
      var entropyBits = bits.slice(0, dividerIndex);
      var checksumBits = bits.slice(dividerIndex); // calculate the checksum and compare

      var entropyBytes = entropyBits.match(/(.{1,8})/g).map(binaryToByte);
      if (entropyBytes.length < 16) throw new Error(INVALID_ENTROPY);
      if (entropyBytes.length > 32) throw new Error(INVALID_ENTROPY);
      if (entropyBytes.length % 4 !== 0) throw new Error(INVALID_ENTROPY);
      var entropy = Buffer.from(entropyBytes);
      var newChecksum = deriveChecksumBits(entropy);
      if (newChecksum !== checksumBits) throw new Error(INVALID_CHECKSUM);
      return entropy.toString('hex');
    }

    exports.mnemonicToEntropy = mnemonicToEntropy;

    function entropyToMnemonic(entropy, wordlist) {
      if (!isBuffer(entropy)) entropy = Buffer.from(entropy, 'hex');
      wordlist = wordlist || DEFAULT_WORDLIST;

      if (!wordlist) {
        throw new Error(WORDLIST_REQUIRED);
      } // 128 <= ENT <= 256


      if (entropy.length < 16) throw new TypeError(INVALID_ENTROPY);
      if (entropy.length > 32) throw new TypeError(INVALID_ENTROPY);
      if (entropy.length % 4 !== 0) throw new TypeError(INVALID_ENTROPY);
      var entropyBits = bytesToBinary(_toConsumableArray(entropy));
      var checksumBits = deriveChecksumBits(entropy);
      var bits = entropyBits + checksumBits;
      var chunks = bits.match(/(.{1,11})/g);
      var words = chunks.map(function (binary) {
        var index = binaryToByte(binary);
        return wordlist[index];
      });
      return wordlist[0] === "\u3042\u3044\u3053\u304F\u3057\u3093" // Japanese wordlist
      ? words.join("\u3000") : words.join(' ');
    }

    exports.entropyToMnemonic = entropyToMnemonic;

    function generateMnemonic(strength, rng, wordlist) {
      strength = strength || 128;
      if (strength % 32 !== 0) throw new TypeError(INVALID_ENTROPY);
      rng = rng || browser$3;
      return entropyToMnemonic(rng(strength / 8), wordlist);
    }

    exports.generateMnemonic = generateMnemonic;

    function validateMnemonic(mnemonic, wordlist) {
      try {
        mnemonicToEntropy(mnemonic, wordlist);
      } catch (e) {
        return false;
      }

      return true;
    }

    exports.validateMnemonic = validateMnemonic;

    function setDefaultWordlist(language) {
      var result = _wordlists.wordlists[language];
      if (result) DEFAULT_WORDLIST = result;else throw new Error('Could not find wordlist for language "' + language + '"');
    }

    exports.setDefaultWordlist = setDefaultWordlist;

    function getDefaultWordlist() {
      if (!DEFAULT_WORDLIST) throw new Error('No Default Wordlist set');
      return Object.keys(_wordlists.wordlists).filter(function (lang) {
        if (lang === 'JA' || lang === 'EN') return false;
        return _wordlists.wordlists[lang].every(function (word, index) {
          return word === DEFAULT_WORDLIST[index];
        });
      })[0];
    }

    exports.getDefaultWordlist = getDefaultWordlist;
    var _wordlists_2 = _wordlists;
    exports.wordlists = _wordlists_2.wordlists;
  });
  unwrapExports(src);
  var src_1 = src.mnemonicToSeedSync;
  var src_2 = src.mnemonicToSeed;
  var src_3 = src.mnemonicToEntropy;
  var src_4 = src.entropyToMnemonic;
  var src_5 = src.generateMnemonic;
  var src_6 = src.validateMnemonic;
  var src_7 = src.setDefaultWordlist;
  var src_8 = src.getDefaultWordlist;
  var src_9 = src.wordlists;

  function compare(a, b) {
    if (a === b) {
      return 0;
    }

    var x = a.length;
    var y = b.length;

    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }

    if (x < y) {
      return -1;
    }

    if (y < x) {
      return 1;
    }

    return 0;
  }

  var hasOwn = Object.prototype.hasOwnProperty;

  var objectKeys = Object.keys || function (obj) {
    var keys = [];

    for (var key in obj) {
      if (hasOwn.call(obj, key)) keys.push(key);
    }

    return keys;
  }; // based on node assert, original notice:
  var pSlice = Array.prototype.slice;

  var _functionsHaveNames;

  function functionsHaveNames() {
    if (typeof _functionsHaveNames !== 'undefined') {
      return _functionsHaveNames;
    }

    return _functionsHaveNames = function () {
      return function foo() {}.name === 'foo';
    }();
  }

  function pToString(obj) {
    return Object.prototype.toString.call(obj);
  }

  function isView(arrbuf) {
    if (isBuffer(arrbuf)) {
      return false;
    }

    if (typeof global$1.ArrayBuffer !== 'function') {
      return false;
    }

    if (typeof ArrayBuffer.isView === 'function') {
      return ArrayBuffer.isView(arrbuf);
    }

    if (!arrbuf) {
      return false;
    }

    if (arrbuf instanceof DataView) {
      return true;
    }

    if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
      return true;
    }

    return false;
  } // 1. The assert module provides functions that throw
  // AssertionError's when particular conditions are not met. The
  // assert module must conform to the following interface.


  function assert(value, message) {
    if (!value) fail(value, true, message, '==', ok);
  }
  // new assert.AssertionError({ message: message,
  //                             actual: actual,
  //                             expected: expected })

  var regex = /\s*function\s+([^\(\s]*)\s*/; // based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js

  function getName(func) {
    if (!isFunction(func)) {
      return;
    }

    if (functionsHaveNames()) {
      return func.name;
    }

    var str = func.toString();
    var match = str.match(regex);
    return match && match[1];
  }

  assert.AssertionError = AssertionError;
  function AssertionError(options) {
    this.name = 'AssertionError';
    this.actual = options.actual;
    this.expected = options.expected;
    this.operator = options.operator;

    if (options.message) {
      this.message = options.message;
      this.generatedMessage = false;
    } else {
      this.message = getMessage(this);
      this.generatedMessage = true;
    }

    var stackStartFunction = options.stackStartFunction || fail;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, stackStartFunction);
    } else {
      // non v8 browsers so we can have a stacktrace
      var err = new Error();

      if (err.stack) {
        var out = err.stack; // try to strip useless frames

        var fn_name = getName(stackStartFunction);
        var idx = out.indexOf('\n' + fn_name);

        if (idx >= 0) {
          // once we have located the function frame
          // we need to strip out everything before it (and its line)
          var next_line = out.indexOf('\n', idx + 1);
          out = out.substring(next_line + 1);
        }

        this.stack = out;
      }
    }
  } // assert.AssertionError instanceof Error

  inherits$1(AssertionError, Error);

  function truncate(s, n) {
    if (typeof s === 'string') {
      return s.length < n ? s : s.slice(0, n);
    } else {
      return s;
    }
  }

  function inspect$1(something) {
    if (functionsHaveNames() || !isFunction(something)) {
      return inspect(something);
    }

    var rawname = getName(something);
    var name = rawname ? ': ' + rawname : '';
    return '[Function' + name + ']';
  }

  function getMessage(self) {
    return truncate(inspect$1(self.actual), 128) + ' ' + self.operator + ' ' + truncate(inspect$1(self.expected), 128);
  } // At present only the three keys mentioned above are used and
  // understood by the spec. Implementations or sub modules can pass
  // other keys to the AssertionError's constructor - they will be
  // ignored.
  // 3. All of the following functions must throw an AssertionError
  // when a corresponding condition is not met, with a message that
  // may be undefined if not provided.  All assertion methods provide
  // both the actual and expected values to the assertion error for
  // display purposes.


  function fail(actual, expected, message, operator, stackStartFunction) {
    throw new AssertionError({
      message: message,
      actual: actual,
      expected: expected,
      operator: operator,
      stackStartFunction: stackStartFunction
    });
  } // EXTENSION! allows for well behaved errors defined elsewhere.

  assert.fail = fail; // 4. Pure assertion tests whether a value is truthy, as determined
  // by !!guard.
  // assert.ok(guard, message_opt);
  // This statement is equivalent to assert.equal(true, !!guard,
  // message_opt);. To test strictly for the value true, use
  // assert.strictEqual(true, guard, message_opt);.

  function ok(value, message) {
    if (!value) fail(value, true, message, '==', ok);
  }
  assert.ok = ok;
  // ==.
  // assert.equal(actual, expected, message_opt);

  assert.equal = equal;
  function equal(actual, expected, message) {
    if (actual != expected) fail(actual, expected, message, '==', equal);
  } // 6. The non-equality assertion tests for whether two objects are not equal
  // with != assert.notEqual(actual, expected, message_opt);

  assert.notEqual = notEqual;
  function notEqual(actual, expected, message) {
    if (actual == expected) {
      fail(actual, expected, message, '!=', notEqual);
    }
  } // 7. The equivalence assertion tests a deep equality relation.
  // assert.deepEqual(actual, expected, message_opt);

  assert.deepEqual = deepEqual;
  function deepEqual(actual, expected, message) {
    if (!_deepEqual(actual, expected, false)) {
      fail(actual, expected, message, 'deepEqual', deepEqual);
    }
  }
  assert.deepStrictEqual = deepStrictEqual;
  function deepStrictEqual(actual, expected, message) {
    if (!_deepEqual(actual, expected, true)) {
      fail(actual, expected, message, 'deepStrictEqual', deepStrictEqual);
    }
  }

  function _deepEqual(actual, expected, strict, memos) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if (isBuffer(actual) && isBuffer(expected)) {
      return compare(actual, expected) === 0; // 7.2. If the expected value is a Date object, the actual value is
      // equivalent if it is also a Date object that refers to the same time.
    } else if (isDate(actual) && isDate(expected)) {
      return actual.getTime() === expected.getTime(); // 7.3 If the expected value is a RegExp object, the actual value is
      // equivalent if it is also a RegExp object with the same source and
      // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
    } else if (isRegExp(actual) && isRegExp(expected)) {
      return actual.source === expected.source && actual.global === expected.global && actual.multiline === expected.multiline && actual.lastIndex === expected.lastIndex && actual.ignoreCase === expected.ignoreCase; // 7.4. Other pairs that do not both pass typeof value == 'object',
      // equivalence is determined by ==.
    } else if ((actual === null || _typeof(actual) !== 'object') && (expected === null || _typeof(expected) !== 'object')) {
      return strict ? actual === expected : actual == expected; // If both values are instances of typed arrays, wrap their underlying
      // ArrayBuffers in a Buffer each to increase performance
      // This optimization requires the arrays to have the same type as checked by
      // Object.prototype.toString (aka pToString). Never perform binary
      // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
      // bit patterns are not identical.
    } else if (isView(actual) && isView(expected) && pToString(actual) === pToString(expected) && !(actual instanceof Float32Array || actual instanceof Float64Array)) {
      return compare(new Uint8Array(actual.buffer), new Uint8Array(expected.buffer)) === 0; // 7.5 For all other Object pairs, including Array objects, equivalence is
      // determined by having the same number of owned properties (as verified
      // with Object.prototype.hasOwnProperty.call), the same set of keys
      // (although not necessarily the same order), equivalent values for every
      // corresponding key, and an identical 'prototype' property. Note: this
      // accounts for both named and indexed properties on Arrays.
    } else if (isBuffer(actual) !== isBuffer(expected)) {
      return false;
    } else {
      memos = memos || {
        actual: [],
        expected: []
      };
      var actualIndex = memos.actual.indexOf(actual);

      if (actualIndex !== -1) {
        if (actualIndex === memos.expected.indexOf(expected)) {
          return true;
        }
      }

      memos.actual.push(actual);
      memos.expected.push(expected);
      return objEquiv(actual, expected, strict, memos);
    }
  }

  function isArguments(object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function objEquiv(a, b, strict, actualVisitedObjects) {
    if (a === null || a === undefined || b === null || b === undefined) return false; // if one is a primitive, the other must be same

    if (isPrimitive(a) || isPrimitive(b)) return a === b;
    if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    var aIsArgs = isArguments(a);
    var bIsArgs = isArguments(b);
    if (aIsArgs && !bIsArgs || !aIsArgs && bIsArgs) return false;

    if (aIsArgs) {
      a = pSlice.call(a);
      b = pSlice.call(b);
      return _deepEqual(a, b, strict);
    }

    var ka = objectKeys(a);
    var kb = objectKeys(b);
    var key, i; // having the same number of owned properties (keys incorporates
    // hasOwnProperty)

    if (ka.length !== kb.length) return false; //the same set of keys (although not necessarily the same order),

    ka.sort();
    kb.sort(); //~~~cheap key test

    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] !== kb[i]) return false;
    } //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test


    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects)) return false;
    }

    return true;
  } // 8. The non-equivalence assertion tests for any deep inequality.
  // assert.notDeepEqual(actual, expected, message_opt);


  assert.notDeepEqual = notDeepEqual;
  function notDeepEqual(actual, expected, message) {
    if (_deepEqual(actual, expected, false)) {
      fail(actual, expected, message, 'notDeepEqual', notDeepEqual);
    }
  }
  assert.notDeepStrictEqual = notDeepStrictEqual;
  function notDeepStrictEqual(actual, expected, message) {
    if (_deepEqual(actual, expected, true)) {
      fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
    }
  } // 9. The strict equality assertion tests strict equality, as determined by ===.
  // assert.strictEqual(actual, expected, message_opt);

  assert.strictEqual = strictEqual;
  function strictEqual(actual, expected, message) {
    if (actual !== expected) {
      fail(actual, expected, message, '===', strictEqual);
    }
  } // 10. The strict non-equality assertion tests for strict inequality, as
  // determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

  assert.notStrictEqual = notStrictEqual;
  function notStrictEqual(actual, expected, message) {
    if (actual === expected) {
      fail(actual, expected, message, '!==', notStrictEqual);
    }
  }

  function expectedException(actual, expected) {
    if (!actual || !expected) {
      return false;
    }

    if (Object.prototype.toString.call(expected) == '[object RegExp]') {
      return expected.test(actual);
    }

    try {
      if (actual instanceof expected) {
        return true;
      }
    } catch (e) {// Ignore.  The instanceof check doesn't work for arrow functions.
    }

    if (Error.isPrototypeOf(expected)) {
      return false;
    }

    return expected.call({}, actual) === true;
  }

  function _tryBlock(block) {
    var error;

    try {
      block();
    } catch (e) {
      error = e;
    }

    return error;
  }

  function _throws(shouldThrow, block, expected, message) {
    var actual;

    if (typeof block !== 'function') {
      throw new TypeError('"block" argument must be a function');
    }

    if (typeof expected === 'string') {
      message = expected;
      expected = null;
    }

    actual = _tryBlock(block);
    message = (expected && expected.name ? ' (' + expected.name + ').' : '.') + (message ? ' ' + message : '.');

    if (shouldThrow && !actual) {
      fail(actual, expected, 'Missing expected exception' + message);
    }

    var userProvidedMessage = typeof message === 'string';
    var isUnwantedException = !shouldThrow && isError(actual);
    var isUnexpectedException = !shouldThrow && actual && !expected;

    if (isUnwantedException && userProvidedMessage && expectedException(actual, expected) || isUnexpectedException) {
      fail(actual, expected, 'Got unwanted exception' + message);
    }

    if (shouldThrow && actual && expected && !expectedException(actual, expected) || !shouldThrow && actual) {
      throw actual;
    }
  } // 11. Expected to throw an error:
  // assert.throws(block, Error_opt, message_opt);


  assert["throws"] = _throws2;

  function _throws2(block,
  /*optional*/
  error,
  /*optional*/
  message) {
    _throws(true, block, error, message);
  } // EXTENSION! This is annoying to write outside this module.
  assert.doesNotThrow = doesNotThrow;
  function doesNotThrow(block,
  /*optional*/
  error,
  /*optional*/
  message) {
    _throws(false, block, error, message);
  }
  assert.ifError = ifError;
  function ifError(err) {
    if (err) throw err;
  }

  var Buffer$e = safeBuffer.Buffer;
  var ZEROS$1 = Buffer$e.alloc(128);
  var blocksize = 64;

  function Hmac$1(alg, key) {
    cipherBase.call(this, 'digest');

    if (typeof key === 'string') {
      key = Buffer$e.from(key);
    }

    this._alg = alg;
    this._key = key;

    if (key.length > blocksize) {
      key = alg(key);
    } else if (key.length < blocksize) {
      key = Buffer$e.concat([key, ZEROS$1], blocksize);
    }

    var ipad = this._ipad = Buffer$e.allocUnsafe(blocksize);
    var opad = this._opad = Buffer$e.allocUnsafe(blocksize);

    for (var i = 0; i < blocksize; i++) {
      ipad[i] = key[i] ^ 0x36;
      opad[i] = key[i] ^ 0x5C;
    }

    this._hash = [ipad];
  }

  inherits_browser(Hmac$1, cipherBase);

  Hmac$1.prototype._update = function (data) {
    this._hash.push(data);
  };

  Hmac$1.prototype._final = function () {
    var h = this._alg(Buffer$e.concat(this._hash));

    return this._alg(Buffer$e.concat([this._opad, h]));
  };

  var legacy = Hmac$1;

  var Buffer$f = safeBuffer.Buffer;
  var ZEROS$2 = Buffer$f.alloc(128);

  function Hmac$2(alg, key) {
    cipherBase.call(this, 'digest');

    if (typeof key === 'string') {
      key = Buffer$f.from(key);
    }

    var blocksize = alg === 'sha512' || alg === 'sha384' ? 128 : 64;
    this._alg = alg;
    this._key = key;

    if (key.length > blocksize) {
      var hash = alg === 'rmd160' ? new ripemd160() : sha_js(alg);
      key = hash.update(key).digest();
    } else if (key.length < blocksize) {
      key = Buffer$f.concat([key, ZEROS$2], blocksize);
    }

    var ipad = this._ipad = Buffer$f.allocUnsafe(blocksize);
    var opad = this._opad = Buffer$f.allocUnsafe(blocksize);

    for (var i = 0; i < blocksize; i++) {
      ipad[i] = key[i] ^ 0x36;
      opad[i] = key[i] ^ 0x5C;
    }

    this._hash = alg === 'rmd160' ? new ripemd160() : sha_js(alg);

    this._hash.update(ipad);
  }

  inherits_browser(Hmac$2, cipherBase);

  Hmac$2.prototype._update = function (data) {
    this._hash.update(data);
  };

  Hmac$2.prototype._final = function () {
    var h = this._hash.digest();

    var hash = this._alg === 'rmd160' ? new ripemd160() : sha_js(this._alg);
    return hash.update(this._opad).update(h).digest();
  };

  var browser$4 = function createHmac(alg, key) {
    alg = alg.toLowerCase();

    if (alg === 'rmd160' || alg === 'ripemd160') {
      return new Hmac$2('rmd160', key);
    }

    if (alg === 'md5') {
      return new legacy(md5, key);
    }

    return new Hmac$2(alg, key);
  };

  var sha224WithRSAEncryption = {
  	sign: "rsa",
  	hash: "sha224",
  	id: "302d300d06096086480165030402040500041c"
  };
  var sha256WithRSAEncryption = {
  	sign: "rsa",
  	hash: "sha256",
  	id: "3031300d060960864801650304020105000420"
  };
  var sha384WithRSAEncryption = {
  	sign: "rsa",
  	hash: "sha384",
  	id: "3041300d060960864801650304020205000430"
  };
  var sha512WithRSAEncryption = {
  	sign: "rsa",
  	hash: "sha512",
  	id: "3051300d060960864801650304020305000440"
  };
  var sha256$1 = {
  	sign: "ecdsa",
  	hash: "sha256",
  	id: ""
  };
  var sha224$1 = {
  	sign: "ecdsa",
  	hash: "sha224",
  	id: ""
  };
  var sha384$1 = {
  	sign: "ecdsa",
  	hash: "sha384",
  	id: ""
  };
  var sha512$1 = {
  	sign: "ecdsa",
  	hash: "sha512",
  	id: ""
  };
  var DSA = {
  	sign: "dsa",
  	hash: "sha1",
  	id: ""
  };
  var ripemd160WithRSA = {
  	sign: "rsa",
  	hash: "rmd160",
  	id: "3021300906052b2403020105000414"
  };
  var md5WithRSAEncryption = {
  	sign: "rsa",
  	hash: "md5",
  	id: "3020300c06082a864886f70d020505000410"
  };
  var algorithms = {
  	sha224WithRSAEncryption: sha224WithRSAEncryption,
  	"RSA-SHA224": {
  	sign: "ecdsa/rsa",
  	hash: "sha224",
  	id: "302d300d06096086480165030402040500041c"
  },
  	sha256WithRSAEncryption: sha256WithRSAEncryption,
  	"RSA-SHA256": {
  	sign: "ecdsa/rsa",
  	hash: "sha256",
  	id: "3031300d060960864801650304020105000420"
  },
  	sha384WithRSAEncryption: sha384WithRSAEncryption,
  	"RSA-SHA384": {
  	sign: "ecdsa/rsa",
  	hash: "sha384",
  	id: "3041300d060960864801650304020205000430"
  },
  	sha512WithRSAEncryption: sha512WithRSAEncryption,
  	"RSA-SHA512": {
  	sign: "ecdsa/rsa",
  	hash: "sha512",
  	id: "3051300d060960864801650304020305000440"
  },
  	"RSA-SHA1": {
  	sign: "rsa",
  	hash: "sha1",
  	id: "3021300906052b0e03021a05000414"
  },
  	"ecdsa-with-SHA1": {
  	sign: "ecdsa",
  	hash: "sha1",
  	id: ""
  },
  	sha256: sha256$1,
  	sha224: sha224$1,
  	sha384: sha384$1,
  	sha512: sha512$1,
  	"DSA-SHA": {
  	sign: "dsa",
  	hash: "sha1",
  	id: ""
  },
  	"DSA-SHA1": {
  	sign: "dsa",
  	hash: "sha1",
  	id: ""
  },
  	DSA: DSA,
  	"DSA-WITH-SHA224": {
  	sign: "dsa",
  	hash: "sha224",
  	id: ""
  },
  	"DSA-SHA224": {
  	sign: "dsa",
  	hash: "sha224",
  	id: ""
  },
  	"DSA-WITH-SHA256": {
  	sign: "dsa",
  	hash: "sha256",
  	id: ""
  },
  	"DSA-SHA256": {
  	sign: "dsa",
  	hash: "sha256",
  	id: ""
  },
  	"DSA-WITH-SHA384": {
  	sign: "dsa",
  	hash: "sha384",
  	id: ""
  },
  	"DSA-SHA384": {
  	sign: "dsa",
  	hash: "sha384",
  	id: ""
  },
  	"DSA-WITH-SHA512": {
  	sign: "dsa",
  	hash: "sha512",
  	id: ""
  },
  	"DSA-SHA512": {
  	sign: "dsa",
  	hash: "sha512",
  	id: ""
  },
  	"DSA-RIPEMD160": {
  	sign: "dsa",
  	hash: "rmd160",
  	id: ""
  },
  	ripemd160WithRSA: ripemd160WithRSA,
  	"RSA-RIPEMD160": {
  	sign: "rsa",
  	hash: "rmd160",
  	id: "3021300906052b2403020105000414"
  },
  	md5WithRSAEncryption: md5WithRSAEncryption,
  	"RSA-MD5": {
  	sign: "rsa",
  	hash: "md5",
  	id: "3020300c06082a864886f70d020505000410"
  }
  };

  var algorithms$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    sha224WithRSAEncryption: sha224WithRSAEncryption,
    sha256WithRSAEncryption: sha256WithRSAEncryption,
    sha384WithRSAEncryption: sha384WithRSAEncryption,
    sha512WithRSAEncryption: sha512WithRSAEncryption,
    sha256: sha256$1,
    sha224: sha224$1,
    sha384: sha384$1,
    sha512: sha512$1,
    DSA: DSA,
    ripemd160WithRSA: ripemd160WithRSA,
    md5WithRSAEncryption: md5WithRSAEncryption,
    'default': algorithms
  });

  var algorithms$2 = getCjsExportFromNamespace(algorithms$1);

  var algos = algorithms$2;

  var readUInt32BE = function readUInt32BE(bytes, off) {
    var res = bytes[0 + off] << 24 | bytes[1 + off] << 16 | bytes[2 + off] << 8 | bytes[3 + off];
    return res >>> 0;
  };

  var writeUInt32BE = function writeUInt32BE(bytes, value, off) {
    bytes[0 + off] = value >>> 24;
    bytes[1 + off] = value >>> 16 & 0xff;
    bytes[2 + off] = value >>> 8 & 0xff;
    bytes[3 + off] = value & 0xff;
  };

  var ip = function ip(inL, inR, out, off) {
    var outL = 0;
    var outR = 0;

    for (var i = 6; i >= 0; i -= 2) {
      for (var j = 0; j <= 24; j += 8) {
        outL <<= 1;
        outL |= inR >>> j + i & 1;
      }

      for (var j = 0; j <= 24; j += 8) {
        outL <<= 1;
        outL |= inL >>> j + i & 1;
      }
    }

    for (var i = 6; i >= 0; i -= 2) {
      for (var j = 1; j <= 25; j += 8) {
        outR <<= 1;
        outR |= inR >>> j + i & 1;
      }

      for (var j = 1; j <= 25; j += 8) {
        outR <<= 1;
        outR |= inL >>> j + i & 1;
      }
    }

    out[off + 0] = outL >>> 0;
    out[off + 1] = outR >>> 0;
  };

  var rip = function rip(inL, inR, out, off) {
    var outL = 0;
    var outR = 0;

    for (var i = 0; i < 4; i++) {
      for (var j = 24; j >= 0; j -= 8) {
        outL <<= 1;
        outL |= inR >>> j + i & 1;
        outL <<= 1;
        outL |= inL >>> j + i & 1;
      }
    }

    for (var i = 4; i < 8; i++) {
      for (var j = 24; j >= 0; j -= 8) {
        outR <<= 1;
        outR |= inR >>> j + i & 1;
        outR <<= 1;
        outR |= inL >>> j + i & 1;
      }
    }

    out[off + 0] = outL >>> 0;
    out[off + 1] = outR >>> 0;
  };

  var pc1 = function pc1(inL, inR, out, off) {
    var outL = 0;
    var outR = 0; // 7, 15, 23, 31, 39, 47, 55, 63
    // 6, 14, 22, 30, 39, 47, 55, 63
    // 5, 13, 21, 29, 39, 47, 55, 63
    // 4, 12, 20, 28

    for (var i = 7; i >= 5; i--) {
      for (var j = 0; j <= 24; j += 8) {
        outL <<= 1;
        outL |= inR >> j + i & 1;
      }

      for (var j = 0; j <= 24; j += 8) {
        outL <<= 1;
        outL |= inL >> j + i & 1;
      }
    }

    for (var j = 0; j <= 24; j += 8) {
      outL <<= 1;
      outL |= inR >> j + i & 1;
    } // 1, 9, 17, 25, 33, 41, 49, 57
    // 2, 10, 18, 26, 34, 42, 50, 58
    // 3, 11, 19, 27, 35, 43, 51, 59
    // 36, 44, 52, 60


    for (var i = 1; i <= 3; i++) {
      for (var j = 0; j <= 24; j += 8) {
        outR <<= 1;
        outR |= inR >> j + i & 1;
      }

      for (var j = 0; j <= 24; j += 8) {
        outR <<= 1;
        outR |= inL >> j + i & 1;
      }
    }

    for (var j = 0; j <= 24; j += 8) {
      outR <<= 1;
      outR |= inL >> j + i & 1;
    }

    out[off + 0] = outL >>> 0;
    out[off + 1] = outR >>> 0;
  };

  var r28shl = function r28shl(num, shift) {
    return num << shift & 0xfffffff | num >>> 28 - shift;
  };

  var pc2table = [// inL => outL
  14, 11, 17, 4, 27, 23, 25, 0, 13, 22, 7, 18, 5, 9, 16, 24, 2, 20, 12, 21, 1, 8, 15, 26, // inR => outR
  15, 4, 25, 19, 9, 1, 26, 16, 5, 11, 23, 8, 12, 7, 17, 0, 22, 3, 10, 14, 6, 20, 27, 24];

  var pc2 = function pc2(inL, inR, out, off) {
    var outL = 0;
    var outR = 0;
    var len = pc2table.length >>> 1;

    for (var i = 0; i < len; i++) {
      outL <<= 1;
      outL |= inL >>> pc2table[i] & 0x1;
    }

    for (var i = len; i < pc2table.length; i++) {
      outR <<= 1;
      outR |= inR >>> pc2table[i] & 0x1;
    }

    out[off + 0] = outL >>> 0;
    out[off + 1] = outR >>> 0;
  };

  var expand = function expand(r, out, off) {
    var outL = 0;
    var outR = 0;
    outL = (r & 1) << 5 | r >>> 27;

    for (var i = 23; i >= 15; i -= 4) {
      outL <<= 6;
      outL |= r >>> i & 0x3f;
    }

    for (var i = 11; i >= 3; i -= 4) {
      outR |= r >>> i & 0x3f;
      outR <<= 6;
    }

    outR |= (r & 0x1f) << 1 | r >>> 31;
    out[off + 0] = outL >>> 0;
    out[off + 1] = outR >>> 0;
  };

  var sTable = [14, 0, 4, 15, 13, 7, 1, 4, 2, 14, 15, 2, 11, 13, 8, 1, 3, 10, 10, 6, 6, 12, 12, 11, 5, 9, 9, 5, 0, 3, 7, 8, 4, 15, 1, 12, 14, 8, 8, 2, 13, 4, 6, 9, 2, 1, 11, 7, 15, 5, 12, 11, 9, 3, 7, 14, 3, 10, 10, 0, 5, 6, 0, 13, 15, 3, 1, 13, 8, 4, 14, 7, 6, 15, 11, 2, 3, 8, 4, 14, 9, 12, 7, 0, 2, 1, 13, 10, 12, 6, 0, 9, 5, 11, 10, 5, 0, 13, 14, 8, 7, 10, 11, 1, 10, 3, 4, 15, 13, 4, 1, 2, 5, 11, 8, 6, 12, 7, 6, 12, 9, 0, 3, 5, 2, 14, 15, 9, 10, 13, 0, 7, 9, 0, 14, 9, 6, 3, 3, 4, 15, 6, 5, 10, 1, 2, 13, 8, 12, 5, 7, 14, 11, 12, 4, 11, 2, 15, 8, 1, 13, 1, 6, 10, 4, 13, 9, 0, 8, 6, 15, 9, 3, 8, 0, 7, 11, 4, 1, 15, 2, 14, 12, 3, 5, 11, 10, 5, 14, 2, 7, 12, 7, 13, 13, 8, 14, 11, 3, 5, 0, 6, 6, 15, 9, 0, 10, 3, 1, 4, 2, 7, 8, 2, 5, 12, 11, 1, 12, 10, 4, 14, 15, 9, 10, 3, 6, 15, 9, 0, 0, 6, 12, 10, 11, 1, 7, 13, 13, 8, 15, 9, 1, 4, 3, 5, 14, 11, 5, 12, 2, 7, 8, 2, 4, 14, 2, 14, 12, 11, 4, 2, 1, 12, 7, 4, 10, 7, 11, 13, 6, 1, 8, 5, 5, 0, 3, 15, 15, 10, 13, 3, 0, 9, 14, 8, 9, 6, 4, 11, 2, 8, 1, 12, 11, 7, 10, 1, 13, 14, 7, 2, 8, 13, 15, 6, 9, 15, 12, 0, 5, 9, 6, 10, 3, 4, 0, 5, 14, 3, 12, 10, 1, 15, 10, 4, 15, 2, 9, 7, 2, 12, 6, 9, 8, 5, 0, 6, 13, 1, 3, 13, 4, 14, 14, 0, 7, 11, 5, 3, 11, 8, 9, 4, 14, 3, 15, 2, 5, 12, 2, 9, 8, 5, 12, 15, 3, 10, 7, 11, 0, 14, 4, 1, 10, 7, 1, 6, 13, 0, 11, 8, 6, 13, 4, 13, 11, 0, 2, 11, 14, 7, 15, 4, 0, 9, 8, 1, 13, 10, 3, 14, 12, 3, 9, 5, 7, 12, 5, 2, 10, 15, 6, 8, 1, 6, 1, 6, 4, 11, 11, 13, 13, 8, 12, 1, 3, 4, 7, 10, 14, 7, 10, 9, 15, 5, 6, 0, 8, 15, 0, 14, 5, 2, 9, 3, 2, 12, 13, 1, 2, 15, 8, 13, 4, 8, 6, 10, 15, 3, 11, 7, 1, 4, 10, 12, 9, 5, 3, 6, 14, 11, 5, 0, 0, 14, 12, 9, 7, 2, 7, 2, 11, 1, 4, 14, 1, 7, 9, 4, 12, 10, 14, 8, 2, 13, 0, 15, 6, 12, 10, 9, 13, 0, 15, 3, 3, 5, 5, 6, 8, 11];

  var substitute = function substitute(inL, inR) {
    var out = 0;

    for (var i = 0; i < 4; i++) {
      var b = inL >>> 18 - i * 6 & 0x3f;
      var sb = sTable[i * 0x40 + b];
      out <<= 4;
      out |= sb;
    }

    for (var i = 0; i < 4; i++) {
      var b = inR >>> 18 - i * 6 & 0x3f;
      var sb = sTable[4 * 0x40 + i * 0x40 + b];
      out <<= 4;
      out |= sb;
    }

    return out >>> 0;
  };

  var permuteTable = [16, 25, 12, 11, 3, 20, 4, 15, 31, 17, 9, 6, 27, 14, 1, 22, 30, 24, 8, 18, 0, 5, 29, 23, 13, 19, 2, 26, 10, 21, 28, 7];

  var permute = function permute(num) {
    var out = 0;

    for (var i = 0; i < permuteTable.length; i++) {
      out <<= 1;
      out |= num >>> permuteTable[i] & 0x1;
    }

    return out >>> 0;
  };

  var padSplit = function padSplit(num, size, group) {
    var str = num.toString(2);

    while (str.length < size) {
      str = '0' + str;
    }

    var out = [];

    for (var i = 0; i < size; i += group) {
      out.push(str.slice(i, i + group));
    }

    return out.join(' ');
  };

  var utils = {
    readUInt32BE: readUInt32BE,
    writeUInt32BE: writeUInt32BE,
    ip: ip,
    rip: rip,
    pc1: pc1,
    r28shl: r28shl,
    pc2: pc2,
    expand: expand,
    substitute: substitute,
    permute: permute,
    padSplit: padSplit
  };

  var minimalisticAssert = assert$1;

  function assert$1(val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  assert$1.equal = function assertEqual(l, r, msg) {
    if (l != r) throw new Error(msg || 'Assertion failed: ' + l + ' != ' + r);
  };

  function Cipher(options) {
    this.options = options;
    this.type = this.options.type;
    this.blockSize = 8;

    this._init();

    this.buffer = new Array(this.blockSize);
    this.bufferOff = 0;
  }

  var cipher = Cipher;

  Cipher.prototype._init = function _init() {// Might be overrided
  };

  Cipher.prototype.update = function update(data) {
    if (data.length === 0) return [];
    if (this.type === 'decrypt') return this._updateDecrypt(data);else return this._updateEncrypt(data);
  };

  Cipher.prototype._buffer = function _buffer(data, off) {
    // Append data to buffer
    var min = Math.min(this.buffer.length - this.bufferOff, data.length - off);

    for (var i = 0; i < min; i++) {
      this.buffer[this.bufferOff + i] = data[off + i];
    }

    this.bufferOff += min; // Shift next

    return min;
  };

  Cipher.prototype._flushBuffer = function _flushBuffer(out, off) {
    this._update(this.buffer, 0, out, off);

    this.bufferOff = 0;
    return this.blockSize;
  };

  Cipher.prototype._updateEncrypt = function _updateEncrypt(data) {
    var inputOff = 0;
    var outputOff = 0;
    var count = (this.bufferOff + data.length) / this.blockSize | 0;
    var out = new Array(count * this.blockSize);

    if (this.bufferOff !== 0) {
      inputOff += this._buffer(data, inputOff);
      if (this.bufferOff === this.buffer.length) outputOff += this._flushBuffer(out, outputOff);
    } // Write blocks


    var max = data.length - (data.length - inputOff) % this.blockSize;

    for (; inputOff < max; inputOff += this.blockSize) {
      this._update(data, inputOff, out, outputOff);

      outputOff += this.blockSize;
    } // Queue rest


    for (; inputOff < data.length; inputOff++, this.bufferOff++) {
      this.buffer[this.bufferOff] = data[inputOff];
    }

    return out;
  };

  Cipher.prototype._updateDecrypt = function _updateDecrypt(data) {
    var inputOff = 0;
    var outputOff = 0;
    var count = Math.ceil((this.bufferOff + data.length) / this.blockSize) - 1;
    var out = new Array(count * this.blockSize); // TODO(indutny): optimize it, this is far from optimal

    for (; count > 0; count--) {
      inputOff += this._buffer(data, inputOff);
      outputOff += this._flushBuffer(out, outputOff);
    } // Buffer rest of the input


    inputOff += this._buffer(data, inputOff);
    return out;
  };

  Cipher.prototype["final"] = function _final(buffer) {
    var first;
    if (buffer) first = this.update(buffer);
    var last;
    if (this.type === 'encrypt') last = this._finalEncrypt();else last = this._finalDecrypt();
    if (first) return first.concat(last);else return last;
  };

  Cipher.prototype._pad = function _pad(buffer, off) {
    if (off === 0) return false;

    while (off < buffer.length) {
      buffer[off++] = 0;
    }

    return true;
  };

  Cipher.prototype._finalEncrypt = function _finalEncrypt() {
    if (!this._pad(this.buffer, this.bufferOff)) return [];
    var out = new Array(this.blockSize);

    this._update(this.buffer, 0, out, 0);

    return out;
  };

  Cipher.prototype._unpad = function _unpad(buffer) {
    return buffer;
  };

  Cipher.prototype._finalDecrypt = function _finalDecrypt() {
    minimalisticAssert.equal(this.bufferOff, this.blockSize, 'Not enough data to decrypt');
    var out = new Array(this.blockSize);

    this._flushBuffer(out, 0);

    return this._unpad(out);
  };

  function DESState() {
    this.tmp = new Array(2);
    this.keys = null;
  }

  function DES(options) {
    cipher.call(this, options);
    var state = new DESState();
    this._desState = state;
    this.deriveKeys(state, options.key);
  }

  inherits_browser(DES, cipher);
  var des = DES;

  DES.create = function create(options) {
    return new DES(options);
  };

  var shiftTable = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

  DES.prototype.deriveKeys = function deriveKeys(state, key) {
    state.keys = new Array(16 * 2);
    minimalisticAssert.equal(key.length, this.blockSize, 'Invalid key length');
    var kL = utils.readUInt32BE(key, 0);
    var kR = utils.readUInt32BE(key, 4);
    utils.pc1(kL, kR, state.tmp, 0);
    kL = state.tmp[0];
    kR = state.tmp[1];

    for (var i = 0; i < state.keys.length; i += 2) {
      var shift = shiftTable[i >>> 1];
      kL = utils.r28shl(kL, shift);
      kR = utils.r28shl(kR, shift);
      utils.pc2(kL, kR, state.keys, i);
    }
  };

  DES.prototype._update = function _update(inp, inOff, out, outOff) {
    var state = this._desState;
    var l = utils.readUInt32BE(inp, inOff);
    var r = utils.readUInt32BE(inp, inOff + 4); // Initial Permutation

    utils.ip(l, r, state.tmp, 0);
    l = state.tmp[0];
    r = state.tmp[1];
    if (this.type === 'encrypt') this._encrypt(state, l, r, state.tmp, 0);else this._decrypt(state, l, r, state.tmp, 0);
    l = state.tmp[0];
    r = state.tmp[1];
    utils.writeUInt32BE(out, l, outOff);
    utils.writeUInt32BE(out, r, outOff + 4);
  };

  DES.prototype._pad = function _pad(buffer, off) {
    var value = buffer.length - off;

    for (var i = off; i < buffer.length; i++) {
      buffer[i] = value;
    }

    return true;
  };

  DES.prototype._unpad = function _unpad(buffer) {
    var pad = buffer[buffer.length - 1];

    for (var i = buffer.length - pad; i < buffer.length; i++) {
      minimalisticAssert.equal(buffer[i], pad);
    }

    return buffer.slice(0, buffer.length - pad);
  };

  DES.prototype._encrypt = function _encrypt(state, lStart, rStart, out, off) {
    var l = lStart;
    var r = rStart; // Apply f() x16 times

    for (var i = 0; i < state.keys.length; i += 2) {
      var keyL = state.keys[i];
      var keyR = state.keys[i + 1]; // f(r, k)

      utils.expand(r, state.tmp, 0);
      keyL ^= state.tmp[0];
      keyR ^= state.tmp[1];
      var s = utils.substitute(keyL, keyR);
      var f = utils.permute(s);
      var t = r;
      r = (l ^ f) >>> 0;
      l = t;
    } // Reverse Initial Permutation


    utils.rip(r, l, out, off);
  };

  DES.prototype._decrypt = function _decrypt(state, lStart, rStart, out, off) {
    var l = rStart;
    var r = lStart; // Apply f() x16 times

    for (var i = state.keys.length - 2; i >= 0; i -= 2) {
      var keyL = state.keys[i];
      var keyR = state.keys[i + 1]; // f(r, k)

      utils.expand(l, state.tmp, 0);
      keyL ^= state.tmp[0];
      keyR ^= state.tmp[1];
      var s = utils.substitute(keyL, keyR);
      var f = utils.permute(s);
      var t = l;
      l = (r ^ f) >>> 0;
      r = t;
    } // Reverse Initial Permutation


    utils.rip(l, r, out, off);
  };

  var proto = {};

  function CBCState(iv) {
    minimalisticAssert.equal(iv.length, 8, 'Invalid IV length');
    this.iv = new Array(8);

    for (var i = 0; i < this.iv.length; i++) {
      this.iv[i] = iv[i];
    }
  }

  function instantiate(Base) {
    function CBC(options) {
      Base.call(this, options);

      this._cbcInit();
    }

    inherits_browser(CBC, Base);
    var keys = Object.keys(proto);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      CBC.prototype[key] = proto[key];
    }

    CBC.create = function create(options) {
      return new CBC(options);
    };

    return CBC;
  }

  var instantiate_1 = instantiate;

  proto._cbcInit = function _cbcInit() {
    var state = new CBCState(this.options.iv);
    this._cbcState = state;
  };

  proto._update = function _update(inp, inOff, out, outOff) {
    var state = this._cbcState;
    var superProto = this.constructor.super_.prototype;
    var iv = state.iv;

    if (this.type === 'encrypt') {
      for (var i = 0; i < this.blockSize; i++) {
        iv[i] ^= inp[inOff + i];
      }

      superProto._update.call(this, iv, 0, out, outOff);

      for (var i = 0; i < this.blockSize; i++) {
        iv[i] = out[outOff + i];
      }
    } else {
      superProto._update.call(this, inp, inOff, out, outOff);

      for (var i = 0; i < this.blockSize; i++) {
        out[outOff + i] ^= iv[i];
      }

      for (var i = 0; i < this.blockSize; i++) {
        iv[i] = inp[inOff + i];
      }
    }
  };

  var cbc = {
    instantiate: instantiate_1
  };

  function EDEState(type, key) {
    minimalisticAssert.equal(key.length, 24, 'Invalid key length');
    var k1 = key.slice(0, 8);
    var k2 = key.slice(8, 16);
    var k3 = key.slice(16, 24);

    if (type === 'encrypt') {
      this.ciphers = [des.create({
        type: 'encrypt',
        key: k1
      }), des.create({
        type: 'decrypt',
        key: k2
      }), des.create({
        type: 'encrypt',
        key: k3
      })];
    } else {
      this.ciphers = [des.create({
        type: 'decrypt',
        key: k3
      }), des.create({
        type: 'encrypt',
        key: k2
      }), des.create({
        type: 'decrypt',
        key: k1
      })];
    }
  }

  function EDE(options) {
    cipher.call(this, options);
    var state = new EDEState(this.type, this.options.key);
    this._edeState = state;
  }

  inherits_browser(EDE, cipher);
  var ede = EDE;

  EDE.create = function create(options) {
    return new EDE(options);
  };

  EDE.prototype._update = function _update(inp, inOff, out, outOff) {
    var state = this._edeState;

    state.ciphers[0]._update(inp, inOff, out, outOff);

    state.ciphers[1]._update(out, outOff, out, outOff);

    state.ciphers[2]._update(out, outOff, out, outOff);
  };

  EDE.prototype._pad = des.prototype._pad;
  EDE.prototype._unpad = des.prototype._unpad;

  var utils$1 = utils;
  var Cipher$1 = cipher;
  var DES$1 = des;
  var CBC = cbc;
  var EDE$1 = ede;
  var des$1 = {
    utils: utils$1,
    Cipher: Cipher$1,
    DES: DES$1,
    CBC: CBC,
    EDE: EDE$1
  };

  var Buffer$g = safeBuffer.Buffer;
  var modes = {
    'des-ede3-cbc': des$1.CBC.instantiate(des$1.EDE),
    'des-ede3': des$1.EDE,
    'des-ede-cbc': des$1.CBC.instantiate(des$1.EDE),
    'des-ede': des$1.EDE,
    'des-cbc': des$1.CBC.instantiate(des$1.DES),
    'des-ecb': des$1.DES
  };
  modes.des = modes['des-cbc'];
  modes.des3 = modes['des-ede3-cbc'];
  var browserifyDes = DES$2;
  inherits_browser(DES$2, cipherBase);

  function DES$2(opts) {
    cipherBase.call(this);
    var modeName = opts.mode.toLowerCase();
    var mode = modes[modeName];
    var type;

    if (opts.decrypt) {
      type = 'decrypt';
    } else {
      type = 'encrypt';
    }

    var key = opts.key;

    if (!Buffer$g.isBuffer(key)) {
      key = Buffer$g.from(key);
    }

    if (modeName === 'des-ede' || modeName === 'des-ede-cbc') {
      key = Buffer$g.concat([key, key.slice(0, 8)]);
    }

    var iv = opts.iv;

    if (!Buffer$g.isBuffer(iv)) {
      iv = Buffer$g.from(iv);
    }

    this._des = mode.create({
      key: key,
      iv: iv,
      type: type
    });
  }

  DES$2.prototype._update = function (data) {
    return Buffer$g.from(this._des.update(data));
  };

  DES$2.prototype._final = function () {
    return Buffer$g.from(this._des["final"]());
  };

  var encrypt = function encrypt(self, block) {
    return self._cipher.encryptBlock(block);
  };

  var decrypt = function decrypt(self, block) {
    return self._cipher.decryptBlock(block);
  };

  var ecb = {
    encrypt: encrypt,
    decrypt: decrypt
  };

  var bufferXor = function xor(a, b) {
    var length = Math.min(a.length, b.length);
    var buffer = new Buffer(length);

    for (var i = 0; i < length; ++i) {
      buffer[i] = a[i] ^ b[i];
    }

    return buffer;
  };

  var encrypt$1 = function encrypt(self, block) {
    var data = bufferXor(block, self._prev);
    self._prev = self._cipher.encryptBlock(data);
    return self._prev;
  };

  var decrypt$1 = function decrypt(self, block) {
    var pad = self._prev;
    self._prev = block;

    var out = self._cipher.decryptBlock(block);

    return bufferXor(out, pad);
  };

  var cbc$1 = {
    encrypt: encrypt$1,
    decrypt: decrypt$1
  };

  var Buffer$h = safeBuffer.Buffer;

  function encryptStart(self, data, decrypt) {
    var len = data.length;
    var out = bufferXor(data, self._cache);
    self._cache = self._cache.slice(len);
    self._prev = Buffer$h.concat([self._prev, decrypt ? data : out]);
    return out;
  }

  var encrypt$2 = function encrypt(self, data, decrypt) {
    var out = Buffer$h.allocUnsafe(0);
    var len;

    while (data.length) {
      if (self._cache.length === 0) {
        self._cache = self._cipher.encryptBlock(self._prev);
        self._prev = Buffer$h.allocUnsafe(0);
      }

      if (self._cache.length <= data.length) {
        len = self._cache.length;
        out = Buffer$h.concat([out, encryptStart(self, data.slice(0, len), decrypt)]);
        data = data.slice(len);
      } else {
        out = Buffer$h.concat([out, encryptStart(self, data, decrypt)]);
        break;
      }
    }

    return out;
  };

  var cfb = {
    encrypt: encrypt$2
  };

  var Buffer$i = safeBuffer.Buffer;

  function encryptByte(self, byteParam, decrypt) {
    var pad = self._cipher.encryptBlock(self._prev);

    var out = pad[0] ^ byteParam;
    self._prev = Buffer$i.concat([self._prev.slice(1), Buffer$i.from([decrypt ? byteParam : out])]);
    return out;
  }

  var encrypt$3 = function encrypt(self, chunk, decrypt) {
    var len = chunk.length;
    var out = Buffer$i.allocUnsafe(len);
    var i = -1;

    while (++i < len) {
      out[i] = encryptByte(self, chunk[i], decrypt);
    }

    return out;
  };

  var cfb8 = {
    encrypt: encrypt$3
  };

  var Buffer$j = safeBuffer.Buffer;

  function encryptByte$1(self, byteParam, decrypt) {
    var pad;
    var i = -1;
    var len = 8;
    var out = 0;
    var bit, value;

    while (++i < len) {
      pad = self._cipher.encryptBlock(self._prev);
      bit = byteParam & 1 << 7 - i ? 0x80 : 0;
      value = pad[0] ^ bit;
      out += (value & 0x80) >> i % 8;
      self._prev = shiftIn(self._prev, decrypt ? bit : value);
    }

    return out;
  }

  function shiftIn(buffer, value) {
    var len = buffer.length;
    var i = -1;
    var out = Buffer$j.allocUnsafe(buffer.length);
    buffer = Buffer$j.concat([buffer, Buffer$j.from([value])]);

    while (++i < len) {
      out[i] = buffer[i] << 1 | buffer[i + 1] >> 7;
    }

    return out;
  }

  var encrypt$4 = function encrypt(self, chunk, decrypt) {
    var len = chunk.length;
    var out = Buffer$j.allocUnsafe(len);
    var i = -1;

    while (++i < len) {
      out[i] = encryptByte$1(self, chunk[i], decrypt);
    }

    return out;
  };

  var cfb1 = {
    encrypt: encrypt$4
  };

  function getBlock(self) {
    self._prev = self._cipher.encryptBlock(self._prev);
    return self._prev;
  }

  var encrypt$5 = function encrypt(self, chunk) {
    while (self._cache.length < chunk.length) {
      self._cache = Buffer.concat([self._cache, getBlock(self)]);
    }

    var pad = self._cache.slice(0, chunk.length);

    self._cache = self._cache.slice(chunk.length);
    return bufferXor(chunk, pad);
  };

  var ofb = {
    encrypt: encrypt$5
  };

  function incr32(iv) {
    var len = iv.length;
    var item;

    while (len--) {
      item = iv.readUInt8(len);

      if (item === 255) {
        iv.writeUInt8(0, len);
      } else {
        item++;
        iv.writeUInt8(item, len);
        break;
      }
    }
  }

  var incr32_1 = incr32;

  var Buffer$k = safeBuffer.Buffer;

  function getBlock$1(self) {
    var out = self._cipher.encryptBlockRaw(self._prev);

    incr32_1(self._prev);
    return out;
  }

  var blockSize = 16;

  var encrypt$6 = function encrypt(self, chunk) {
    var chunkNum = Math.ceil(chunk.length / blockSize);
    var start = self._cache.length;
    self._cache = Buffer$k.concat([self._cache, Buffer$k.allocUnsafe(chunkNum * blockSize)]);

    for (var i = 0; i < chunkNum; i++) {
      var out = getBlock$1(self);
      var offset = start + i * blockSize;

      self._cache.writeUInt32BE(out[0], offset + 0);

      self._cache.writeUInt32BE(out[1], offset + 4);

      self._cache.writeUInt32BE(out[2], offset + 8);

      self._cache.writeUInt32BE(out[3], offset + 12);
    }

    var pad = self._cache.slice(0, chunk.length);

    self._cache = self._cache.slice(chunk.length);
    return bufferXor(chunk, pad);
  };

  var ctr = {
    encrypt: encrypt$6
  };

  var aes128 = {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  };
  var aes192 = {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  };
  var aes256 = {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  };
  var list = {
  	"aes-128-ecb": {
  	cipher: "AES",
  	key: 128,
  	iv: 0,
  	mode: "ECB",
  	type: "block"
  },
  	"aes-192-ecb": {
  	cipher: "AES",
  	key: 192,
  	iv: 0,
  	mode: "ECB",
  	type: "block"
  },
  	"aes-256-ecb": {
  	cipher: "AES",
  	key: 256,
  	iv: 0,
  	mode: "ECB",
  	type: "block"
  },
  	"aes-128-cbc": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  },
  	"aes-192-cbc": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  },
  	"aes-256-cbc": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CBC",
  	type: "block"
  },
  	aes128: aes128,
  	aes192: aes192,
  	aes256: aes256,
  	"aes-128-cfb": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CFB",
  	type: "stream"
  },
  	"aes-192-cfb": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CFB",
  	type: "stream"
  },
  	"aes-256-cfb": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CFB",
  	type: "stream"
  },
  	"aes-128-cfb8": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CFB8",
  	type: "stream"
  },
  	"aes-192-cfb8": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CFB8",
  	type: "stream"
  },
  	"aes-256-cfb8": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CFB8",
  	type: "stream"
  },
  	"aes-128-cfb1": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CFB1",
  	type: "stream"
  },
  	"aes-192-cfb1": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CFB1",
  	type: "stream"
  },
  	"aes-256-cfb1": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CFB1",
  	type: "stream"
  },
  	"aes-128-ofb": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "OFB",
  	type: "stream"
  },
  	"aes-192-ofb": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "OFB",
  	type: "stream"
  },
  	"aes-256-ofb": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "OFB",
  	type: "stream"
  },
  	"aes-128-ctr": {
  	cipher: "AES",
  	key: 128,
  	iv: 16,
  	mode: "CTR",
  	type: "stream"
  },
  	"aes-192-ctr": {
  	cipher: "AES",
  	key: 192,
  	iv: 16,
  	mode: "CTR",
  	type: "stream"
  },
  	"aes-256-ctr": {
  	cipher: "AES",
  	key: 256,
  	iv: 16,
  	mode: "CTR",
  	type: "stream"
  },
  	"aes-128-gcm": {
  	cipher: "AES",
  	key: 128,
  	iv: 12,
  	mode: "GCM",
  	type: "auth"
  },
  	"aes-192-gcm": {
  	cipher: "AES",
  	key: 192,
  	iv: 12,
  	mode: "GCM",
  	type: "auth"
  },
  	"aes-256-gcm": {
  	cipher: "AES",
  	key: 256,
  	iv: 12,
  	mode: "GCM",
  	type: "auth"
  }
  };

  var list$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    aes128: aes128,
    aes192: aes192,
    aes256: aes256,
    'default': list
  });

  var modes$1 = getCjsExportFromNamespace(list$1);

  var modeModules = {
    ECB: ecb,
    CBC: cbc$1,
    CFB: cfb,
    CFB8: cfb8,
    CFB1: cfb1,
    OFB: ofb,
    CTR: ctr,
    GCM: ctr
  };

  for (var key in modes$1) {
    modes$1[key].module = modeModules[modes$1[key].mode];
  }

  var modes_1 = modes$1;

  // https://github.com/keybase/triplesec
  // which is in turn based on the one from crypto-js
  // https://code.google.com/p/crypto-js/

  var Buffer$l = safeBuffer.Buffer;

  function asUInt32Array(buf) {
    if (!Buffer$l.isBuffer(buf)) buf = Buffer$l.from(buf);
    var len = buf.length / 4 | 0;
    var out = new Array(len);

    for (var i = 0; i < len; i++) {
      out[i] = buf.readUInt32BE(i * 4);
    }

    return out;
  }

  function scrubVec(v) {
    for (var i = 0; i < v.length; v++) {
      v[i] = 0;
    }
  }

  function cryptBlock(M, keySchedule, SUB_MIX, SBOX, nRounds) {
    var SUB_MIX0 = SUB_MIX[0];
    var SUB_MIX1 = SUB_MIX[1];
    var SUB_MIX2 = SUB_MIX[2];
    var SUB_MIX3 = SUB_MIX[3];
    var s0 = M[0] ^ keySchedule[0];
    var s1 = M[1] ^ keySchedule[1];
    var s2 = M[2] ^ keySchedule[2];
    var s3 = M[3] ^ keySchedule[3];
    var t0, t1, t2, t3;
    var ksRow = 4;

    for (var round = 1; round < nRounds; round++) {
      t0 = SUB_MIX0[s0 >>> 24] ^ SUB_MIX1[s1 >>> 16 & 0xff] ^ SUB_MIX2[s2 >>> 8 & 0xff] ^ SUB_MIX3[s3 & 0xff] ^ keySchedule[ksRow++];
      t1 = SUB_MIX0[s1 >>> 24] ^ SUB_MIX1[s2 >>> 16 & 0xff] ^ SUB_MIX2[s3 >>> 8 & 0xff] ^ SUB_MIX3[s0 & 0xff] ^ keySchedule[ksRow++];
      t2 = SUB_MIX0[s2 >>> 24] ^ SUB_MIX1[s3 >>> 16 & 0xff] ^ SUB_MIX2[s0 >>> 8 & 0xff] ^ SUB_MIX3[s1 & 0xff] ^ keySchedule[ksRow++];
      t3 = SUB_MIX0[s3 >>> 24] ^ SUB_MIX1[s0 >>> 16 & 0xff] ^ SUB_MIX2[s1 >>> 8 & 0xff] ^ SUB_MIX3[s2 & 0xff] ^ keySchedule[ksRow++];
      s0 = t0;
      s1 = t1;
      s2 = t2;
      s3 = t3;
    }

    t0 = (SBOX[s0 >>> 24] << 24 | SBOX[s1 >>> 16 & 0xff] << 16 | SBOX[s2 >>> 8 & 0xff] << 8 | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
    t1 = (SBOX[s1 >>> 24] << 24 | SBOX[s2 >>> 16 & 0xff] << 16 | SBOX[s3 >>> 8 & 0xff] << 8 | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
    t2 = (SBOX[s2 >>> 24] << 24 | SBOX[s3 >>> 16 & 0xff] << 16 | SBOX[s0 >>> 8 & 0xff] << 8 | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
    t3 = (SBOX[s3 >>> 24] << 24 | SBOX[s0 >>> 16 & 0xff] << 16 | SBOX[s1 >>> 8 & 0xff] << 8 | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];
    t0 = t0 >>> 0;
    t1 = t1 >>> 0;
    t2 = t2 >>> 0;
    t3 = t3 >>> 0;
    return [t0, t1, t2, t3];
  } // AES constants


  var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

  var G = function () {
    // Compute double table
    var d = new Array(256);

    for (var j = 0; j < 256; j++) {
      if (j < 128) {
        d[j] = j << 1;
      } else {
        d[j] = j << 1 ^ 0x11b;
      }
    }

    var SBOX = [];
    var INV_SBOX = [];
    var SUB_MIX = [[], [], [], []];
    var INV_SUB_MIX = [[], [], [], []]; // Walk GF(2^8)

    var x = 0;
    var xi = 0;

    for (var i = 0; i < 256; ++i) {
      // Compute sbox
      var sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
      sx = sx >>> 8 ^ sx & 0xff ^ 0x63;
      SBOX[x] = sx;
      INV_SBOX[sx] = x; // Compute multiplication

      var x2 = d[x];
      var x4 = d[x2];
      var x8 = d[x4]; // Compute sub bytes, mix columns tables

      var t = d[sx] * 0x101 ^ sx * 0x1010100;
      SUB_MIX[0][x] = t << 24 | t >>> 8;
      SUB_MIX[1][x] = t << 16 | t >>> 16;
      SUB_MIX[2][x] = t << 8 | t >>> 24;
      SUB_MIX[3][x] = t; // Compute inv sub bytes, inv mix columns tables

      t = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
      INV_SUB_MIX[0][sx] = t << 24 | t >>> 8;
      INV_SUB_MIX[1][sx] = t << 16 | t >>> 16;
      INV_SUB_MIX[2][sx] = t << 8 | t >>> 24;
      INV_SUB_MIX[3][sx] = t;

      if (x === 0) {
        x = xi = 1;
      } else {
        x = x2 ^ d[d[d[x8 ^ x2]]];
        xi ^= d[d[xi]];
      }
    }

    return {
      SBOX: SBOX,
      INV_SBOX: INV_SBOX,
      SUB_MIX: SUB_MIX,
      INV_SUB_MIX: INV_SUB_MIX
    };
  }();

  function AES(key) {
    this._key = asUInt32Array(key);

    this._reset();
  }

  AES.blockSize = 4 * 4;
  AES.keySize = 256 / 8;
  AES.prototype.blockSize = AES.blockSize;
  AES.prototype.keySize = AES.keySize;

  AES.prototype._reset = function () {
    var keyWords = this._key;
    var keySize = keyWords.length;
    var nRounds = keySize + 6;
    var ksRows = (nRounds + 1) * 4;
    var keySchedule = [];

    for (var k = 0; k < keySize; k++) {
      keySchedule[k] = keyWords[k];
    }

    for (k = keySize; k < ksRows; k++) {
      var t = keySchedule[k - 1];

      if (k % keySize === 0) {
        t = t << 8 | t >>> 24;
        t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 0xff] << 16 | G.SBOX[t >>> 8 & 0xff] << 8 | G.SBOX[t & 0xff];
        t ^= RCON[k / keySize | 0] << 24;
      } else if (keySize > 6 && k % keySize === 4) {
        t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 0xff] << 16 | G.SBOX[t >>> 8 & 0xff] << 8 | G.SBOX[t & 0xff];
      }

      keySchedule[k] = keySchedule[k - keySize] ^ t;
    }

    var invKeySchedule = [];

    for (var ik = 0; ik < ksRows; ik++) {
      var ksR = ksRows - ik;
      var tt = keySchedule[ksR - (ik % 4 ? 0 : 4)];

      if (ik < 4 || ksR <= 4) {
        invKeySchedule[ik] = tt;
      } else {
        invKeySchedule[ik] = G.INV_SUB_MIX[0][G.SBOX[tt >>> 24]] ^ G.INV_SUB_MIX[1][G.SBOX[tt >>> 16 & 0xff]] ^ G.INV_SUB_MIX[2][G.SBOX[tt >>> 8 & 0xff]] ^ G.INV_SUB_MIX[3][G.SBOX[tt & 0xff]];
      }
    }

    this._nRounds = nRounds;
    this._keySchedule = keySchedule;
    this._invKeySchedule = invKeySchedule;
  };

  AES.prototype.encryptBlockRaw = function (M) {
    M = asUInt32Array(M);
    return cryptBlock(M, this._keySchedule, G.SUB_MIX, G.SBOX, this._nRounds);
  };

  AES.prototype.encryptBlock = function (M) {
    var out = this.encryptBlockRaw(M);
    var buf = Buffer$l.allocUnsafe(16);
    buf.writeUInt32BE(out[0], 0);
    buf.writeUInt32BE(out[1], 4);
    buf.writeUInt32BE(out[2], 8);
    buf.writeUInt32BE(out[3], 12);
    return buf;
  };

  AES.prototype.decryptBlock = function (M) {
    M = asUInt32Array(M); // swap

    var m1 = M[1];
    M[1] = M[3];
    M[3] = m1;
    var out = cryptBlock(M, this._invKeySchedule, G.INV_SUB_MIX, G.INV_SBOX, this._nRounds);
    var buf = Buffer$l.allocUnsafe(16);
    buf.writeUInt32BE(out[0], 0);
    buf.writeUInt32BE(out[3], 4);
    buf.writeUInt32BE(out[2], 8);
    buf.writeUInt32BE(out[1], 12);
    return buf;
  };

  AES.prototype.scrub = function () {
    scrubVec(this._keySchedule);
    scrubVec(this._invKeySchedule);
    scrubVec(this._key);
  };

  var AES_1 = AES;
  var aes = {
    AES: AES_1
  };

  var Buffer$m = safeBuffer.Buffer;
  var ZEROES = Buffer$m.alloc(16, 0);

  function toArray(buf) {
    return [buf.readUInt32BE(0), buf.readUInt32BE(4), buf.readUInt32BE(8), buf.readUInt32BE(12)];
  }

  function fromArray(out) {
    var buf = Buffer$m.allocUnsafe(16);
    buf.writeUInt32BE(out[0] >>> 0, 0);
    buf.writeUInt32BE(out[1] >>> 0, 4);
    buf.writeUInt32BE(out[2] >>> 0, 8);
    buf.writeUInt32BE(out[3] >>> 0, 12);
    return buf;
  }

  function GHASH(key) {
    this.h = key;
    this.state = Buffer$m.alloc(16, 0);
    this.cache = Buffer$m.allocUnsafe(0);
  } // from http://bitwiseshiftleft.github.io/sjcl/doc/symbols/src/core_gcm.js.html
  // by Juho Vähä-Herttua


  GHASH.prototype.ghash = function (block) {
    var i = -1;

    while (++i < block.length) {
      this.state[i] ^= block[i];
    }

    this._multiply();
  };

  GHASH.prototype._multiply = function () {
    var Vi = toArray(this.h);
    var Zi = [0, 0, 0, 0];
    var j, xi, lsbVi;
    var i = -1;

    while (++i < 128) {
      xi = (this.state[~~(i / 8)] & 1 << 7 - i % 8) !== 0;

      if (xi) {
        // Z_i+1 = Z_i ^ V_i
        Zi[0] ^= Vi[0];
        Zi[1] ^= Vi[1];
        Zi[2] ^= Vi[2];
        Zi[3] ^= Vi[3];
      } // Store the value of LSB(V_i)


      lsbVi = (Vi[3] & 1) !== 0; // V_i+1 = V_i >> 1

      for (j = 3; j > 0; j--) {
        Vi[j] = Vi[j] >>> 1 | (Vi[j - 1] & 1) << 31;
      }

      Vi[0] = Vi[0] >>> 1; // If LSB(V_i) is 1, V_i+1 = (V_i >> 1) ^ R

      if (lsbVi) {
        Vi[0] = Vi[0] ^ 0xe1 << 24;
      }
    }

    this.state = fromArray(Zi);
  };

  GHASH.prototype.update = function (buf) {
    this.cache = Buffer$m.concat([this.cache, buf]);
    var chunk;

    while (this.cache.length >= 16) {
      chunk = this.cache.slice(0, 16);
      this.cache = this.cache.slice(16);
      this.ghash(chunk);
    }
  };

  GHASH.prototype["final"] = function (abl, bl) {
    if (this.cache.length) {
      this.ghash(Buffer$m.concat([this.cache, ZEROES], 16));
    }

    this.ghash(fromArray([0, abl, 0, bl]));
    return this.state;
  };

  var ghash = GHASH;

  var Buffer$n = safeBuffer.Buffer;

  function xorTest(a, b) {
    var out = 0;
    if (a.length !== b.length) out++;
    var len = Math.min(a.length, b.length);

    for (var i = 0; i < len; ++i) {
      out += a[i] ^ b[i];
    }

    return out;
  }

  function calcIv(self, iv, ck) {
    if (iv.length === 12) {
      self._finID = Buffer$n.concat([iv, Buffer$n.from([0, 0, 0, 1])]);
      return Buffer$n.concat([iv, Buffer$n.from([0, 0, 0, 2])]);
    }

    var ghash$1 = new ghash(ck);
    var len = iv.length;
    var toPad = len % 16;
    ghash$1.update(iv);

    if (toPad) {
      toPad = 16 - toPad;
      ghash$1.update(Buffer$n.alloc(toPad, 0));
    }

    ghash$1.update(Buffer$n.alloc(8, 0));
    var ivBits = len * 8;
    var tail = Buffer$n.alloc(8);
    tail.writeUIntBE(ivBits, 0, 8);
    ghash$1.update(tail);
    self._finID = ghash$1.state;
    var out = Buffer$n.from(self._finID);
    incr32_1(out);
    return out;
  }

  function StreamCipher(mode, key, iv, decrypt) {
    cipherBase.call(this);
    var h = Buffer$n.alloc(4, 0);
    this._cipher = new aes.AES(key);

    var ck = this._cipher.encryptBlock(h);

    this._ghash = new ghash(ck);
    iv = calcIv(this, iv, ck);
    this._prev = Buffer$n.from(iv);
    this._cache = Buffer$n.allocUnsafe(0);
    this._secCache = Buffer$n.allocUnsafe(0);
    this._decrypt = decrypt;
    this._alen = 0;
    this._len = 0;
    this._mode = mode;
    this._authTag = null;
    this._called = false;
  }

  inherits_browser(StreamCipher, cipherBase);

  StreamCipher.prototype._update = function (chunk) {
    if (!this._called && this._alen) {
      var rump = 16 - this._alen % 16;

      if (rump < 16) {
        rump = Buffer$n.alloc(rump, 0);

        this._ghash.update(rump);
      }
    }

    this._called = true;

    var out = this._mode.encrypt(this, chunk);

    if (this._decrypt) {
      this._ghash.update(chunk);
    } else {
      this._ghash.update(out);
    }

    this._len += chunk.length;
    return out;
  };

  StreamCipher.prototype._final = function () {
    if (this._decrypt && !this._authTag) throw new Error('Unsupported state or unable to authenticate data');
    var tag = bufferXor(this._ghash["final"](this._alen * 8, this._len * 8), this._cipher.encryptBlock(this._finID));
    if (this._decrypt && xorTest(tag, this._authTag)) throw new Error('Unsupported state or unable to authenticate data');
    this._authTag = tag;

    this._cipher.scrub();
  };

  StreamCipher.prototype.getAuthTag = function getAuthTag() {
    if (this._decrypt || !Buffer$n.isBuffer(this._authTag)) throw new Error('Attempting to get auth tag in unsupported state');
    return this._authTag;
  };

  StreamCipher.prototype.setAuthTag = function setAuthTag(tag) {
    if (!this._decrypt) throw new Error('Attempting to set auth tag in unsupported state');
    this._authTag = tag;
  };

  StreamCipher.prototype.setAAD = function setAAD(buf) {
    if (this._called) throw new Error('Attempting to set AAD in unsupported state');

    this._ghash.update(buf);

    this._alen += buf.length;
  };

  var authCipher = StreamCipher;

  var Buffer$o = safeBuffer.Buffer;

  function StreamCipher$1(mode, key, iv, decrypt) {
    cipherBase.call(this);
    this._cipher = new aes.AES(key);
    this._prev = Buffer$o.from(iv);
    this._cache = Buffer$o.allocUnsafe(0);
    this._secCache = Buffer$o.allocUnsafe(0);
    this._decrypt = decrypt;
    this._mode = mode;
  }

  inherits_browser(StreamCipher$1, cipherBase);

  StreamCipher$1.prototype._update = function (chunk) {
    return this._mode.encrypt(this, chunk, this._decrypt);
  };

  StreamCipher$1.prototype._final = function () {
    this._cipher.scrub();
  };

  var streamCipher = StreamCipher$1;

  var Buffer$p = safeBuffer.Buffer;
  /* eslint-disable camelcase */

  function EVP_BytesToKey(password, salt, keyBits, ivLen) {
    if (!Buffer$p.isBuffer(password)) password = Buffer$p.from(password, 'binary');

    if (salt) {
      if (!Buffer$p.isBuffer(salt)) salt = Buffer$p.from(salt, 'binary');
      if (salt.length !== 8) throw new RangeError('salt should be Buffer with 8 byte length');
    }

    var keyLen = keyBits / 8;
    var key = Buffer$p.alloc(keyLen);
    var iv = Buffer$p.alloc(ivLen || 0);
    var tmp = Buffer$p.alloc(0);

    while (keyLen > 0 || ivLen > 0) {
      var hash = new md5_js();
      hash.update(tmp);
      hash.update(password);
      if (salt) hash.update(salt);
      tmp = hash.digest();
      var used = 0;

      if (keyLen > 0) {
        var keyStart = key.length - keyLen;
        used = Math.min(keyLen, tmp.length);
        tmp.copy(key, keyStart, 0, used);
        keyLen -= used;
      }

      if (used < tmp.length && ivLen > 0) {
        var ivStart = iv.length - ivLen;
        var length = Math.min(ivLen, tmp.length - used);
        tmp.copy(iv, ivStart, used, used + length);
        ivLen -= length;
      }
    }

    tmp.fill(0);
    return {
      key: key,
      iv: iv
    };
  }

  var evp_bytestokey = EVP_BytesToKey;

  var Buffer$q = safeBuffer.Buffer;

  function Cipher$2(mode, key, iv) {
    cipherBase.call(this);
    this._cache = new Splitter();
    this._cipher = new aes.AES(key);
    this._prev = Buffer$q.from(iv);
    this._mode = mode;
    this._autopadding = true;
  }

  inherits_browser(Cipher$2, cipherBase);

  Cipher$2.prototype._update = function (data) {
    this._cache.add(data);

    var chunk;
    var thing;
    var out = [];

    while (chunk = this._cache.get()) {
      thing = this._mode.encrypt(this, chunk);
      out.push(thing);
    }

    return Buffer$q.concat(out);
  };

  var PADDING = Buffer$q.alloc(16, 0x10);

  Cipher$2.prototype._final = function () {
    var chunk = this._cache.flush();

    if (this._autopadding) {
      chunk = this._mode.encrypt(this, chunk);

      this._cipher.scrub();

      return chunk;
    }

    if (!chunk.equals(PADDING)) {
      this._cipher.scrub();

      throw new Error('data not multiple of block length');
    }
  };

  Cipher$2.prototype.setAutoPadding = function (setTo) {
    this._autopadding = !!setTo;
    return this;
  };

  function Splitter() {
    this.cache = Buffer$q.allocUnsafe(0);
  }

  Splitter.prototype.add = function (data) {
    this.cache = Buffer$q.concat([this.cache, data]);
  };

  Splitter.prototype.get = function () {
    if (this.cache.length > 15) {
      var out = this.cache.slice(0, 16);
      this.cache = this.cache.slice(16);
      return out;
    }

    return null;
  };

  Splitter.prototype.flush = function () {
    var len = 16 - this.cache.length;
    var padBuff = Buffer$q.allocUnsafe(len);
    var i = -1;

    while (++i < len) {
      padBuff.writeUInt8(len, i);
    }

    return Buffer$q.concat([this.cache, padBuff]);
  };

  function createCipheriv(suite, password, iv) {
    var config = modes_1[suite.toLowerCase()];
    if (!config) throw new TypeError('invalid suite type');
    if (typeof password === 'string') password = Buffer$q.from(password);
    if (password.length !== config.key / 8) throw new TypeError('invalid key length ' + password.length);
    if (typeof iv === 'string') iv = Buffer$q.from(iv);
    if (config.mode !== 'GCM' && iv.length !== config.iv) throw new TypeError('invalid iv length ' + iv.length);

    if (config.type === 'stream') {
      return new streamCipher(config.module, password, iv);
    } else if (config.type === 'auth') {
      return new authCipher(config.module, password, iv);
    }

    return new Cipher$2(config.module, password, iv);
  }

  function createCipher(suite, password) {
    var config = modes_1[suite.toLowerCase()];
    if (!config) throw new TypeError('invalid suite type');
    var keys = evp_bytestokey(password, false, config.key, config.iv);
    return createCipheriv(suite, keys.key, keys.iv);
  }

  var createCipheriv_1 = createCipheriv;
  var createCipher_1 = createCipher;
  var encrypter = {
    createCipheriv: createCipheriv_1,
    createCipher: createCipher_1
  };

  var Buffer$r = safeBuffer.Buffer;

  function Decipher(mode, key, iv) {
    cipherBase.call(this);
    this._cache = new Splitter$1();
    this._last = void 0;
    this._cipher = new aes.AES(key);
    this._prev = Buffer$r.from(iv);
    this._mode = mode;
    this._autopadding = true;
  }

  inherits_browser(Decipher, cipherBase);

  Decipher.prototype._update = function (data) {
    this._cache.add(data);

    var chunk;
    var thing;
    var out = [];

    while (chunk = this._cache.get(this._autopadding)) {
      thing = this._mode.decrypt(this, chunk);
      out.push(thing);
    }

    return Buffer$r.concat(out);
  };

  Decipher.prototype._final = function () {
    var chunk = this._cache.flush();

    if (this._autopadding) {
      return unpad(this._mode.decrypt(this, chunk));
    } else if (chunk) {
      throw new Error('data not multiple of block length');
    }
  };

  Decipher.prototype.setAutoPadding = function (setTo) {
    this._autopadding = !!setTo;
    return this;
  };

  function Splitter$1() {
    this.cache = Buffer$r.allocUnsafe(0);
  }

  Splitter$1.prototype.add = function (data) {
    this.cache = Buffer$r.concat([this.cache, data]);
  };

  Splitter$1.prototype.get = function (autoPadding) {
    var out;

    if (autoPadding) {
      if (this.cache.length > 16) {
        out = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        return out;
      }
    } else {
      if (this.cache.length >= 16) {
        out = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        return out;
      }
    }

    return null;
  };

  Splitter$1.prototype.flush = function () {
    if (this.cache.length) return this.cache;
  };

  function unpad(last) {
    var padded = last[15];

    if (padded < 1 || padded > 16) {
      throw new Error('unable to decrypt data');
    }

    var i = -1;

    while (++i < padded) {
      if (last[i + (16 - padded)] !== padded) {
        throw new Error('unable to decrypt data');
      }
    }

    if (padded === 16) return;
    return last.slice(0, 16 - padded);
  }

  function createDecipheriv(suite, password, iv) {
    var config = modes_1[suite.toLowerCase()];
    if (!config) throw new TypeError('invalid suite type');
    if (typeof iv === 'string') iv = Buffer$r.from(iv);
    if (config.mode !== 'GCM' && iv.length !== config.iv) throw new TypeError('invalid iv length ' + iv.length);
    if (typeof password === 'string') password = Buffer$r.from(password);
    if (password.length !== config.key / 8) throw new TypeError('invalid key length ' + password.length);

    if (config.type === 'stream') {
      return new streamCipher(config.module, password, iv, true);
    } else if (config.type === 'auth') {
      return new authCipher(config.module, password, iv, true);
    }

    return new Decipher(config.module, password, iv);
  }

  function createDecipher(suite, password) {
    var config = modes_1[suite.toLowerCase()];
    if (!config) throw new TypeError('invalid suite type');
    var keys = evp_bytestokey(password, false, config.key, config.iv);
    return createDecipheriv(suite, keys.key, keys.iv);
  }

  var createDecipher_1 = createDecipher;
  var createDecipheriv_1 = createDecipheriv;
  var decrypter = {
    createDecipher: createDecipher_1,
    createDecipheriv: createDecipheriv_1
  };

  var browser$5 = createCommonjsModule(function (module, exports) {
    function getCiphers() {
      return Object.keys(modes$1);
    }

    exports.createCipher = exports.Cipher = encrypter.createCipher;
    exports.createCipheriv = exports.Cipheriv = encrypter.createCipheriv;
    exports.createDecipher = exports.Decipher = decrypter.createDecipher;
    exports.createDecipheriv = exports.Decipheriv = decrypter.createDecipheriv;
    exports.listCiphers = exports.getCiphers = getCiphers;
  });
  var browser_1 = browser$5.createCipher;
  var browser_2 = browser$5.Cipher;
  var browser_3 = browser$5.createCipheriv;
  var browser_4 = browser$5.Cipheriv;
  var browser_5 = browser$5.createDecipher;
  var browser_6 = browser$5.Decipher;
  var browser_7 = browser$5.createDecipheriv;
  var browser_8 = browser$5.Decipheriv;
  var browser_9 = browser$5.listCiphers;
  var browser_10 = browser$5.getCiphers;

  var modes$2 = createCommonjsModule(function (module, exports) {
    exports['des-ecb'] = {
      key: 8,
      iv: 0
    };
    exports['des-cbc'] = exports.des = {
      key: 8,
      iv: 8
    };
    exports['des-ede3-cbc'] = exports.des3 = {
      key: 24,
      iv: 8
    };
    exports['des-ede3'] = {
      key: 24,
      iv: 0
    };
    exports['des-ede-cbc'] = {
      key: 16,
      iv: 8
    };
    exports['des-ede'] = {
      key: 16,
      iv: 0
    };
  });
  var modes_1$1 = modes$2.des;
  var modes_2 = modes$2.des3;

  var browser$6 = createCommonjsModule(function (module, exports) {
    function createCipher(suite, password) {
      suite = suite.toLowerCase();
      var keyLen, ivLen;

      if (modes_1[suite]) {
        keyLen = modes_1[suite].key;
        ivLen = modes_1[suite].iv;
      } else if (modes$2[suite]) {
        keyLen = modes$2[suite].key * 8;
        ivLen = modes$2[suite].iv;
      } else {
        throw new TypeError('invalid suite type');
      }

      var keys = evp_bytestokey(password, false, keyLen, ivLen);
      return createCipheriv(suite, keys.key, keys.iv);
    }

    function createDecipher(suite, password) {
      suite = suite.toLowerCase();
      var keyLen, ivLen;

      if (modes_1[suite]) {
        keyLen = modes_1[suite].key;
        ivLen = modes_1[suite].iv;
      } else if (modes$2[suite]) {
        keyLen = modes$2[suite].key * 8;
        ivLen = modes$2[suite].iv;
      } else {
        throw new TypeError('invalid suite type');
      }

      var keys = evp_bytestokey(password, false, keyLen, ivLen);
      return createDecipheriv(suite, keys.key, keys.iv);
    }

    function createCipheriv(suite, key, iv) {
      suite = suite.toLowerCase();
      if (modes_1[suite]) return browser$5.createCipheriv(suite, key, iv);
      if (modes$2[suite]) return new browserifyDes({
        key: key,
        iv: iv,
        mode: suite
      });
      throw new TypeError('invalid suite type');
    }

    function createDecipheriv(suite, key, iv) {
      suite = suite.toLowerCase();
      if (modes_1[suite]) return browser$5.createDecipheriv(suite, key, iv);
      if (modes$2[suite]) return new browserifyDes({
        key: key,
        iv: iv,
        mode: suite,
        decrypt: true
      });
      throw new TypeError('invalid suite type');
    }

    function getCiphers() {
      return Object.keys(modes$2).concat(browser$5.getCiphers());
    }

    exports.createCipher = exports.Cipher = createCipher;
    exports.createCipheriv = exports.Cipheriv = createCipheriv;
    exports.createDecipher = exports.Decipher = createDecipher;
    exports.createDecipheriv = exports.Decipheriv = createDecipheriv;
    exports.listCiphers = exports.getCiphers = getCiphers;
  });
  var browser_1$1 = browser$6.createCipher;
  var browser_2$1 = browser$6.Cipher;
  var browser_3$1 = browser$6.createCipheriv;
  var browser_4$1 = browser$6.Cipheriv;
  var browser_5$1 = browser$6.createDecipher;
  var browser_6$1 = browser$6.Decipher;
  var browser_7$1 = browser$6.createDecipheriv;
  var browser_8$1 = browser$6.Decipheriv;
  var browser_9$1 = browser$6.listCiphers;
  var browser_10$1 = browser$6.getCiphers;

  var _nodeResolve_empty = {};

  var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': _nodeResolve_empty
  });

  var require$$0$1 = getCjsExportFromNamespace(_nodeResolve_empty$1);

  var bn = createCommonjsModule(function (module) {
    (function (module, exports) {

      function assert(val, msg) {
        if (!val) throw new Error(msg || 'Assertion failed');
      } // Could use `inherits` module, but don't want to move from single file
      // architecture yet.


      function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;

        var TempCtor = function TempCtor() {};

        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      } // BN


      function BN(number, base, endian) {
        if (BN.isBN(number)) {
          return number;
        }

        this.negative = 0;
        this.words = null;
        this.length = 0; // Reduction context

        this.red = null;

        if (number !== null) {
          if (base === 'le' || base === 'be') {
            endian = base;
            base = 10;
          }

          this._init(number || 0, base || 10, endian || 'be');
        }
      }

      if (_typeof(module) === 'object') {
        module.exports = BN;
      } else {
        exports.BN = BN;
      }

      BN.BN = BN;
      BN.wordSize = 26;
      var Buffer;

      try {
        Buffer = require$$0$1.Buffer;
      } catch (e) {}

      BN.isBN = function isBN(num) {
        if (num instanceof BN) {
          return true;
        }

        return num !== null && _typeof(num) === 'object' && num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
      };

      BN.max = function max(left, right) {
        if (left.cmp(right) > 0) return left;
        return right;
      };

      BN.min = function min(left, right) {
        if (left.cmp(right) < 0) return left;
        return right;
      };

      BN.prototype._init = function init(number, base, endian) {
        if (typeof number === 'number') {
          return this._initNumber(number, base, endian);
        }

        if (_typeof(number) === 'object') {
          return this._initArray(number, base, endian);
        }

        if (base === 'hex') {
          base = 16;
        }

        assert(base === (base | 0) && base >= 2 && base <= 36);
        number = number.toString().replace(/\s+/g, '');
        var start = 0;

        if (number[0] === '-') {
          start++;
        }

        if (base === 16) {
          this._parseHex(number, start);
        } else {
          this._parseBase(number, base, start);
        }

        if (number[0] === '-') {
          this.negative = 1;
        }

        this.strip();
        if (endian !== 'le') return;

        this._initArray(this.toArray(), base, endian);
      };

      BN.prototype._initNumber = function _initNumber(number, base, endian) {
        if (number < 0) {
          this.negative = 1;
          number = -number;
        }

        if (number < 0x4000000) {
          this.words = [number & 0x3ffffff];
          this.length = 1;
        } else if (number < 0x10000000000000) {
          this.words = [number & 0x3ffffff, number / 0x4000000 & 0x3ffffff];
          this.length = 2;
        } else {
          assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)

          this.words = [number & 0x3ffffff, number / 0x4000000 & 0x3ffffff, 1];
          this.length = 3;
        }

        if (endian !== 'le') return; // Reverse the bytes

        this._initArray(this.toArray(), base, endian);
      };

      BN.prototype._initArray = function _initArray(number, base, endian) {
        // Perhaps a Uint8Array
        assert(typeof number.length === 'number');

        if (number.length <= 0) {
          this.words = [0];
          this.length = 1;
          return this;
        }

        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);

        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }

        var j, w;
        var off = 0;

        if (endian === 'be') {
          for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
            w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
            this.words[j] |= w << off & 0x3ffffff;
            this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
            off += 24;

            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        } else if (endian === 'le') {
          for (i = 0, j = 0; i < number.length; i += 3) {
            w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
            this.words[j] |= w << off & 0x3ffffff;
            this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
            off += 24;

            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        }

        return this.strip();
      };

      function parseHex(str, start, end) {
        var r = 0;
        var len = Math.min(str.length, end);

        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r <<= 4; // 'a' - 'f'

          if (c >= 49 && c <= 54) {
            r |= c - 49 + 0xa; // 'A' - 'F'
          } else if (c >= 17 && c <= 22) {
            r |= c - 17 + 0xa; // '0' - '9'
          } else {
            r |= c & 0xf;
          }
        }

        return r;
      }

      BN.prototype._parseHex = function _parseHex(number, start) {
        // Create possibly bigger array to ensure that it fits the number
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);

        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }

        var j, w; // Scan 24-bit chunks and add them to the number

        var off = 0;

        for (i = number.length - 6, j = 0; i >= start; i -= 6) {
          w = parseHex(number, i, i + 6);
          this.words[j] |= w << off & 0x3ffffff; // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb

          this.words[j + 1] |= w >>> 26 - off & 0x3fffff;
          off += 24;

          if (off >= 26) {
            off -= 26;
            j++;
          }
        }

        if (i + 6 !== start) {
          w = parseHex(number, start, i + 6);
          this.words[j] |= w << off & 0x3ffffff;
          this.words[j + 1] |= w >>> 26 - off & 0x3fffff;
        }

        this.strip();
      };

      function parseBase(str, start, end, mul) {
        var r = 0;
        var len = Math.min(str.length, end);

        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r *= mul; // 'a'

          if (c >= 49) {
            r += c - 49 + 0xa; // 'A'
          } else if (c >= 17) {
            r += c - 17 + 0xa; // '0' - '9'
          } else {
            r += c;
          }
        }

        return r;
      }

      BN.prototype._parseBase = function _parseBase(number, base, start) {
        // Initialize as zero
        this.words = [0];
        this.length = 1; // Find length of limb in base

        for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
          limbLen++;
        }

        limbLen--;
        limbPow = limbPow / base | 0;
        var total = number.length - start;
        var mod = total % limbLen;
        var end = Math.min(total, total - mod) + start;
        var word = 0;

        for (var i = start; i < end; i += limbLen) {
          word = parseBase(number, i, i + limbLen, base);
          this.imuln(limbPow);

          if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }

        if (mod !== 0) {
          var pow = 1;
          word = parseBase(number, i, number.length, base);

          for (i = 0; i < mod; i++) {
            pow *= base;
          }

          this.imuln(pow);

          if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
      };

      BN.prototype.copy = function copy(dest) {
        dest.words = new Array(this.length);

        for (var i = 0; i < this.length; i++) {
          dest.words[i] = this.words[i];
        }

        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
      };

      BN.prototype.clone = function clone() {
        var r = new BN(null);
        this.copy(r);
        return r;
      };

      BN.prototype._expand = function _expand(size) {
        while (this.length < size) {
          this.words[this.length++] = 0;
        }

        return this;
      }; // Remove leading `0` from `this`


      BN.prototype.strip = function strip() {
        while (this.length > 1 && this.words[this.length - 1] === 0) {
          this.length--;
        }

        return this._normSign();
      };

      BN.prototype._normSign = function _normSign() {
        // -0 = 0
        if (this.length === 1 && this.words[0] === 0) {
          this.negative = 0;
        }

        return this;
      };

      BN.prototype.inspect = function inspect() {
        return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
      };
      /*
       var zeros = [];
      var groupSizes = [];
      var groupBases = [];
       var s = '';
      var i = -1;
      while (++i < BN.wordSize) {
        zeros[i] = s;
        s += '0';
      }
      groupSizes[0] = 0;
      groupSizes[1] = 0;
      groupBases[0] = 0;
      groupBases[1] = 0;
      var base = 2 - 1;
      while (++base < 36 + 1) {
        var groupSize = 0;
        var groupBase = 1;
        while (groupBase < (1 << BN.wordSize) / base) {
          groupBase *= base;
          groupSize += 1;
        }
        groupSizes[base] = groupSize;
        groupBases[base] = groupBase;
      }
       */


      var zeros = ['', '0', '00', '000', '0000', '00000', '000000', '0000000', '00000000', '000000000', '0000000000', '00000000000', '000000000000', '0000000000000', '00000000000000', '000000000000000', '0000000000000000', '00000000000000000', '000000000000000000', '0000000000000000000', '00000000000000000000', '000000000000000000000', '0000000000000000000000', '00000000000000000000000', '000000000000000000000000', '0000000000000000000000000'];
      var groupSizes = [0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      var groupBases = [0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176];

      BN.prototype.toString = function toString(base, padding) {
        base = base || 10;
        padding = padding | 0 || 1;
        var out;

        if (base === 16 || base === 'hex') {
          out = '';
          var off = 0;
          var carry = 0;

          for (var i = 0; i < this.length; i++) {
            var w = this.words[i];
            var word = ((w << off | carry) & 0xffffff).toString(16);
            carry = w >>> 24 - off & 0xffffff;

            if (carry !== 0 || i !== this.length - 1) {
              out = zeros[6 - word.length] + word + out;
            } else {
              out = word + out;
            }

            off += 2;

            if (off >= 26) {
              off -= 26;
              i--;
            }
          }

          if (carry !== 0) {
            out = carry.toString(16) + out;
          }

          while (out.length % padding !== 0) {
            out = '0' + out;
          }

          if (this.negative !== 0) {
            out = '-' + out;
          }

          return out;
        }

        if (base === (base | 0) && base >= 2 && base <= 36) {
          // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
          var groupSize = groupSizes[base]; // var groupBase = Math.pow(base, groupSize);

          var groupBase = groupBases[base];
          out = '';
          var c = this.clone();
          c.negative = 0;

          while (!c.isZero()) {
            var r = c.modn(groupBase).toString(base);
            c = c.idivn(groupBase);

            if (!c.isZero()) {
              out = zeros[groupSize - r.length] + r + out;
            } else {
              out = r + out;
            }
          }

          if (this.isZero()) {
            out = '0' + out;
          }

          while (out.length % padding !== 0) {
            out = '0' + out;
          }

          if (this.negative !== 0) {
            out = '-' + out;
          }

          return out;
        }

        assert(false, 'Base should be between 2 and 36');
      };

      BN.prototype.toNumber = function toNumber() {
        var ret = this.words[0];

        if (this.length === 2) {
          ret += this.words[1] * 0x4000000;
        } else if (this.length === 3 && this.words[2] === 0x01) {
          // NOTE: at this stage it is known that the top bit is set
          ret += 0x10000000000000 + this.words[1] * 0x4000000;
        } else if (this.length > 2) {
          assert(false, 'Number can only safely store up to 53 bits');
        }

        return this.negative !== 0 ? -ret : ret;
      };

      BN.prototype.toJSON = function toJSON() {
        return this.toString(16);
      };

      BN.prototype.toBuffer = function toBuffer(endian, length) {
        assert(typeof Buffer !== 'undefined');
        return this.toArrayLike(Buffer, endian, length);
      };

      BN.prototype.toArray = function toArray(endian, length) {
        return this.toArrayLike(Array, endian, length);
      };

      BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
        var byteLength = this.byteLength();
        var reqLength = length || Math.max(1, byteLength);
        assert(byteLength <= reqLength, 'byte array longer than desired length');
        assert(reqLength > 0, 'Requested array length <= 0');
        this.strip();
        var littleEndian = endian === 'le';
        var res = new ArrayType(reqLength);
        var b, i;
        var q = this.clone();

        if (!littleEndian) {
          // Assume big-endian
          for (i = 0; i < reqLength - byteLength; i++) {
            res[i] = 0;
          }

          for (i = 0; !q.isZero(); i++) {
            b = q.andln(0xff);
            q.iushrn(8);
            res[reqLength - i - 1] = b;
          }
        } else {
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(0xff);
            q.iushrn(8);
            res[i] = b;
          }

          for (; i < reqLength; i++) {
            res[i] = 0;
          }
        }

        return res;
      };

      if (Math.clz32) {
        BN.prototype._countBits = function _countBits(w) {
          return 32 - Math.clz32(w);
        };
      } else {
        BN.prototype._countBits = function _countBits(w) {
          var t = w;
          var r = 0;

          if (t >= 0x1000) {
            r += 13;
            t >>>= 13;
          }

          if (t >= 0x40) {
            r += 7;
            t >>>= 7;
          }

          if (t >= 0x8) {
            r += 4;
            t >>>= 4;
          }

          if (t >= 0x02) {
            r += 2;
            t >>>= 2;
          }

          return r + t;
        };
      }

      BN.prototype._zeroBits = function _zeroBits(w) {
        // Short-cut
        if (w === 0) return 26;
        var t = w;
        var r = 0;

        if ((t & 0x1fff) === 0) {
          r += 13;
          t >>>= 13;
        }

        if ((t & 0x7f) === 0) {
          r += 7;
          t >>>= 7;
        }

        if ((t & 0xf) === 0) {
          r += 4;
          t >>>= 4;
        }

        if ((t & 0x3) === 0) {
          r += 2;
          t >>>= 2;
        }

        if ((t & 0x1) === 0) {
          r++;
        }

        return r;
      }; // Return number of used bits in a BN


      BN.prototype.bitLength = function bitLength() {
        var w = this.words[this.length - 1];

        var hi = this._countBits(w);

        return (this.length - 1) * 26 + hi;
      };

      function toBitArray(num) {
        var w = new Array(num.bitLength());

        for (var bit = 0; bit < w.length; bit++) {
          var off = bit / 26 | 0;
          var wbit = bit % 26;
          w[bit] = (num.words[off] & 1 << wbit) >>> wbit;
        }

        return w;
      } // Number of trailing zero bits


      BN.prototype.zeroBits = function zeroBits() {
        if (this.isZero()) return 0;
        var r = 0;

        for (var i = 0; i < this.length; i++) {
          var b = this._zeroBits(this.words[i]);

          r += b;
          if (b !== 26) break;
        }

        return r;
      };

      BN.prototype.byteLength = function byteLength() {
        return Math.ceil(this.bitLength() / 8);
      };

      BN.prototype.toTwos = function toTwos(width) {
        if (this.negative !== 0) {
          return this.abs().inotn(width).iaddn(1);
        }

        return this.clone();
      };

      BN.prototype.fromTwos = function fromTwos(width) {
        if (this.testn(width - 1)) {
          return this.notn(width).iaddn(1).ineg();
        }

        return this.clone();
      };

      BN.prototype.isNeg = function isNeg() {
        return this.negative !== 0;
      }; // Return negative clone of `this`


      BN.prototype.neg = function neg() {
        return this.clone().ineg();
      };

      BN.prototype.ineg = function ineg() {
        if (!this.isZero()) {
          this.negative ^= 1;
        }

        return this;
      }; // Or `num` with `this` in-place


      BN.prototype.iuor = function iuor(num) {
        while (this.length < num.length) {
          this.words[this.length++] = 0;
        }

        for (var i = 0; i < num.length; i++) {
          this.words[i] = this.words[i] | num.words[i];
        }

        return this.strip();
      };

      BN.prototype.ior = function ior(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuor(num);
      }; // Or `num` with `this`


      BN.prototype.or = function or(num) {
        if (this.length > num.length) return this.clone().ior(num);
        return num.clone().ior(this);
      };

      BN.prototype.uor = function uor(num) {
        if (this.length > num.length) return this.clone().iuor(num);
        return num.clone().iuor(this);
      }; // And `num` with `this` in-place


      BN.prototype.iuand = function iuand(num) {
        // b = min-length(num, this)
        var b;

        if (this.length > num.length) {
          b = num;
        } else {
          b = this;
        }

        for (var i = 0; i < b.length; i++) {
          this.words[i] = this.words[i] & num.words[i];
        }

        this.length = b.length;
        return this.strip();
      };

      BN.prototype.iand = function iand(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuand(num);
      }; // And `num` with `this`


      BN.prototype.and = function and(num) {
        if (this.length > num.length) return this.clone().iand(num);
        return num.clone().iand(this);
      };

      BN.prototype.uand = function uand(num) {
        if (this.length > num.length) return this.clone().iuand(num);
        return num.clone().iuand(this);
      }; // Xor `num` with `this` in-place


      BN.prototype.iuxor = function iuxor(num) {
        // a.length > b.length
        var a;
        var b;

        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        for (var i = 0; i < b.length; i++) {
          this.words[i] = a.words[i] ^ b.words[i];
        }

        if (this !== a) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        this.length = a.length;
        return this.strip();
      };

      BN.prototype.ixor = function ixor(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuxor(num);
      }; // Xor `num` with `this`


      BN.prototype.xor = function xor(num) {
        if (this.length > num.length) return this.clone().ixor(num);
        return num.clone().ixor(this);
      };

      BN.prototype.uxor = function uxor(num) {
        if (this.length > num.length) return this.clone().iuxor(num);
        return num.clone().iuxor(this);
      }; // Not ``this`` with ``width`` bitwidth


      BN.prototype.inotn = function inotn(width) {
        assert(typeof width === 'number' && width >= 0);
        var bytesNeeded = Math.ceil(width / 26) | 0;
        var bitsLeft = width % 26; // Extend the buffer with leading zeroes

        this._expand(bytesNeeded);

        if (bitsLeft > 0) {
          bytesNeeded--;
        } // Handle complete words


        for (var i = 0; i < bytesNeeded; i++) {
          this.words[i] = ~this.words[i] & 0x3ffffff;
        } // Handle the residue


        if (bitsLeft > 0) {
          this.words[i] = ~this.words[i] & 0x3ffffff >> 26 - bitsLeft;
        } // And remove leading zeroes


        return this.strip();
      };

      BN.prototype.notn = function notn(width) {
        return this.clone().inotn(width);
      }; // Set `bit` of `this`


      BN.prototype.setn = function setn(bit, val) {
        assert(typeof bit === 'number' && bit >= 0);
        var off = bit / 26 | 0;
        var wbit = bit % 26;

        this._expand(off + 1);

        if (val) {
          this.words[off] = this.words[off] | 1 << wbit;
        } else {
          this.words[off] = this.words[off] & ~(1 << wbit);
        }

        return this.strip();
      }; // Add `num` to `this` in-place


      BN.prototype.iadd = function iadd(num) {
        var r; // negative + positive

        if (this.negative !== 0 && num.negative === 0) {
          this.negative = 0;
          r = this.isub(num);
          this.negative ^= 1;
          return this._normSign(); // positive + negative
        } else if (this.negative === 0 && num.negative !== 0) {
          num.negative = 0;
          r = this.isub(num);
          num.negative = 1;
          return r._normSign();
        } // a.length > b.length


        var a, b;

        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        var carry = 0;

        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
          this.words[i] = r & 0x3ffffff;
          carry = r >>> 26;
        }

        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          this.words[i] = r & 0x3ffffff;
          carry = r >>> 26;
        }

        this.length = a.length;

        if (carry !== 0) {
          this.words[this.length] = carry;
          this.length++; // Copy the rest of the words
        } else if (a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        return this;
      }; // Add `num` to `this`


      BN.prototype.add = function add(num) {
        var res;

        if (num.negative !== 0 && this.negative === 0) {
          num.negative = 0;
          res = this.sub(num);
          num.negative ^= 1;
          return res;
        } else if (num.negative === 0 && this.negative !== 0) {
          this.negative = 0;
          res = num.sub(this);
          this.negative = 1;
          return res;
        }

        if (this.length > num.length) return this.clone().iadd(num);
        return num.clone().iadd(this);
      }; // Subtract `num` from `this` in-place


      BN.prototype.isub = function isub(num) {
        // this - (-num) = this + num
        if (num.negative !== 0) {
          num.negative = 0;
          var r = this.iadd(num);
          num.negative = 1;
          return r._normSign(); // -this - num = -(this + num)
        } else if (this.negative !== 0) {
          this.negative = 0;
          this.iadd(num);
          this.negative = 1;
          return this._normSign();
        } // At this point both numbers are positive


        var cmp = this.cmp(num); // Optimization - zeroify

        if (cmp === 0) {
          this.negative = 0;
          this.length = 1;
          this.words[0] = 0;
          return this;
        } // a > b


        var a, b;

        if (cmp > 0) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        var carry = 0;

        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 0x3ffffff;
        }

        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 0x3ffffff;
        } // Copy rest of the words


        if (carry === 0 && i < a.length && a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        this.length = Math.max(this.length, i);

        if (a !== this) {
          this.negative = 1;
        }

        return this.strip();
      }; // Subtract `num` from `this`


      BN.prototype.sub = function sub(num) {
        return this.clone().isub(num);
      };

      function smallMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        var len = self.length + num.length | 0;
        out.length = len;
        len = len - 1 | 0; // Peel one iteration (compiler can't do it, because of code complexity)

        var a = self.words[0] | 0;
        var b = num.words[0] | 0;
        var r = a * b;
        var lo = r & 0x3ffffff;
        var carry = r / 0x4000000 | 0;
        out.words[0] = lo;

        for (var k = 1; k < len; k++) {
          // Sum all words with the same `i + j = k` and accumulate `ncarry`,
          // note that ncarry could be >= 0x3ffffff
          var ncarry = carry >>> 26;
          var rword = carry & 0x3ffffff;
          var maxJ = Math.min(k, num.length - 1);

          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j | 0;
            a = self.words[i] | 0;
            b = num.words[j] | 0;
            r = a * b + rword;
            ncarry += r / 0x4000000 | 0;
            rword = r & 0x3ffffff;
          }

          out.words[k] = rword | 0;
          carry = ncarry | 0;
        }

        if (carry !== 0) {
          out.words[k] = carry | 0;
        } else {
          out.length--;
        }

        return out.strip();
      } // TODO(indutny): it may be reasonable to omit it for users who don't need
      // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
      // multiplication (like elliptic secp256k1).


      var comb10MulTo = function comb10MulTo(self, num, out) {
        var a = self.words;
        var b = num.words;
        var o = out.words;
        var c = 0;
        var lo;
        var mid;
        var hi;
        var a0 = a[0] | 0;
        var al0 = a0 & 0x1fff;
        var ah0 = a0 >>> 13;
        var a1 = a[1] | 0;
        var al1 = a1 & 0x1fff;
        var ah1 = a1 >>> 13;
        var a2 = a[2] | 0;
        var al2 = a2 & 0x1fff;
        var ah2 = a2 >>> 13;
        var a3 = a[3] | 0;
        var al3 = a3 & 0x1fff;
        var ah3 = a3 >>> 13;
        var a4 = a[4] | 0;
        var al4 = a4 & 0x1fff;
        var ah4 = a4 >>> 13;
        var a5 = a[5] | 0;
        var al5 = a5 & 0x1fff;
        var ah5 = a5 >>> 13;
        var a6 = a[6] | 0;
        var al6 = a6 & 0x1fff;
        var ah6 = a6 >>> 13;
        var a7 = a[7] | 0;
        var al7 = a7 & 0x1fff;
        var ah7 = a7 >>> 13;
        var a8 = a[8] | 0;
        var al8 = a8 & 0x1fff;
        var ah8 = a8 >>> 13;
        var a9 = a[9] | 0;
        var al9 = a9 & 0x1fff;
        var ah9 = a9 >>> 13;
        var b0 = b[0] | 0;
        var bl0 = b0 & 0x1fff;
        var bh0 = b0 >>> 13;
        var b1 = b[1] | 0;
        var bl1 = b1 & 0x1fff;
        var bh1 = b1 >>> 13;
        var b2 = b[2] | 0;
        var bl2 = b2 & 0x1fff;
        var bh2 = b2 >>> 13;
        var b3 = b[3] | 0;
        var bl3 = b3 & 0x1fff;
        var bh3 = b3 >>> 13;
        var b4 = b[4] | 0;
        var bl4 = b4 & 0x1fff;
        var bh4 = b4 >>> 13;
        var b5 = b[5] | 0;
        var bl5 = b5 & 0x1fff;
        var bh5 = b5 >>> 13;
        var b6 = b[6] | 0;
        var bl6 = b6 & 0x1fff;
        var bh6 = b6 >>> 13;
        var b7 = b[7] | 0;
        var bl7 = b7 & 0x1fff;
        var bh7 = b7 >>> 13;
        var b8 = b[8] | 0;
        var bl8 = b8 & 0x1fff;
        var bh8 = b8 >>> 13;
        var b9 = b[9] | 0;
        var bl9 = b9 & 0x1fff;
        var bh9 = b9 >>> 13;
        out.negative = self.negative ^ num.negative;
        out.length = 19;
        /* k = 0 */

        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = mid + Math.imul(ah0, bl0) | 0;
        hi = Math.imul(ah0, bh0);
        var w0 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
        w0 &= 0x3ffffff;
        /* k = 1 */

        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = mid + Math.imul(ah1, bl0) | 0;
        hi = Math.imul(ah1, bh0);
        lo = lo + Math.imul(al0, bl1) | 0;
        mid = mid + Math.imul(al0, bh1) | 0;
        mid = mid + Math.imul(ah0, bl1) | 0;
        hi = hi + Math.imul(ah0, bh1) | 0;
        var w1 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
        w1 &= 0x3ffffff;
        /* k = 2 */

        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = mid + Math.imul(ah2, bl0) | 0;
        hi = Math.imul(ah2, bh0);
        lo = lo + Math.imul(al1, bl1) | 0;
        mid = mid + Math.imul(al1, bh1) | 0;
        mid = mid + Math.imul(ah1, bl1) | 0;
        hi = hi + Math.imul(ah1, bh1) | 0;
        lo = lo + Math.imul(al0, bl2) | 0;
        mid = mid + Math.imul(al0, bh2) | 0;
        mid = mid + Math.imul(ah0, bl2) | 0;
        hi = hi + Math.imul(ah0, bh2) | 0;
        var w2 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
        w2 &= 0x3ffffff;
        /* k = 3 */

        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = mid + Math.imul(ah3, bl0) | 0;
        hi = Math.imul(ah3, bh0);
        lo = lo + Math.imul(al2, bl1) | 0;
        mid = mid + Math.imul(al2, bh1) | 0;
        mid = mid + Math.imul(ah2, bl1) | 0;
        hi = hi + Math.imul(ah2, bh1) | 0;
        lo = lo + Math.imul(al1, bl2) | 0;
        mid = mid + Math.imul(al1, bh2) | 0;
        mid = mid + Math.imul(ah1, bl2) | 0;
        hi = hi + Math.imul(ah1, bh2) | 0;
        lo = lo + Math.imul(al0, bl3) | 0;
        mid = mid + Math.imul(al0, bh3) | 0;
        mid = mid + Math.imul(ah0, bl3) | 0;
        hi = hi + Math.imul(ah0, bh3) | 0;
        var w3 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
        w3 &= 0x3ffffff;
        /* k = 4 */

        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = mid + Math.imul(ah4, bl0) | 0;
        hi = Math.imul(ah4, bh0);
        lo = lo + Math.imul(al3, bl1) | 0;
        mid = mid + Math.imul(al3, bh1) | 0;
        mid = mid + Math.imul(ah3, bl1) | 0;
        hi = hi + Math.imul(ah3, bh1) | 0;
        lo = lo + Math.imul(al2, bl2) | 0;
        mid = mid + Math.imul(al2, bh2) | 0;
        mid = mid + Math.imul(ah2, bl2) | 0;
        hi = hi + Math.imul(ah2, bh2) | 0;
        lo = lo + Math.imul(al1, bl3) | 0;
        mid = mid + Math.imul(al1, bh3) | 0;
        mid = mid + Math.imul(ah1, bl3) | 0;
        hi = hi + Math.imul(ah1, bh3) | 0;
        lo = lo + Math.imul(al0, bl4) | 0;
        mid = mid + Math.imul(al0, bh4) | 0;
        mid = mid + Math.imul(ah0, bl4) | 0;
        hi = hi + Math.imul(ah0, bh4) | 0;
        var w4 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
        w4 &= 0x3ffffff;
        /* k = 5 */

        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = mid + Math.imul(ah5, bl0) | 0;
        hi = Math.imul(ah5, bh0);
        lo = lo + Math.imul(al4, bl1) | 0;
        mid = mid + Math.imul(al4, bh1) | 0;
        mid = mid + Math.imul(ah4, bl1) | 0;
        hi = hi + Math.imul(ah4, bh1) | 0;
        lo = lo + Math.imul(al3, bl2) | 0;
        mid = mid + Math.imul(al3, bh2) | 0;
        mid = mid + Math.imul(ah3, bl2) | 0;
        hi = hi + Math.imul(ah3, bh2) | 0;
        lo = lo + Math.imul(al2, bl3) | 0;
        mid = mid + Math.imul(al2, bh3) | 0;
        mid = mid + Math.imul(ah2, bl3) | 0;
        hi = hi + Math.imul(ah2, bh3) | 0;
        lo = lo + Math.imul(al1, bl4) | 0;
        mid = mid + Math.imul(al1, bh4) | 0;
        mid = mid + Math.imul(ah1, bl4) | 0;
        hi = hi + Math.imul(ah1, bh4) | 0;
        lo = lo + Math.imul(al0, bl5) | 0;
        mid = mid + Math.imul(al0, bh5) | 0;
        mid = mid + Math.imul(ah0, bl5) | 0;
        hi = hi + Math.imul(ah0, bh5) | 0;
        var w5 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
        w5 &= 0x3ffffff;
        /* k = 6 */

        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = mid + Math.imul(ah6, bl0) | 0;
        hi = Math.imul(ah6, bh0);
        lo = lo + Math.imul(al5, bl1) | 0;
        mid = mid + Math.imul(al5, bh1) | 0;
        mid = mid + Math.imul(ah5, bl1) | 0;
        hi = hi + Math.imul(ah5, bh1) | 0;
        lo = lo + Math.imul(al4, bl2) | 0;
        mid = mid + Math.imul(al4, bh2) | 0;
        mid = mid + Math.imul(ah4, bl2) | 0;
        hi = hi + Math.imul(ah4, bh2) | 0;
        lo = lo + Math.imul(al3, bl3) | 0;
        mid = mid + Math.imul(al3, bh3) | 0;
        mid = mid + Math.imul(ah3, bl3) | 0;
        hi = hi + Math.imul(ah3, bh3) | 0;
        lo = lo + Math.imul(al2, bl4) | 0;
        mid = mid + Math.imul(al2, bh4) | 0;
        mid = mid + Math.imul(ah2, bl4) | 0;
        hi = hi + Math.imul(ah2, bh4) | 0;
        lo = lo + Math.imul(al1, bl5) | 0;
        mid = mid + Math.imul(al1, bh5) | 0;
        mid = mid + Math.imul(ah1, bl5) | 0;
        hi = hi + Math.imul(ah1, bh5) | 0;
        lo = lo + Math.imul(al0, bl6) | 0;
        mid = mid + Math.imul(al0, bh6) | 0;
        mid = mid + Math.imul(ah0, bl6) | 0;
        hi = hi + Math.imul(ah0, bh6) | 0;
        var w6 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
        w6 &= 0x3ffffff;
        /* k = 7 */

        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = mid + Math.imul(ah7, bl0) | 0;
        hi = Math.imul(ah7, bh0);
        lo = lo + Math.imul(al6, bl1) | 0;
        mid = mid + Math.imul(al6, bh1) | 0;
        mid = mid + Math.imul(ah6, bl1) | 0;
        hi = hi + Math.imul(ah6, bh1) | 0;
        lo = lo + Math.imul(al5, bl2) | 0;
        mid = mid + Math.imul(al5, bh2) | 0;
        mid = mid + Math.imul(ah5, bl2) | 0;
        hi = hi + Math.imul(ah5, bh2) | 0;
        lo = lo + Math.imul(al4, bl3) | 0;
        mid = mid + Math.imul(al4, bh3) | 0;
        mid = mid + Math.imul(ah4, bl3) | 0;
        hi = hi + Math.imul(ah4, bh3) | 0;
        lo = lo + Math.imul(al3, bl4) | 0;
        mid = mid + Math.imul(al3, bh4) | 0;
        mid = mid + Math.imul(ah3, bl4) | 0;
        hi = hi + Math.imul(ah3, bh4) | 0;
        lo = lo + Math.imul(al2, bl5) | 0;
        mid = mid + Math.imul(al2, bh5) | 0;
        mid = mid + Math.imul(ah2, bl5) | 0;
        hi = hi + Math.imul(ah2, bh5) | 0;
        lo = lo + Math.imul(al1, bl6) | 0;
        mid = mid + Math.imul(al1, bh6) | 0;
        mid = mid + Math.imul(ah1, bl6) | 0;
        hi = hi + Math.imul(ah1, bh6) | 0;
        lo = lo + Math.imul(al0, bl7) | 0;
        mid = mid + Math.imul(al0, bh7) | 0;
        mid = mid + Math.imul(ah0, bl7) | 0;
        hi = hi + Math.imul(ah0, bh7) | 0;
        var w7 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
        w7 &= 0x3ffffff;
        /* k = 8 */

        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = mid + Math.imul(ah8, bl0) | 0;
        hi = Math.imul(ah8, bh0);
        lo = lo + Math.imul(al7, bl1) | 0;
        mid = mid + Math.imul(al7, bh1) | 0;
        mid = mid + Math.imul(ah7, bl1) | 0;
        hi = hi + Math.imul(ah7, bh1) | 0;
        lo = lo + Math.imul(al6, bl2) | 0;
        mid = mid + Math.imul(al6, bh2) | 0;
        mid = mid + Math.imul(ah6, bl2) | 0;
        hi = hi + Math.imul(ah6, bh2) | 0;
        lo = lo + Math.imul(al5, bl3) | 0;
        mid = mid + Math.imul(al5, bh3) | 0;
        mid = mid + Math.imul(ah5, bl3) | 0;
        hi = hi + Math.imul(ah5, bh3) | 0;
        lo = lo + Math.imul(al4, bl4) | 0;
        mid = mid + Math.imul(al4, bh4) | 0;
        mid = mid + Math.imul(ah4, bl4) | 0;
        hi = hi + Math.imul(ah4, bh4) | 0;
        lo = lo + Math.imul(al3, bl5) | 0;
        mid = mid + Math.imul(al3, bh5) | 0;
        mid = mid + Math.imul(ah3, bl5) | 0;
        hi = hi + Math.imul(ah3, bh5) | 0;
        lo = lo + Math.imul(al2, bl6) | 0;
        mid = mid + Math.imul(al2, bh6) | 0;
        mid = mid + Math.imul(ah2, bl6) | 0;
        hi = hi + Math.imul(ah2, bh6) | 0;
        lo = lo + Math.imul(al1, bl7) | 0;
        mid = mid + Math.imul(al1, bh7) | 0;
        mid = mid + Math.imul(ah1, bl7) | 0;
        hi = hi + Math.imul(ah1, bh7) | 0;
        lo = lo + Math.imul(al0, bl8) | 0;
        mid = mid + Math.imul(al0, bh8) | 0;
        mid = mid + Math.imul(ah0, bl8) | 0;
        hi = hi + Math.imul(ah0, bh8) | 0;
        var w8 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
        w8 &= 0x3ffffff;
        /* k = 9 */

        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = mid + Math.imul(ah9, bl0) | 0;
        hi = Math.imul(ah9, bh0);
        lo = lo + Math.imul(al8, bl1) | 0;
        mid = mid + Math.imul(al8, bh1) | 0;
        mid = mid + Math.imul(ah8, bl1) | 0;
        hi = hi + Math.imul(ah8, bh1) | 0;
        lo = lo + Math.imul(al7, bl2) | 0;
        mid = mid + Math.imul(al7, bh2) | 0;
        mid = mid + Math.imul(ah7, bl2) | 0;
        hi = hi + Math.imul(ah7, bh2) | 0;
        lo = lo + Math.imul(al6, bl3) | 0;
        mid = mid + Math.imul(al6, bh3) | 0;
        mid = mid + Math.imul(ah6, bl3) | 0;
        hi = hi + Math.imul(ah6, bh3) | 0;
        lo = lo + Math.imul(al5, bl4) | 0;
        mid = mid + Math.imul(al5, bh4) | 0;
        mid = mid + Math.imul(ah5, bl4) | 0;
        hi = hi + Math.imul(ah5, bh4) | 0;
        lo = lo + Math.imul(al4, bl5) | 0;
        mid = mid + Math.imul(al4, bh5) | 0;
        mid = mid + Math.imul(ah4, bl5) | 0;
        hi = hi + Math.imul(ah4, bh5) | 0;
        lo = lo + Math.imul(al3, bl6) | 0;
        mid = mid + Math.imul(al3, bh6) | 0;
        mid = mid + Math.imul(ah3, bl6) | 0;
        hi = hi + Math.imul(ah3, bh6) | 0;
        lo = lo + Math.imul(al2, bl7) | 0;
        mid = mid + Math.imul(al2, bh7) | 0;
        mid = mid + Math.imul(ah2, bl7) | 0;
        hi = hi + Math.imul(ah2, bh7) | 0;
        lo = lo + Math.imul(al1, bl8) | 0;
        mid = mid + Math.imul(al1, bh8) | 0;
        mid = mid + Math.imul(ah1, bl8) | 0;
        hi = hi + Math.imul(ah1, bh8) | 0;
        lo = lo + Math.imul(al0, bl9) | 0;
        mid = mid + Math.imul(al0, bh9) | 0;
        mid = mid + Math.imul(ah0, bl9) | 0;
        hi = hi + Math.imul(ah0, bh9) | 0;
        var w9 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
        w9 &= 0x3ffffff;
        /* k = 10 */

        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = mid + Math.imul(ah9, bl1) | 0;
        hi = Math.imul(ah9, bh1);
        lo = lo + Math.imul(al8, bl2) | 0;
        mid = mid + Math.imul(al8, bh2) | 0;
        mid = mid + Math.imul(ah8, bl2) | 0;
        hi = hi + Math.imul(ah8, bh2) | 0;
        lo = lo + Math.imul(al7, bl3) | 0;
        mid = mid + Math.imul(al7, bh3) | 0;
        mid = mid + Math.imul(ah7, bl3) | 0;
        hi = hi + Math.imul(ah7, bh3) | 0;
        lo = lo + Math.imul(al6, bl4) | 0;
        mid = mid + Math.imul(al6, bh4) | 0;
        mid = mid + Math.imul(ah6, bl4) | 0;
        hi = hi + Math.imul(ah6, bh4) | 0;
        lo = lo + Math.imul(al5, bl5) | 0;
        mid = mid + Math.imul(al5, bh5) | 0;
        mid = mid + Math.imul(ah5, bl5) | 0;
        hi = hi + Math.imul(ah5, bh5) | 0;
        lo = lo + Math.imul(al4, bl6) | 0;
        mid = mid + Math.imul(al4, bh6) | 0;
        mid = mid + Math.imul(ah4, bl6) | 0;
        hi = hi + Math.imul(ah4, bh6) | 0;
        lo = lo + Math.imul(al3, bl7) | 0;
        mid = mid + Math.imul(al3, bh7) | 0;
        mid = mid + Math.imul(ah3, bl7) | 0;
        hi = hi + Math.imul(ah3, bh7) | 0;
        lo = lo + Math.imul(al2, bl8) | 0;
        mid = mid + Math.imul(al2, bh8) | 0;
        mid = mid + Math.imul(ah2, bl8) | 0;
        hi = hi + Math.imul(ah2, bh8) | 0;
        lo = lo + Math.imul(al1, bl9) | 0;
        mid = mid + Math.imul(al1, bh9) | 0;
        mid = mid + Math.imul(ah1, bl9) | 0;
        hi = hi + Math.imul(ah1, bh9) | 0;
        var w10 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
        w10 &= 0x3ffffff;
        /* k = 11 */

        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = mid + Math.imul(ah9, bl2) | 0;
        hi = Math.imul(ah9, bh2);
        lo = lo + Math.imul(al8, bl3) | 0;
        mid = mid + Math.imul(al8, bh3) | 0;
        mid = mid + Math.imul(ah8, bl3) | 0;
        hi = hi + Math.imul(ah8, bh3) | 0;
        lo = lo + Math.imul(al7, bl4) | 0;
        mid = mid + Math.imul(al7, bh4) | 0;
        mid = mid + Math.imul(ah7, bl4) | 0;
        hi = hi + Math.imul(ah7, bh4) | 0;
        lo = lo + Math.imul(al6, bl5) | 0;
        mid = mid + Math.imul(al6, bh5) | 0;
        mid = mid + Math.imul(ah6, bl5) | 0;
        hi = hi + Math.imul(ah6, bh5) | 0;
        lo = lo + Math.imul(al5, bl6) | 0;
        mid = mid + Math.imul(al5, bh6) | 0;
        mid = mid + Math.imul(ah5, bl6) | 0;
        hi = hi + Math.imul(ah5, bh6) | 0;
        lo = lo + Math.imul(al4, bl7) | 0;
        mid = mid + Math.imul(al4, bh7) | 0;
        mid = mid + Math.imul(ah4, bl7) | 0;
        hi = hi + Math.imul(ah4, bh7) | 0;
        lo = lo + Math.imul(al3, bl8) | 0;
        mid = mid + Math.imul(al3, bh8) | 0;
        mid = mid + Math.imul(ah3, bl8) | 0;
        hi = hi + Math.imul(ah3, bh8) | 0;
        lo = lo + Math.imul(al2, bl9) | 0;
        mid = mid + Math.imul(al2, bh9) | 0;
        mid = mid + Math.imul(ah2, bl9) | 0;
        hi = hi + Math.imul(ah2, bh9) | 0;
        var w11 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
        w11 &= 0x3ffffff;
        /* k = 12 */

        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = mid + Math.imul(ah9, bl3) | 0;
        hi = Math.imul(ah9, bh3);
        lo = lo + Math.imul(al8, bl4) | 0;
        mid = mid + Math.imul(al8, bh4) | 0;
        mid = mid + Math.imul(ah8, bl4) | 0;
        hi = hi + Math.imul(ah8, bh4) | 0;
        lo = lo + Math.imul(al7, bl5) | 0;
        mid = mid + Math.imul(al7, bh5) | 0;
        mid = mid + Math.imul(ah7, bl5) | 0;
        hi = hi + Math.imul(ah7, bh5) | 0;
        lo = lo + Math.imul(al6, bl6) | 0;
        mid = mid + Math.imul(al6, bh6) | 0;
        mid = mid + Math.imul(ah6, bl6) | 0;
        hi = hi + Math.imul(ah6, bh6) | 0;
        lo = lo + Math.imul(al5, bl7) | 0;
        mid = mid + Math.imul(al5, bh7) | 0;
        mid = mid + Math.imul(ah5, bl7) | 0;
        hi = hi + Math.imul(ah5, bh7) | 0;
        lo = lo + Math.imul(al4, bl8) | 0;
        mid = mid + Math.imul(al4, bh8) | 0;
        mid = mid + Math.imul(ah4, bl8) | 0;
        hi = hi + Math.imul(ah4, bh8) | 0;
        lo = lo + Math.imul(al3, bl9) | 0;
        mid = mid + Math.imul(al3, bh9) | 0;
        mid = mid + Math.imul(ah3, bl9) | 0;
        hi = hi + Math.imul(ah3, bh9) | 0;
        var w12 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
        w12 &= 0x3ffffff;
        /* k = 13 */

        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = mid + Math.imul(ah9, bl4) | 0;
        hi = Math.imul(ah9, bh4);
        lo = lo + Math.imul(al8, bl5) | 0;
        mid = mid + Math.imul(al8, bh5) | 0;
        mid = mid + Math.imul(ah8, bl5) | 0;
        hi = hi + Math.imul(ah8, bh5) | 0;
        lo = lo + Math.imul(al7, bl6) | 0;
        mid = mid + Math.imul(al7, bh6) | 0;
        mid = mid + Math.imul(ah7, bl6) | 0;
        hi = hi + Math.imul(ah7, bh6) | 0;
        lo = lo + Math.imul(al6, bl7) | 0;
        mid = mid + Math.imul(al6, bh7) | 0;
        mid = mid + Math.imul(ah6, bl7) | 0;
        hi = hi + Math.imul(ah6, bh7) | 0;
        lo = lo + Math.imul(al5, bl8) | 0;
        mid = mid + Math.imul(al5, bh8) | 0;
        mid = mid + Math.imul(ah5, bl8) | 0;
        hi = hi + Math.imul(ah5, bh8) | 0;
        lo = lo + Math.imul(al4, bl9) | 0;
        mid = mid + Math.imul(al4, bh9) | 0;
        mid = mid + Math.imul(ah4, bl9) | 0;
        hi = hi + Math.imul(ah4, bh9) | 0;
        var w13 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
        w13 &= 0x3ffffff;
        /* k = 14 */

        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = mid + Math.imul(ah9, bl5) | 0;
        hi = Math.imul(ah9, bh5);
        lo = lo + Math.imul(al8, bl6) | 0;
        mid = mid + Math.imul(al8, bh6) | 0;
        mid = mid + Math.imul(ah8, bl6) | 0;
        hi = hi + Math.imul(ah8, bh6) | 0;
        lo = lo + Math.imul(al7, bl7) | 0;
        mid = mid + Math.imul(al7, bh7) | 0;
        mid = mid + Math.imul(ah7, bl7) | 0;
        hi = hi + Math.imul(ah7, bh7) | 0;
        lo = lo + Math.imul(al6, bl8) | 0;
        mid = mid + Math.imul(al6, bh8) | 0;
        mid = mid + Math.imul(ah6, bl8) | 0;
        hi = hi + Math.imul(ah6, bh8) | 0;
        lo = lo + Math.imul(al5, bl9) | 0;
        mid = mid + Math.imul(al5, bh9) | 0;
        mid = mid + Math.imul(ah5, bl9) | 0;
        hi = hi + Math.imul(ah5, bh9) | 0;
        var w14 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
        w14 &= 0x3ffffff;
        /* k = 15 */

        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = mid + Math.imul(ah9, bl6) | 0;
        hi = Math.imul(ah9, bh6);
        lo = lo + Math.imul(al8, bl7) | 0;
        mid = mid + Math.imul(al8, bh7) | 0;
        mid = mid + Math.imul(ah8, bl7) | 0;
        hi = hi + Math.imul(ah8, bh7) | 0;
        lo = lo + Math.imul(al7, bl8) | 0;
        mid = mid + Math.imul(al7, bh8) | 0;
        mid = mid + Math.imul(ah7, bl8) | 0;
        hi = hi + Math.imul(ah7, bh8) | 0;
        lo = lo + Math.imul(al6, bl9) | 0;
        mid = mid + Math.imul(al6, bh9) | 0;
        mid = mid + Math.imul(ah6, bl9) | 0;
        hi = hi + Math.imul(ah6, bh9) | 0;
        var w15 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
        w15 &= 0x3ffffff;
        /* k = 16 */

        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = mid + Math.imul(ah9, bl7) | 0;
        hi = Math.imul(ah9, bh7);
        lo = lo + Math.imul(al8, bl8) | 0;
        mid = mid + Math.imul(al8, bh8) | 0;
        mid = mid + Math.imul(ah8, bl8) | 0;
        hi = hi + Math.imul(ah8, bh8) | 0;
        lo = lo + Math.imul(al7, bl9) | 0;
        mid = mid + Math.imul(al7, bh9) | 0;
        mid = mid + Math.imul(ah7, bl9) | 0;
        hi = hi + Math.imul(ah7, bh9) | 0;
        var w16 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
        w16 &= 0x3ffffff;
        /* k = 17 */

        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = mid + Math.imul(ah9, bl8) | 0;
        hi = Math.imul(ah9, bh8);
        lo = lo + Math.imul(al8, bl9) | 0;
        mid = mid + Math.imul(al8, bh9) | 0;
        mid = mid + Math.imul(ah8, bl9) | 0;
        hi = hi + Math.imul(ah8, bh9) | 0;
        var w17 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
        w17 &= 0x3ffffff;
        /* k = 18 */

        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = mid + Math.imul(ah9, bl9) | 0;
        hi = Math.imul(ah9, bh9);
        var w18 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
        w18 &= 0x3ffffff;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;

        if (c !== 0) {
          o[19] = c;
          out.length++;
        }

        return out;
      }; // Polyfill comb


      if (!Math.imul) {
        comb10MulTo = smallMulTo;
      }

      function bigMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        out.length = self.length + num.length;
        var carry = 0;
        var hncarry = 0;

        for (var k = 0; k < out.length - 1; k++) {
          // Sum all words with the same `i + j = k` and accumulate `ncarry`,
          // note that ncarry could be >= 0x3ffffff
          var ncarry = hncarry;
          hncarry = 0;
          var rword = carry & 0x3ffffff;
          var maxJ = Math.min(k, num.length - 1);

          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j;
            var a = self.words[i] | 0;
            var b = num.words[j] | 0;
            var r = a * b;
            var lo = r & 0x3ffffff;
            ncarry = ncarry + (r / 0x4000000 | 0) | 0;
            lo = lo + rword | 0;
            rword = lo & 0x3ffffff;
            ncarry = ncarry + (lo >>> 26) | 0;
            hncarry += ncarry >>> 26;
            ncarry &= 0x3ffffff;
          }

          out.words[k] = rword;
          carry = ncarry;
          ncarry = hncarry;
        }

        if (carry !== 0) {
          out.words[k] = carry;
        } else {
          out.length--;
        }

        return out.strip();
      }

      function jumboMulTo(self, num, out) {
        var fftm = new FFTM();
        return fftm.mulp(self, num, out);
      }

      BN.prototype.mulTo = function mulTo(num, out) {
        var res;
        var len = this.length + num.length;

        if (this.length === 10 && num.length === 10) {
          res = comb10MulTo(this, num, out);
        } else if (len < 63) {
          res = smallMulTo(this, num, out);
        } else if (len < 1024) {
          res = bigMulTo(this, num, out);
        } else {
          res = jumboMulTo(this, num, out);
        }

        return res;
      }; // Cooley-Tukey algorithm for FFT
      // slightly revisited to rely on looping instead of recursion


      function FFTM(x, y) {
        this.x = x;
        this.y = y;
      }

      FFTM.prototype.makeRBT = function makeRBT(N) {
        var t = new Array(N);
        var l = BN.prototype._countBits(N) - 1;

        for (var i = 0; i < N; i++) {
          t[i] = this.revBin(i, l, N);
        }

        return t;
      }; // Returns binary-reversed representation of `x`


      FFTM.prototype.revBin = function revBin(x, l, N) {
        if (x === 0 || x === N - 1) return x;
        var rb = 0;

        for (var i = 0; i < l; i++) {
          rb |= (x & 1) << l - i - 1;
          x >>= 1;
        }

        return rb;
      }; // Performs "tweedling" phase, therefore 'emulating'
      // behaviour of the recursive algorithm


      FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
        for (var i = 0; i < N; i++) {
          rtws[i] = rws[rbt[i]];
          itws[i] = iws[rbt[i]];
        }
      };

      FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
        this.permute(rbt, rws, iws, rtws, itws, N);

        for (var s = 1; s < N; s <<= 1) {
          var l = s << 1;
          var rtwdf = Math.cos(2 * Math.PI / l);
          var itwdf = Math.sin(2 * Math.PI / l);

          for (var p = 0; p < N; p += l) {
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;

            for (var j = 0; j < s; j++) {
              var re = rtws[p + j];
              var ie = itws[p + j];
              var ro = rtws[p + j + s];
              var io = itws[p + j + s];
              var rx = rtwdf_ * ro - itwdf_ * io;
              io = rtwdf_ * io + itwdf_ * ro;
              ro = rx;
              rtws[p + j] = re + ro;
              itws[p + j] = ie + io;
              rtws[p + j + s] = re - ro;
              itws[p + j + s] = ie - io;
              /* jshint maxdepth : false */

              if (j !== l) {
                rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                rtwdf_ = rx;
              }
            }
          }
        }
      };

      FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
        var N = Math.max(m, n) | 1;
        var odd = N & 1;
        var i = 0;

        for (N = N / 2 | 0; N; N = N >>> 1) {
          i++;
        }

        return 1 << i + 1 + odd;
      };

      FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
        if (N <= 1) return;

        for (var i = 0; i < N / 2; i++) {
          var t = rws[i];
          rws[i] = rws[N - i - 1];
          rws[N - i - 1] = t;
          t = iws[i];
          iws[i] = -iws[N - i - 1];
          iws[N - i - 1] = -t;
        }
      };

      FFTM.prototype.normalize13b = function normalize13b(ws, N) {
        var carry = 0;

        for (var i = 0; i < N / 2; i++) {
          var w = Math.round(ws[2 * i + 1] / N) * 0x2000 + Math.round(ws[2 * i] / N) + carry;
          ws[i] = w & 0x3ffffff;

          if (w < 0x4000000) {
            carry = 0;
          } else {
            carry = w / 0x4000000 | 0;
          }
        }

        return ws;
      };

      FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
        var carry = 0;

        for (var i = 0; i < len; i++) {
          carry = carry + (ws[i] | 0);
          rws[2 * i] = carry & 0x1fff;
          carry = carry >>> 13;
          rws[2 * i + 1] = carry & 0x1fff;
          carry = carry >>> 13;
        } // Pad with zeroes


        for (i = 2 * len; i < N; ++i) {
          rws[i] = 0;
        }

        assert(carry === 0);
        assert((carry & ~0x1fff) === 0);
      };

      FFTM.prototype.stub = function stub(N) {
        var ph = new Array(N);

        for (var i = 0; i < N; i++) {
          ph[i] = 0;
        }

        return ph;
      };

      FFTM.prototype.mulp = function mulp(x, y, out) {
        var N = 2 * this.guessLen13b(x.length, y.length);
        var rbt = this.makeRBT(N);

        var _ = this.stub(N);

        var rws = new Array(N);
        var rwst = new Array(N);
        var iwst = new Array(N);
        var nrws = new Array(N);
        var nrwst = new Array(N);
        var niwst = new Array(N);
        var rmws = out.words;
        rmws.length = N;
        this.convert13b(x.words, x.length, rws, N);
        this.convert13b(y.words, y.length, nrws, N);
        this.transform(rws, _, rwst, iwst, N, rbt);
        this.transform(nrws, _, nrwst, niwst, N, rbt);

        for (var i = 0; i < N; i++) {
          var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
          iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
          rwst[i] = rx;
        }

        this.conjugate(rwst, iwst, N);
        this.transform(rwst, iwst, rmws, _, N, rbt);
        this.conjugate(rmws, _, N);
        this.normalize13b(rmws, N);
        out.negative = x.negative ^ y.negative;
        out.length = x.length + y.length;
        return out.strip();
      }; // Multiply `this` by `num`


      BN.prototype.mul = function mul(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
      }; // Multiply employing FFT


      BN.prototype.mulf = function mulf(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return jumboMulTo(this, num, out);
      }; // In-place Multiplication


      BN.prototype.imul = function imul(num) {
        return this.clone().mulTo(num, this);
      };

      BN.prototype.imuln = function imuln(num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000); // Carry

        var carry = 0;

        for (var i = 0; i < this.length; i++) {
          var w = (this.words[i] | 0) * num;
          var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
          carry >>= 26;
          carry += w / 0x4000000 | 0; // NOTE: lo is 27bit maximum

          carry += lo >>> 26;
          this.words[i] = lo & 0x3ffffff;
        }

        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }

        return this;
      };

      BN.prototype.muln = function muln(num) {
        return this.clone().imuln(num);
      }; // `this` * `this`


      BN.prototype.sqr = function sqr() {
        return this.mul(this);
      }; // `this` * `this` in-place


      BN.prototype.isqr = function isqr() {
        return this.imul(this.clone());
      }; // Math.pow(`this`, `num`)


      BN.prototype.pow = function pow(num) {
        var w = toBitArray(num);
        if (w.length === 0) return new BN(1); // Skip leading zeroes

        var res = this;

        for (var i = 0; i < w.length; i++, res = res.sqr()) {
          if (w[i] !== 0) break;
        }

        if (++i < w.length) {
          for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
            if (w[i] === 0) continue;
            res = res.mul(q);
          }
        }

        return res;
      }; // Shift-left in-place


      BN.prototype.iushln = function iushln(bits) {
        assert(typeof bits === 'number' && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        var carryMask = 0x3ffffff >>> 26 - r << 26 - r;
        var i;

        if (r !== 0) {
          var carry = 0;

          for (i = 0; i < this.length; i++) {
            var newCarry = this.words[i] & carryMask;
            var c = (this.words[i] | 0) - newCarry << r;
            this.words[i] = c | carry;
            carry = newCarry >>> 26 - r;
          }

          if (carry) {
            this.words[i] = carry;
            this.length++;
          }
        }

        if (s !== 0) {
          for (i = this.length - 1; i >= 0; i--) {
            this.words[i + s] = this.words[i];
          }

          for (i = 0; i < s; i++) {
            this.words[i] = 0;
          }

          this.length += s;
        }

        return this.strip();
      };

      BN.prototype.ishln = function ishln(bits) {
        // TODO(indutny): implement me
        assert(this.negative === 0);
        return this.iushln(bits);
      }; // Shift-right in-place
      // NOTE: `hint` is a lowest bit before trailing zeroes
      // NOTE: if `extended` is present - it will be filled with destroyed bits


      BN.prototype.iushrn = function iushrn(bits, hint, extended) {
        assert(typeof bits === 'number' && bits >= 0);
        var h;

        if (hint) {
          h = (hint - hint % 26) / 26;
        } else {
          h = 0;
        }

        var r = bits % 26;
        var s = Math.min((bits - r) / 26, this.length);
        var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
        var maskedWords = extended;
        h -= s;
        h = Math.max(0, h); // Extended mode, copy masked part

        if (maskedWords) {
          for (var i = 0; i < s; i++) {
            maskedWords.words[i] = this.words[i];
          }

          maskedWords.length = s;
        }

        if (s === 0) ; else if (this.length > s) {
          this.length -= s;

          for (i = 0; i < this.length; i++) {
            this.words[i] = this.words[i + s];
          }
        } else {
          this.words[0] = 0;
          this.length = 1;
        }

        var carry = 0;

        for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
          var word = this.words[i] | 0;
          this.words[i] = carry << 26 - r | word >>> r;
          carry = word & mask;
        } // Push carried bits as a mask


        if (maskedWords && carry !== 0) {
          maskedWords.words[maskedWords.length++] = carry;
        }

        if (this.length === 0) {
          this.words[0] = 0;
          this.length = 1;
        }

        return this.strip();
      };

      BN.prototype.ishrn = function ishrn(bits, hint, extended) {
        // TODO(indutny): implement me
        assert(this.negative === 0);
        return this.iushrn(bits, hint, extended);
      }; // Shift-left


      BN.prototype.shln = function shln(bits) {
        return this.clone().ishln(bits);
      };

      BN.prototype.ushln = function ushln(bits) {
        return this.clone().iushln(bits);
      }; // Shift-right


      BN.prototype.shrn = function shrn(bits) {
        return this.clone().ishrn(bits);
      };

      BN.prototype.ushrn = function ushrn(bits) {
        return this.clone().iushrn(bits);
      }; // Test if n bit is set


      BN.prototype.testn = function testn(bit) {
        assert(typeof bit === 'number' && bit >= 0);
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r; // Fast case: bit is much higher than all existing words

        if (this.length <= s) return false; // Check bit and return

        var w = this.words[s];
        return !!(w & q);
      }; // Return only lowers bits of number (in-place)


      BN.prototype.imaskn = function imaskn(bits) {
        assert(typeof bits === 'number' && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        assert(this.negative === 0, 'imaskn works only with positive numbers');

        if (this.length <= s) {
          return this;
        }

        if (r !== 0) {
          s++;
        }

        this.length = Math.min(s, this.length);

        if (r !== 0) {
          var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
          this.words[this.length - 1] &= mask;
        }

        return this.strip();
      }; // Return only lowers bits of number


      BN.prototype.maskn = function maskn(bits) {
        return this.clone().imaskn(bits);
      }; // Add plain number `num` to `this`


      BN.prototype.iaddn = function iaddn(num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000);
        if (num < 0) return this.isubn(-num); // Possible sign change

        if (this.negative !== 0) {
          if (this.length === 1 && (this.words[0] | 0) < num) {
            this.words[0] = num - (this.words[0] | 0);
            this.negative = 0;
            return this;
          }

          this.negative = 0;
          this.isubn(num);
          this.negative = 1;
          return this;
        } // Add without checks


        return this._iaddn(num);
      };

      BN.prototype._iaddn = function _iaddn(num) {
        this.words[0] += num; // Carry

        for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
          this.words[i] -= 0x4000000;

          if (i === this.length - 1) {
            this.words[i + 1] = 1;
          } else {
            this.words[i + 1]++;
          }
        }

        this.length = Math.max(this.length, i + 1);
        return this;
      }; // Subtract plain number `num` from `this`


      BN.prototype.isubn = function isubn(num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000);
        if (num < 0) return this.iaddn(-num);

        if (this.negative !== 0) {
          this.negative = 0;
          this.iaddn(num);
          this.negative = 1;
          return this;
        }

        this.words[0] -= num;

        if (this.length === 1 && this.words[0] < 0) {
          this.words[0] = -this.words[0];
          this.negative = 1;
        } else {
          // Carry
          for (var i = 0; i < this.length && this.words[i] < 0; i++) {
            this.words[i] += 0x4000000;
            this.words[i + 1] -= 1;
          }
        }

        return this.strip();
      };

      BN.prototype.addn = function addn(num) {
        return this.clone().iaddn(num);
      };

      BN.prototype.subn = function subn(num) {
        return this.clone().isubn(num);
      };

      BN.prototype.iabs = function iabs() {
        this.negative = 0;
        return this;
      };

      BN.prototype.abs = function abs() {
        return this.clone().iabs();
      };

      BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
        var len = num.length + shift;
        var i;

        this._expand(len);

        var w;
        var carry = 0;

        for (i = 0; i < num.length; i++) {
          w = (this.words[i + shift] | 0) + carry;
          var right = (num.words[i] | 0) * mul;
          w -= right & 0x3ffffff;
          carry = (w >> 26) - (right / 0x4000000 | 0);
          this.words[i + shift] = w & 0x3ffffff;
        }

        for (; i < this.length - shift; i++) {
          w = (this.words[i + shift] | 0) + carry;
          carry = w >> 26;
          this.words[i + shift] = w & 0x3ffffff;
        }

        if (carry === 0) return this.strip(); // Subtraction overflow

        assert(carry === -1);
        carry = 0;

        for (i = 0; i < this.length; i++) {
          w = -(this.words[i] | 0) + carry;
          carry = w >> 26;
          this.words[i] = w & 0x3ffffff;
        }

        this.negative = 1;
        return this.strip();
      };

      BN.prototype._wordDiv = function _wordDiv(num, mode) {
        var shift = this.length - num.length;
        var a = this.clone();
        var b = num; // Normalize

        var bhi = b.words[b.length - 1] | 0;

        var bhiBits = this._countBits(bhi);

        shift = 26 - bhiBits;

        if (shift !== 0) {
          b = b.ushln(shift);
          a.iushln(shift);
          bhi = b.words[b.length - 1] | 0;
        } // Initialize quotient


        var m = a.length - b.length;
        var q;

        if (mode !== 'mod') {
          q = new BN(null);
          q.length = m + 1;
          q.words = new Array(q.length);

          for (var i = 0; i < q.length; i++) {
            q.words[i] = 0;
          }
        }

        var diff = a.clone()._ishlnsubmul(b, 1, m);

        if (diff.negative === 0) {
          a = diff;

          if (q) {
            q.words[m] = 1;
          }
        }

        for (var j = m - 1; j >= 0; j--) {
          var qj = (a.words[b.length + j] | 0) * 0x4000000 + (a.words[b.length + j - 1] | 0); // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
          // (0x7ffffff)

          qj = Math.min(qj / bhi | 0, 0x3ffffff);

          a._ishlnsubmul(b, qj, j);

          while (a.negative !== 0) {
            qj--;
            a.negative = 0;

            a._ishlnsubmul(b, 1, j);

            if (!a.isZero()) {
              a.negative ^= 1;
            }
          }

          if (q) {
            q.words[j] = qj;
          }
        }

        if (q) {
          q.strip();
        }

        a.strip(); // Denormalize

        if (mode !== 'div' && shift !== 0) {
          a.iushrn(shift);
        }

        return {
          div: q || null,
          mod: a
        };
      }; // NOTE: 1) `mode` can be set to `mod` to request mod only,
      //       to `div` to request div only, or be absent to
      //       request both div & mod
      //       2) `positive` is true if unsigned mod is requested


      BN.prototype.divmod = function divmod(num, mode, positive) {
        assert(!num.isZero());

        if (this.isZero()) {
          return {
            div: new BN(0),
            mod: new BN(0)
          };
        }

        var div, mod, res;

        if (this.negative !== 0 && num.negative === 0) {
          res = this.neg().divmod(num, mode);

          if (mode !== 'mod') {
            div = res.div.neg();
          }

          if (mode !== 'div') {
            mod = res.mod.neg();

            if (positive && mod.negative !== 0) {
              mod.iadd(num);
            }
          }

          return {
            div: div,
            mod: mod
          };
        }

        if (this.negative === 0 && num.negative !== 0) {
          res = this.divmod(num.neg(), mode);

          if (mode !== 'mod') {
            div = res.div.neg();
          }

          return {
            div: div,
            mod: res.mod
          };
        }

        if ((this.negative & num.negative) !== 0) {
          res = this.neg().divmod(num.neg(), mode);

          if (mode !== 'div') {
            mod = res.mod.neg();

            if (positive && mod.negative !== 0) {
              mod.isub(num);
            }
          }

          return {
            div: res.div,
            mod: mod
          };
        } // Both numbers are positive at this point
        // Strip both numbers to approximate shift value


        if (num.length > this.length || this.cmp(num) < 0) {
          return {
            div: new BN(0),
            mod: this
          };
        } // Very short reduction


        if (num.length === 1) {
          if (mode === 'div') {
            return {
              div: this.divn(num.words[0]),
              mod: null
            };
          }

          if (mode === 'mod') {
            return {
              div: null,
              mod: new BN(this.modn(num.words[0]))
            };
          }

          return {
            div: this.divn(num.words[0]),
            mod: new BN(this.modn(num.words[0]))
          };
        }

        return this._wordDiv(num, mode);
      }; // Find `this` / `num`


      BN.prototype.div = function div(num) {
        return this.divmod(num, 'div', false).div;
      }; // Find `this` % `num`


      BN.prototype.mod = function mod(num) {
        return this.divmod(num, 'mod', false).mod;
      };

      BN.prototype.umod = function umod(num) {
        return this.divmod(num, 'mod', true).mod;
      }; // Find Round(`this` / `num`)


      BN.prototype.divRound = function divRound(num) {
        var dm = this.divmod(num); // Fast case - exact division

        if (dm.mod.isZero()) return dm.div;
        var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;
        var half = num.ushrn(1);
        var r2 = num.andln(1);
        var cmp = mod.cmp(half); // Round down

        if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div; // Round up

        return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
      };

      BN.prototype.modn = function modn(num) {
        assert(num <= 0x3ffffff);
        var p = (1 << 26) % num;
        var acc = 0;

        for (var i = this.length - 1; i >= 0; i--) {
          acc = (p * acc + (this.words[i] | 0)) % num;
        }

        return acc;
      }; // In-place division by number


      BN.prototype.idivn = function idivn(num) {
        assert(num <= 0x3ffffff);
        var carry = 0;

        for (var i = this.length - 1; i >= 0; i--) {
          var w = (this.words[i] | 0) + carry * 0x4000000;
          this.words[i] = w / num | 0;
          carry = w % num;
        }

        return this.strip();
      };

      BN.prototype.divn = function divn(num) {
        return this.clone().idivn(num);
      };

      BN.prototype.egcd = function egcd(p) {
        assert(p.negative === 0);
        assert(!p.isZero());
        var x = this;
        var y = p.clone();

        if (x.negative !== 0) {
          x = x.umod(p);
        } else {
          x = x.clone();
        } // A * x + B * y = x


        var A = new BN(1);
        var B = new BN(0); // C * x + D * y = y

        var C = new BN(0);
        var D = new BN(1);
        var g = 0;

        while (x.isEven() && y.isEven()) {
          x.iushrn(1);
          y.iushrn(1);
          ++g;
        }

        var yp = y.clone();
        var xp = x.clone();

        while (!x.isZero()) {
          for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1) {
          }

          if (i > 0) {
            x.iushrn(i);

            while (i-- > 0) {
              if (A.isOdd() || B.isOdd()) {
                A.iadd(yp);
                B.isub(xp);
              }

              A.iushrn(1);
              B.iushrn(1);
            }
          }

          for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) {
          }

          if (j > 0) {
            y.iushrn(j);

            while (j-- > 0) {
              if (C.isOdd() || D.isOdd()) {
                C.iadd(yp);
                D.isub(xp);
              }

              C.iushrn(1);
              D.iushrn(1);
            }
          }

          if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
          } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
          }
        }

        return {
          a: C,
          b: D,
          gcd: y.iushln(g)
        };
      }; // This is reduced incarnation of the binary EEA
      // above, designated to invert members of the
      // _prime_ fields F(p) at a maximal speed


      BN.prototype._invmp = function _invmp(p) {
        assert(p.negative === 0);
        assert(!p.isZero());
        var a = this;
        var b = p.clone();

        if (a.negative !== 0) {
          a = a.umod(p);
        } else {
          a = a.clone();
        }

        var x1 = new BN(1);
        var x2 = new BN(0);
        var delta = b.clone();

        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
          for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1) {
          }

          if (i > 0) {
            a.iushrn(i);

            while (i-- > 0) {
              if (x1.isOdd()) {
                x1.iadd(delta);
              }

              x1.iushrn(1);
            }
          }

          for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) {
          }

          if (j > 0) {
            b.iushrn(j);

            while (j-- > 0) {
              if (x2.isOdd()) {
                x2.iadd(delta);
              }

              x2.iushrn(1);
            }
          }

          if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
          } else {
            b.isub(a);
            x2.isub(x1);
          }
        }

        var res;

        if (a.cmpn(1) === 0) {
          res = x1;
        } else {
          res = x2;
        }

        if (res.cmpn(0) < 0) {
          res.iadd(p);
        }

        return res;
      };

      BN.prototype.gcd = function gcd(num) {
        if (this.isZero()) return num.abs();
        if (num.isZero()) return this.abs();
        var a = this.clone();
        var b = num.clone();
        a.negative = 0;
        b.negative = 0; // Remove common factor of two

        for (var shift = 0; a.isEven() && b.isEven(); shift++) {
          a.iushrn(1);
          b.iushrn(1);
        }

        do {
          while (a.isEven()) {
            a.iushrn(1);
          }

          while (b.isEven()) {
            b.iushrn(1);
          }

          var r = a.cmp(b);

          if (r < 0) {
            // Swap `a` and `b` to make `a` always bigger than `b`
            var t = a;
            a = b;
            b = t;
          } else if (r === 0 || b.cmpn(1) === 0) {
            break;
          }

          a.isub(b);
        } while (true);

        return b.iushln(shift);
      }; // Invert number in the field F(num)


      BN.prototype.invm = function invm(num) {
        return this.egcd(num).a.umod(num);
      };

      BN.prototype.isEven = function isEven() {
        return (this.words[0] & 1) === 0;
      };

      BN.prototype.isOdd = function isOdd() {
        return (this.words[0] & 1) === 1;
      }; // And first word and num


      BN.prototype.andln = function andln(num) {
        return this.words[0] & num;
      }; // Increment at the bit position in-line


      BN.prototype.bincn = function bincn(bit) {
        assert(typeof bit === 'number');
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r; // Fast case: bit is much higher than all existing words

        if (this.length <= s) {
          this._expand(s + 1);

          this.words[s] |= q;
          return this;
        } // Add bit and propagate, if needed


        var carry = q;

        for (var i = s; carry !== 0 && i < this.length; i++) {
          var w = this.words[i] | 0;
          w += carry;
          carry = w >>> 26;
          w &= 0x3ffffff;
          this.words[i] = w;
        }

        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }

        return this;
      };

      BN.prototype.isZero = function isZero() {
        return this.length === 1 && this.words[0] === 0;
      };

      BN.prototype.cmpn = function cmpn(num) {
        var negative = num < 0;
        if (this.negative !== 0 && !negative) return -1;
        if (this.negative === 0 && negative) return 1;
        this.strip();
        var res;

        if (this.length > 1) {
          res = 1;
        } else {
          if (negative) {
            num = -num;
          }

          assert(num <= 0x3ffffff, 'Number is too big');
          var w = this.words[0] | 0;
          res = w === num ? 0 : w < num ? -1 : 1;
        }

        if (this.negative !== 0) return -res | 0;
        return res;
      }; // Compare two numbers and return:
      // 1 - if `this` > `num`
      // 0 - if `this` == `num`
      // -1 - if `this` < `num`


      BN.prototype.cmp = function cmp(num) {
        if (this.negative !== 0 && num.negative === 0) return -1;
        if (this.negative === 0 && num.negative !== 0) return 1;
        var res = this.ucmp(num);
        if (this.negative !== 0) return -res | 0;
        return res;
      }; // Unsigned comparison


      BN.prototype.ucmp = function ucmp(num) {
        // At this point both numbers have the same sign
        if (this.length > num.length) return 1;
        if (this.length < num.length) return -1;
        var res = 0;

        for (var i = this.length - 1; i >= 0; i--) {
          var a = this.words[i] | 0;
          var b = num.words[i] | 0;
          if (a === b) continue;

          if (a < b) {
            res = -1;
          } else if (a > b) {
            res = 1;
          }

          break;
        }

        return res;
      };

      BN.prototype.gtn = function gtn(num) {
        return this.cmpn(num) === 1;
      };

      BN.prototype.gt = function gt(num) {
        return this.cmp(num) === 1;
      };

      BN.prototype.gten = function gten(num) {
        return this.cmpn(num) >= 0;
      };

      BN.prototype.gte = function gte(num) {
        return this.cmp(num) >= 0;
      };

      BN.prototype.ltn = function ltn(num) {
        return this.cmpn(num) === -1;
      };

      BN.prototype.lt = function lt(num) {
        return this.cmp(num) === -1;
      };

      BN.prototype.lten = function lten(num) {
        return this.cmpn(num) <= 0;
      };

      BN.prototype.lte = function lte(num) {
        return this.cmp(num) <= 0;
      };

      BN.prototype.eqn = function eqn(num) {
        return this.cmpn(num) === 0;
      };

      BN.prototype.eq = function eq(num) {
        return this.cmp(num) === 0;
      }; //
      // A reduce context, could be using montgomery or something better, depending
      // on the `m` itself.
      //


      BN.red = function red(num) {
        return new Red(num);
      };

      BN.prototype.toRed = function toRed(ctx) {
        assert(!this.red, 'Already a number in reduction context');
        assert(this.negative === 0, 'red works only with positives');
        return ctx.convertTo(this)._forceRed(ctx);
      };

      BN.prototype.fromRed = function fromRed() {
        assert(this.red, 'fromRed works only with numbers in reduction context');
        return this.red.convertFrom(this);
      };

      BN.prototype._forceRed = function _forceRed(ctx) {
        this.red = ctx;
        return this;
      };

      BN.prototype.forceRed = function forceRed(ctx) {
        assert(!this.red, 'Already a number in reduction context');
        return this._forceRed(ctx);
      };

      BN.prototype.redAdd = function redAdd(num) {
        assert(this.red, 'redAdd works only with red numbers');
        return this.red.add(this, num);
      };

      BN.prototype.redIAdd = function redIAdd(num) {
        assert(this.red, 'redIAdd works only with red numbers');
        return this.red.iadd(this, num);
      };

      BN.prototype.redSub = function redSub(num) {
        assert(this.red, 'redSub works only with red numbers');
        return this.red.sub(this, num);
      };

      BN.prototype.redISub = function redISub(num) {
        assert(this.red, 'redISub works only with red numbers');
        return this.red.isub(this, num);
      };

      BN.prototype.redShl = function redShl(num) {
        assert(this.red, 'redShl works only with red numbers');
        return this.red.shl(this, num);
      };

      BN.prototype.redMul = function redMul(num) {
        assert(this.red, 'redMul works only with red numbers');

        this.red._verify2(this, num);

        return this.red.mul(this, num);
      };

      BN.prototype.redIMul = function redIMul(num) {
        assert(this.red, 'redMul works only with red numbers');

        this.red._verify2(this, num);

        return this.red.imul(this, num);
      };

      BN.prototype.redSqr = function redSqr() {
        assert(this.red, 'redSqr works only with red numbers');

        this.red._verify1(this);

        return this.red.sqr(this);
      };

      BN.prototype.redISqr = function redISqr() {
        assert(this.red, 'redISqr works only with red numbers');

        this.red._verify1(this);

        return this.red.isqr(this);
      }; // Square root over p


      BN.prototype.redSqrt = function redSqrt() {
        assert(this.red, 'redSqrt works only with red numbers');

        this.red._verify1(this);

        return this.red.sqrt(this);
      };

      BN.prototype.redInvm = function redInvm() {
        assert(this.red, 'redInvm works only with red numbers');

        this.red._verify1(this);

        return this.red.invm(this);
      }; // Return negative clone of `this` % `red modulo`


      BN.prototype.redNeg = function redNeg() {
        assert(this.red, 'redNeg works only with red numbers');

        this.red._verify1(this);

        return this.red.neg(this);
      };

      BN.prototype.redPow = function redPow(num) {
        assert(this.red && !num.red, 'redPow(normalNum)');

        this.red._verify1(this);

        return this.red.pow(this, num);
      }; // Prime numbers with efficient reduction


      var primes = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      }; // Pseudo-Mersenne prime

      function MPrime(name, p) {
        // P = 2 ^ N - K
        this.name = name;
        this.p = new BN(p, 16);
        this.n = this.p.bitLength();
        this.k = new BN(1).iushln(this.n).isub(this.p);
        this.tmp = this._tmp();
      }

      MPrime.prototype._tmp = function _tmp() {
        var tmp = new BN(null);
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
      };

      MPrime.prototype.ireduce = function ireduce(num) {
        // Assumes that `num` is less than `P^2`
        // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
        var r = num;
        var rlen;

        do {
          this.split(r, this.tmp);
          r = this.imulK(r);
          r = r.iadd(this.tmp);
          rlen = r.bitLength();
        } while (rlen > this.n);

        var cmp = rlen < this.n ? -1 : r.ucmp(this.p);

        if (cmp === 0) {
          r.words[0] = 0;
          r.length = 1;
        } else if (cmp > 0) {
          r.isub(this.p);
        } else {
          r.strip();
        }

        return r;
      };

      MPrime.prototype.split = function split(input, out) {
        input.iushrn(this.n, 0, out);
      };

      MPrime.prototype.imulK = function imulK(num) {
        return num.imul(this.k);
      };

      function K256() {
        MPrime.call(this, 'k256', 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
      }

      inherits(K256, MPrime);

      K256.prototype.split = function split(input, output) {
        // 256 = 9 * 26 + 22
        var mask = 0x3fffff;
        var outLen = Math.min(input.length, 9);

        for (var i = 0; i < outLen; i++) {
          output.words[i] = input.words[i];
        }

        output.length = outLen;

        if (input.length <= 9) {
          input.words[0] = 0;
          input.length = 1;
          return;
        } // Shift by 9 limbs


        var prev = input.words[9];
        output.words[output.length++] = prev & mask;

        for (i = 10; i < input.length; i++) {
          var next = input.words[i] | 0;
          input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
          prev = next;
        }

        prev >>>= 22;
        input.words[i - 10] = prev;

        if (prev === 0 && input.length > 10) {
          input.length -= 10;
        } else {
          input.length -= 9;
        }
      };

      K256.prototype.imulK = function imulK(num) {
        // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2; // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390

        var lo = 0;

        for (var i = 0; i < num.length; i++) {
          var w = num.words[i] | 0;
          lo += w * 0x3d1;
          num.words[i] = lo & 0x3ffffff;
          lo = w * 0x40 + (lo / 0x4000000 | 0);
        } // Fast length reduction


        if (num.words[num.length - 1] === 0) {
          num.length--;

          if (num.words[num.length - 1] === 0) {
            num.length--;
          }
        }

        return num;
      };

      function P224() {
        MPrime.call(this, 'p224', 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
      }

      inherits(P224, MPrime);

      function P192() {
        MPrime.call(this, 'p192', 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
      }

      inherits(P192, MPrime);

      function P25519() {
        // 2 ^ 255 - 19
        MPrime.call(this, '25519', '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
      }

      inherits(P25519, MPrime);

      P25519.prototype.imulK = function imulK(num) {
        // K = 0x13
        var carry = 0;

        for (var i = 0; i < num.length; i++) {
          var hi = (num.words[i] | 0) * 0x13 + carry;
          var lo = hi & 0x3ffffff;
          hi >>>= 26;
          num.words[i] = lo;
          carry = hi;
        }

        if (carry !== 0) {
          num.words[num.length++] = carry;
        }

        return num;
      }; // Exported mostly for testing purposes, use plain name instead


      BN._prime = function prime(name) {
        // Cached version of prime
        if (primes[name]) return primes[name];
        var prime;

        if (name === 'k256') {
          prime = new K256();
        } else if (name === 'p224') {
          prime = new P224();
        } else if (name === 'p192') {
          prime = new P192();
        } else if (name === 'p25519') {
          prime = new P25519();
        } else {
          throw new Error('Unknown prime ' + name);
        }

        primes[name] = prime;
        return prime;
      }; //
      // Base reduction engine
      //


      function Red(m) {
        if (typeof m === 'string') {
          var prime = BN._prime(m);

          this.m = prime.p;
          this.prime = prime;
        } else {
          assert(m.gtn(1), 'modulus must be greater than 1');
          this.m = m;
          this.prime = null;
        }
      }

      Red.prototype._verify1 = function _verify1(a) {
        assert(a.negative === 0, 'red works only with positives');
        assert(a.red, 'red works only with red numbers');
      };

      Red.prototype._verify2 = function _verify2(a, b) {
        assert((a.negative | b.negative) === 0, 'red works only with positives');
        assert(a.red && a.red === b.red, 'red works only with red numbers');
      };

      Red.prototype.imod = function imod(a) {
        if (this.prime) return this.prime.ireduce(a)._forceRed(this);
        return a.umod(this.m)._forceRed(this);
      };

      Red.prototype.neg = function neg(a) {
        if (a.isZero()) {
          return a.clone();
        }

        return this.m.sub(a)._forceRed(this);
      };

      Red.prototype.add = function add(a, b) {
        this._verify2(a, b);

        var res = a.add(b);

        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }

        return res._forceRed(this);
      };

      Red.prototype.iadd = function iadd(a, b) {
        this._verify2(a, b);

        var res = a.iadd(b);

        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }

        return res;
      };

      Red.prototype.sub = function sub(a, b) {
        this._verify2(a, b);

        var res = a.sub(b);

        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }

        return res._forceRed(this);
      };

      Red.prototype.isub = function isub(a, b) {
        this._verify2(a, b);

        var res = a.isub(b);

        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }

        return res;
      };

      Red.prototype.shl = function shl(a, num) {
        this._verify1(a);

        return this.imod(a.ushln(num));
      };

      Red.prototype.imul = function imul(a, b) {
        this._verify2(a, b);

        return this.imod(a.imul(b));
      };

      Red.prototype.mul = function mul(a, b) {
        this._verify2(a, b);

        return this.imod(a.mul(b));
      };

      Red.prototype.isqr = function isqr(a) {
        return this.imul(a, a.clone());
      };

      Red.prototype.sqr = function sqr(a) {
        return this.mul(a, a);
      };

      Red.prototype.sqrt = function sqrt(a) {
        if (a.isZero()) return a.clone();
        var mod3 = this.m.andln(3);
        assert(mod3 % 2 === 1); // Fast case

        if (mod3 === 3) {
          var pow = this.m.add(new BN(1)).iushrn(2);
          return this.pow(a, pow);
        } // Tonelli-Shanks algorithm (Totally unoptimized and slow)
        //
        // Find Q and S, that Q * 2 ^ S = (P - 1)


        var q = this.m.subn(1);
        var s = 0;

        while (!q.isZero() && q.andln(1) === 0) {
          s++;
          q.iushrn(1);
        }

        assert(!q.isZero());
        var one = new BN(1).toRed(this);
        var nOne = one.redNeg(); // Find quadratic non-residue
        // NOTE: Max is such because of generalized Riemann hypothesis.

        var lpow = this.m.subn(1).iushrn(1);
        var z = this.m.bitLength();
        z = new BN(2 * z * z).toRed(this);

        while (this.pow(z, lpow).cmp(nOne) !== 0) {
          z.redIAdd(nOne);
        }

        var c = this.pow(z, q);
        var r = this.pow(a, q.addn(1).iushrn(1));
        var t = this.pow(a, q);
        var m = s;

        while (t.cmp(one) !== 0) {
          var tmp = t;

          for (var i = 0; tmp.cmp(one) !== 0; i++) {
            tmp = tmp.redSqr();
          }

          assert(i < m);
          var b = this.pow(c, new BN(1).iushln(m - i - 1));
          r = r.redMul(b);
          c = b.redSqr();
          t = t.redMul(c);
          m = i;
        }

        return r;
      };

      Red.prototype.invm = function invm(a) {
        var inv = a._invmp(this.m);

        if (inv.negative !== 0) {
          inv.negative = 0;
          return this.imod(inv).redNeg();
        } else {
          return this.imod(inv);
        }
      };

      Red.prototype.pow = function pow(a, num) {
        if (num.isZero()) return new BN(1).toRed(this);
        if (num.cmpn(1) === 0) return a.clone();
        var windowSize = 4;
        var wnd = new Array(1 << windowSize);
        wnd[0] = new BN(1).toRed(this);
        wnd[1] = a;

        for (var i = 2; i < wnd.length; i++) {
          wnd[i] = this.mul(wnd[i - 1], a);
        }

        var res = wnd[0];
        var current = 0;
        var currentLen = 0;
        var start = num.bitLength() % 26;

        if (start === 0) {
          start = 26;
        }

        for (i = num.length - 1; i >= 0; i--) {
          var word = num.words[i];

          for (var j = start - 1; j >= 0; j--) {
            var bit = word >> j & 1;

            if (res !== wnd[0]) {
              res = this.sqr(res);
            }

            if (bit === 0 && current === 0) {
              currentLen = 0;
              continue;
            }

            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
          }

          start = 26;
        }

        return res;
      };

      Red.prototype.convertTo = function convertTo(num) {
        var r = num.umod(this.m);
        return r === num ? r.clone() : r;
      };

      Red.prototype.convertFrom = function convertFrom(num) {
        var res = num.clone();
        res.red = null;
        return res;
      }; //
      // Montgomery method engine
      //


      BN.mont = function mont(num) {
        return new Mont(num);
      };

      function Mont(m) {
        Red.call(this, m);
        this.shift = this.m.bitLength();

        if (this.shift % 26 !== 0) {
          this.shift += 26 - this.shift % 26;
        }

        this.r = new BN(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);
        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
      }

      inherits(Mont, Red);

      Mont.prototype.convertTo = function convertTo(num) {
        return this.imod(num.ushln(this.shift));
      };

      Mont.prototype.convertFrom = function convertFrom(num) {
        var r = this.imod(num.mul(this.rinv));
        r.red = null;
        return r;
      };

      Mont.prototype.imul = function imul(a, b) {
        if (a.isZero() || b.isZero()) {
          a.words[0] = 0;
          a.length = 1;
          return a;
        }

        var t = a.imul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;

        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }

        return res._forceRed(this);
      };

      Mont.prototype.mul = function mul(a, b) {
        if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
        var t = a.mul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;

        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }

        return res._forceRed(this);
      };

      Mont.prototype.invm = function invm(a) {
        // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
        var res = this.imod(a._invmp(this.m).mul(this.r2));
        return res._forceRed(this);
      };
    })( module, commonjsGlobal);
  });

  var r;

  var brorand = function rand(len) {
    if (!r) r = new Rand(null);
    return r.generate(len);
  };

  function Rand(rand) {
    this.rand = rand;
  }

  var Rand_1 = Rand;

  Rand.prototype.generate = function generate(len) {
    return this._rand(len);
  }; // Emulate crypto API using randy


  Rand.prototype._rand = function _rand(n) {
    if (this.rand.getBytes) return this.rand.getBytes(n);
    var res = new Uint8Array(n);

    for (var i = 0; i < res.length; i++) {
      res[i] = this.rand.getByte();
    }

    return res;
  };

  if ((typeof self === "undefined" ? "undefined" : _typeof(self)) === 'object') {
    if (self.crypto && self.crypto.getRandomValues) {
      // Modern browsers
      Rand.prototype._rand = function _rand(n) {
        var arr = new Uint8Array(n);
        self.crypto.getRandomValues(arr);
        return arr;
      };
    } else if (self.msCrypto && self.msCrypto.getRandomValues) {
      // IE
      Rand.prototype._rand = function _rand(n) {
        var arr = new Uint8Array(n);
        self.msCrypto.getRandomValues(arr);
        return arr;
      }; // Safari's WebWorkers do not have `crypto`

    } else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object') {
      // Old junk
      Rand.prototype._rand = function () {
        throw new Error('Not implemented yet');
      };
    }
  } else {
    // Node.js or Web worker with no crypto support
    try {
      var crypto = require$$0$1;
      if (typeof crypto.randomBytes !== 'function') throw new Error('Not supported');

      Rand.prototype._rand = function _rand(n) {
        return crypto.randomBytes(n);
      };
    } catch (e) {}
  }
  brorand.Rand = Rand_1;

  function MillerRabin(rand) {
    this.rand = rand || new brorand.Rand();
  }

  var mr = MillerRabin;

  MillerRabin.create = function create(rand) {
    return new MillerRabin(rand);
  };

  MillerRabin.prototype._randbelow = function _randbelow(n) {
    var len = n.bitLength();
    var min_bytes = Math.ceil(len / 8); // Generage random bytes until a number less than n is found.
    // This ensures that 0..n-1 have an equal probability of being selected.

    do {
      var a = new bn(this.rand.generate(min_bytes));
    } while (a.cmp(n) >= 0);

    return a;
  };

  MillerRabin.prototype._randrange = function _randrange(start, stop) {
    // Generate a random number greater than or equal to start and less than stop.
    var size = stop.sub(start);
    return start.add(this._randbelow(size));
  };

  MillerRabin.prototype.test = function test(n, k, cb) {
    var len = n.bitLength();
    var red = bn.mont(n);
    var rone = new bn(1).toRed(red);
    if (!k) k = Math.max(1, len / 48 | 0); // Find d and s, (n - 1) = (2 ^ s) * d;

    var n1 = n.subn(1);

    for (var s = 0; !n1.testn(s); s++) {}

    var d = n.shrn(s);
    var rn1 = n1.toRed(red);
    var prime = true;

    for (; k > 0; k--) {
      var a = this._randrange(new bn(2), n1);

      if (cb) cb(a);
      var x = a.toRed(red).redPow(d);
      if (x.cmp(rone) === 0 || x.cmp(rn1) === 0) continue;

      for (var i = 1; i < s; i++) {
        x = x.redSqr();
        if (x.cmp(rone) === 0) return false;
        if (x.cmp(rn1) === 0) break;
      }

      if (i === s) return false;
    }

    return prime;
  };

  MillerRabin.prototype.getDivisor = function getDivisor(n, k) {
    var len = n.bitLength();
    var red = bn.mont(n);
    var rone = new bn(1).toRed(red);
    if (!k) k = Math.max(1, len / 48 | 0); // Find d and s, (n - 1) = (2 ^ s) * d;

    var n1 = n.subn(1);

    for (var s = 0; !n1.testn(s); s++) {}

    var d = n.shrn(s);
    var rn1 = n1.toRed(red);

    for (; k > 0; k--) {
      var a = this._randrange(new bn(2), n1);

      var g = n.gcd(a);
      if (g.cmpn(1) !== 0) return g;
      var x = a.toRed(red).redPow(d);
      if (x.cmp(rone) === 0 || x.cmp(rn1) === 0) continue;

      for (var i = 1; i < s; i++) {
        x = x.redSqr();
        if (x.cmp(rone) === 0) return x.fromRed().subn(1).gcd(n);
        if (x.cmp(rn1) === 0) break;
      }

      if (i === s) {
        x = x.redSqr();
        return x.fromRed().subn(1).gcd(n);
      }
    }

    return false;
  };

  var generatePrime = findPrime;
  findPrime.simpleSieve = simpleSieve;
  findPrime.fermatTest = fermatTest;
  var TWENTYFOUR = new bn(24);
  var millerRabin = new mr();
  var ONE = new bn(1);
  var TWO = new bn(2);
  var FIVE = new bn(5);
  var SIXTEEN = new bn(16);
  var EIGHT = new bn(8);
  var TEN = new bn(10);
  var THREE = new bn(3);
  var SEVEN = new bn(7);
  var ELEVEN = new bn(11);
  var FOUR = new bn(4);
  var TWELVE = new bn(12);
  var primes = null;

  function _getPrimes() {
    if (primes !== null) return primes;
    var limit = 0x100000;
    var res = [];
    res[0] = 2;

    for (var i = 1, k = 3; k < limit; k += 2) {
      var sqrt = Math.ceil(Math.sqrt(k));

      for (var j = 0; j < i && res[j] <= sqrt; j++) {
        if (k % res[j] === 0) break;
      }

      if (i !== j && res[j] <= sqrt) continue;
      res[i++] = k;
    }

    primes = res;
    return res;
  }

  function simpleSieve(p) {
    var primes = _getPrimes();

    for (var i = 0; i < primes.length; i++) {
      if (p.modn(primes[i]) === 0) {
        if (p.cmpn(primes[i]) === 0) {
          return true;
        } else {
          return false;
        }
      }
    }

    return true;
  }

  function fermatTest(p) {
    var red = bn.mont(p);
    return TWO.toRed(red).redPow(p.subn(1)).fromRed().cmpn(1) === 0;
  }

  function findPrime(bits, gen) {
    if (bits < 16) {
      // this is what openssl does
      if (gen === 2 || gen === 5) {
        return new bn([0x8c, 0x7b]);
      } else {
        return new bn([0x8c, 0x27]);
      }
    }

    gen = new bn(gen);
    var num, n2;

    while (true) {
      num = new bn(browser$3(Math.ceil(bits / 8)));

      while (num.bitLength() > bits) {
        num.ishrn(1);
      }

      if (num.isEven()) {
        num.iadd(ONE);
      }

      if (!num.testn(1)) {
        num.iadd(TWO);
      }

      if (!gen.cmp(TWO)) {
        while (num.mod(TWENTYFOUR).cmp(ELEVEN)) {
          num.iadd(FOUR);
        }
      } else if (!gen.cmp(FIVE)) {
        while (num.mod(TEN).cmp(THREE)) {
          num.iadd(FOUR);
        }
      }

      n2 = num.shrn(1);

      if (simpleSieve(n2) && simpleSieve(num) && fermatTest(n2) && fermatTest(num) && millerRabin.test(n2) && millerRabin.test(num)) {
        return num;
      }
    }
  }

  var modp1 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a63a3620ffffffffffffffff"
  };
  var modp2 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381ffffffffffffffff"
  };
  var modp5 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca237327ffffffffffffffff"
  };
  var modp14 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aacaa68ffffffffffffffff"
  };
  var modp15 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a93ad2caffffffffffffffff"
  };
  var modp16 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c934063199ffffffffffffffff"
  };
  var modp17 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dcc4024ffffffffffffffff"
  };
  var modp18 = {
  	gen: "02",
  	prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dbe115974a3926f12fee5e438777cb6a932df8cd8bec4d073b931ba3bc832b68d9dd300741fa7bf8afc47ed2576f6936ba424663aab639c5ae4f5683423b4742bf1c978238f16cbe39d652de3fdb8befc848ad922222e04a4037c0713eb57a81a23f0c73473fc646cea306b4bcbc8862f8385ddfa9d4b7fa2c087e879683303ed5bdd3a062b3cf5b3a278a66d2a13f83f44f82ddf310ee074ab6a364597e899a0255dc164f31cc50846851df9ab48195ded7ea1b1d510bd7ee74d73faf36bc31ecfa268359046f4eb879f924009438b481c6cd7889a002ed5ee382bc9190da6fc026e479558e4475677e9aa9e3050e2765694dfc81f56e880b96e7160c980dd98edd3dfffffffffffffffff"
  };
  var primes$1 = {
  	modp1: modp1,
  	modp2: modp2,
  	modp5: modp5,
  	modp14: modp14,
  	modp15: modp15,
  	modp16: modp16,
  	modp17: modp17,
  	modp18: modp18
  };

  var primes$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    modp1: modp1,
    modp2: modp2,
    modp5: modp5,
    modp14: modp14,
    modp15: modp15,
    modp16: modp16,
    modp17: modp17,
    modp18: modp18,
    'default': primes$1
  });

  var millerRabin$1 = new mr();
  var TWENTYFOUR$1 = new bn(24);
  var ELEVEN$1 = new bn(11);
  var TEN$1 = new bn(10);
  var THREE$1 = new bn(3);
  var SEVEN$1 = new bn(7);
  var dh = DH;

  function setPublicKey(pub, enc) {
    enc = enc || 'utf8';

    if (!isBuffer(pub)) {
      pub = new Buffer(pub, enc);
    }

    this._pub = new bn(pub);
    return this;
  }

  function setPrivateKey(priv, enc) {
    enc = enc || 'utf8';

    if (!isBuffer(priv)) {
      priv = new Buffer(priv, enc);
    }

    this._priv = new bn(priv);
    return this;
  }

  var primeCache = {};

  function checkPrime(prime, generator) {
    var gen = generator.toString('hex');
    var hex = [gen, prime.toString(16)].join('_');

    if (hex in primeCache) {
      return primeCache[hex];
    }

    var error = 0;

    if (prime.isEven() || !generatePrime.simpleSieve || !generatePrime.fermatTest(prime) || !millerRabin$1.test(prime)) {
      //not a prime so +1
      error += 1;

      if (gen === '02' || gen === '05') {
        // we'd be able to check the generator
        // it would fail so +8
        error += 8;
      } else {
        //we wouldn't be able to test the generator
        // so +4
        error += 4;
      }

      primeCache[hex] = error;
      return error;
    }

    if (!millerRabin$1.test(prime.shrn(1))) {
      //not a safe prime
      error += 2;
    }

    var rem;

    switch (gen) {
      case '02':
        if (prime.mod(TWENTYFOUR$1).cmp(ELEVEN$1)) {
          // unsuidable generator
          error += 8;
        }

        break;

      case '05':
        rem = prime.mod(TEN$1);

        if (rem.cmp(THREE$1) && rem.cmp(SEVEN$1)) {
          // prime mod 10 needs to equal 3 or 7
          error += 8;
        }

        break;

      default:
        error += 4;
    }

    primeCache[hex] = error;
    return error;
  }

  function DH(prime, generator, malleable) {
    this.setGenerator(generator);
    this.__prime = new bn(prime);
    this._prime = bn.mont(this.__prime);
    this._primeLen = prime.length;
    this._pub = undefined;
    this._priv = undefined;
    this._primeCode = undefined;

    if (malleable) {
      this.setPublicKey = setPublicKey;
      this.setPrivateKey = setPrivateKey;
    } else {
      this._primeCode = 8;
    }
  }

  Object.defineProperty(DH.prototype, 'verifyError', {
    enumerable: true,
    get: function get() {
      if (typeof this._primeCode !== 'number') {
        this._primeCode = checkPrime(this.__prime, this.__gen);
      }

      return this._primeCode;
    }
  });

  DH.prototype.generateKeys = function () {
    if (!this._priv) {
      this._priv = new bn(browser$3(this._primeLen));
    }

    this._pub = this._gen.toRed(this._prime).redPow(this._priv).fromRed();
    return this.getPublicKey();
  };

  DH.prototype.computeSecret = function (other) {
    other = new bn(other);
    other = other.toRed(this._prime);
    var secret = other.redPow(this._priv).fromRed();
    var out = new Buffer(secret.toArray());
    var prime = this.getPrime();

    if (out.length < prime.length) {
      var front = new Buffer(prime.length - out.length);
      front.fill(0);
      out = Buffer.concat([front, out]);
    }

    return out;
  };

  DH.prototype.getPublicKey = function getPublicKey(enc) {
    return formatReturnValue(this._pub, enc);
  };

  DH.prototype.getPrivateKey = function getPrivateKey(enc) {
    return formatReturnValue(this._priv, enc);
  };

  DH.prototype.getPrime = function (enc) {
    return formatReturnValue(this.__prime, enc);
  };

  DH.prototype.getGenerator = function (enc) {
    return formatReturnValue(this._gen, enc);
  };

  DH.prototype.setGenerator = function (gen, enc) {
    enc = enc || 'utf8';

    if (!isBuffer(gen)) {
      gen = new Buffer(gen, enc);
    }

    this.__gen = gen;
    this._gen = new bn(gen);
    return this;
  };

  function formatReturnValue(bn, enc) {
    var buf = new Buffer(bn.toArray());

    if (!enc) {
      return buf;
    } else {
      return buf.toString(enc);
    }
  }

  var primes$3 = getCjsExportFromNamespace(primes$2);

  var browser$7 = createCommonjsModule(function (module, exports) {
    function getDiffieHellman(mod) {
      var prime = new Buffer(primes$3[mod].prime, 'hex');
      var gen = new Buffer(primes$3[mod].gen, 'hex');
      return new dh(prime, gen);
    }

    var ENCODINGS = {
      'binary': true,
      'hex': true,
      'base64': true
    };

    function createDiffieHellman(prime, enc, generator, genc) {
      if (isBuffer(enc) || ENCODINGS[enc] === undefined) {
        return createDiffieHellman(prime, 'binary', enc, generator);
      }

      enc = enc || 'binary';
      genc = genc || 'binary';
      generator = generator || new Buffer([2]);

      if (!isBuffer(generator)) {
        generator = new Buffer(generator, genc);
      }

      if (typeof prime === 'number') {
        return new dh(generatePrime(prime, generator), generator, true);
      }

      if (!isBuffer(prime)) {
        prime = new Buffer(prime, enc);
      }

      return new dh(prime, generator, true);
    }

    exports.DiffieHellmanGroup = exports.createDiffieHellmanGroup = exports.getDiffieHellman = getDiffieHellman;
    exports.createDiffieHellman = exports.DiffieHellman = createDiffieHellman;
  });
  var browser_1$2 = browser$7.DiffieHellmanGroup;
  var browser_2$2 = browser$7.createDiffieHellmanGroup;
  var browser_3$2 = browser$7.getDiffieHellman;
  var browser_4$2 = browser$7.createDiffieHellman;
  var browser_5$2 = browser$7.DiffieHellman;

  var browserifyRsa = crt;

  function blind(priv) {
    var r = getr(priv);
    var blinder = r.toRed(bn.mont(priv.modulus)).redPow(new bn(priv.publicExponent)).fromRed();
    return {
      blinder: blinder,
      unblinder: r.invm(priv.modulus)
    };
  }

  function crt(msg, priv) {
    var blinds = blind(priv);
    var len = priv.modulus.byteLength();
    var mod = bn.mont(priv.modulus);
    var blinded = new bn(msg).mul(blinds.blinder).umod(priv.modulus);
    var c1 = blinded.toRed(bn.mont(priv.prime1));
    var c2 = blinded.toRed(bn.mont(priv.prime2));
    var qinv = priv.coefficient;
    var p = priv.prime1;
    var q = priv.prime2;
    var m1 = c1.redPow(priv.exponent1);
    var m2 = c2.redPow(priv.exponent2);
    m1 = m1.fromRed();
    m2 = m2.fromRed();
    var h = m1.isub(m2).imul(qinv).umod(p);
    h.imul(q);
    m2.iadd(h);
    return new Buffer(m2.imul(blinds.unblinder).umod(priv.modulus).toArray(false, len));
  }

  crt.getr = getr;

  function getr(priv) {
    var len = priv.modulus.byteLength();
    var r = new bn(browser$3(len));

    while (r.cmp(priv.modulus) >= 0 || !r.umod(priv.prime1) || !r.umod(priv.prime2)) {
      r = new bn(browser$3(len));
    }

    return r;
  }

  var _from = "elliptic@^6.5.1";
  var _id = "elliptic@6.5.1";
  var _inBundle = false;
  var _integrity = "sha512-xvJINNLbTeWQjrl6X+7eQCrIy/YPv5XCpKW6kB5mKvtnGILoLDcySuwomfdzt0BMdLNVnuRNTuzKNHj0bva1Cg==";
  var _location = "/elliptic";
  var _phantomChildren = {
  };
  var _requested = {
  	type: "range",
  	registry: true,
  	raw: "elliptic@^6.5.1",
  	name: "elliptic",
  	escapedName: "elliptic",
  	rawSpec: "^6.5.1",
  	saveSpec: null,
  	fetchSpec: "^6.5.1"
  };
  var _requiredBy = [
  	"/",
  	"/browserify-sign",
  	"/create-ecdh",
  	"/minterjs-tx",
  	"/minterjs-util",
  	"/secp256k1"
  ];
  var _resolved = "https://registry.npmjs.org/elliptic/-/elliptic-6.5.1.tgz";
  var _shasum = "c380f5f909bf1b9b4428d028cd18d3b0efd6b52b";
  var _spec = "elliptic@^6.5.1";
  var _where = "/Users/front/work/minterjs-wallet";
  var author = {
  	name: "Fedor Indutny",
  	email: "fedor@indutny.com"
  };
  var bugs = {
  	url: "https://github.com/indutny/elliptic/issues"
  };
  var bundleDependencies = false;
  var dependencies = {
  	"bn.js": "^4.4.0",
  	brorand: "^1.0.1",
  	"hash.js": "^1.0.0",
  	"hmac-drbg": "^1.0.0",
  	inherits: "^2.0.1",
  	"minimalistic-assert": "^1.0.0",
  	"minimalistic-crypto-utils": "^1.0.0"
  };
  var deprecated = false;
  var description = "EC cryptography";
  var devDependencies = {
  	brfs: "^1.4.3",
  	coveralls: "^3.0.4",
  	grunt: "^1.0.4",
  	"grunt-browserify": "^5.0.0",
  	"grunt-cli": "^1.2.0",
  	"grunt-contrib-connect": "^1.0.0",
  	"grunt-contrib-copy": "^1.0.0",
  	"grunt-contrib-uglify": "^1.0.1",
  	"grunt-mocha-istanbul": "^3.0.1",
  	"grunt-saucelabs": "^9.0.1",
  	istanbul: "^0.4.2",
  	jscs: "^3.0.7",
  	jshint: "^2.6.0",
  	mocha: "^6.1.4"
  };
  var files = [
  	"lib"
  ];
  var homepage = "https://github.com/indutny/elliptic";
  var keywords = [
  	"EC",
  	"Elliptic",
  	"curve",
  	"Cryptography"
  ];
  var license = "MIT";
  var main = "lib/elliptic.js";
  var name = "elliptic";
  var repository = {
  	type: "git",
  	url: "git+ssh://git@github.com/indutny/elliptic.git"
  };
  var scripts = {
  	jscs: "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
  	jshint: "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
  	lint: "npm run jscs && npm run jshint",
  	test: "npm run lint && npm run unit",
  	unit: "istanbul test _mocha --reporter=spec test/index.js",
  	version: "grunt dist && git add dist/"
  };
  var version = "6.5.1";
  var _package = {
  	_from: _from,
  	_id: _id,
  	_inBundle: _inBundle,
  	_integrity: _integrity,
  	_location: _location,
  	_phantomChildren: _phantomChildren,
  	_requested: _requested,
  	_requiredBy: _requiredBy,
  	_resolved: _resolved,
  	_shasum: _shasum,
  	_spec: _spec,
  	_where: _where,
  	author: author,
  	bugs: bugs,
  	bundleDependencies: bundleDependencies,
  	dependencies: dependencies,
  	deprecated: deprecated,
  	description: description,
  	devDependencies: devDependencies,
  	files: files,
  	homepage: homepage,
  	keywords: keywords,
  	license: license,
  	main: main,
  	name: name,
  	repository: repository,
  	scripts: scripts,
  	version: version
  };

  var _package$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    _from: _from,
    _id: _id,
    _inBundle: _inBundle,
    _integrity: _integrity,
    _location: _location,
    _phantomChildren: _phantomChildren,
    _requested: _requested,
    _requiredBy: _requiredBy,
    _resolved: _resolved,
    _shasum: _shasum,
    _spec: _spec,
    _where: _where,
    author: author,
    bugs: bugs,
    bundleDependencies: bundleDependencies,
    dependencies: dependencies,
    deprecated: deprecated,
    description: description,
    devDependencies: devDependencies,
    files: files,
    homepage: homepage,
    keywords: keywords,
    license: license,
    main: main,
    name: name,
    repository: repository,
    scripts: scripts,
    version: version,
    'default': _package
  });

  var utils_1 = createCommonjsModule(function (module, exports) {

    var utils = exports;

    function toArray(msg, enc) {
      if (Array.isArray(msg)) return msg.slice();
      if (!msg) return [];
      var res = [];

      if (typeof msg !== 'string') {
        for (var i = 0; i < msg.length; i++) {
          res[i] = msg[i] | 0;
        }

        return res;
      }

      if (enc === 'hex') {
        msg = msg.replace(/[^a-z0-9]+/ig, '');
        if (msg.length % 2 !== 0) msg = '0' + msg;

        for (var i = 0; i < msg.length; i += 2) {
          res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
      } else {
        for (var i = 0; i < msg.length; i++) {
          var c = msg.charCodeAt(i);
          var hi = c >> 8;
          var lo = c & 0xff;
          if (hi) res.push(hi, lo);else res.push(lo);
        }
      }

      return res;
    }

    utils.toArray = toArray;

    function zero2(word) {
      if (word.length === 1) return '0' + word;else return word;
    }

    utils.zero2 = zero2;

    function toHex(msg) {
      var res = '';

      for (var i = 0; i < msg.length; i++) {
        res += zero2(msg[i].toString(16));
      }

      return res;
    }

    utils.toHex = toHex;

    utils.encode = function encode(arr, enc) {
      if (enc === 'hex') return toHex(arr);else return arr;
    };
  });

  var utils_1$1 = createCommonjsModule(function (module, exports) {

    var utils = exports;
    utils.assert = minimalisticAssert;
    utils.toArray = utils_1.toArray;
    utils.zero2 = utils_1.zero2;
    utils.toHex = utils_1.toHex;
    utils.encode = utils_1.encode; // Represent num in a w-NAF form

    function getNAF(num, w) {
      var naf = [];
      var ws = 1 << w + 1;
      var k = num.clone();

      while (k.cmpn(1) >= 0) {
        var z;

        if (k.isOdd()) {
          var mod = k.andln(ws - 1);
          if (mod > (ws >> 1) - 1) z = (ws >> 1) - mod;else z = mod;
          k.isubn(z);
        } else {
          z = 0;
        }

        naf.push(z); // Optimization, shift by word if possible

        var shift = k.cmpn(0) !== 0 && k.andln(ws - 1) === 0 ? w + 1 : 1;

        for (var i = 1; i < shift; i++) {
          naf.push(0);
        }

        k.iushrn(shift);
      }

      return naf;
    }

    utils.getNAF = getNAF; // Represent k1, k2 in a Joint Sparse Form

    function getJSF(k1, k2) {
      var jsf = [[], []];
      k1 = k1.clone();
      k2 = k2.clone();
      var d1 = 0;
      var d2 = 0;

      while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
        // First phase
        var m14 = k1.andln(3) + d1 & 3;
        var m24 = k2.andln(3) + d2 & 3;
        if (m14 === 3) m14 = -1;
        if (m24 === 3) m24 = -1;
        var u1;

        if ((m14 & 1) === 0) {
          u1 = 0;
        } else {
          var m8 = k1.andln(7) + d1 & 7;
          if ((m8 === 3 || m8 === 5) && m24 === 2) u1 = -m14;else u1 = m14;
        }

        jsf[0].push(u1);
        var u2;

        if ((m24 & 1) === 0) {
          u2 = 0;
        } else {
          var m8 = k2.andln(7) + d2 & 7;
          if ((m8 === 3 || m8 === 5) && m14 === 2) u2 = -m24;else u2 = m24;
        }

        jsf[1].push(u2); // Second phase

        if (2 * d1 === u1 + 1) d1 = 1 - d1;
        if (2 * d2 === u2 + 1) d2 = 1 - d2;
        k1.iushrn(1);
        k2.iushrn(1);
      }

      return jsf;
    }

    utils.getJSF = getJSF;

    function cachedProperty(obj, name, computer) {
      var key = '_' + name;

      obj.prototype[name] = function cachedProperty() {
        return this[key] !== undefined ? this[key] : this[key] = computer.call(this);
      };
    }

    utils.cachedProperty = cachedProperty;

    function parseBytes(bytes) {
      return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') : bytes;
    }

    utils.parseBytes = parseBytes;

    function intFromLE(bytes) {
      return new bn(bytes, 'hex', 'le');
    }

    utils.intFromLE = intFromLE;
  });

  var getNAF = utils_1$1.getNAF;
  var getJSF = utils_1$1.getJSF;
  var assert$2 = utils_1$1.assert;

  function BaseCurve(type, conf) {
    this.type = type;
    this.p = new bn(conf.p, 16); // Use Montgomery, when there is no fast reduction for the prime

    this.red = conf.prime ? bn.red(conf.prime) : bn.mont(this.p); // Useful for many curves

    this.zero = new bn(0).toRed(this.red);
    this.one = new bn(1).toRed(this.red);
    this.two = new bn(2).toRed(this.red); // Curve configuration, optional

    this.n = conf.n && new bn(conf.n, 16);
    this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed); // Temporary arrays

    this._wnafT1 = new Array(4);
    this._wnafT2 = new Array(4);
    this._wnafT3 = new Array(4);
    this._wnafT4 = new Array(4); // Generalized Greg Maxwell's trick

    var adjustCount = this.n && this.p.div(this.n);

    if (!adjustCount || adjustCount.cmpn(100) > 0) {
      this.redN = null;
    } else {
      this._maxwellTrick = true;
      this.redN = this.n.toRed(this.red);
    }
  }

  var base = BaseCurve;

  BaseCurve.prototype.point = function point() {
    throw new Error('Not implemented');
  };

  BaseCurve.prototype.validate = function validate() {
    throw new Error('Not implemented');
  };

  BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
    assert$2(p.precomputed);

    var doubles = p._getDoubles();

    var naf = getNAF(k, 1);
    var I = (1 << doubles.step + 1) - (doubles.step % 2 === 0 ? 2 : 1);
    I /= 3; // Translate into more windowed form

    var repr = [];

    for (var j = 0; j < naf.length; j += doubles.step) {
      var nafW = 0;

      for (var k = j + doubles.step - 1; k >= j; k--) {
        nafW = (nafW << 1) + naf[k];
      }

      repr.push(nafW);
    }

    var a = this.jpoint(null, null, null);
    var b = this.jpoint(null, null, null);

    for (var i = I; i > 0; i--) {
      for (var j = 0; j < repr.length; j++) {
        var nafW = repr[j];
        if (nafW === i) b = b.mixedAdd(doubles.points[j]);else if (nafW === -i) b = b.mixedAdd(doubles.points[j].neg());
      }

      a = a.add(b);
    }

    return a.toP();
  };

  BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
    var w = 4; // Precompute window

    var nafPoints = p._getNAFPoints(w);

    w = nafPoints.wnd;
    var wnd = nafPoints.points; // Get NAF form

    var naf = getNAF(k, w); // Add `this`*(N+1) for every w-NAF index

    var acc = this.jpoint(null, null, null);

    for (var i = naf.length - 1; i >= 0; i--) {
      // Count zeroes
      for (var k = 0; i >= 0 && naf[i] === 0; i--) {
        k++;
      }

      if (i >= 0) k++;
      acc = acc.dblp(k);
      if (i < 0) break;
      var z = naf[i];
      assert$2(z !== 0);

      if (p.type === 'affine') {
        // J +- P
        if (z > 0) acc = acc.mixedAdd(wnd[z - 1 >> 1]);else acc = acc.mixedAdd(wnd[-z - 1 >> 1].neg());
      } else {
        // J +- J
        if (z > 0) acc = acc.add(wnd[z - 1 >> 1]);else acc = acc.add(wnd[-z - 1 >> 1].neg());
      }
    }

    return p.type === 'affine' ? acc.toP() : acc;
  };

  BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
    var wndWidth = this._wnafT1;
    var wnd = this._wnafT2;
    var naf = this._wnafT3; // Fill all arrays

    var max = 0;

    for (var i = 0; i < len; i++) {
      var p = points[i];

      var nafPoints = p._getNAFPoints(defW);

      wndWidth[i] = nafPoints.wnd;
      wnd[i] = nafPoints.points;
    } // Comb small window NAFs


    for (var i = len - 1; i >= 1; i -= 2) {
      var a = i - 1;
      var b = i;

      if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
        naf[a] = getNAF(coeffs[a], wndWidth[a]);
        naf[b] = getNAF(coeffs[b], wndWidth[b]);
        max = Math.max(naf[a].length, max);
        max = Math.max(naf[b].length, max);
        continue;
      }

      var comb = [points[a],
      /* 1 */
      null,
      /* 3 */
      null,
      /* 5 */
      points[b]
      /* 7 */
      ]; // Try to avoid Projective points, if possible

      if (points[a].y.cmp(points[b].y) === 0) {
        comb[1] = points[a].add(points[b]);
        comb[2] = points[a].toJ().mixedAdd(points[b].neg());
      } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
        comb[1] = points[a].toJ().mixedAdd(points[b]);
        comb[2] = points[a].add(points[b].neg());
      } else {
        comb[1] = points[a].toJ().mixedAdd(points[b]);
        comb[2] = points[a].toJ().mixedAdd(points[b].neg());
      }

      var index = [-3,
      /* -1 -1 */
      -1,
      /* -1 0 */
      -5,
      /* -1 1 */
      -7,
      /* 0 -1 */
      0,
      /* 0 0 */
      7,
      /* 0 1 */
      5,
      /* 1 -1 */
      1,
      /* 1 0 */
      3
      /* 1 1 */
      ];
      var jsf = getJSF(coeffs[a], coeffs[b]);
      max = Math.max(jsf[0].length, max);
      naf[a] = new Array(max);
      naf[b] = new Array(max);

      for (var j = 0; j < max; j++) {
        var ja = jsf[0][j] | 0;
        var jb = jsf[1][j] | 0;
        naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
        naf[b][j] = 0;
        wnd[a] = comb;
      }
    }

    var acc = this.jpoint(null, null, null);
    var tmp = this._wnafT4;

    for (var i = max; i >= 0; i--) {
      var k = 0;

      while (i >= 0) {
        var zero = true;

        for (var j = 0; j < len; j++) {
          tmp[j] = naf[j][i] | 0;
          if (tmp[j] !== 0) zero = false;
        }

        if (!zero) break;
        k++;
        i--;
      }

      if (i >= 0) k++;
      acc = acc.dblp(k);
      if (i < 0) break;

      for (var j = 0; j < len; j++) {
        var z = tmp[j];
        var p;
        if (z === 0) continue;else if (z > 0) p = wnd[j][z - 1 >> 1];else if (z < 0) p = wnd[j][-z - 1 >> 1].neg();
        if (p.type === 'affine') acc = acc.mixedAdd(p);else acc = acc.add(p);
      }
    } // Zeroify references


    for (var i = 0; i < len; i++) {
      wnd[i] = null;
    }

    if (jacobianResult) return acc;else return acc.toP();
  };

  function BasePoint(curve, type) {
    this.curve = curve;
    this.type = type;
    this.precomputed = null;
  }

  BaseCurve.BasePoint = BasePoint;

  BasePoint.prototype.eq = function eq()
  /*other*/
  {
    throw new Error('Not implemented');
  };

  BasePoint.prototype.validate = function validate() {
    return this.curve.validate(this);
  };

  BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
    bytes = utils_1$1.toArray(bytes, enc);
    var len = this.p.byteLength(); // uncompressed, hybrid-odd, hybrid-even

    if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) && bytes.length - 1 === 2 * len) {
      if (bytes[0] === 0x06) assert$2(bytes[bytes.length - 1] % 2 === 0);else if (bytes[0] === 0x07) assert$2(bytes[bytes.length - 1] % 2 === 1);
      var res = this.point(bytes.slice(1, 1 + len), bytes.slice(1 + len, 1 + 2 * len));
      return res;
    } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) && bytes.length - 1 === len) {
      return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
    }

    throw new Error('Unknown point format');
  };

  BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
    return this.encode(enc, true);
  };

  BasePoint.prototype._encode = function _encode(compact) {
    var len = this.curve.p.byteLength();
    var x = this.getX().toArray('be', len);
    if (compact) return [this.getY().isEven() ? 0x02 : 0x03].concat(x);
    return [0x04].concat(x, this.getY().toArray('be', len));
  };

  BasePoint.prototype.encode = function encode(enc, compact) {
    return utils_1$1.encode(this._encode(compact), enc);
  };

  BasePoint.prototype.precompute = function precompute(power) {
    if (this.precomputed) return this;
    var precomputed = {
      doubles: null,
      naf: null,
      beta: null
    };
    precomputed.naf = this._getNAFPoints(8);
    precomputed.doubles = this._getDoubles(4, power);
    precomputed.beta = this._getBeta();
    this.precomputed = precomputed;
    return this;
  };

  BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
    if (!this.precomputed) return false;
    var doubles = this.precomputed.doubles;
    if (!doubles) return false;
    return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
  };

  BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
    if (this.precomputed && this.precomputed.doubles) return this.precomputed.doubles;
    var doubles = [this];
    var acc = this;

    for (var i = 0; i < power; i += step) {
      for (var j = 0; j < step; j++) {
        acc = acc.dbl();
      }

      doubles.push(acc);
    }

    return {
      step: step,
      points: doubles
    };
  };

  BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
    if (this.precomputed && this.precomputed.naf) return this.precomputed.naf;
    var res = [this];
    var max = (1 << wnd) - 1;
    var dbl = max === 1 ? null : this.dbl();

    for (var i = 1; i < max; i++) {
      res[i] = res[i - 1].add(dbl);
    }

    return {
      wnd: wnd,
      points: res
    };
  };

  BasePoint.prototype._getBeta = function _getBeta() {
    return null;
  };

  BasePoint.prototype.dblp = function dblp(k) {
    var r = this;

    for (var i = 0; i < k; i++) {
      r = r.dbl();
    }

    return r;
  };

  var assert$3 = utils_1$1.assert;

  function ShortCurve(conf) {
    base.call(this, 'short', conf);
    this.a = new bn(conf.a, 16).toRed(this.red);
    this.b = new bn(conf.b, 16).toRed(this.red);
    this.tinv = this.two.redInvm();
    this.zeroA = this.a.fromRed().cmpn(0) === 0;
    this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0; // If the curve is endomorphic, precalculate beta and lambda

    this.endo = this._getEndomorphism(conf);
    this._endoWnafT1 = new Array(4);
    this._endoWnafT2 = new Array(4);
  }

  inherits_browser(ShortCurve, base);
  var short_1 = ShortCurve;

  ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
    // No efficient endomorphism
    if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1) return; // Compute beta and lambda, that lambda * P = (beta * Px; Py)

    var beta;
    var lambda;

    if (conf.beta) {
      beta = new bn(conf.beta, 16).toRed(this.red);
    } else {
      var betas = this._getEndoRoots(this.p); // Choose the smallest beta


      beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
      beta = beta.toRed(this.red);
    }

    if (conf.lambda) {
      lambda = new bn(conf.lambda, 16);
    } else {
      // Choose the lambda that is matching selected beta
      var lambdas = this._getEndoRoots(this.n);

      if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
        lambda = lambdas[0];
      } else {
        lambda = lambdas[1];
        assert$3(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
      }
    } // Get basis vectors, used for balanced length-two representation


    var basis;

    if (conf.basis) {
      basis = conf.basis.map(function (vec) {
        return {
          a: new bn(vec.a, 16),
          b: new bn(vec.b, 16)
        };
      });
    } else {
      basis = this._getEndoBasis(lambda);
    }

    return {
      beta: beta,
      lambda: lambda,
      basis: basis
    };
  };

  ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
    // Find roots of for x^2 + x + 1 in F
    // Root = (-1 +- Sqrt(-3)) / 2
    //
    var red = num === this.p ? this.red : bn.mont(num);
    var tinv = new bn(2).toRed(red).redInvm();
    var ntinv = tinv.redNeg();
    var s = new bn(3).toRed(red).redNeg().redSqrt().redMul(tinv);
    var l1 = ntinv.redAdd(s).fromRed();
    var l2 = ntinv.redSub(s).fromRed();
    return [l1, l2];
  };

  ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
    // aprxSqrt >= sqrt(this.n)
    var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2)); // 3.74
    // Run EGCD, until r(L + 1) < aprxSqrt

    var u = lambda;
    var v = this.n.clone();
    var x1 = new bn(1);
    var y1 = new bn(0);
    var x2 = new bn(0);
    var y2 = new bn(1); // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)

    var a0;
    var b0; // First vector

    var a1;
    var b1; // Second vector

    var a2;
    var b2;
    var prevR;
    var i = 0;
    var r;
    var x;

    while (u.cmpn(0) !== 0) {
      var q = v.div(u);
      r = v.sub(q.mul(u));
      x = x2.sub(q.mul(x1));
      var y = y2.sub(q.mul(y1));

      if (!a1 && r.cmp(aprxSqrt) < 0) {
        a0 = prevR.neg();
        b0 = x1;
        a1 = r.neg();
        b1 = x;
      } else if (a1 && ++i === 2) {
        break;
      }

      prevR = r;
      v = u;
      u = r;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
    }

    a2 = r.neg();
    b2 = x;
    var len1 = a1.sqr().add(b1.sqr());
    var len2 = a2.sqr().add(b2.sqr());

    if (len2.cmp(len1) >= 0) {
      a2 = a0;
      b2 = b0;
    } // Normalize signs


    if (a1.negative) {
      a1 = a1.neg();
      b1 = b1.neg();
    }

    if (a2.negative) {
      a2 = a2.neg();
      b2 = b2.neg();
    }

    return [{
      a: a1,
      b: b1
    }, {
      a: a2,
      b: b2
    }];
  };

  ShortCurve.prototype._endoSplit = function _endoSplit(k) {
    var basis = this.endo.basis;
    var v1 = basis[0];
    var v2 = basis[1];
    var c1 = v2.b.mul(k).divRound(this.n);
    var c2 = v1.b.neg().mul(k).divRound(this.n);
    var p1 = c1.mul(v1.a);
    var p2 = c2.mul(v2.a);
    var q1 = c1.mul(v1.b);
    var q2 = c2.mul(v2.b); // Calculate answer

    var k1 = k.sub(p1).sub(p2);
    var k2 = q1.add(q2).neg();
    return {
      k1: k1,
      k2: k2
    };
  };

  ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
    x = new bn(x, 16);
    if (!x.red) x = x.toRed(this.red);
    var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
    var y = y2.redSqrt();
    if (y.redSqr().redSub(y2).cmp(this.zero) !== 0) throw new Error('invalid point'); // XXX Is there any way to tell if the number is odd without converting it
    // to non-red form?

    var isOdd = y.fromRed().isOdd();
    if (odd && !isOdd || !odd && isOdd) y = y.redNeg();
    return this.point(x, y);
  };

  ShortCurve.prototype.validate = function validate(point) {
    if (point.inf) return true;
    var x = point.x;
    var y = point.y;
    var ax = this.a.redMul(x);
    var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
    return y.redSqr().redISub(rhs).cmpn(0) === 0;
  };

  ShortCurve.prototype._endoWnafMulAdd = function _endoWnafMulAdd(points, coeffs, jacobianResult) {
    var npoints = this._endoWnafT1;
    var ncoeffs = this._endoWnafT2;

    for (var i = 0; i < points.length; i++) {
      var split = this._endoSplit(coeffs[i]);

      var p = points[i];

      var beta = p._getBeta();

      if (split.k1.negative) {
        split.k1.ineg();
        p = p.neg(true);
      }

      if (split.k2.negative) {
        split.k2.ineg();
        beta = beta.neg(true);
      }

      npoints[i * 2] = p;
      npoints[i * 2 + 1] = beta;
      ncoeffs[i * 2] = split.k1;
      ncoeffs[i * 2 + 1] = split.k2;
    }

    var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult); // Clean-up references to points and coefficients


    for (var j = 0; j < i * 2; j++) {
      npoints[j] = null;
      ncoeffs[j] = null;
    }

    return res;
  };

  function Point(curve, x, y, isRed) {
    base.BasePoint.call(this, curve, 'affine');

    if (x === null && y === null) {
      this.x = null;
      this.y = null;
      this.inf = true;
    } else {
      this.x = new bn(x, 16);
      this.y = new bn(y, 16); // Force redgomery representation when loading from JSON

      if (isRed) {
        this.x.forceRed(this.curve.red);
        this.y.forceRed(this.curve.red);
      }

      if (!this.x.red) this.x = this.x.toRed(this.curve.red);
      if (!this.y.red) this.y = this.y.toRed(this.curve.red);
      this.inf = false;
    }
  }

  inherits_browser(Point, base.BasePoint);

  ShortCurve.prototype.point = function point(x, y, isRed) {
    return new Point(this, x, y, isRed);
  };

  ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
    return Point.fromJSON(this, obj, red);
  };

  Point.prototype._getBeta = function _getBeta() {
    if (!this.curve.endo) return;
    var pre = this.precomputed;
    if (pre && pre.beta) return pre.beta;
    var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);

    if (pre) {
      var curve = this.curve;

      var endoMul = function endoMul(p) {
        return curve.point(p.x.redMul(curve.endo.beta), p.y);
      };

      pre.beta = beta;
      beta.precomputed = {
        beta: null,
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: pre.naf.points.map(endoMul)
        },
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: pre.doubles.points.map(endoMul)
        }
      };
    }

    return beta;
  };

  Point.prototype.toJSON = function toJSON() {
    if (!this.precomputed) return [this.x, this.y];
    return [this.x, this.y, this.precomputed && {
      doubles: this.precomputed.doubles && {
        step: this.precomputed.doubles.step,
        points: this.precomputed.doubles.points.slice(1)
      },
      naf: this.precomputed.naf && {
        wnd: this.precomputed.naf.wnd,
        points: this.precomputed.naf.points.slice(1)
      }
    }];
  };

  Point.fromJSON = function fromJSON(curve, obj, red) {
    if (typeof obj === 'string') obj = JSON.parse(obj);
    var res = curve.point(obj[0], obj[1], red);
    if (!obj[2]) return res;

    function obj2point(obj) {
      return curve.point(obj[0], obj[1], red);
    }

    var pre = obj[2];
    res.precomputed = {
      beta: null,
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: [res].concat(pre.doubles.points.map(obj2point))
      },
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: [res].concat(pre.naf.points.map(obj2point))
      }
    };
    return res;
  };

  Point.prototype.inspect = function inspect() {
    if (this.isInfinity()) return '<EC Point Infinity>';
    return '<EC Point x: ' + this.x.fromRed().toString(16, 2) + ' y: ' + this.y.fromRed().toString(16, 2) + '>';
  };

  Point.prototype.isInfinity = function isInfinity() {
    return this.inf;
  };

  Point.prototype.add = function add(p) {
    // O + P = P
    if (this.inf) return p; // P + O = P

    if (p.inf) return this; // P + P = 2P

    if (this.eq(p)) return this.dbl(); // P + (-P) = O

    if (this.neg().eq(p)) return this.curve.point(null, null); // P + Q = O

    if (this.x.cmp(p.x) === 0) return this.curve.point(null, null);
    var c = this.y.redSub(p.y);
    if (c.cmpn(0) !== 0) c = c.redMul(this.x.redSub(p.x).redInvm());
    var nx = c.redSqr().redISub(this.x).redISub(p.x);
    var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
    return this.curve.point(nx, ny);
  };

  Point.prototype.dbl = function dbl() {
    if (this.inf) return this; // 2P = O

    var ys1 = this.y.redAdd(this.y);
    if (ys1.cmpn(0) === 0) return this.curve.point(null, null);
    var a = this.curve.a;
    var x2 = this.x.redSqr();
    var dyinv = ys1.redInvm();
    var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
    var nx = c.redSqr().redISub(this.x.redAdd(this.x));
    var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
    return this.curve.point(nx, ny);
  };

  Point.prototype.getX = function getX() {
    return this.x.fromRed();
  };

  Point.prototype.getY = function getY() {
    return this.y.fromRed();
  };

  Point.prototype.mul = function mul(k) {
    k = new bn(k, 16);
    if (this.isInfinity()) return this;else if (this._hasDoubles(k)) return this.curve._fixedNafMul(this, k);else if (this.curve.endo) return this.curve._endoWnafMulAdd([this], [k]);else return this.curve._wnafMul(this, k);
  };

  Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
    var points = [this, p2];
    var coeffs = [k1, k2];
    if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs);else return this.curve._wnafMulAdd(1, points, coeffs, 2);
  };

  Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
    var points = [this, p2];
    var coeffs = [k1, k2];
    if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs, true);else return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
  };

  Point.prototype.eq = function eq(p) {
    return this === p || this.inf === p.inf && (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
  };

  Point.prototype.neg = function neg(_precompute) {
    if (this.inf) return this;
    var res = this.curve.point(this.x, this.y.redNeg());

    if (_precompute && this.precomputed) {
      var pre = this.precomputed;

      var negate = function negate(p) {
        return p.neg();
      };

      res.precomputed = {
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: pre.naf.points.map(negate)
        },
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: pre.doubles.points.map(negate)
        }
      };
    }

    return res;
  };

  Point.prototype.toJ = function toJ() {
    if (this.inf) return this.curve.jpoint(null, null, null);
    var res = this.curve.jpoint(this.x, this.y, this.curve.one);
    return res;
  };

  function JPoint(curve, x, y, z) {
    base.BasePoint.call(this, curve, 'jacobian');

    if (x === null && y === null && z === null) {
      this.x = this.curve.one;
      this.y = this.curve.one;
      this.z = new bn(0);
    } else {
      this.x = new bn(x, 16);
      this.y = new bn(y, 16);
      this.z = new bn(z, 16);
    }

    if (!this.x.red) this.x = this.x.toRed(this.curve.red);
    if (!this.y.red) this.y = this.y.toRed(this.curve.red);
    if (!this.z.red) this.z = this.z.toRed(this.curve.red);
    this.zOne = this.z === this.curve.one;
  }

  inherits_browser(JPoint, base.BasePoint);

  ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
    return new JPoint(this, x, y, z);
  };

  JPoint.prototype.toP = function toP() {
    if (this.isInfinity()) return this.curve.point(null, null);
    var zinv = this.z.redInvm();
    var zinv2 = zinv.redSqr();
    var ax = this.x.redMul(zinv2);
    var ay = this.y.redMul(zinv2).redMul(zinv);
    return this.curve.point(ax, ay);
  };

  JPoint.prototype.neg = function neg() {
    return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
  };

  JPoint.prototype.add = function add(p) {
    // O + P = P
    if (this.isInfinity()) return p; // P + O = P

    if (p.isInfinity()) return this; // 12M + 4S + 7A

    var pz2 = p.z.redSqr();
    var z2 = this.z.redSqr();
    var u1 = this.x.redMul(pz2);
    var u2 = p.x.redMul(z2);
    var s1 = this.y.redMul(pz2.redMul(p.z));
    var s2 = p.y.redMul(z2.redMul(this.z));
    var h = u1.redSub(u2);
    var r = s1.redSub(s2);

    if (h.cmpn(0) === 0) {
      if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);else return this.dbl();
    }

    var h2 = h.redSqr();
    var h3 = h2.redMul(h);
    var v = u1.redMul(h2);
    var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
    var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
    var nz = this.z.redMul(p.z).redMul(h);
    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype.mixedAdd = function mixedAdd(p) {
    // O + P = P
    if (this.isInfinity()) return p.toJ(); // P + O = P

    if (p.isInfinity()) return this; // 8M + 3S + 7A

    var z2 = this.z.redSqr();
    var u1 = this.x;
    var u2 = p.x.redMul(z2);
    var s1 = this.y;
    var s2 = p.y.redMul(z2).redMul(this.z);
    var h = u1.redSub(u2);
    var r = s1.redSub(s2);

    if (h.cmpn(0) === 0) {
      if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);else return this.dbl();
    }

    var h2 = h.redSqr();
    var h3 = h2.redMul(h);
    var v = u1.redMul(h2);
    var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
    var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
    var nz = this.z.redMul(h);
    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype.dblp = function dblp(pow) {
    if (pow === 0) return this;
    if (this.isInfinity()) return this;
    if (!pow) return this.dbl();

    if (this.curve.zeroA || this.curve.threeA) {
      var r = this;

      for (var i = 0; i < pow; i++) {
        r = r.dbl();
      }

      return r;
    } // 1M + 2S + 1A + N * (4S + 5M + 8A)
    // N = 1 => 6M + 6S + 9A


    var a = this.curve.a;
    var tinv = this.curve.tinv;
    var jx = this.x;
    var jy = this.y;
    var jz = this.z;
    var jz4 = jz.redSqr().redSqr(); // Reuse results

    var jyd = jy.redAdd(jy);

    for (var i = 0; i < pow; i++) {
      var jx2 = jx.redSqr();
      var jyd2 = jyd.redSqr();
      var jyd4 = jyd2.redSqr();
      var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
      var t1 = jx.redMul(jyd2);
      var nx = c.redSqr().redISub(t1.redAdd(t1));
      var t2 = t1.redISub(nx);
      var dny = c.redMul(t2);
      dny = dny.redIAdd(dny).redISub(jyd4);
      var nz = jyd.redMul(jz);
      if (i + 1 < pow) jz4 = jz4.redMul(jyd4);
      jx = nx;
      jz = nz;
      jyd = dny;
    }

    return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
  };

  JPoint.prototype.dbl = function dbl() {
    if (this.isInfinity()) return this;
    if (this.curve.zeroA) return this._zeroDbl();else if (this.curve.threeA) return this._threeDbl();else return this._dbl();
  };

  JPoint.prototype._zeroDbl = function _zeroDbl() {
    var nx;
    var ny;
    var nz; // Z = 1

    if (this.zOne) {
      // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
      //     #doubling-mdbl-2007-bl
      // 1M + 5S + 14A
      // XX = X1^2
      var xx = this.x.redSqr(); // YY = Y1^2

      var yy = this.y.redSqr(); // YYYY = YY^2

      var yyyy = yy.redSqr(); // S = 2 * ((X1 + YY)^2 - XX - YYYY)

      var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      s = s.redIAdd(s); // M = 3 * XX + a; a = 0

      var m = xx.redAdd(xx).redIAdd(xx); // T = M ^ 2 - 2*S

      var t = m.redSqr().redISub(s).redISub(s); // 8 * YYYY

      var yyyy8 = yyyy.redIAdd(yyyy);
      yyyy8 = yyyy8.redIAdd(yyyy8);
      yyyy8 = yyyy8.redIAdd(yyyy8); // X3 = T

      nx = t; // Y3 = M * (S - T) - 8 * YYYY

      ny = m.redMul(s.redISub(t)).redISub(yyyy8); // Z3 = 2*Y1

      nz = this.y.redAdd(this.y);
    } else {
      // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
      //     #doubling-dbl-2009-l
      // 2M + 5S + 13A
      // A = X1^2
      var a = this.x.redSqr(); // B = Y1^2

      var b = this.y.redSqr(); // C = B^2

      var c = b.redSqr(); // D = 2 * ((X1 + B)^2 - A - C)

      var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
      d = d.redIAdd(d); // E = 3 * A

      var e = a.redAdd(a).redIAdd(a); // F = E^2

      var f = e.redSqr(); // 8 * C

      var c8 = c.redIAdd(c);
      c8 = c8.redIAdd(c8);
      c8 = c8.redIAdd(c8); // X3 = F - 2 * D

      nx = f.redISub(d).redISub(d); // Y3 = E * (D - X3) - 8 * C

      ny = e.redMul(d.redISub(nx)).redISub(c8); // Z3 = 2 * Y1 * Z1

      nz = this.y.redMul(this.z);
      nz = nz.redIAdd(nz);
    }

    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype._threeDbl = function _threeDbl() {
    var nx;
    var ny;
    var nz; // Z = 1

    if (this.zOne) {
      // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
      //     #doubling-mdbl-2007-bl
      // 1M + 5S + 15A
      // XX = X1^2
      var xx = this.x.redSqr(); // YY = Y1^2

      var yy = this.y.redSqr(); // YYYY = YY^2

      var yyyy = yy.redSqr(); // S = 2 * ((X1 + YY)^2 - XX - YYYY)

      var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      s = s.redIAdd(s); // M = 3 * XX + a

      var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a); // T = M^2 - 2 * S

      var t = m.redSqr().redISub(s).redISub(s); // X3 = T

      nx = t; // Y3 = M * (S - T) - 8 * YYYY

      var yyyy8 = yyyy.redIAdd(yyyy);
      yyyy8 = yyyy8.redIAdd(yyyy8);
      yyyy8 = yyyy8.redIAdd(yyyy8);
      ny = m.redMul(s.redISub(t)).redISub(yyyy8); // Z3 = 2 * Y1

      nz = this.y.redAdd(this.y);
    } else {
      // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
      // 3M + 5S
      // delta = Z1^2
      var delta = this.z.redSqr(); // gamma = Y1^2

      var gamma = this.y.redSqr(); // beta = X1 * gamma

      var beta = this.x.redMul(gamma); // alpha = 3 * (X1 - delta) * (X1 + delta)

      var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
      alpha = alpha.redAdd(alpha).redIAdd(alpha); // X3 = alpha^2 - 8 * beta

      var beta4 = beta.redIAdd(beta);
      beta4 = beta4.redIAdd(beta4);
      var beta8 = beta4.redAdd(beta4);
      nx = alpha.redSqr().redISub(beta8); // Z3 = (Y1 + Z1)^2 - gamma - delta

      nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta); // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2

      var ggamma8 = gamma.redSqr();
      ggamma8 = ggamma8.redIAdd(ggamma8);
      ggamma8 = ggamma8.redIAdd(ggamma8);
      ggamma8 = ggamma8.redIAdd(ggamma8);
      ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
    }

    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype._dbl = function _dbl() {
    var a = this.curve.a; // 4M + 6S + 10A

    var jx = this.x;
    var jy = this.y;
    var jz = this.z;
    var jz4 = jz.redSqr().redSqr();
    var jx2 = jx.redSqr();
    var jy2 = jy.redSqr();
    var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
    var jxd4 = jx.redAdd(jx);
    jxd4 = jxd4.redIAdd(jxd4);
    var t1 = jxd4.redMul(jy2);
    var nx = c.redSqr().redISub(t1.redAdd(t1));
    var t2 = t1.redISub(nx);
    var jyd8 = jy2.redSqr();
    jyd8 = jyd8.redIAdd(jyd8);
    jyd8 = jyd8.redIAdd(jyd8);
    jyd8 = jyd8.redIAdd(jyd8);
    var ny = c.redMul(t2).redISub(jyd8);
    var nz = jy.redAdd(jy).redMul(jz);
    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype.trpl = function trpl() {
    if (!this.curve.zeroA) return this.dbl().add(this); // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
    // 5M + 10S + ...
    // XX = X1^2

    var xx = this.x.redSqr(); // YY = Y1^2

    var yy = this.y.redSqr(); // ZZ = Z1^2

    var zz = this.z.redSqr(); // YYYY = YY^2

    var yyyy = yy.redSqr(); // M = 3 * XX + a * ZZ2; a = 0

    var m = xx.redAdd(xx).redIAdd(xx); // MM = M^2

    var mm = m.redSqr(); // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM

    var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    e = e.redIAdd(e);
    e = e.redAdd(e).redIAdd(e);
    e = e.redISub(mm); // EE = E^2

    var ee = e.redSqr(); // T = 16*YYYY

    var t = yyyy.redIAdd(yyyy);
    t = t.redIAdd(t);
    t = t.redIAdd(t);
    t = t.redIAdd(t); // U = (M + E)^2 - MM - EE - T

    var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t); // X3 = 4 * (X1 * EE - 4 * YY * U)

    var yyu4 = yy.redMul(u);
    yyu4 = yyu4.redIAdd(yyu4);
    yyu4 = yyu4.redIAdd(yyu4);
    var nx = this.x.redMul(ee).redISub(yyu4);
    nx = nx.redIAdd(nx);
    nx = nx.redIAdd(nx); // Y3 = 8 * Y1 * (U * (T - U) - E * EE)

    var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
    ny = ny.redIAdd(ny);
    ny = ny.redIAdd(ny);
    ny = ny.redIAdd(ny); // Z3 = (Z1 + E)^2 - ZZ - EE

    var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);
    return this.curve.jpoint(nx, ny, nz);
  };

  JPoint.prototype.mul = function mul(k, kbase) {
    k = new bn(k, kbase);
    return this.curve._wnafMul(this, k);
  };

  JPoint.prototype.eq = function eq(p) {
    if (p.type === 'affine') return this.eq(p.toJ());
    if (this === p) return true; // x1 * z2^2 == x2 * z1^2

    var z2 = this.z.redSqr();
    var pz2 = p.z.redSqr();
    if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0) return false; // y1 * z2^3 == y2 * z1^3

    var z3 = z2.redMul(this.z);
    var pz3 = pz2.redMul(p.z);
    return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
  };

  JPoint.prototype.eqXToP = function eqXToP(x) {
    var zs = this.z.redSqr();
    var rx = x.toRed(this.curve.red).redMul(zs);
    if (this.x.cmp(rx) === 0) return true;
    var xc = x.clone();
    var t = this.curve.redN.redMul(zs);

    for (;;) {
      xc.iadd(this.curve.n);
      if (xc.cmp(this.curve.p) >= 0) return false;
      rx.redIAdd(t);
      if (this.x.cmp(rx) === 0) return true;
    }
  };

  JPoint.prototype.inspect = function inspect() {
    if (this.isInfinity()) return '<EC JPoint Infinity>';
    return '<EC JPoint x: ' + this.x.toString(16, 2) + ' y: ' + this.y.toString(16, 2) + ' z: ' + this.z.toString(16, 2) + '>';
  };

  JPoint.prototype.isInfinity = function isInfinity() {
    // XXX This code assumes that zero is always zero in red
    return this.z.cmpn(0) === 0;
  };

  function MontCurve(conf) {
    base.call(this, 'mont', conf);
    this.a = new bn(conf.a, 16).toRed(this.red);
    this.b = new bn(conf.b, 16).toRed(this.red);
    this.i4 = new bn(4).toRed(this.red).redInvm();
    this.two = new bn(2).toRed(this.red);
    this.a24 = this.i4.redMul(this.a.redAdd(this.two));
  }

  inherits_browser(MontCurve, base);
  var mont = MontCurve;

  MontCurve.prototype.validate = function validate(point) {
    var x = point.normalize().x;
    var x2 = x.redSqr();
    var rhs = x2.redMul(x).redAdd(x2.redMul(this.a)).redAdd(x);
    var y = rhs.redSqrt();
    return y.redSqr().cmp(rhs) === 0;
  };

  function Point$1(curve, x, z) {
    base.BasePoint.call(this, curve, 'projective');

    if (x === null && z === null) {
      this.x = this.curve.one;
      this.z = this.curve.zero;
    } else {
      this.x = new bn(x, 16);
      this.z = new bn(z, 16);
      if (!this.x.red) this.x = this.x.toRed(this.curve.red);
      if (!this.z.red) this.z = this.z.toRed(this.curve.red);
    }
  }

  inherits_browser(Point$1, base.BasePoint);

  MontCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
    return this.point(utils_1$1.toArray(bytes, enc), 1);
  };

  MontCurve.prototype.point = function point(x, z) {
    return new Point$1(this, x, z);
  };

  MontCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
    return Point$1.fromJSON(this, obj);
  };

  Point$1.prototype.precompute = function precompute() {// No-op
  };

  Point$1.prototype._encode = function _encode() {
    return this.getX().toArray('be', this.curve.p.byteLength());
  };

  Point$1.fromJSON = function fromJSON(curve, obj) {
    return new Point$1(curve, obj[0], obj[1] || curve.one);
  };

  Point$1.prototype.inspect = function inspect() {
    if (this.isInfinity()) return '<EC Point Infinity>';
    return '<EC Point x: ' + this.x.fromRed().toString(16, 2) + ' z: ' + this.z.fromRed().toString(16, 2) + '>';
  };

  Point$1.prototype.isInfinity = function isInfinity() {
    // XXX This code assumes that zero is always zero in red
    return this.z.cmpn(0) === 0;
  };

  Point$1.prototype.dbl = function dbl() {
    // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#doubling-dbl-1987-m-3
    // 2M + 2S + 4A
    // A = X1 + Z1
    var a = this.x.redAdd(this.z); // AA = A^2

    var aa = a.redSqr(); // B = X1 - Z1

    var b = this.x.redSub(this.z); // BB = B^2

    var bb = b.redSqr(); // C = AA - BB

    var c = aa.redSub(bb); // X3 = AA * BB

    var nx = aa.redMul(bb); // Z3 = C * (BB + A24 * C)

    var nz = c.redMul(bb.redAdd(this.curve.a24.redMul(c)));
    return this.curve.point(nx, nz);
  };

  Point$1.prototype.add = function add() {
    throw new Error('Not supported on Montgomery curve');
  };

  Point$1.prototype.diffAdd = function diffAdd(p, diff) {
    // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#diffadd-dadd-1987-m-3
    // 4M + 2S + 6A
    // A = X2 + Z2
    var a = this.x.redAdd(this.z); // B = X2 - Z2

    var b = this.x.redSub(this.z); // C = X3 + Z3

    var c = p.x.redAdd(p.z); // D = X3 - Z3

    var d = p.x.redSub(p.z); // DA = D * A

    var da = d.redMul(a); // CB = C * B

    var cb = c.redMul(b); // X5 = Z1 * (DA + CB)^2

    var nx = diff.z.redMul(da.redAdd(cb).redSqr()); // Z5 = X1 * (DA - CB)^2

    var nz = diff.x.redMul(da.redISub(cb).redSqr());
    return this.curve.point(nx, nz);
  };

  Point$1.prototype.mul = function mul(k) {
    var t = k.clone();
    var a = this; // (N / 2) * Q + Q

    var b = this.curve.point(null, null); // (N / 2) * Q

    var c = this; // Q

    for (var bits = []; t.cmpn(0) !== 0; t.iushrn(1)) {
      bits.push(t.andln(1));
    }

    for (var i = bits.length - 1; i >= 0; i--) {
      if (bits[i] === 0) {
        // N * Q + Q = ((N / 2) * Q + Q)) + (N / 2) * Q
        a = a.diffAdd(b, c); // N * Q = 2 * ((N / 2) * Q + Q))

        b = b.dbl();
      } else {
        // N * Q = ((N / 2) * Q + Q) + ((N / 2) * Q)
        b = a.diffAdd(b, c); // N * Q + Q = 2 * ((N / 2) * Q + Q)

        a = a.dbl();
      }
    }

    return b;
  };

  Point$1.prototype.mulAdd = function mulAdd() {
    throw new Error('Not supported on Montgomery curve');
  };

  Point$1.prototype.jumlAdd = function jumlAdd() {
    throw new Error('Not supported on Montgomery curve');
  };

  Point$1.prototype.eq = function eq(other) {
    return this.getX().cmp(other.getX()) === 0;
  };

  Point$1.prototype.normalize = function normalize() {
    this.x = this.x.redMul(this.z.redInvm());
    this.z = this.curve.one;
    return this;
  };

  Point$1.prototype.getX = function getX() {
    // Normalize coordinates
    this.normalize();
    return this.x.fromRed();
  };

  var assert$4 = utils_1$1.assert;

  function EdwardsCurve(conf) {
    // NOTE: Important as we are creating point in Base.call()
    this.twisted = (conf.a | 0) !== 1;
    this.mOneA = this.twisted && (conf.a | 0) === -1;
    this.extended = this.mOneA;
    base.call(this, 'edwards', conf);
    this.a = new bn(conf.a, 16).umod(this.red.m);
    this.a = this.a.toRed(this.red);
    this.c = new bn(conf.c, 16).toRed(this.red);
    this.c2 = this.c.redSqr();
    this.d = new bn(conf.d, 16).toRed(this.red);
    this.dd = this.d.redAdd(this.d);
    assert$4(!this.twisted || this.c.fromRed().cmpn(1) === 0);
    this.oneC = (conf.c | 0) === 1;
  }

  inherits_browser(EdwardsCurve, base);
  var edwards = EdwardsCurve;

  EdwardsCurve.prototype._mulA = function _mulA(num) {
    if (this.mOneA) return num.redNeg();else return this.a.redMul(num);
  };

  EdwardsCurve.prototype._mulC = function _mulC(num) {
    if (this.oneC) return num;else return this.c.redMul(num);
  }; // Just for compatibility with Short curve


  EdwardsCurve.prototype.jpoint = function jpoint(x, y, z, t) {
    return this.point(x, y, z, t);
  };

  EdwardsCurve.prototype.pointFromX = function pointFromX(x, odd) {
    x = new bn(x, 16);
    if (!x.red) x = x.toRed(this.red);
    var x2 = x.redSqr();
    var rhs = this.c2.redSub(this.a.redMul(x2));
    var lhs = this.one.redSub(this.c2.redMul(this.d).redMul(x2));
    var y2 = rhs.redMul(lhs.redInvm());
    var y = y2.redSqrt();
    if (y.redSqr().redSub(y2).cmp(this.zero) !== 0) throw new Error('invalid point');
    var isOdd = y.fromRed().isOdd();
    if (odd && !isOdd || !odd && isOdd) y = y.redNeg();
    return this.point(x, y);
  };

  EdwardsCurve.prototype.pointFromY = function pointFromY(y, odd) {
    y = new bn(y, 16);
    if (!y.red) y = y.toRed(this.red); // x^2 = (y^2 - c^2) / (c^2 d y^2 - a)

    var y2 = y.redSqr();
    var lhs = y2.redSub(this.c2);
    var rhs = y2.redMul(this.d).redMul(this.c2).redSub(this.a);
    var x2 = lhs.redMul(rhs.redInvm());

    if (x2.cmp(this.zero) === 0) {
      if (odd) throw new Error('invalid point');else return this.point(this.zero, y);
    }

    var x = x2.redSqrt();
    if (x.redSqr().redSub(x2).cmp(this.zero) !== 0) throw new Error('invalid point');
    if (x.fromRed().isOdd() !== odd) x = x.redNeg();
    return this.point(x, y);
  };

  EdwardsCurve.prototype.validate = function validate(point) {
    if (point.isInfinity()) return true; // Curve: A * X^2 + Y^2 = C^2 * (1 + D * X^2 * Y^2)

    point.normalize();
    var x2 = point.x.redSqr();
    var y2 = point.y.redSqr();
    var lhs = x2.redMul(this.a).redAdd(y2);
    var rhs = this.c2.redMul(this.one.redAdd(this.d.redMul(x2).redMul(y2)));
    return lhs.cmp(rhs) === 0;
  };

  function Point$2(curve, x, y, z, t) {
    base.BasePoint.call(this, curve, 'projective');

    if (x === null && y === null && z === null) {
      this.x = this.curve.zero;
      this.y = this.curve.one;
      this.z = this.curve.one;
      this.t = this.curve.zero;
      this.zOne = true;
    } else {
      this.x = new bn(x, 16);
      this.y = new bn(y, 16);
      this.z = z ? new bn(z, 16) : this.curve.one;
      this.t = t && new bn(t, 16);
      if (!this.x.red) this.x = this.x.toRed(this.curve.red);
      if (!this.y.red) this.y = this.y.toRed(this.curve.red);
      if (!this.z.red) this.z = this.z.toRed(this.curve.red);
      if (this.t && !this.t.red) this.t = this.t.toRed(this.curve.red);
      this.zOne = this.z === this.curve.one; // Use extended coordinates

      if (this.curve.extended && !this.t) {
        this.t = this.x.redMul(this.y);
        if (!this.zOne) this.t = this.t.redMul(this.z.redInvm());
      }
    }
  }

  inherits_browser(Point$2, base.BasePoint);

  EdwardsCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
    return Point$2.fromJSON(this, obj);
  };

  EdwardsCurve.prototype.point = function point(x, y, z, t) {
    return new Point$2(this, x, y, z, t);
  };

  Point$2.fromJSON = function fromJSON(curve, obj) {
    return new Point$2(curve, obj[0], obj[1], obj[2]);
  };

  Point$2.prototype.inspect = function inspect() {
    if (this.isInfinity()) return '<EC Point Infinity>';
    return '<EC Point x: ' + this.x.fromRed().toString(16, 2) + ' y: ' + this.y.fromRed().toString(16, 2) + ' z: ' + this.z.fromRed().toString(16, 2) + '>';
  };

  Point$2.prototype.isInfinity = function isInfinity() {
    // XXX This code assumes that zero is always zero in red
    return this.x.cmpn(0) === 0 && (this.y.cmp(this.z) === 0 || this.zOne && this.y.cmp(this.curve.c) === 0);
  };

  Point$2.prototype._extDbl = function _extDbl() {
    // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
    //     #doubling-dbl-2008-hwcd
    // 4M + 4S
    // A = X1^2
    var a = this.x.redSqr(); // B = Y1^2

    var b = this.y.redSqr(); // C = 2 * Z1^2

    var c = this.z.redSqr();
    c = c.redIAdd(c); // D = a * A

    var d = this.curve._mulA(a); // E = (X1 + Y1)^2 - A - B


    var e = this.x.redAdd(this.y).redSqr().redISub(a).redISub(b); // G = D + B

    var g = d.redAdd(b); // F = G - C

    var f = g.redSub(c); // H = D - B

    var h = d.redSub(b); // X3 = E * F

    var nx = e.redMul(f); // Y3 = G * H

    var ny = g.redMul(h); // T3 = E * H

    var nt = e.redMul(h); // Z3 = F * G

    var nz = f.redMul(g);
    return this.curve.point(nx, ny, nz, nt);
  };

  Point$2.prototype._projDbl = function _projDbl() {
    // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
    //     #doubling-dbl-2008-bbjlp
    //     #doubling-dbl-2007-bl
    // and others
    // Generally 3M + 4S or 2M + 4S
    // B = (X1 + Y1)^2
    var b = this.x.redAdd(this.y).redSqr(); // C = X1^2

    var c = this.x.redSqr(); // D = Y1^2

    var d = this.y.redSqr();
    var nx;
    var ny;
    var nz;

    if (this.curve.twisted) {
      // E = a * C
      var e = this.curve._mulA(c); // F = E + D


      var f = e.redAdd(d);

      if (this.zOne) {
        // X3 = (B - C - D) * (F - 2)
        nx = b.redSub(c).redSub(d).redMul(f.redSub(this.curve.two)); // Y3 = F * (E - D)

        ny = f.redMul(e.redSub(d)); // Z3 = F^2 - 2 * F

        nz = f.redSqr().redSub(f).redSub(f);
      } else {
        // H = Z1^2
        var h = this.z.redSqr(); // J = F - 2 * H

        var j = f.redSub(h).redISub(h); // X3 = (B-C-D)*J

        nx = b.redSub(c).redISub(d).redMul(j); // Y3 = F * (E - D)

        ny = f.redMul(e.redSub(d)); // Z3 = F * J

        nz = f.redMul(j);
      }
    } else {
      // E = C + D
      var e = c.redAdd(d); // H = (c * Z1)^2

      var h = this.curve._mulC(this.z).redSqr(); // J = E - 2 * H


      var j = e.redSub(h).redSub(h); // X3 = c * (B - E) * J

      nx = this.curve._mulC(b.redISub(e)).redMul(j); // Y3 = c * E * (C - D)

      ny = this.curve._mulC(e).redMul(c.redISub(d)); // Z3 = E * J

      nz = e.redMul(j);
    }

    return this.curve.point(nx, ny, nz);
  };

  Point$2.prototype.dbl = function dbl() {
    if (this.isInfinity()) return this; // Double in extended coordinates

    if (this.curve.extended) return this._extDbl();else return this._projDbl();
  };

  Point$2.prototype._extAdd = function _extAdd(p) {
    // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
    //     #addition-add-2008-hwcd-3
    // 8M
    // A = (Y1 - X1) * (Y2 - X2)
    var a = this.y.redSub(this.x).redMul(p.y.redSub(p.x)); // B = (Y1 + X1) * (Y2 + X2)

    var b = this.y.redAdd(this.x).redMul(p.y.redAdd(p.x)); // C = T1 * k * T2

    var c = this.t.redMul(this.curve.dd).redMul(p.t); // D = Z1 * 2 * Z2

    var d = this.z.redMul(p.z.redAdd(p.z)); // E = B - A

    var e = b.redSub(a); // F = D - C

    var f = d.redSub(c); // G = D + C

    var g = d.redAdd(c); // H = B + A

    var h = b.redAdd(a); // X3 = E * F

    var nx = e.redMul(f); // Y3 = G * H

    var ny = g.redMul(h); // T3 = E * H

    var nt = e.redMul(h); // Z3 = F * G

    var nz = f.redMul(g);
    return this.curve.point(nx, ny, nz, nt);
  };

  Point$2.prototype._projAdd = function _projAdd(p) {
    // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
    //     #addition-add-2008-bbjlp
    //     #addition-add-2007-bl
    // 10M + 1S
    // A = Z1 * Z2
    var a = this.z.redMul(p.z); // B = A^2

    var b = a.redSqr(); // C = X1 * X2

    var c = this.x.redMul(p.x); // D = Y1 * Y2

    var d = this.y.redMul(p.y); // E = d * C * D

    var e = this.curve.d.redMul(c).redMul(d); // F = B - E

    var f = b.redSub(e); // G = B + E

    var g = b.redAdd(e); // X3 = A * F * ((X1 + Y1) * (X2 + Y2) - C - D)

    var tmp = this.x.redAdd(this.y).redMul(p.x.redAdd(p.y)).redISub(c).redISub(d);
    var nx = a.redMul(f).redMul(tmp);
    var ny;
    var nz;

    if (this.curve.twisted) {
      // Y3 = A * G * (D - a * C)
      ny = a.redMul(g).redMul(d.redSub(this.curve._mulA(c))); // Z3 = F * G

      nz = f.redMul(g);
    } else {
      // Y3 = A * G * (D - C)
      ny = a.redMul(g).redMul(d.redSub(c)); // Z3 = c * F * G

      nz = this.curve._mulC(f).redMul(g);
    }

    return this.curve.point(nx, ny, nz);
  };

  Point$2.prototype.add = function add(p) {
    if (this.isInfinity()) return p;
    if (p.isInfinity()) return this;
    if (this.curve.extended) return this._extAdd(p);else return this._projAdd(p);
  };

  Point$2.prototype.mul = function mul(k) {
    if (this._hasDoubles(k)) return this.curve._fixedNafMul(this, k);else return this.curve._wnafMul(this, k);
  };

  Point$2.prototype.mulAdd = function mulAdd(k1, p, k2) {
    return this.curve._wnafMulAdd(1, [this, p], [k1, k2], 2, false);
  };

  Point$2.prototype.jmulAdd = function jmulAdd(k1, p, k2) {
    return this.curve._wnafMulAdd(1, [this, p], [k1, k2], 2, true);
  };

  Point$2.prototype.normalize = function normalize() {
    if (this.zOne) return this; // Normalize coordinates

    var zi = this.z.redInvm();
    this.x = this.x.redMul(zi);
    this.y = this.y.redMul(zi);
    if (this.t) this.t = this.t.redMul(zi);
    this.z = this.curve.one;
    this.zOne = true;
    return this;
  };

  Point$2.prototype.neg = function neg() {
    return this.curve.point(this.x.redNeg(), this.y, this.z, this.t && this.t.redNeg());
  };

  Point$2.prototype.getX = function getX() {
    this.normalize();
    return this.x.fromRed();
  };

  Point$2.prototype.getY = function getY() {
    this.normalize();
    return this.y.fromRed();
  };

  Point$2.prototype.eq = function eq(other) {
    return this === other || this.getX().cmp(other.getX()) === 0 && this.getY().cmp(other.getY()) === 0;
  };

  Point$2.prototype.eqXToP = function eqXToP(x) {
    var rx = x.toRed(this.curve.red).redMul(this.z);
    if (this.x.cmp(rx) === 0) return true;
    var xc = x.clone();
    var t = this.curve.redN.redMul(this.z);

    for (;;) {
      xc.iadd(this.curve.n);
      if (xc.cmp(this.curve.p) >= 0) return false;
      rx.redIAdd(t);
      if (this.x.cmp(rx) === 0) return true;
    }
  }; // Compatibility with BaseCurve


  Point$2.prototype.toP = Point$2.prototype.normalize;
  Point$2.prototype.mixedAdd = Point$2.prototype.add;

  var curve_1 = createCommonjsModule(function (module, exports) {

    var curve = exports;
    curve.base = base;
    curve["short"] = short_1;
    curve.mont = mont;
    curve.edwards = edwards;
  });

  var inherits_1 = inherits_browser;

  function isSurrogatePair(msg, i) {
    if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
      return false;
    }

    if (i < 0 || i + 1 >= msg.length) {
      return false;
    }

    return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
  }

  function toArray$1(msg, enc) {
    if (Array.isArray(msg)) return msg.slice();
    if (!msg) return [];
    var res = [];

    if (typeof msg === 'string') {
      if (!enc) {
        // Inspired by stringToUtf8ByteArray() in closure-library by Google
        // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
        // Apache License 2.0
        // https://github.com/google/closure-library/blob/master/LICENSE
        var p = 0;

        for (var i = 0; i < msg.length; i++) {
          var c = msg.charCodeAt(i);

          if (c < 128) {
            res[p++] = c;
          } else if (c < 2048) {
            res[p++] = c >> 6 | 192;
            res[p++] = c & 63 | 128;
          } else if (isSurrogatePair(msg, i)) {
            c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
            res[p++] = c >> 18 | 240;
            res[p++] = c >> 12 & 63 | 128;
            res[p++] = c >> 6 & 63 | 128;
            res[p++] = c & 63 | 128;
          } else {
            res[p++] = c >> 12 | 224;
            res[p++] = c >> 6 & 63 | 128;
            res[p++] = c & 63 | 128;
          }
        }
      } else if (enc === 'hex') {
        msg = msg.replace(/[^a-z0-9]+/ig, '');
        if (msg.length % 2 !== 0) msg = '0' + msg;

        for (i = 0; i < msg.length; i += 2) {
          res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
      }
    } else {
      for (i = 0; i < msg.length; i++) {
        res[i] = msg[i] | 0;
      }
    }

    return res;
  }

  var toArray_1 = toArray$1;

  function toHex$1(msg) {
    var res = '';

    for (var i = 0; i < msg.length; i++) {
      res += zero2(msg[i].toString(16));
    }

    return res;
  }

  var toHex_1 = toHex$1;

  function htonl(w) {
    var res = w >>> 24 | w >>> 8 & 0xff00 | w << 8 & 0xff0000 | (w & 0xff) << 24;
    return res >>> 0;
  }

  var htonl_1 = htonl;

  function toHex32(msg, endian) {
    var res = '';

    for (var i = 0; i < msg.length; i++) {
      var w = msg[i];
      if (endian === 'little') w = htonl(w);
      res += zero8(w.toString(16));
    }

    return res;
  }

  var toHex32_1 = toHex32;

  function zero2(word) {
    if (word.length === 1) return '0' + word;else return word;
  }

  var zero2_1 = zero2;

  function zero8(word) {
    if (word.length === 7) return '0' + word;else if (word.length === 6) return '00' + word;else if (word.length === 5) return '000' + word;else if (word.length === 4) return '0000' + word;else if (word.length === 3) return '00000' + word;else if (word.length === 2) return '000000' + word;else if (word.length === 1) return '0000000' + word;else return word;
  }

  var zero8_1 = zero8;

  function join32(msg, start, end, endian) {
    var len = end - start;
    minimalisticAssert(len % 4 === 0);
    var res = new Array(len / 4);

    for (var i = 0, k = start; i < res.length; i++, k += 4) {
      var w;
      if (endian === 'big') w = msg[k] << 24 | msg[k + 1] << 16 | msg[k + 2] << 8 | msg[k + 3];else w = msg[k + 3] << 24 | msg[k + 2] << 16 | msg[k + 1] << 8 | msg[k];
      res[i] = w >>> 0;
    }

    return res;
  }

  var join32_1 = join32;

  function split32(msg, endian) {
    var res = new Array(msg.length * 4);

    for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
      var m = msg[i];

      if (endian === 'big') {
        res[k] = m >>> 24;
        res[k + 1] = m >>> 16 & 0xff;
        res[k + 2] = m >>> 8 & 0xff;
        res[k + 3] = m & 0xff;
      } else {
        res[k + 3] = m >>> 24;
        res[k + 2] = m >>> 16 & 0xff;
        res[k + 1] = m >>> 8 & 0xff;
        res[k] = m & 0xff;
      }
    }

    return res;
  }

  var split32_1 = split32;

  function rotr32(w, b) {
    return w >>> b | w << 32 - b;
  }

  var rotr32_1 = rotr32;

  function rotl32(w, b) {
    return w << b | w >>> 32 - b;
  }

  var rotl32_1 = rotl32;

  function sum32(a, b) {
    return a + b >>> 0;
  }

  var sum32_1 = sum32;

  function sum32_3(a, b, c) {
    return a + b + c >>> 0;
  }

  var sum32_3_1 = sum32_3;

  function sum32_4(a, b, c, d) {
    return a + b + c + d >>> 0;
  }

  var sum32_4_1 = sum32_4;

  function sum32_5(a, b, c, d, e) {
    return a + b + c + d + e >>> 0;
  }

  var sum32_5_1 = sum32_5;

  function sum64(buf, pos, ah, al) {
    var bh = buf[pos];
    var bl = buf[pos + 1];
    var lo = al + bl >>> 0;
    var hi = (lo < al ? 1 : 0) + ah + bh;
    buf[pos] = hi >>> 0;
    buf[pos + 1] = lo;
  }

  var sum64_1 = sum64;

  function sum64_hi(ah, al, bh, bl) {
    var lo = al + bl >>> 0;
    var hi = (lo < al ? 1 : 0) + ah + bh;
    return hi >>> 0;
  }

  var sum64_hi_1 = sum64_hi;

  function sum64_lo(ah, al, bh, bl) {
    var lo = al + bl;
    return lo >>> 0;
  }

  var sum64_lo_1 = sum64_lo;

  function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
    var carry = 0;
    var lo = al;
    lo = lo + bl >>> 0;
    carry += lo < al ? 1 : 0;
    lo = lo + cl >>> 0;
    carry += lo < cl ? 1 : 0;
    lo = lo + dl >>> 0;
    carry += lo < dl ? 1 : 0;
    var hi = ah + bh + ch + dh + carry;
    return hi >>> 0;
  }

  var sum64_4_hi_1 = sum64_4_hi;

  function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
    var lo = al + bl + cl + dl;
    return lo >>> 0;
  }

  var sum64_4_lo_1 = sum64_4_lo;

  function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
    var carry = 0;
    var lo = al;
    lo = lo + bl >>> 0;
    carry += lo < al ? 1 : 0;
    lo = lo + cl >>> 0;
    carry += lo < cl ? 1 : 0;
    lo = lo + dl >>> 0;
    carry += lo < dl ? 1 : 0;
    lo = lo + el >>> 0;
    carry += lo < el ? 1 : 0;
    var hi = ah + bh + ch + dh + eh + carry;
    return hi >>> 0;
  }

  var sum64_5_hi_1 = sum64_5_hi;

  function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
    var lo = al + bl + cl + dl + el;
    return lo >>> 0;
  }

  var sum64_5_lo_1 = sum64_5_lo;

  function rotr64_hi(ah, al, num) {
    var r = al << 32 - num | ah >>> num;
    return r >>> 0;
  }

  var rotr64_hi_1 = rotr64_hi;

  function rotr64_lo(ah, al, num) {
    var r = ah << 32 - num | al >>> num;
    return r >>> 0;
  }

  var rotr64_lo_1 = rotr64_lo;

  function shr64_hi(ah, al, num) {
    return ah >>> num;
  }

  var shr64_hi_1 = shr64_hi;

  function shr64_lo(ah, al, num) {
    var r = ah << 32 - num | al >>> num;
    return r >>> 0;
  }

  var shr64_lo_1 = shr64_lo;
  var utils$2 = {
    inherits: inherits_1,
    toArray: toArray_1,
    toHex: toHex_1,
    htonl: htonl_1,
    toHex32: toHex32_1,
    zero2: zero2_1,
    zero8: zero8_1,
    join32: join32_1,
    split32: split32_1,
    rotr32: rotr32_1,
    rotl32: rotl32_1,
    sum32: sum32_1,
    sum32_3: sum32_3_1,
    sum32_4: sum32_4_1,
    sum32_5: sum32_5_1,
    sum64: sum64_1,
    sum64_hi: sum64_hi_1,
    sum64_lo: sum64_lo_1,
    sum64_4_hi: sum64_4_hi_1,
    sum64_4_lo: sum64_4_lo_1,
    sum64_5_hi: sum64_5_hi_1,
    sum64_5_lo: sum64_5_lo_1,
    rotr64_hi: rotr64_hi_1,
    rotr64_lo: rotr64_lo_1,
    shr64_hi: shr64_hi_1,
    shr64_lo: shr64_lo_1
  };

  function BlockHash() {
    this.pending = null;
    this.pendingTotal = 0;
    this.blockSize = this.constructor.blockSize;
    this.outSize = this.constructor.outSize;
    this.hmacStrength = this.constructor.hmacStrength;
    this.padLength = this.constructor.padLength / 8;
    this.endian = 'big';
    this._delta8 = this.blockSize / 8;
    this._delta32 = this.blockSize / 32;
  }

  var BlockHash_1 = BlockHash;

  BlockHash.prototype.update = function update(msg, enc) {
    // Convert message to array, pad it, and join into 32bit blocks
    msg = utils$2.toArray(msg, enc);
    if (!this.pending) this.pending = msg;else this.pending = this.pending.concat(msg);
    this.pendingTotal += msg.length; // Enough data, try updating

    if (this.pending.length >= this._delta8) {
      msg = this.pending; // Process pending data in blocks

      var r = msg.length % this._delta8;
      this.pending = msg.slice(msg.length - r, msg.length);
      if (this.pending.length === 0) this.pending = null;
      msg = utils$2.join32(msg, 0, msg.length - r, this.endian);

      for (var i = 0; i < msg.length; i += this._delta32) {
        this._update(msg, i, i + this._delta32);
      }
    }

    return this;
  };

  BlockHash.prototype.digest = function digest(enc) {
    this.update(this._pad());
    minimalisticAssert(this.pending === null);
    return this._digest(enc);
  };

  BlockHash.prototype._pad = function pad() {
    var len = this.pendingTotal;
    var bytes = this._delta8;
    var k = bytes - (len + this.padLength) % bytes;
    var res = new Array(k + this.padLength);
    res[0] = 0x80;

    for (var i = 1; i < k; i++) {
      res[i] = 0;
    } // Append length


    len <<= 3;

    if (this.endian === 'big') {
      for (var t = 8; t < this.padLength; t++) {
        res[i++] = 0;
      }

      res[i++] = 0;
      res[i++] = 0;
      res[i++] = 0;
      res[i++] = 0;
      res[i++] = len >>> 24 & 0xff;
      res[i++] = len >>> 16 & 0xff;
      res[i++] = len >>> 8 & 0xff;
      res[i++] = len & 0xff;
    } else {
      res[i++] = len & 0xff;
      res[i++] = len >>> 8 & 0xff;
      res[i++] = len >>> 16 & 0xff;
      res[i++] = len >>> 24 & 0xff;
      res[i++] = 0;
      res[i++] = 0;
      res[i++] = 0;
      res[i++] = 0;

      for (t = 8; t < this.padLength; t++) {
        res[i++] = 0;
      }
    }

    return res;
  };

  var common = {
    BlockHash: BlockHash_1
  };

  var rotr32$1 = utils$2.rotr32;

  function ft_1(s, x, y, z) {
    if (s === 0) return ch32(x, y, z);
    if (s === 1 || s === 3) return p32(x, y, z);
    if (s === 2) return maj32(x, y, z);
  }

  var ft_1_1 = ft_1;

  function ch32(x, y, z) {
    return x & y ^ ~x & z;
  }

  var ch32_1 = ch32;

  function maj32(x, y, z) {
    return x & y ^ x & z ^ y & z;
  }

  var maj32_1 = maj32;

  function p32(x, y, z) {
    return x ^ y ^ z;
  }

  var p32_1 = p32;

  function s0_256(x) {
    return rotr32$1(x, 2) ^ rotr32$1(x, 13) ^ rotr32$1(x, 22);
  }

  var s0_256_1 = s0_256;

  function s1_256(x) {
    return rotr32$1(x, 6) ^ rotr32$1(x, 11) ^ rotr32$1(x, 25);
  }

  var s1_256_1 = s1_256;

  function g0_256(x) {
    return rotr32$1(x, 7) ^ rotr32$1(x, 18) ^ x >>> 3;
  }

  var g0_256_1 = g0_256;

  function g1_256(x) {
    return rotr32$1(x, 17) ^ rotr32$1(x, 19) ^ x >>> 10;
  }

  var g1_256_1 = g1_256;
  var common$1 = {
    ft_1: ft_1_1,
    ch32: ch32_1,
    maj32: maj32_1,
    p32: p32_1,
    s0_256: s0_256_1,
    s1_256: s1_256_1,
    g0_256: g0_256_1,
    g1_256: g1_256_1
  };

  var rotl32$1 = utils$2.rotl32;
  var sum32$1 = utils$2.sum32;
  var sum32_5$1 = utils$2.sum32_5;
  var ft_1$1 = common$1.ft_1;
  var BlockHash$1 = common.BlockHash;
  var sha1_K = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];

  function SHA1() {
    if (!(this instanceof SHA1)) return new SHA1();
    BlockHash$1.call(this);
    this.h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    this.W = new Array(80);
  }

  utils$2.inherits(SHA1, BlockHash$1);
  var _1 = SHA1;
  SHA1.blockSize = 512;
  SHA1.outSize = 160;
  SHA1.hmacStrength = 80;
  SHA1.padLength = 64;

  SHA1.prototype._update = function _update(msg, start) {
    var W = this.W;

    for (var i = 0; i < 16; i++) {
      W[i] = msg[start + i];
    }

    for (; i < W.length; i++) {
      W[i] = rotl32$1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    }

    var a = this.h[0];
    var b = this.h[1];
    var c = this.h[2];
    var d = this.h[3];
    var e = this.h[4];

    for (i = 0; i < W.length; i++) {
      var s = ~~(i / 20);
      var t = sum32_5$1(rotl32$1(a, 5), ft_1$1(s, b, c, d), e, W[i], sha1_K[s]);
      e = d;
      d = c;
      c = rotl32$1(b, 30);
      b = a;
      a = t;
    }

    this.h[0] = sum32$1(this.h[0], a);
    this.h[1] = sum32$1(this.h[1], b);
    this.h[2] = sum32$1(this.h[2], c);
    this.h[3] = sum32$1(this.h[3], d);
    this.h[4] = sum32$1(this.h[4], e);
  };

  SHA1.prototype._digest = function digest(enc) {
    if (enc === 'hex') return utils$2.toHex32(this.h, 'big');else return utils$2.split32(this.h, 'big');
  };

  var sum32$2 = utils$2.sum32;
  var sum32_4$1 = utils$2.sum32_4;
  var sum32_5$2 = utils$2.sum32_5;
  var ch32$1 = common$1.ch32;
  var maj32$1 = common$1.maj32;
  var s0_256$1 = common$1.s0_256;
  var s1_256$1 = common$1.s1_256;
  var g0_256$1 = common$1.g0_256;
  var g1_256$1 = common$1.g1_256;
  var BlockHash$2 = common.BlockHash;
  var sha256_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];

  function SHA256() {
    if (!(this instanceof SHA256)) return new SHA256();
    BlockHash$2.call(this);
    this.h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    this.k = sha256_K;
    this.W = new Array(64);
  }

  utils$2.inherits(SHA256, BlockHash$2);
  var _256 = SHA256;
  SHA256.blockSize = 512;
  SHA256.outSize = 256;
  SHA256.hmacStrength = 192;
  SHA256.padLength = 64;

  SHA256.prototype._update = function _update(msg, start) {
    var W = this.W;

    for (var i = 0; i < 16; i++) {
      W[i] = msg[start + i];
    }

    for (; i < W.length; i++) {
      W[i] = sum32_4$1(g1_256$1(W[i - 2]), W[i - 7], g0_256$1(W[i - 15]), W[i - 16]);
    }

    var a = this.h[0];
    var b = this.h[1];
    var c = this.h[2];
    var d = this.h[3];
    var e = this.h[4];
    var f = this.h[5];
    var g = this.h[6];
    var h = this.h[7];
    minimalisticAssert(this.k.length === W.length);

    for (i = 0; i < W.length; i++) {
      var T1 = sum32_5$2(h, s1_256$1(e), ch32$1(e, f, g), this.k[i], W[i]);
      var T2 = sum32$2(s0_256$1(a), maj32$1(a, b, c));
      h = g;
      g = f;
      f = e;
      e = sum32$2(d, T1);
      d = c;
      c = b;
      b = a;
      a = sum32$2(T1, T2);
    }

    this.h[0] = sum32$2(this.h[0], a);
    this.h[1] = sum32$2(this.h[1], b);
    this.h[2] = sum32$2(this.h[2], c);
    this.h[3] = sum32$2(this.h[3], d);
    this.h[4] = sum32$2(this.h[4], e);
    this.h[5] = sum32$2(this.h[5], f);
    this.h[6] = sum32$2(this.h[6], g);
    this.h[7] = sum32$2(this.h[7], h);
  };

  SHA256.prototype._digest = function digest(enc) {
    if (enc === 'hex') return utils$2.toHex32(this.h, 'big');else return utils$2.split32(this.h, 'big');
  };

  function SHA224() {
    if (!(this instanceof SHA224)) return new SHA224();
    _256.call(this);
    this.h = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];
  }

  utils$2.inherits(SHA224, _256);
  var _224 = SHA224;
  SHA224.blockSize = 512;
  SHA224.outSize = 224;
  SHA224.hmacStrength = 192;
  SHA224.padLength = 64;

  SHA224.prototype._digest = function digest(enc) {
    // Just truncate output
    if (enc === 'hex') return utils$2.toHex32(this.h.slice(0, 7), 'big');else return utils$2.split32(this.h.slice(0, 7), 'big');
  };

  var rotr64_hi$1 = utils$2.rotr64_hi;
  var rotr64_lo$1 = utils$2.rotr64_lo;
  var shr64_hi$1 = utils$2.shr64_hi;
  var shr64_lo$1 = utils$2.shr64_lo;
  var sum64$1 = utils$2.sum64;
  var sum64_hi$1 = utils$2.sum64_hi;
  var sum64_lo$1 = utils$2.sum64_lo;
  var sum64_4_hi$1 = utils$2.sum64_4_hi;
  var sum64_4_lo$1 = utils$2.sum64_4_lo;
  var sum64_5_hi$1 = utils$2.sum64_5_hi;
  var sum64_5_lo$1 = utils$2.sum64_5_lo;
  var BlockHash$3 = common.BlockHash;
  var sha512_K = [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];

  function SHA512() {
    if (!(this instanceof SHA512)) return new SHA512();
    BlockHash$3.call(this);
    this.h = [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1, 0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179];
    this.k = sha512_K;
    this.W = new Array(160);
  }

  utils$2.inherits(SHA512, BlockHash$3);
  var _512 = SHA512;
  SHA512.blockSize = 1024;
  SHA512.outSize = 512;
  SHA512.hmacStrength = 192;
  SHA512.padLength = 128;

  SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
    var W = this.W; // 32 x 32bit words

    for (var i = 0; i < 32; i++) {
      W[i] = msg[start + i];
    }

    for (; i < W.length; i += 2) {
      var c0_hi = g1_512_hi(W[i - 4], W[i - 3]); // i - 2

      var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
      var c1_hi = W[i - 14]; // i - 7

      var c1_lo = W[i - 13];
      var c2_hi = g0_512_hi(W[i - 30], W[i - 29]); // i - 15

      var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
      var c3_hi = W[i - 32]; // i - 16

      var c3_lo = W[i - 31];
      W[i] = sum64_4_hi$1(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo);
      W[i + 1] = sum64_4_lo$1(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo);
    }
  };

  SHA512.prototype._update = function _update(msg, start) {
    this._prepareBlock(msg, start);

    var W = this.W;
    var ah = this.h[0];
    var al = this.h[1];
    var bh = this.h[2];
    var bl = this.h[3];
    var ch = this.h[4];
    var cl = this.h[5];
    var dh = this.h[6];
    var dl = this.h[7];
    var eh = this.h[8];
    var el = this.h[9];
    var fh = this.h[10];
    var fl = this.h[11];
    var gh = this.h[12];
    var gl = this.h[13];
    var hh = this.h[14];
    var hl = this.h[15];
    minimalisticAssert(this.k.length === W.length);

    for (var i = 0; i < W.length; i += 2) {
      var c0_hi = hh;
      var c0_lo = hl;
      var c1_hi = s1_512_hi(eh, el);
      var c1_lo = s1_512_lo(eh, el);
      var c2_hi = ch64_hi(eh, el, fh, fl, gh);
      var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
      var c3_hi = this.k[i];
      var c3_lo = this.k[i + 1];
      var c4_hi = W[i];
      var c4_lo = W[i + 1];
      var T1_hi = sum64_5_hi$1(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
      var T1_lo = sum64_5_lo$1(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
      c0_hi = s0_512_hi(ah, al);
      c0_lo = s0_512_lo(ah, al);
      c1_hi = maj64_hi(ah, al, bh, bl, ch);
      c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);
      var T2_hi = sum64_hi$1(c0_hi, c0_lo, c1_hi, c1_lo);
      var T2_lo = sum64_lo$1(c0_hi, c0_lo, c1_hi, c1_lo);
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      eh = sum64_hi$1(dh, dl, T1_hi, T1_lo);
      el = sum64_lo$1(dl, dl, T1_hi, T1_lo);
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      ah = sum64_hi$1(T1_hi, T1_lo, T2_hi, T2_lo);
      al = sum64_lo$1(T1_hi, T1_lo, T2_hi, T2_lo);
    }

    sum64$1(this.h, 0, ah, al);
    sum64$1(this.h, 2, bh, bl);
    sum64$1(this.h, 4, ch, cl);
    sum64$1(this.h, 6, dh, dl);
    sum64$1(this.h, 8, eh, el);
    sum64$1(this.h, 10, fh, fl);
    sum64$1(this.h, 12, gh, gl);
    sum64$1(this.h, 14, hh, hl);
  };

  SHA512.prototype._digest = function digest(enc) {
    if (enc === 'hex') return utils$2.toHex32(this.h, 'big');else return utils$2.split32(this.h, 'big');
  };

  function ch64_hi(xh, xl, yh, yl, zh) {
    var r = xh & yh ^ ~xh & zh;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function ch64_lo(xh, xl, yh, yl, zh, zl) {
    var r = xl & yl ^ ~xl & zl;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function maj64_hi(xh, xl, yh, yl, zh) {
    var r = xh & yh ^ xh & zh ^ yh & zh;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function maj64_lo(xh, xl, yh, yl, zh, zl) {
    var r = xl & yl ^ xl & zl ^ yl & zl;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function s0_512_hi(xh, xl) {
    var c0_hi = rotr64_hi$1(xh, xl, 28);
    var c1_hi = rotr64_hi$1(xl, xh, 2); // 34

    var c2_hi = rotr64_hi$1(xl, xh, 7); // 39

    var r = c0_hi ^ c1_hi ^ c2_hi;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function s0_512_lo(xh, xl) {
    var c0_lo = rotr64_lo$1(xh, xl, 28);
    var c1_lo = rotr64_lo$1(xl, xh, 2); // 34

    var c2_lo = rotr64_lo$1(xl, xh, 7); // 39

    var r = c0_lo ^ c1_lo ^ c2_lo;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function s1_512_hi(xh, xl) {
    var c0_hi = rotr64_hi$1(xh, xl, 14);
    var c1_hi = rotr64_hi$1(xh, xl, 18);
    var c2_hi = rotr64_hi$1(xl, xh, 9); // 41

    var r = c0_hi ^ c1_hi ^ c2_hi;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function s1_512_lo(xh, xl) {
    var c0_lo = rotr64_lo$1(xh, xl, 14);
    var c1_lo = rotr64_lo$1(xh, xl, 18);
    var c2_lo = rotr64_lo$1(xl, xh, 9); // 41

    var r = c0_lo ^ c1_lo ^ c2_lo;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function g0_512_hi(xh, xl) {
    var c0_hi = rotr64_hi$1(xh, xl, 1);
    var c1_hi = rotr64_hi$1(xh, xl, 8);
    var c2_hi = shr64_hi$1(xh, xl, 7);
    var r = c0_hi ^ c1_hi ^ c2_hi;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function g0_512_lo(xh, xl) {
    var c0_lo = rotr64_lo$1(xh, xl, 1);
    var c1_lo = rotr64_lo$1(xh, xl, 8);
    var c2_lo = shr64_lo$1(xh, xl, 7);
    var r = c0_lo ^ c1_lo ^ c2_lo;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function g1_512_hi(xh, xl) {
    var c0_hi = rotr64_hi$1(xh, xl, 19);
    var c1_hi = rotr64_hi$1(xl, xh, 29); // 61

    var c2_hi = shr64_hi$1(xh, xl, 6);
    var r = c0_hi ^ c1_hi ^ c2_hi;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function g1_512_lo(xh, xl) {
    var c0_lo = rotr64_lo$1(xh, xl, 19);
    var c1_lo = rotr64_lo$1(xl, xh, 29); // 61

    var c2_lo = shr64_lo$1(xh, xl, 6);
    var r = c0_lo ^ c1_lo ^ c2_lo;
    if (r < 0) r += 0x100000000;
    return r;
  }

  function SHA384() {
    if (!(this instanceof SHA384)) return new SHA384();
    _512.call(this);
    this.h = [0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939, 0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4];
  }

  utils$2.inherits(SHA384, _512);
  var _384 = SHA384;
  SHA384.blockSize = 1024;
  SHA384.outSize = 384;
  SHA384.hmacStrength = 192;
  SHA384.padLength = 128;

  SHA384.prototype._digest = function digest(enc) {
    if (enc === 'hex') return utils$2.toHex32(this.h.slice(0, 12), 'big');else return utils$2.split32(this.h.slice(0, 12), 'big');
  };

  var sha1$1 = _1;
  var sha224$2 = _224;
  var sha256$2 = _256;
  var sha384$2 = _384;
  var sha512$2 = _512;
  var sha$1 = {
    sha1: sha1$1,
    sha224: sha224$2,
    sha256: sha256$2,
    sha384: sha384$2,
    sha512: sha512$2
  };

  var rotl32$2 = utils$2.rotl32;
  var sum32$3 = utils$2.sum32;
  var sum32_3$1 = utils$2.sum32_3;
  var sum32_4$2 = utils$2.sum32_4;
  var BlockHash$4 = common.BlockHash;

  function RIPEMD160$1() {
    if (!(this instanceof RIPEMD160$1)) return new RIPEMD160$1();
    BlockHash$4.call(this);
    this.h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    this.endian = 'little';
  }

  utils$2.inherits(RIPEMD160$1, BlockHash$4);
  var ripemd160$1 = RIPEMD160$1;
  RIPEMD160$1.blockSize = 512;
  RIPEMD160$1.outSize = 160;
  RIPEMD160$1.hmacStrength = 192;
  RIPEMD160$1.padLength = 64;

  RIPEMD160$1.prototype._update = function update(msg, start) {
    var A = this.h[0];
    var B = this.h[1];
    var C = this.h[2];
    var D = this.h[3];
    var E = this.h[4];
    var Ah = A;
    var Bh = B;
    var Ch = C;
    var Dh = D;
    var Eh = E;

    for (var j = 0; j < 80; j++) {
      var T = sum32$3(rotl32$2(sum32_4$2(A, f(j, B, C, D), msg[r$1[j] + start], K$4(j)), s[j]), E);
      A = E;
      E = D;
      D = rotl32$2(C, 10);
      C = B;
      B = T;
      T = sum32$3(rotl32$2(sum32_4$2(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)), sh[j]), Eh);
      Ah = Eh;
      Eh = Dh;
      Dh = rotl32$2(Ch, 10);
      Ch = Bh;
      Bh = T;
    }

    T = sum32_3$1(this.h[1], C, Dh);
    this.h[1] = sum32_3$1(this.h[2], D, Eh);
    this.h[2] = sum32_3$1(this.h[3], E, Ah);
    this.h[3] = sum32_3$1(this.h[4], A, Bh);
    this.h[4] = sum32_3$1(this.h[0], B, Ch);
    this.h[0] = T;
  };

  RIPEMD160$1.prototype._digest = function digest(enc) {
    if (enc === 'hex') return utils$2.toHex32(this.h, 'little');else return utils$2.split32(this.h, 'little');
  };

  function f(j, x, y, z) {
    if (j <= 15) return x ^ y ^ z;else if (j <= 31) return x & y | ~x & z;else if (j <= 47) return (x | ~y) ^ z;else if (j <= 63) return x & z | y & ~z;else return x ^ (y | ~z);
  }

  function K$4(j) {
    if (j <= 15) return 0x00000000;else if (j <= 31) return 0x5a827999;else if (j <= 47) return 0x6ed9eba1;else if (j <= 63) return 0x8f1bbcdc;else return 0xa953fd4e;
  }

  function Kh(j) {
    if (j <= 15) return 0x50a28be6;else if (j <= 31) return 0x5c4dd124;else if (j <= 47) return 0x6d703ef3;else if (j <= 63) return 0x7a6d76e9;else return 0x00000000;
  }

  var r$1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
  var rh = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
  var s = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
  var sh = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
  var ripemd = {
    ripemd160: ripemd160$1
  };

  function Hmac$3(hash, key, enc) {
    if (!(this instanceof Hmac$3)) return new Hmac$3(hash, key, enc);
    this.Hash = hash;
    this.blockSize = hash.blockSize / 8;
    this.outSize = hash.outSize / 8;
    this.inner = null;
    this.outer = null;

    this._init(utils$2.toArray(key, enc));
  }

  var hmac = Hmac$3;

  Hmac$3.prototype._init = function init(key) {
    // Shorten key, if needed
    if (key.length > this.blockSize) key = new this.Hash().update(key).digest();
    minimalisticAssert(key.length <= this.blockSize); // Add padding to key

    for (var i = key.length; i < this.blockSize; i++) {
      key.push(0);
    }

    for (i = 0; i < key.length; i++) {
      key[i] ^= 0x36;
    }

    this.inner = new this.Hash().update(key); // 0x36 ^ 0x5c = 0x6a

    for (i = 0; i < key.length; i++) {
      key[i] ^= 0x6a;
    }

    this.outer = new this.Hash().update(key);
  };

  Hmac$3.prototype.update = function update(msg, enc) {
    this.inner.update(msg, enc);
    return this;
  };

  Hmac$3.prototype.digest = function digest(enc) {
    this.outer.update(this.inner.digest());
    return this.outer.digest(enc);
  };

  var hash_1 = createCommonjsModule(function (module, exports) {
    var hash = exports;
    hash.utils = utils$2;
    hash.common = common;
    hash.sha = sha$1;
    hash.ripemd = ripemd;
    hash.hmac = hmac; // Proxy hash functions to the main object

    hash.sha1 = hash.sha.sha1;
    hash.sha256 = hash.sha.sha256;
    hash.sha224 = hash.sha.sha224;
    hash.sha384 = hash.sha.sha384;
    hash.sha512 = hash.sha.sha512;
    hash.ripemd160 = hash.ripemd.ripemd160;
  });

  var secp256k1 = {
    doubles: {
      step: 4,
      points: [['e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a', 'f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821'], ['8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508', '11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf'], ['175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739', 'd3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695'], ['363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640', '4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9'], ['8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c', '4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36'], ['723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda', '96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f'], ['eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa', '5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999'], ['100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0', 'cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09'], ['e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d', '9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d'], ['feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d', 'e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088'], ['da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1', '9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d'], ['53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0', '5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8'], ['8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047', '10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a'], ['385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862', '283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453'], ['6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7', '7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160'], ['3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd', '56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0'], ['85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83', '7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6'], ['948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a', '53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589'], ['6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8', 'bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17'], ['e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d', '4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda'], ['e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725', '7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd'], ['213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754', '4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2'], ['4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c', '17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6'], ['fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6', '6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f'], ['76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39', 'c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01'], ['c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891', '893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3'], ['d895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b', 'febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f'], ['b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03', '2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7'], ['e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d', 'eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78'], ['a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070', '7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1'], ['90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4', 'e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150'], ['8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da', '662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82'], ['e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11', '1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc'], ['8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e', 'efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b'], ['e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41', '2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51'], ['b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef', '67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45'], ['d68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8', 'db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120'], ['324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d', '648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84'], ['4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96', '35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d'], ['9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd', 'ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d'], ['6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5', '9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8'], ['a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266', '40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8'], ['7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71', '34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac'], ['928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac', 'c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f'], ['85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751', '1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962'], ['ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e', '493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907'], ['827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241', 'c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec'], ['eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3', 'be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d'], ['e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f', '4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414'], ['1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19', 'aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd'], ['146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be', 'b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0'], ['fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9', '6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811'], ['da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2', '8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1'], ['a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13', '7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c'], ['174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c', 'ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73'], ['959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba', '2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd'], ['d2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151', 'e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405'], ['64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073', 'd99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589'], ['8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458', '38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e'], ['13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b', '69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27'], ['bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366', 'd3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1'], ['8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa', '40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482'], ['8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0', '620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945'], ['dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787', '7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573'], ['f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e', 'ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82']]
    },
    naf: {
      wnd: 7,
      points: [['f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9', '388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672'], ['2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4', 'd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6'], ['5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc', '6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da'], ['acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe', 'cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37'], ['774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb', 'd984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b'], ['f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8', 'ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81'], ['d7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e', '581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58'], ['defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34', '4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77'], ['2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c', '85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a'], ['352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5', '321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c'], ['2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f', '2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67'], ['9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714', '73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402'], ['daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729', 'a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55'], ['c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db', '2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482'], ['6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4', 'e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82'], ['1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5', 'b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396'], ['605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479', '2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49'], ['62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d', '80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf'], ['80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f', '1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a'], ['7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb', 'd0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7'], ['d528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9', 'eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933'], ['49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963', '758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a'], ['77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74', '958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6'], ['f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530', 'e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37'], ['463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b', '5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e'], ['f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247', 'cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6'], ['caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1', 'cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476'], ['2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120', '4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40'], ['7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435', '91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61'], ['754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18', '673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683'], ['e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8', '59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5'], ['186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb', '3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b'], ['df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f', '55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417'], ['5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143', 'efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868'], ['290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba', 'e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a'], ['af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45', 'f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6'], ['766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a', '744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996'], ['59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e', 'c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e'], ['f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8', 'e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d'], ['7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c', '30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2'], ['948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519', 'e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e'], ['7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab', '100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437'], ['3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca', 'ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311'], ['d3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf', '8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4'], ['1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610', '68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575'], ['733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4', 'f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d'], ['15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c', 'd56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d'], ['a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940', 'edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629'], ['e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980', 'a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06'], ['311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3', '66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374'], ['34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf', '9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee'], ['f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63', '4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1'], ['d7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448', 'fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b'], ['32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf', '5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661'], ['7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5', '8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6'], ['ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6', '8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e'], ['16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5', '5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d'], ['eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99', 'f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc'], ['78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51', 'f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4'], ['494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5', '42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c'], ['a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5', '204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b'], ['c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997', '4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913'], ['841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881', '73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154'], ['5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5', '39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865'], ['36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66', 'd2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc'], ['336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726', 'ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224'], ['8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede', '6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e'], ['1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94', '60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6'], ['85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31', '3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511'], ['29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51', 'b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b'], ['a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252', 'ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2'], ['4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5', 'cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c'], ['d24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b', '6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3'], ['ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4', '322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d'], ['af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f', '6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700'], ['e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889', '2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4'], ['591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246', 'b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196'], ['11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984', '998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4'], ['3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a', 'b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257'], ['cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030', 'bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13'], ['c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197', '6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096'], ['c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593', 'c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38'], ['a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef', '21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f'], ['347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38', '60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448'], ['da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a', '49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a'], ['c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111', '5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4'], ['4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502', '7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437'], ['3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea', 'be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7'], ['cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26', '8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d'], ['b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986', '39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a'], ['d4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e', '62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54'], ['48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4', '25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77'], ['dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda', 'ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517'], ['6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859', 'cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10'], ['e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f', 'f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125'], ['eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c', '6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e'], ['13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942', 'fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1'], ['ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a', '1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2'], ['b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80', '5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423'], ['ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d', '438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8'], ['8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1', 'cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758'], ['52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63', 'c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375'], ['e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352', '6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d'], ['7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193', 'ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec'], ['5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00', '9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0'], ['32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58', 'ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c'], ['e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7', 'd3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4'], ['8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8', 'c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f'], ['4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e', '67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649'], ['3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d', 'cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826'], ['674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b', '299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5'], ['d32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f', 'f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87'], ['30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6', '462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b'], ['be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297', '62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc'], ['93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a', '7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c'], ['b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c', 'ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f'], ['d5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52', '4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a'], ['d3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb', 'bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46'], ['463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065', 'bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f'], ['7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917', '603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03'], ['74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9', 'cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08'], ['30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3', '553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8'], ['9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57', '712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373'], ['176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66', 'ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3'], ['75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8', '9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8'], ['809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721', '9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1'], ['1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180', '4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9']]
    }
  };

  var curves_1 = createCommonjsModule(function (module, exports) {

    var curves = exports;
    var assert = utils_1$1.assert;

    function PresetCurve(options) {
      if (options.type === 'short') this.curve = new curve_1["short"](options);else if (options.type === 'edwards') this.curve = new curve_1.edwards(options);else this.curve = new curve_1.mont(options);
      this.g = this.curve.g;
      this.n = this.curve.n;
      this.hash = options.hash;
      assert(this.g.validate(), 'Invalid curve');
      assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
    }

    curves.PresetCurve = PresetCurve;

    function defineCurve(name, options) {
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        get: function get() {
          var curve = new PresetCurve(options);
          Object.defineProperty(curves, name, {
            configurable: true,
            enumerable: true,
            value: curve
          });
          return curve;
        }
      });
    }

    defineCurve('p192', {
      type: 'short',
      prime: 'p192',
      p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
      a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
      b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
      n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
      hash: hash_1.sha256,
      gRed: false,
      g: ['188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012', '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811']
    });
    defineCurve('p224', {
      type: 'short',
      prime: 'p224',
      p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
      a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
      b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
      n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
      hash: hash_1.sha256,
      gRed: false,
      g: ['b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21', 'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34']
    });
    defineCurve('p256', {
      type: 'short',
      prime: null,
      p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
      a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
      b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
      n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
      hash: hash_1.sha256,
      gRed: false,
      g: ['6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296', '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5']
    });
    defineCurve('p384', {
      type: 'short',
      prime: null,
      p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'fffffffe ffffffff 00000000 00000000 ffffffff',
      a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'fffffffe ffffffff 00000000 00000000 fffffffc',
      b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' + '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
      n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' + 'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
      hash: hash_1.sha384,
      gRed: false,
      g: ['aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' + '5502f25d bf55296c 3a545e38 72760ab7', '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' + '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f']
    });
    defineCurve('p521', {
      type: 'short',
      prime: null,
      p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff',
      a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff fffffffc',
      b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' + '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' + '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
      n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' + 'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
      hash: hash_1.sha512,
      gRed: false,
      g: ['000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' + '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' + 'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66', '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' + '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' + '3fad0761 353c7086 a272c240 88be9476 9fd16650']
    });
    defineCurve('curve25519', {
      type: 'mont',
      prime: 'p25519',
      p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
      a: '76d06',
      b: '1',
      n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
      hash: hash_1.sha256,
      gRed: false,
      g: ['9']
    });
    defineCurve('ed25519', {
      type: 'edwards',
      prime: 'p25519',
      p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
      a: '-1',
      c: '1',
      // -121665 * (121666^(-1)) (mod P)
      d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
      n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
      hash: hash_1.sha256,
      gRed: false,
      g: ['216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a', // 4/5
      '6666666666666666666666666666666666666666666666666666666666666658']
    });
    var pre;

    try {
      pre = secp256k1;
    } catch (e) {
      pre = undefined;
    }

    defineCurve('secp256k1', {
      type: 'short',
      prime: 'k256',
      p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
      a: '0',
      b: '7',
      n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
      h: '1',
      hash: hash_1.sha256,
      // Precomputed endomorphism
      beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
      lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
      basis: [{
        a: '3086d221a7d46bcde86c90e49284eb15',
        b: '-e4437ed6010e88286f547fa90abfe4c3'
      }, {
        a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
        b: '3086d221a7d46bcde86c90e49284eb15'
      }],
      gRed: false,
      g: ['79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8', pre]
    });
  });

  function HmacDRBG(options) {
    if (!(this instanceof HmacDRBG)) return new HmacDRBG(options);
    this.hash = options.hash;
    this.predResist = !!options.predResist;
    this.outLen = this.hash.outSize;
    this.minEntropy = options.minEntropy || this.hash.hmacStrength;
    this._reseed = null;
    this.reseedInterval = null;
    this.K = null;
    this.V = null;
    var entropy = utils_1.toArray(options.entropy, options.entropyEnc || 'hex');
    var nonce = utils_1.toArray(options.nonce, options.nonceEnc || 'hex');
    var pers = utils_1.toArray(options.pers, options.persEnc || 'hex');
    minimalisticAssert(entropy.length >= this.minEntropy / 8, 'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

    this._init(entropy, nonce, pers);
  }

  var hmacDrbg = HmacDRBG;

  HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
    var seed = entropy.concat(nonce).concat(pers);
    this.K = new Array(this.outLen / 8);
    this.V = new Array(this.outLen / 8);

    for (var i = 0; i < this.V.length; i++) {
      this.K[i] = 0x00;
      this.V[i] = 0x01;
    }

    this._update(seed);

    this._reseed = 1;
    this.reseedInterval = 0x1000000000000; // 2^48
  };

  HmacDRBG.prototype._hmac = function hmac() {
    return new hash_1.hmac(this.hash, this.K);
  };

  HmacDRBG.prototype._update = function update(seed) {
    var kmac = this._hmac().update(this.V).update([0x00]);

    if (seed) kmac = kmac.update(seed);
    this.K = kmac.digest();
    this.V = this._hmac().update(this.V).digest();
    if (!seed) return;
    this.K = this._hmac().update(this.V).update([0x01]).update(seed).digest();
    this.V = this._hmac().update(this.V).digest();
  };

  HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
    // Optional entropy enc
    if (typeof entropyEnc !== 'string') {
      addEnc = add;
      add = entropyEnc;
      entropyEnc = null;
    }

    entropy = utils_1.toArray(entropy, entropyEnc);
    add = utils_1.toArray(add, addEnc);
    minimalisticAssert(entropy.length >= this.minEntropy / 8, 'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

    this._update(entropy.concat(add || []));

    this._reseed = 1;
  };

  HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
    if (this._reseed > this.reseedInterval) throw new Error('Reseed is required'); // Optional encoding

    if (typeof enc !== 'string') {
      addEnc = add;
      add = enc;
      enc = null;
    } // Optional additional data


    if (add) {
      add = utils_1.toArray(add, addEnc || 'hex');

      this._update(add);
    }

    var temp = [];

    while (temp.length < len) {
      this.V = this._hmac().update(this.V).digest();
      temp = temp.concat(this.V);
    }

    var res = temp.slice(0, len);

    this._update(add);

    this._reseed++;
    return utils_1.encode(res, enc);
  };

  var assert$5 = utils_1$1.assert;

  function KeyPair(ec, options) {
    this.ec = ec;
    this.priv = null;
    this.pub = null; // KeyPair(ec, { priv: ..., pub: ... })

    if (options.priv) this._importPrivate(options.priv, options.privEnc);
    if (options.pub) this._importPublic(options.pub, options.pubEnc);
  }

  var key$1 = KeyPair;

  KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
    if (pub instanceof KeyPair) return pub;
    return new KeyPair(ec, {
      pub: pub,
      pubEnc: enc
    });
  };

  KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
    if (priv instanceof KeyPair) return priv;
    return new KeyPair(ec, {
      priv: priv,
      privEnc: enc
    });
  };

  KeyPair.prototype.validate = function validate() {
    var pub = this.getPublic();
    if (pub.isInfinity()) return {
      result: false,
      reason: 'Invalid public key'
    };
    if (!pub.validate()) return {
      result: false,
      reason: 'Public key is not a point'
    };
    if (!pub.mul(this.ec.curve.n).isInfinity()) return {
      result: false,
      reason: 'Public key * N != O'
    };
    return {
      result: true,
      reason: null
    };
  };

  KeyPair.prototype.getPublic = function getPublic(compact, enc) {
    // compact is optional argument
    if (typeof compact === 'string') {
      enc = compact;
      compact = null;
    }

    if (!this.pub) this.pub = this.ec.g.mul(this.priv);
    if (!enc) return this.pub;
    return this.pub.encode(enc, compact);
  };

  KeyPair.prototype.getPrivate = function getPrivate(enc) {
    if (enc === 'hex') return this.priv.toString(16, 2);else return this.priv;
  };

  KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
    this.priv = new bn(key, enc || 16); // Ensure that the priv won't be bigger than n, otherwise we may fail
    // in fixed multiplication method

    this.priv = this.priv.umod(this.ec.curve.n);
  };

  KeyPair.prototype._importPublic = function _importPublic(key, enc) {
    if (key.x || key.y) {
      // Montgomery points only have an `x` coordinate.
      // Weierstrass/Edwards points on the other hand have both `x` and
      // `y` coordinates.
      if (this.ec.curve.type === 'mont') {
        assert$5(key.x, 'Need x coordinate');
      } else if (this.ec.curve.type === 'short' || this.ec.curve.type === 'edwards') {
        assert$5(key.x && key.y, 'Need both x and y coordinate');
      }

      this.pub = this.ec.curve.point(key.x, key.y);
      return;
    }

    this.pub = this.ec.curve.decodePoint(key, enc);
  }; // ECDH


  KeyPair.prototype.derive = function derive(pub) {
    return pub.mul(this.priv).getX();
  }; // ECDSA


  KeyPair.prototype.sign = function sign(msg, enc, options) {
    return this.ec.sign(msg, this, enc, options);
  };

  KeyPair.prototype.verify = function verify(msg, signature) {
    return this.ec.verify(msg, signature, this);
  };

  KeyPair.prototype.inspect = function inspect() {
    return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) + ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
  };

  var assert$6 = utils_1$1.assert;

  function Signature(options, enc) {
    if (options instanceof Signature) return options;
    if (this._importDER(options, enc)) return;
    assert$6(options.r && options.s, 'Signature without r or s');
    this.r = new bn(options.r, 16);
    this.s = new bn(options.s, 16);
    if (options.recoveryParam === undefined) this.recoveryParam = null;else this.recoveryParam = options.recoveryParam;
  }

  var signature = Signature;

  function Position() {
    this.place = 0;
  }

  function getLength(buf, p) {
    var initial = buf[p.place++];

    if (!(initial & 0x80)) {
      return initial;
    }

    var octetLen = initial & 0xf;
    var val = 0;

    for (var i = 0, off = p.place; i < octetLen; i++, off++) {
      val <<= 8;
      val |= buf[off];
    }

    p.place = off;
    return val;
  }

  function rmPadding(buf) {
    var i = 0;
    var len = buf.length - 1;

    while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
      i++;
    }

    if (i === 0) {
      return buf;
    }

    return buf.slice(i);
  }

  Signature.prototype._importDER = function _importDER(data, enc) {
    data = utils_1$1.toArray(data, enc);
    var p = new Position();

    if (data[p.place++] !== 0x30) {
      return false;
    }

    var len = getLength(data, p);

    if (len + p.place !== data.length) {
      return false;
    }

    if (data[p.place++] !== 0x02) {
      return false;
    }

    var rlen = getLength(data, p);
    var r = data.slice(p.place, rlen + p.place);
    p.place += rlen;

    if (data[p.place++] !== 0x02) {
      return false;
    }

    var slen = getLength(data, p);

    if (data.length !== slen + p.place) {
      return false;
    }

    var s = data.slice(p.place, slen + p.place);

    if (r[0] === 0 && r[1] & 0x80) {
      r = r.slice(1);
    }

    if (s[0] === 0 && s[1] & 0x80) {
      s = s.slice(1);
    }

    this.r = new bn(r);
    this.s = new bn(s);
    this.recoveryParam = null;
    return true;
  };

  function constructLength(arr, len) {
    if (len < 0x80) {
      arr.push(len);
      return;
    }

    var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
    arr.push(octets | 0x80);

    while (--octets) {
      arr.push(len >>> (octets << 3) & 0xff);
    }

    arr.push(len);
  }

  Signature.prototype.toDER = function toDER(enc) {
    var r = this.r.toArray();
    var s = this.s.toArray(); // Pad values

    if (r[0] & 0x80) r = [0].concat(r); // Pad values

    if (s[0] & 0x80) s = [0].concat(s);
    r = rmPadding(r);
    s = rmPadding(s);

    while (!s[0] && !(s[1] & 0x80)) {
      s = s.slice(1);
    }

    var arr = [0x02];
    constructLength(arr, r.length);
    arr = arr.concat(r);
    arr.push(0x02);
    constructLength(arr, s.length);
    var backHalf = arr.concat(s);
    var res = [0x30];
    constructLength(res, backHalf.length);
    res = res.concat(backHalf);
    return utils_1$1.encode(res, enc);
  };

  var assert$7 = utils_1$1.assert;

  function EC(options) {
    if (!(this instanceof EC)) return new EC(options); // Shortcut `elliptic.ec(curve-name)`

    if (typeof options === 'string') {
      assert$7(curves_1.hasOwnProperty(options), 'Unknown curve ' + options);
      options = curves_1[options];
    } // Shortcut for `elliptic.ec(elliptic.curves.curveName)`


    if (options instanceof curves_1.PresetCurve) options = {
      curve: options
    };
    this.curve = options.curve.curve;
    this.n = this.curve.n;
    this.nh = this.n.ushrn(1);
    this.g = this.curve.g; // Point on curve

    this.g = options.curve.g;
    this.g.precompute(options.curve.n.bitLength() + 1); // Hash for function for DRBG

    this.hash = options.hash || options.curve.hash;
  }

  var ec = EC;

  EC.prototype.keyPair = function keyPair(options) {
    return new key$1(this, options);
  };

  EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
    return key$1.fromPrivate(this, priv, enc);
  };

  EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
    return key$1.fromPublic(this, pub, enc);
  };

  EC.prototype.genKeyPair = function genKeyPair(options) {
    if (!options) options = {}; // Instantiate Hmac_DRBG

    var drbg = new hmacDrbg({
      hash: this.hash,
      pers: options.pers,
      persEnc: options.persEnc || 'utf8',
      entropy: options.entropy || brorand(this.hash.hmacStrength),
      entropyEnc: options.entropy && options.entropyEnc || 'utf8',
      nonce: this.n.toArray()
    });
    var bytes = this.n.byteLength();
    var ns2 = this.n.sub(new bn(2));

    do {
      var priv = new bn(drbg.generate(bytes));
      if (priv.cmp(ns2) > 0) continue;
      priv.iaddn(1);
      return this.keyFromPrivate(priv);
    } while (true);
  };

  EC.prototype._truncateToN = function truncateToN(msg, truncOnly) {
    var delta = msg.byteLength() * 8 - this.n.bitLength();
    if (delta > 0) msg = msg.ushrn(delta);
    if (!truncOnly && msg.cmp(this.n) >= 0) return msg.sub(this.n);else return msg;
  };

  EC.prototype.sign = function sign(msg, key, enc, options) {
    if (_typeof(enc) === 'object') {
      options = enc;
      enc = null;
    }

    if (!options) options = {};
    key = this.keyFromPrivate(key, enc);
    msg = this._truncateToN(new bn(msg, 16)); // Zero-extend key to provide enough entropy

    var bytes = this.n.byteLength();
    var bkey = key.getPrivate().toArray('be', bytes); // Zero-extend nonce to have the same byte size as N

    var nonce = msg.toArray('be', bytes); // Instantiate Hmac_DRBG

    var drbg = new hmacDrbg({
      hash: this.hash,
      entropy: bkey,
      nonce: nonce,
      pers: options.pers,
      persEnc: options.persEnc || 'utf8'
    }); // Number of bytes to generate

    var ns1 = this.n.sub(new bn(1));

    for (var iter = 0; true; iter++) {
      var k = options.k ? options.k(iter) : new bn(drbg.generate(this.n.byteLength()));
      k = this._truncateToN(k, true);
      if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0) continue;
      var kp = this.g.mul(k);
      if (kp.isInfinity()) continue;
      var kpX = kp.getX();
      var r = kpX.umod(this.n);
      if (r.cmpn(0) === 0) continue;
      var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
      s = s.umod(this.n);
      if (s.cmpn(0) === 0) continue;
      var recoveryParam = (kp.getY().isOdd() ? 1 : 0) | (kpX.cmp(r) !== 0 ? 2 : 0); // Use complement of `s`, if it is > `n / 2`

      if (options.canonical && s.cmp(this.nh) > 0) {
        s = this.n.sub(s);
        recoveryParam ^= 1;
      }

      return new signature({
        r: r,
        s: s,
        recoveryParam: recoveryParam
      });
    }
  };

  EC.prototype.verify = function verify(msg, signature$1, key, enc) {
    msg = this._truncateToN(new bn(msg, 16));
    key = this.keyFromPublic(key, enc);
    signature$1 = new signature(signature$1, 'hex'); // Perform primitive values validation

    var r = signature$1.r;
    var s = signature$1.s;
    if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0) return false;
    if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0) return false; // Validate signature

    var sinv = s.invm(this.n);
    var u1 = sinv.mul(msg).umod(this.n);
    var u2 = sinv.mul(r).umod(this.n);

    if (!this.curve._maxwellTrick) {
      var p = this.g.mulAdd(u1, key.getPublic(), u2);
      if (p.isInfinity()) return false;
      return p.getX().umod(this.n).cmp(r) === 0;
    } // NOTE: Greg Maxwell's trick, inspired by:
    // https://git.io/vad3K


    var p = this.g.jmulAdd(u1, key.getPublic(), u2);
    if (p.isInfinity()) return false; // Compare `p.x` of Jacobian point with `r`,
    // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
    // inverse of `p.z^2`

    return p.eqXToP(r);
  };

  EC.prototype.recoverPubKey = function (msg, signature$1, j, enc) {
    assert$7((3 & j) === j, 'The recovery param is more than two bits');
    signature$1 = new signature(signature$1, enc);
    var n = this.n;
    var e = new bn(msg);
    var r = signature$1.r;
    var s = signature$1.s; // A set LSB signifies that the y-coordinate is odd

    var isYOdd = j & 1;
    var isSecondKey = j >> 1;
    if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey) throw new Error('Unable to find sencond key candinate'); // 1.1. Let x = r + jn.

    if (isSecondKey) r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);else r = this.curve.pointFromX(r, isYOdd);
    var rInv = signature$1.r.invm(n);
    var s1 = n.sub(e).mul(rInv).umod(n);
    var s2 = s.mul(rInv).umod(n); // 1.6.1 Compute Q = r^-1 (sR -  eG)
    //               Q = r^-1 (sR + -eG)

    return this.g.mulAdd(s1, r, s2);
  };

  EC.prototype.getKeyRecoveryParam = function (e, signature$1, Q, enc) {
    signature$1 = new signature(signature$1, enc);
    if (signature$1.recoveryParam !== null) return signature$1.recoveryParam;

    for (var i = 0; i < 4; i++) {
      var Qprime;

      try {
        Qprime = this.recoverPubKey(e, signature$1, i);
      } catch (e) {
        continue;
      }

      if (Qprime.eq(Q)) return i;
    }

    throw new Error('Unable to find valid recovery factor');
  };

  var assert$8 = utils_1$1.assert;
  var parseBytes = utils_1$1.parseBytes;
  var cachedProperty = utils_1$1.cachedProperty;
  /**
  * @param {EDDSA} eddsa - instance
  * @param {Object} params - public/private key parameters
  *
  * @param {Array<Byte>} [params.secret] - secret seed bytes
  * @param {Point} [params.pub] - public key point (aka `A` in eddsa terms)
  * @param {Array<Byte>} [params.pub] - public key point encoded as bytes
  *
  */

  function KeyPair$1(eddsa, params) {
    this.eddsa = eddsa;
    this._secret = parseBytes(params.secret);
    if (eddsa.isPoint(params.pub)) this._pub = params.pub;else this._pubBytes = parseBytes(params.pub);
  }

  KeyPair$1.fromPublic = function fromPublic(eddsa, pub) {
    if (pub instanceof KeyPair$1) return pub;
    return new KeyPair$1(eddsa, {
      pub: pub
    });
  };

  KeyPair$1.fromSecret = function fromSecret(eddsa, secret) {
    if (secret instanceof KeyPair$1) return secret;
    return new KeyPair$1(eddsa, {
      secret: secret
    });
  };

  KeyPair$1.prototype.secret = function secret() {
    return this._secret;
  };

  cachedProperty(KeyPair$1, 'pubBytes', function pubBytes() {
    return this.eddsa.encodePoint(this.pub());
  });
  cachedProperty(KeyPair$1, 'pub', function pub() {
    if (this._pubBytes) return this.eddsa.decodePoint(this._pubBytes);
    return this.eddsa.g.mul(this.priv());
  });
  cachedProperty(KeyPair$1, 'privBytes', function privBytes() {
    var eddsa = this.eddsa;
    var hash = this.hash();
    var lastIx = eddsa.encodingLength - 1;
    var a = hash.slice(0, eddsa.encodingLength);
    a[0] &= 248;
    a[lastIx] &= 127;
    a[lastIx] |= 64;
    return a;
  });
  cachedProperty(KeyPair$1, 'priv', function priv() {
    return this.eddsa.decodeInt(this.privBytes());
  });
  cachedProperty(KeyPair$1, 'hash', function hash() {
    return this.eddsa.hash().update(this.secret()).digest();
  });
  cachedProperty(KeyPair$1, 'messagePrefix', function messagePrefix() {
    return this.hash().slice(this.eddsa.encodingLength);
  });

  KeyPair$1.prototype.sign = function sign(message) {
    assert$8(this._secret, 'KeyPair can only verify');
    return this.eddsa.sign(message, this);
  };

  KeyPair$1.prototype.verify = function verify(message, sig) {
    return this.eddsa.verify(message, sig, this);
  };

  KeyPair$1.prototype.getSecret = function getSecret(enc) {
    assert$8(this._secret, 'KeyPair is public only');
    return utils_1$1.encode(this.secret(), enc);
  };

  KeyPair$1.prototype.getPublic = function getPublic(enc) {
    return utils_1$1.encode(this.pubBytes(), enc);
  };

  var key$2 = KeyPair$1;

  var assert$9 = utils_1$1.assert;
  var cachedProperty$1 = utils_1$1.cachedProperty;
  var parseBytes$1 = utils_1$1.parseBytes;
  /**
  * @param {EDDSA} eddsa - eddsa instance
  * @param {Array<Bytes>|Object} sig -
  * @param {Array<Bytes>|Point} [sig.R] - R point as Point or bytes
  * @param {Array<Bytes>|bn} [sig.S] - S scalar as bn or bytes
  * @param {Array<Bytes>} [sig.Rencoded] - R point encoded
  * @param {Array<Bytes>} [sig.Sencoded] - S scalar encoded
  */

  function Signature$1(eddsa, sig) {
    this.eddsa = eddsa;
    if (_typeof(sig) !== 'object') sig = parseBytes$1(sig);

    if (Array.isArray(sig)) {
      sig = {
        R: sig.slice(0, eddsa.encodingLength),
        S: sig.slice(eddsa.encodingLength)
      };
    }

    assert$9(sig.R && sig.S, 'Signature without R or S');
    if (eddsa.isPoint(sig.R)) this._R = sig.R;
    if (sig.S instanceof bn) this._S = sig.S;
    this._Rencoded = Array.isArray(sig.R) ? sig.R : sig.Rencoded;
    this._Sencoded = Array.isArray(sig.S) ? sig.S : sig.Sencoded;
  }

  cachedProperty$1(Signature$1, 'S', function S() {
    return this.eddsa.decodeInt(this.Sencoded());
  });
  cachedProperty$1(Signature$1, 'R', function R() {
    return this.eddsa.decodePoint(this.Rencoded());
  });
  cachedProperty$1(Signature$1, 'Rencoded', function Rencoded() {
    return this.eddsa.encodePoint(this.R());
  });
  cachedProperty$1(Signature$1, 'Sencoded', function Sencoded() {
    return this.eddsa.encodeInt(this.S());
  });

  Signature$1.prototype.toBytes = function toBytes() {
    return this.Rencoded().concat(this.Sencoded());
  };

  Signature$1.prototype.toHex = function toHex() {
    return utils_1$1.encode(this.toBytes(), 'hex').toUpperCase();
  };

  var signature$1 = Signature$1;

  var assert$a = utils_1$1.assert;
  var parseBytes$2 = utils_1$1.parseBytes;

  function EDDSA(curve) {
    assert$a(curve === 'ed25519', 'only tested with ed25519 so far');
    if (!(this instanceof EDDSA)) return new EDDSA(curve);
    var curve = curves_1[curve].curve;
    this.curve = curve;
    this.g = curve.g;
    this.g.precompute(curve.n.bitLength() + 1);
    this.pointClass = curve.point().constructor;
    this.encodingLength = Math.ceil(curve.n.bitLength() / 8);
    this.hash = hash_1.sha512;
  }

  var eddsa = EDDSA;
  /**
  * @param {Array|String} message - message bytes
  * @param {Array|String|KeyPair} secret - secret bytes or a keypair
  * @returns {Signature} - signature
  */

  EDDSA.prototype.sign = function sign(message, secret) {
    message = parseBytes$2(message);
    var key = this.keyFromSecret(secret);
    var r = this.hashInt(key.messagePrefix(), message);
    var R = this.g.mul(r);
    var Rencoded = this.encodePoint(R);
    var s_ = this.hashInt(Rencoded, key.pubBytes(), message).mul(key.priv());
    var S = r.add(s_).umod(this.curve.n);
    return this.makeSignature({
      R: R,
      S: S,
      Rencoded: Rencoded
    });
  };
  /**
  * @param {Array} message - message bytes
  * @param {Array|String|Signature} sig - sig bytes
  * @param {Array|String|Point|KeyPair} pub - public key
  * @returns {Boolean} - true if public key matches sig of message
  */


  EDDSA.prototype.verify = function verify(message, sig, pub) {
    message = parseBytes$2(message);
    sig = this.makeSignature(sig);
    var key = this.keyFromPublic(pub);
    var h = this.hashInt(sig.Rencoded(), key.pubBytes(), message);
    var SG = this.g.mul(sig.S());
    var RplusAh = sig.R().add(key.pub().mul(h));
    return RplusAh.eq(SG);
  };

  EDDSA.prototype.hashInt = function hashInt() {
    var hash = this.hash();

    for (var i = 0; i < arguments.length; i++) {
      hash.update(arguments[i]);
    }

    return utils_1$1.intFromLE(hash.digest()).umod(this.curve.n);
  };

  EDDSA.prototype.keyFromPublic = function keyFromPublic(pub) {
    return key$2.fromPublic(this, pub);
  };

  EDDSA.prototype.keyFromSecret = function keyFromSecret(secret) {
    return key$2.fromSecret(this, secret);
  };

  EDDSA.prototype.makeSignature = function makeSignature(sig) {
    if (sig instanceof signature$1) return sig;
    return new signature$1(this, sig);
  };
  /**
  * * https://tools.ietf.org/html/draft-josefsson-eddsa-ed25519-03#section-5.2
  *
  * EDDSA defines methods for encoding and decoding points and integers. These are
  * helper convenience methods, that pass along to utility functions implied
  * parameters.
  *
  */


  EDDSA.prototype.encodePoint = function encodePoint(point) {
    var enc = point.getY().toArray('le', this.encodingLength);
    enc[this.encodingLength - 1] |= point.getX().isOdd() ? 0x80 : 0;
    return enc;
  };

  EDDSA.prototype.decodePoint = function decodePoint(bytes) {
    bytes = utils_1$1.parseBytes(bytes);
    var lastIx = bytes.length - 1;
    var normed = bytes.slice(0, lastIx).concat(bytes[lastIx] & ~0x80);
    var xIsOdd = (bytes[lastIx] & 0x80) !== 0;
    var y = utils_1$1.intFromLE(normed);
    return this.curve.pointFromY(y, xIsOdd);
  };

  EDDSA.prototype.encodeInt = function encodeInt(num) {
    return num.toArray('le', this.encodingLength);
  };

  EDDSA.prototype.decodeInt = function decodeInt(bytes) {
    return utils_1$1.intFromLE(bytes);
  };

  EDDSA.prototype.isPoint = function isPoint(val) {
    return val instanceof this.pointClass;
  };

  var require$$0$2 = getCjsExportFromNamespace(_package$1);

  var elliptic_1 = createCommonjsModule(function (module, exports) {

    var elliptic = exports;
    elliptic.version = require$$0$2.version;
    elliptic.utils = utils_1$1;
    elliptic.rand = brorand;
    elliptic.curve = curve_1;
    elliptic.curves = curves_1; // Protocols

    elliptic.ec = ec;
    elliptic.eddsa = eddsa;
  });

  function Reporter(options) {
    this._reporterState = {
      obj: null,
      path: [],
      options: options || {},
      errors: []
    };
  }

  var Reporter_1 = Reporter;

  Reporter.prototype.isError = function isError(obj) {
    return obj instanceof ReporterError;
  };

  Reporter.prototype.save = function save() {
    var state = this._reporterState;
    return {
      obj: state.obj,
      pathLen: state.path.length
    };
  };

  Reporter.prototype.restore = function restore(data) {
    var state = this._reporterState;
    state.obj = data.obj;
    state.path = state.path.slice(0, data.pathLen);
  };

  Reporter.prototype.enterKey = function enterKey(key) {
    return this._reporterState.path.push(key);
  };

  Reporter.prototype.exitKey = function exitKey(index) {
    var state = this._reporterState;
    state.path = state.path.slice(0, index - 1);
  };

  Reporter.prototype.leaveKey = function leaveKey(index, key, value) {
    var state = this._reporterState;
    this.exitKey(index);
    if (state.obj !== null) state.obj[key] = value;
  };

  Reporter.prototype.path = function path() {
    return this._reporterState.path.join('/');
  };

  Reporter.prototype.enterObject = function enterObject() {
    var state = this._reporterState;
    var prev = state.obj;
    state.obj = {};
    return prev;
  };

  Reporter.prototype.leaveObject = function leaveObject(prev) {
    var state = this._reporterState;
    var now = state.obj;
    state.obj = prev;
    return now;
  };

  Reporter.prototype.error = function error(msg) {
    var err;
    var state = this._reporterState;
    var inherited = msg instanceof ReporterError;

    if (inherited) {
      err = msg;
    } else {
      err = new ReporterError(state.path.map(function (elem) {
        return '[' + JSON.stringify(elem) + ']';
      }).join(''), msg.message || msg, msg.stack);
    }

    if (!state.options.partial) throw err;
    if (!inherited) state.errors.push(err);
    return err;
  };

  Reporter.prototype.wrapResult = function wrapResult(result) {
    var state = this._reporterState;
    if (!state.options.partial) return result;
    return {
      result: this.isError(result) ? null : result,
      errors: state.errors
    };
  };

  function ReporterError(path, msg) {
    this.path = path;
    this.rethrow(msg);
  }

  inherits_browser(ReporterError, Error);

  ReporterError.prototype.rethrow = function rethrow(msg) {
    this.message = msg + ' at: ' + (this.path || '(shallow)');
    if (Error.captureStackTrace) Error.captureStackTrace(this, ReporterError);

    if (!this.stack) {
      try {
        // IE only adds stack when thrown
        throw new Error(this.message);
      } catch (e) {
        this.stack = e.stack;
      }
    }

    return this;
  };

  var reporter = {
    Reporter: Reporter_1
  };

  var Reporter$1 = reporter.Reporter;
  var Buffer$s = bufferEs6.Buffer;

  function DecoderBuffer(base, options) {
    Reporter$1.call(this, options);

    if (!Buffer$s.isBuffer(base)) {
      this.error('Input not Buffer');
      return;
    }

    this.base = base;
    this.offset = 0;
    this.length = base.length;
  }

  inherits_browser(DecoderBuffer, Reporter$1);
  var DecoderBuffer_1 = DecoderBuffer;

  DecoderBuffer.isDecoderBuffer = function isDecoderBuffer(data) {
    if (data instanceof DecoderBuffer) {
      return true;
    } // Or accept compatible API


    var isCompatible = _typeof(data) === 'object' && Buffer$s.isBuffer(data.base) && data.constructor.name === 'DecoderBuffer' && typeof data.offset === 'number' && typeof data.length === 'number' && typeof data.save === 'function' && typeof data.restore === 'function' && typeof data.isEmpty === 'function' && typeof data.readUInt8 === 'function' && typeof data.skip === 'function' && typeof data.raw === 'function';
    return isCompatible;
  };

  DecoderBuffer.prototype.save = function save() {
    return {
      offset: this.offset,
      reporter: Reporter$1.prototype.save.call(this)
    };
  };

  DecoderBuffer.prototype.restore = function restore(save) {
    // Return skipped data
    var res = new DecoderBuffer(this.base);
    res.offset = save.offset;
    res.length = this.offset;
    this.offset = save.offset;
    Reporter$1.prototype.restore.call(this, save.reporter);
    return res;
  };

  DecoderBuffer.prototype.isEmpty = function isEmpty() {
    return this.offset === this.length;
  };

  DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
    if (this.offset + 1 <= this.length) return this.base.readUInt8(this.offset++, true);else return this.error(fail || 'DecoderBuffer overrun');
  };

  DecoderBuffer.prototype.skip = function skip(bytes, fail) {
    if (!(this.offset + bytes <= this.length)) return this.error(fail || 'DecoderBuffer overrun');
    var res = new DecoderBuffer(this.base); // Share reporter state

    res._reporterState = this._reporterState;
    res.offset = this.offset;
    res.length = this.offset + bytes;
    this.offset += bytes;
    return res;
  };

  DecoderBuffer.prototype.raw = function raw(save) {
    return this.base.slice(save ? save.offset : this.offset, this.length);
  };

  function EncoderBuffer(value, reporter) {
    if (Array.isArray(value)) {
      this.length = 0;
      this.value = value.map(function (item) {
        if (!EncoderBuffer.isEncoderBuffer(item)) item = new EncoderBuffer(item, reporter);
        this.length += item.length;
        return item;
      }, this);
    } else if (typeof value === 'number') {
      if (!(0 <= value && value <= 0xff)) return reporter.error('non-byte EncoderBuffer value');
      this.value = value;
      this.length = 1;
    } else if (typeof value === 'string') {
      this.value = value;
      this.length = Buffer$s.byteLength(value);
    } else if (Buffer$s.isBuffer(value)) {
      this.value = value;
      this.length = value.length;
    } else {
      return reporter.error('Unsupported type: ' + _typeof(value));
    }
  }

  var EncoderBuffer_1 = EncoderBuffer;

  EncoderBuffer.isEncoderBuffer = function isEncoderBuffer(data) {
    if (data instanceof EncoderBuffer) {
      return true;
    } // Or accept compatible API


    var isCompatible = _typeof(data) === 'object' && data.constructor.name === 'EncoderBuffer' && typeof data.length === 'number' && typeof data.join === 'function';
    return isCompatible;
  };

  EncoderBuffer.prototype.join = function join(out, offset) {
    if (!out) out = new Buffer$s(this.length);
    if (!offset) offset = 0;
    if (this.length === 0) return out;

    if (Array.isArray(this.value)) {
      this.value.forEach(function (item) {
        item.join(out, offset);
        offset += item.length;
      });
    } else {
      if (typeof this.value === 'number') out[offset] = this.value;else if (typeof this.value === 'string') out.write(this.value, offset);else if (Buffer$s.isBuffer(this.value)) this.value.copy(out, offset);
      offset += this.length;
    }

    return out;
  };

  var buffer = {
    DecoderBuffer: DecoderBuffer_1,
    EncoderBuffer: EncoderBuffer_1
  };

  var Reporter$2 = reporter.Reporter;
  var EncoderBuffer$1 = buffer.EncoderBuffer;
  var DecoderBuffer$1 = buffer.DecoderBuffer; // Supported tags

  var tags = ['seq', 'seqof', 'set', 'setof', 'objid', 'bool', 'gentime', 'utctime', 'null_', 'enum', 'int', 'objDesc', 'bitstr', 'bmpstr', 'charstr', 'genstr', 'graphstr', 'ia5str', 'iso646str', 'numstr', 'octstr', 'printstr', 't61str', 'unistr', 'utf8str', 'videostr']; // Public methods list

  var methods = ['key', 'obj', 'use', 'optional', 'explicit', 'implicit', 'def', 'choice', 'any', 'contains'].concat(tags); // Overrided methods list

  var overrided = ['_peekTag', '_decodeTag', '_use', '_decodeStr', '_decodeObjid', '_decodeTime', '_decodeNull', '_decodeInt', '_decodeBool', '_decodeList', '_encodeComposite', '_encodeStr', '_encodeObjid', '_encodeTime', '_encodeNull', '_encodeInt', '_encodeBool'];

  function Node(enc, parent, name) {
    var state = {};
    this._baseState = state;
    state.name = name;
    state.enc = enc;
    state.parent = parent || null;
    state.children = null; // State

    state.tag = null;
    state.args = null;
    state.reverseArgs = null;
    state.choice = null;
    state.optional = false;
    state.any = false;
    state.obj = false;
    state.use = null;
    state.useDecoder = null;
    state.key = null;
    state['default'] = null;
    state.explicit = null;
    state.implicit = null;
    state.contains = null; // Should create new instance on each method

    if (!state.parent) {
      state.children = [];

      this._wrap();
    }
  }

  var node = Node;
  var stateProps = ['enc', 'parent', 'children', 'tag', 'args', 'reverseArgs', 'choice', 'optional', 'any', 'obj', 'use', 'alteredUse', 'key', 'default', 'explicit', 'implicit', 'contains'];

  Node.prototype.clone = function clone() {
    var state = this._baseState;
    var cstate = {};
    stateProps.forEach(function (prop) {
      cstate[prop] = state[prop];
    });
    var res = new this.constructor(cstate.parent);
    res._baseState = cstate;
    return res;
  };

  Node.prototype._wrap = function wrap() {
    var state = this._baseState;
    methods.forEach(function (method) {
      this[method] = function _wrappedMethod() {
        var clone = new this.constructor(this);
        state.children.push(clone);
        return clone[method].apply(clone, arguments);
      };
    }, this);
  };

  Node.prototype._init = function init(body) {
    var state = this._baseState;
    minimalisticAssert(state.parent === null);
    body.call(this); // Filter children

    state.children = state.children.filter(function (child) {
      return child._baseState.parent === this;
    }, this);
    minimalisticAssert.equal(state.children.length, 1, 'Root node can have only one child');
  };

  Node.prototype._useArgs = function useArgs(args) {
    var state = this._baseState; // Filter children and args

    var children = args.filter(function (arg) {
      return arg instanceof this.constructor;
    }, this);
    args = args.filter(function (arg) {
      return !(arg instanceof this.constructor);
    }, this);

    if (children.length !== 0) {
      minimalisticAssert(state.children === null);
      state.children = children; // Replace parent to maintain backward link

      children.forEach(function (child) {
        child._baseState.parent = this;
      }, this);
    }

    if (args.length !== 0) {
      minimalisticAssert(state.args === null);
      state.args = args;
      state.reverseArgs = args.map(function (arg) {
        if (_typeof(arg) !== 'object' || arg.constructor !== Object) return arg;
        var res = {};
        Object.keys(arg).forEach(function (key) {
          if (key == (key | 0)) key |= 0;
          var value = arg[key];
          res[value] = key;
        });
        return res;
      });
    }
  }; //
  // Overrided methods
  //


  overrided.forEach(function (method) {
    Node.prototype[method] = function _overrided() {
      var state = this._baseState;
      throw new Error(method + ' not implemented for encoding: ' + state.enc);
    };
  }); //
  // Public methods
  //

  tags.forEach(function (tag) {
    Node.prototype[tag] = function _tagMethod() {
      var state = this._baseState;
      var args = Array.prototype.slice.call(arguments);
      minimalisticAssert(state.tag === null);
      state.tag = tag;

      this._useArgs(args);

      return this;
    };
  });

  Node.prototype.use = function use(item) {
    minimalisticAssert(item);
    var state = this._baseState;
    minimalisticAssert(state.use === null);
    state.use = item;
    return this;
  };

  Node.prototype.optional = function optional() {
    var state = this._baseState;
    state.optional = true;
    return this;
  };

  Node.prototype.def = function def(val) {
    var state = this._baseState;
    minimalisticAssert(state['default'] === null);
    state['default'] = val;
    state.optional = true;
    return this;
  };

  Node.prototype.explicit = function explicit(num) {
    var state = this._baseState;
    minimalisticAssert(state.explicit === null && state.implicit === null);
    state.explicit = num;
    return this;
  };

  Node.prototype.implicit = function implicit(num) {
    var state = this._baseState;
    minimalisticAssert(state.explicit === null && state.implicit === null);
    state.implicit = num;
    return this;
  };

  Node.prototype.obj = function obj() {
    var state = this._baseState;
    var args = Array.prototype.slice.call(arguments);
    state.obj = true;
    if (args.length !== 0) this._useArgs(args);
    return this;
  };

  Node.prototype.key = function key(newKey) {
    var state = this._baseState;
    minimalisticAssert(state.key === null);
    state.key = newKey;
    return this;
  };

  Node.prototype.any = function any() {
    var state = this._baseState;
    state.any = true;
    return this;
  };

  Node.prototype.choice = function choice(obj) {
    var state = this._baseState;
    minimalisticAssert(state.choice === null);
    state.choice = obj;

    this._useArgs(Object.keys(obj).map(function (key) {
      return obj[key];
    }));

    return this;
  };

  Node.prototype.contains = function contains(item) {
    var state = this._baseState;
    minimalisticAssert(state.use === null);
    state.contains = item;
    return this;
  }; //
  // Decoding
  //


  Node.prototype._decode = function decode(input, options) {
    var state = this._baseState; // Decode root node

    if (state.parent === null) return input.wrapResult(state.children[0]._decode(input, options));
    var result = state['default'];
    var present = true;
    var prevKey = null;
    if (state.key !== null) prevKey = input.enterKey(state.key); // Check if tag is there

    if (state.optional) {
      var tag = null;
      if (state.explicit !== null) tag = state.explicit;else if (state.implicit !== null) tag = state.implicit;else if (state.tag !== null) tag = state.tag;

      if (tag === null && !state.any) {
        // Trial and Error
        var save = input.save();

        try {
          if (state.choice === null) this._decodeGeneric(state.tag, input, options);else this._decodeChoice(input, options);
          present = true;
        } catch (e) {
          present = false;
        }

        input.restore(save);
      } else {
        present = this._peekTag(input, tag, state.any);
        if (input.isError(present)) return present;
      }
    } // Push object on stack


    var prevObj;
    if (state.obj && present) prevObj = input.enterObject();

    if (present) {
      // Unwrap explicit values
      if (state.explicit !== null) {
        var explicit = this._decodeTag(input, state.explicit);

        if (input.isError(explicit)) return explicit;
        input = explicit;
      }

      var start = input.offset; // Unwrap implicit and normal values

      if (state.use === null && state.choice === null) {
        var _save;

        if (state.any) _save = input.save();

        var body = this._decodeTag(input, state.implicit !== null ? state.implicit : state.tag, state.any);

        if (input.isError(body)) return body;
        if (state.any) result = input.raw(_save);else input = body;
      }

      if (options && options.track && state.tag !== null) options.track(input.path(), start, input.length, 'tagged');
      if (options && options.track && state.tag !== null) options.track(input.path(), input.offset, input.length, 'content'); // Select proper method for tag

      if (state.any) ; else if (state.choice === null) {
        result = this._decodeGeneric(state.tag, input, options);
      } else {
        result = this._decodeChoice(input, options);
      }

      if (input.isError(result)) return result; // Decode children

      if (!state.any && state.choice === null && state.children !== null) {
        state.children.forEach(function decodeChildren(child) {
          // NOTE: We are ignoring errors here, to let parser continue with other
          // parts of encoded data
          child._decode(input, options);
        });
      } // Decode contained/encoded by schema, only in bit or octet strings


      if (state.contains && (state.tag === 'octstr' || state.tag === 'bitstr')) {
        var data = new DecoderBuffer$1(result);
        result = this._getUse(state.contains, input._reporterState.obj)._decode(data, options);
      }
    } // Pop object


    if (state.obj && present) result = input.leaveObject(prevObj); // Set key

    if (state.key !== null && (result !== null || present === true)) input.leaveKey(prevKey, state.key, result);else if (prevKey !== null) input.exitKey(prevKey);
    return result;
  };

  Node.prototype._decodeGeneric = function decodeGeneric(tag, input, options) {
    var state = this._baseState;
    if (tag === 'seq' || tag === 'set') return null;
    if (tag === 'seqof' || tag === 'setof') return this._decodeList(input, tag, state.args[0], options);else if (/str$/.test(tag)) return this._decodeStr(input, tag, options);else if (tag === 'objid' && state.args) return this._decodeObjid(input, state.args[0], state.args[1], options);else if (tag === 'objid') return this._decodeObjid(input, null, null, options);else if (tag === 'gentime' || tag === 'utctime') return this._decodeTime(input, tag, options);else if (tag === 'null_') return this._decodeNull(input, options);else if (tag === 'bool') return this._decodeBool(input, options);else if (tag === 'objDesc') return this._decodeStr(input, tag, options);else if (tag === 'int' || tag === 'enum') return this._decodeInt(input, state.args && state.args[0], options);

    if (state.use !== null) {
      return this._getUse(state.use, input._reporterState.obj)._decode(input, options);
    } else {
      return input.error('unknown tag: ' + tag);
    }
  };

  Node.prototype._getUse = function _getUse(entity, obj) {
    var state = this._baseState; // Create altered use decoder if implicit is set

    state.useDecoder = this._use(entity, obj);
    minimalisticAssert(state.useDecoder._baseState.parent === null);
    state.useDecoder = state.useDecoder._baseState.children[0];

    if (state.implicit !== state.useDecoder._baseState.implicit) {
      state.useDecoder = state.useDecoder.clone();
      state.useDecoder._baseState.implicit = state.implicit;
    }

    return state.useDecoder;
  };

  Node.prototype._decodeChoice = function decodeChoice(input, options) {
    var state = this._baseState;
    var result = null;
    var match = false;
    Object.keys(state.choice).some(function (key) {
      var save = input.save();
      var node = state.choice[key];

      try {
        var value = node._decode(input, options);

        if (input.isError(value)) return false;
        result = {
          type: key,
          value: value
        };
        match = true;
      } catch (e) {
        input.restore(save);
        return false;
      }

      return true;
    }, this);
    if (!match) return input.error('Choice not matched');
    return result;
  }; //
  // Encoding
  //


  Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
    return new EncoderBuffer$1(data, this.reporter);
  };

  Node.prototype._encode = function encode(data, reporter, parent) {
    var state = this._baseState;
    if (state['default'] !== null && state['default'] === data) return;

    var result = this._encodeValue(data, reporter, parent);

    if (result === undefined) return;
    if (this._skipDefault(result, reporter, parent)) return;
    return result;
  };

  Node.prototype._encodeValue = function encode(data, reporter, parent) {
    var state = this._baseState; // Decode root node

    if (state.parent === null) return state.children[0]._encode(data, reporter || new Reporter$2());
    var result = null; // Set reporter to share it with a child class

    this.reporter = reporter; // Check if data is there

    if (state.optional && data === undefined) {
      if (state['default'] !== null) data = state['default'];else return;
    } // Encode children first


    var content = null;
    var primitive = false;

    if (state.any) {
      // Anything that was given is translated to buffer
      result = this._createEncoderBuffer(data);
    } else if (state.choice) {
      result = this._encodeChoice(data, reporter);
    } else if (state.contains) {
      content = this._getUse(state.contains, parent)._encode(data, reporter);
      primitive = true;
    } else if (state.children) {
      content = state.children.map(function (child) {
        if (child._baseState.tag === 'null_') return child._encode(null, reporter, data);
        if (child._baseState.key === null) return reporter.error('Child should have a key');
        var prevKey = reporter.enterKey(child._baseState.key);
        if (_typeof(data) !== 'object') return reporter.error('Child expected, but input is not object');

        var res = child._encode(data[child._baseState.key], reporter, data);

        reporter.leaveKey(prevKey);
        return res;
      }, this).filter(function (child) {
        return child;
      });
      content = this._createEncoderBuffer(content);
    } else {
      if (state.tag === 'seqof' || state.tag === 'setof') {
        // TODO(indutny): this should be thrown on DSL level
        if (!(state.args && state.args.length === 1)) return reporter.error('Too many args for : ' + state.tag);
        if (!Array.isArray(data)) return reporter.error('seqof/setof, but data is not Array');
        var child = this.clone();
        child._baseState.implicit = null;
        content = this._createEncoderBuffer(data.map(function (item) {
          var state = this._baseState;
          return this._getUse(state.args[0], data)._encode(item, reporter);
        }, child));
      } else if (state.use !== null) {
        result = this._getUse(state.use, parent)._encode(data, reporter);
      } else {
        content = this._encodePrimitive(state.tag, data);
        primitive = true;
      }
    } // Encode data itself


    if (!state.any && state.choice === null) {
      var tag = state.implicit !== null ? state.implicit : state.tag;
      var cls = state.implicit === null ? 'universal' : 'context';

      if (tag === null) {
        if (state.use === null) reporter.error('Tag could be omitted only for .use()');
      } else {
        if (state.use === null) result = this._encodeComposite(tag, primitive, cls, content);
      }
    } // Wrap in explicit


    if (state.explicit !== null) result = this._encodeComposite(state.explicit, false, 'context', result);
    return result;
  };

  Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
    var state = this._baseState;
    var node = state.choice[data.type];

    if (!node) {
      minimalisticAssert(false, data.type + ' not found in ' + JSON.stringify(Object.keys(state.choice)));
    }

    return node._encode(data.value, reporter);
  };

  Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
    var state = this._baseState;
    if (/str$/.test(tag)) return this._encodeStr(data, tag);else if (tag === 'objid' && state.args) return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);else if (tag === 'objid') return this._encodeObjid(data, null, null);else if (tag === 'gentime' || tag === 'utctime') return this._encodeTime(data, tag);else if (tag === 'null_') return this._encodeNull();else if (tag === 'int' || tag === 'enum') return this._encodeInt(data, state.args && state.reverseArgs[0]);else if (tag === 'bool') return this._encodeBool(data);else if (tag === 'objDesc') return this._encodeStr(data, tag);else throw new Error('Unsupported tag: ' + tag);
  };

  Node.prototype._isNumstr = function isNumstr(str) {
    return /^[0-9 ]*$/.test(str);
  };

  Node.prototype._isPrintstr = function isPrintstr(str) {
    return /^[A-Za-z0-9 '()+,-./:=?]*$/.test(str);
  };

  var der = createCommonjsModule(function (module, exports) {

    function reverse(map) {
      var res = {};
      Object.keys(map).forEach(function (key) {
        // Convert key to integer if it is stringified
        if ((key | 0) == key) key = key | 0;
        var value = map[key];
        res[value] = key;
      });
      return res;
    }

    exports.tagClass = {
      0: 'universal',
      1: 'application',
      2: 'context',
      3: 'private'
    };
    exports.tagClassByName = reverse(exports.tagClass);
    exports.tag = {
      0x00: 'end',
      0x01: 'bool',
      0x02: 'int',
      0x03: 'bitstr',
      0x04: 'octstr',
      0x05: 'null_',
      0x06: 'objid',
      0x07: 'objDesc',
      0x08: 'external',
      0x09: 'real',
      0x0a: 'enum',
      0x0b: 'embed',
      0x0c: 'utf8str',
      0x0d: 'relativeOid',
      0x10: 'seq',
      0x11: 'set',
      0x12: 'numstr',
      0x13: 'printstr',
      0x14: 't61str',
      0x15: 'videostr',
      0x16: 'ia5str',
      0x17: 'utctime',
      0x18: 'gentime',
      0x19: 'graphstr',
      0x1a: 'iso646str',
      0x1b: 'genstr',
      0x1c: 'unistr',
      0x1d: 'charstr',
      0x1e: 'bmpstr'
    };
    exports.tagByName = reverse(exports.tag);
  });
  var der_1 = der.tagClass;
  var der_2 = der.tagClassByName;
  var der_3 = der.tag;
  var der_4 = der.tagByName;

  var Buffer$t = bufferEs6.Buffer; // Import DER constants

  function DEREncoder(entity) {
    this.enc = 'der';
    this.name = entity.name;
    this.entity = entity; // Construct base tree

    this.tree = new DERNode();

    this.tree._init(entity.body);
  }

  var der_1$1 = DEREncoder;

  DEREncoder.prototype.encode = function encode(data, reporter) {
    return this.tree._encode(data, reporter).join();
  }; // Tree methods


  function DERNode(parent) {
    node.call(this, 'der', parent);
  }

  inherits_browser(DERNode, node);

  DERNode.prototype._encodeComposite = function encodeComposite(tag, primitive, cls, content) {
    var encodedTag = encodeTag(tag, primitive, cls, this.reporter); // Short form

    if (content.length < 0x80) {
      var _header = new Buffer$t(2);

      _header[0] = encodedTag;
      _header[1] = content.length;
      return this._createEncoderBuffer([_header, content]);
    } // Long form
    // Count octets required to store length


    var lenOctets = 1;

    for (var i = content.length; i >= 0x100; i >>= 8) {
      lenOctets++;
    }

    var header = new Buffer$t(1 + 1 + lenOctets);
    header[0] = encodedTag;
    header[1] = 0x80 | lenOctets;

    for (var _i = 1 + lenOctets, j = content.length; j > 0; _i--, j >>= 8) {
      header[_i] = j & 0xff;
    }

    return this._createEncoderBuffer([header, content]);
  };

  DERNode.prototype._encodeStr = function encodeStr(str, tag) {
    if (tag === 'bitstr') {
      return this._createEncoderBuffer([str.unused | 0, str.data]);
    } else if (tag === 'bmpstr') {
      var buf = new Buffer$t(str.length * 2);

      for (var i = 0; i < str.length; i++) {
        buf.writeUInt16BE(str.charCodeAt(i), i * 2);
      }

      return this._createEncoderBuffer(buf);
    } else if (tag === 'numstr') {
      if (!this._isNumstr(str)) {
        return this.reporter.error('Encoding of string type: numstr supports ' + 'only digits and space');
      }

      return this._createEncoderBuffer(str);
    } else if (tag === 'printstr') {
      if (!this._isPrintstr(str)) {
        return this.reporter.error('Encoding of string type: printstr supports ' + 'only latin upper and lower case letters, ' + 'digits, space, apostrophe, left and rigth ' + 'parenthesis, plus sign, comma, hyphen, ' + 'dot, slash, colon, equal sign, ' + 'question mark');
      }

      return this._createEncoderBuffer(str);
    } else if (/str$/.test(tag)) {
      return this._createEncoderBuffer(str);
    } else if (tag === 'objDesc') {
      return this._createEncoderBuffer(str);
    } else {
      return this.reporter.error('Encoding of string type: ' + tag + ' unsupported');
    }
  };

  DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
    if (typeof id === 'string') {
      if (!values) return this.reporter.error('string objid given, but no values map found');
      if (!values.hasOwnProperty(id)) return this.reporter.error('objid not found in values map');
      id = values[id].split(/[\s.]+/g);

      for (var i = 0; i < id.length; i++) {
        id[i] |= 0;
      }
    } else if (Array.isArray(id)) {
      id = id.slice();

      for (var _i2 = 0; _i2 < id.length; _i2++) {
        id[_i2] |= 0;
      }
    }

    if (!Array.isArray(id)) {
      return this.reporter.error('objid() should be either array or string, ' + 'got: ' + JSON.stringify(id));
    }

    if (!relative) {
      if (id[1] >= 40) return this.reporter.error('Second objid identifier OOB');
      id.splice(0, 2, id[0] * 40 + id[1]);
    } // Count number of octets


    var size = 0;

    for (var _i3 = 0; _i3 < id.length; _i3++) {
      var ident = id[_i3];

      for (size++; ident >= 0x80; ident >>= 7) {
        size++;
      }
    }

    var objid = new Buffer$t(size);
    var offset = objid.length - 1;

    for (var _i4 = id.length - 1; _i4 >= 0; _i4--) {
      var _ident = id[_i4];
      objid[offset--] = _ident & 0x7f;

      while ((_ident >>= 7) > 0) {
        objid[offset--] = 0x80 | _ident & 0x7f;
      }
    }

    return this._createEncoderBuffer(objid);
  };

  function two(num) {
    if (num < 10) return '0' + num;else return num;
  }

  DERNode.prototype._encodeTime = function encodeTime(time, tag) {
    var str;
    var date = new Date(time);

    if (tag === 'gentime') {
      str = [two(date.getUTCFullYear()), two(date.getUTCMonth() + 1), two(date.getUTCDate()), two(date.getUTCHours()), two(date.getUTCMinutes()), two(date.getUTCSeconds()), 'Z'].join('');
    } else if (tag === 'utctime') {
      str = [two(date.getUTCFullYear() % 100), two(date.getUTCMonth() + 1), two(date.getUTCDate()), two(date.getUTCHours()), two(date.getUTCMinutes()), two(date.getUTCSeconds()), 'Z'].join('');
    } else {
      this.reporter.error('Encoding ' + tag + ' time is not supported yet');
    }

    return this._encodeStr(str, 'octstr');
  };

  DERNode.prototype._encodeNull = function encodeNull() {
    return this._createEncoderBuffer('');
  };

  DERNode.prototype._encodeInt = function encodeInt(num, values) {
    if (typeof num === 'string') {
      if (!values) return this.reporter.error('String int or enum given, but no values map');

      if (!values.hasOwnProperty(num)) {
        return this.reporter.error('Values map doesn\'t contain: ' + JSON.stringify(num));
      }

      num = values[num];
    } // Bignum, assume big endian


    if (typeof num !== 'number' && !Buffer$t.isBuffer(num)) {
      var numArray = num.toArray();

      if (!num.sign && numArray[0] & 0x80) {
        numArray.unshift(0);
      }

      num = new Buffer$t(numArray);
    }

    if (Buffer$t.isBuffer(num)) {
      var _size = num.length;
      if (num.length === 0) _size++;

      var _out = new Buffer$t(_size);

      num.copy(_out);
      if (num.length === 0) _out[0] = 0;
      return this._createEncoderBuffer(_out);
    }

    if (num < 0x80) return this._createEncoderBuffer(num);
    if (num < 0x100) return this._createEncoderBuffer([0, num]);
    var size = 1;

    for (var i = num; i >= 0x100; i >>= 8) {
      size++;
    }

    var out = new Array(size);

    for (var _i5 = out.length - 1; _i5 >= 0; _i5--) {
      out[_i5] = num & 0xff;
      num >>= 8;
    }

    if (out[0] & 0x80) {
      out.unshift(0);
    }

    return this._createEncoderBuffer(new Buffer$t(out));
  };

  DERNode.prototype._encodeBool = function encodeBool(value) {
    return this._createEncoderBuffer(value ? 0xff : 0);
  };

  DERNode.prototype._use = function use(entity, obj) {
    if (typeof entity === 'function') entity = entity(obj);
    return entity._getEncoder('der').tree;
  };

  DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
    var state = this._baseState;
    var i;
    if (state['default'] === null) return false;
    var data = dataBuffer.join();
    if (state.defaultBuffer === undefined) state.defaultBuffer = this._encodeValue(state['default'], reporter, parent).join();
    if (data.length !== state.defaultBuffer.length) return false;

    for (i = 0; i < data.length; i++) {
      if (data[i] !== state.defaultBuffer[i]) return false;
    }

    return true;
  }; // Utility methods


  function encodeTag(tag, primitive, cls, reporter) {
    var res;
    if (tag === 'seqof') tag = 'seq';else if (tag === 'setof') tag = 'set';
    if (der.tagByName.hasOwnProperty(tag)) res = der.tagByName[tag];else if (typeof tag === 'number' && (tag | 0) === tag) res = tag;else return reporter.error('Unknown tag: ' + tag);
    if (res >= 0x1f) return reporter.error('Multi-octet tag encoding unsupported');
    if (!primitive) res |= 0x20;
    res |= der.tagClassByName[cls || 'universal'] << 6;
    return res;
  }

  function PEMEncoder(entity) {
    der_1$1.call(this, entity);
    this.enc = 'pem';
  }

  inherits_browser(PEMEncoder, der_1$1);
  var pem = PEMEncoder;

  PEMEncoder.prototype.encode = function encode(data, options) {
    var buf = der_1$1.prototype.encode.call(this, data);
    var p = buf.toString('base64');
    var out = ['-----BEGIN ' + options.label + '-----'];

    for (var i = 0; i < p.length; i += 64) {
      out.push(p.slice(i, i + 64));
    }

    out.push('-----END ' + options.label + '-----');
    return out.join('\n');
  };

  var encoders_1 = createCommonjsModule(function (module, exports) {

    var encoders = exports;
    encoders.der = der_1$1;
    encoders.pem = pem;
  });

  var DecoderBuffer$2 = buffer.DecoderBuffer; // Import DER constants

  function DERDecoder(entity) {
    this.enc = 'der';
    this.name = entity.name;
    this.entity = entity; // Construct base tree

    this.tree = new DERNode$1();

    this.tree._init(entity.body);
  }

  var der_1$2 = DERDecoder;

  DERDecoder.prototype.decode = function decode(data, options) {
    if (!DecoderBuffer$2.isDecoderBuffer(data)) {
      data = new DecoderBuffer$2(data, options);
    }

    return this.tree._decode(data, options);
  }; // Tree methods


  function DERNode$1(parent) {
    node.call(this, 'der', parent);
  }

  inherits_browser(DERNode$1, node);

  DERNode$1.prototype._peekTag = function peekTag(buffer, tag, any) {
    if (buffer.isEmpty()) return false;
    var state = buffer.save();
    var decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
    if (buffer.isError(decodedTag)) return decodedTag;
    buffer.restore(state);
    return decodedTag.tag === tag || decodedTag.tagStr === tag || decodedTag.tagStr + 'of' === tag || any;
  };

  DERNode$1.prototype._decodeTag = function decodeTag(buffer, tag, any) {
    var decodedTag = derDecodeTag(buffer, 'Failed to decode tag of "' + tag + '"');
    if (buffer.isError(decodedTag)) return decodedTag;
    var len = derDecodeLen(buffer, decodedTag.primitive, 'Failed to get length of "' + tag + '"'); // Failure

    if (buffer.isError(len)) return len;

    if (!any && decodedTag.tag !== tag && decodedTag.tagStr !== tag && decodedTag.tagStr + 'of' !== tag) {
      return buffer.error('Failed to match tag: "' + tag + '"');
    }

    if (decodedTag.primitive || len !== null) return buffer.skip(len, 'Failed to match body of: "' + tag + '"'); // Indefinite length... find END tag

    var state = buffer.save();

    var res = this._skipUntilEnd(buffer, 'Failed to skip indefinite length body: "' + this.tag + '"');

    if (buffer.isError(res)) return res;
    len = buffer.offset - state.offset;
    buffer.restore(state);
    return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
  };

  DERNode$1.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
    for (;;) {
      var tag = derDecodeTag(buffer, fail);
      if (buffer.isError(tag)) return tag;
      var len = derDecodeLen(buffer, tag.primitive, fail);
      if (buffer.isError(len)) return len;
      var res = void 0;
      if (tag.primitive || len !== null) res = buffer.skip(len);else res = this._skipUntilEnd(buffer, fail); // Failure

      if (buffer.isError(res)) return res;
      if (tag.tagStr === 'end') break;
    }
  };

  DERNode$1.prototype._decodeList = function decodeList(buffer, tag, decoder, options) {
    var result = [];

    while (!buffer.isEmpty()) {
      var possibleEnd = this._peekTag(buffer, 'end');

      if (buffer.isError(possibleEnd)) return possibleEnd;
      var res = decoder.decode(buffer, 'der', options);
      if (buffer.isError(res) && possibleEnd) break;
      result.push(res);
    }

    return result;
  };

  DERNode$1.prototype._decodeStr = function decodeStr(buffer, tag) {
    if (tag === 'bitstr') {
      var unused = buffer.readUInt8();
      if (buffer.isError(unused)) return unused;
      return {
        unused: unused,
        data: buffer.raw()
      };
    } else if (tag === 'bmpstr') {
      var raw = buffer.raw();
      if (raw.length % 2 === 1) return buffer.error('Decoding of string type: bmpstr length mismatch');
      var str = '';

      for (var i = 0; i < raw.length / 2; i++) {
        str += String.fromCharCode(raw.readUInt16BE(i * 2));
      }

      return str;
    } else if (tag === 'numstr') {
      var numstr = buffer.raw().toString('ascii');

      if (!this._isNumstr(numstr)) {
        return buffer.error('Decoding of string type: ' + 'numstr unsupported characters');
      }

      return numstr;
    } else if (tag === 'octstr') {
      return buffer.raw();
    } else if (tag === 'objDesc') {
      return buffer.raw();
    } else if (tag === 'printstr') {
      var printstr = buffer.raw().toString('ascii');

      if (!this._isPrintstr(printstr)) {
        return buffer.error('Decoding of string type: ' + 'printstr unsupported characters');
      }

      return printstr;
    } else if (/str$/.test(tag)) {
      return buffer.raw().toString();
    } else {
      return buffer.error('Decoding of string type: ' + tag + ' unsupported');
    }
  };

  DERNode$1.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
    var result;
    var identifiers = [];
    var ident = 0;
    var subident = 0;

    while (!buffer.isEmpty()) {
      subident = buffer.readUInt8();
      ident <<= 7;
      ident |= subident & 0x7f;

      if ((subident & 0x80) === 0) {
        identifiers.push(ident);
        ident = 0;
      }
    }

    if (subident & 0x80) identifiers.push(ident);
    var first = identifiers[0] / 40 | 0;
    var second = identifiers[0] % 40;
    if (relative) result = identifiers;else result = [first, second].concat(identifiers.slice(1));

    if (values) {
      var tmp = values[result.join(' ')];
      if (tmp === undefined) tmp = values[result.join('.')];
      if (tmp !== undefined) result = tmp;
    }

    return result;
  };

  DERNode$1.prototype._decodeTime = function decodeTime(buffer, tag) {
    var str = buffer.raw().toString();
    var year;
    var mon;
    var day;
    var hour;
    var min;
    var sec;

    if (tag === 'gentime') {
      year = str.slice(0, 4) | 0;
      mon = str.slice(4, 6) | 0;
      day = str.slice(6, 8) | 0;
      hour = str.slice(8, 10) | 0;
      min = str.slice(10, 12) | 0;
      sec = str.slice(12, 14) | 0;
    } else if (tag === 'utctime') {
      year = str.slice(0, 2) | 0;
      mon = str.slice(2, 4) | 0;
      day = str.slice(4, 6) | 0;
      hour = str.slice(6, 8) | 0;
      min = str.slice(8, 10) | 0;
      sec = str.slice(10, 12) | 0;
      if (year < 70) year = 2000 + year;else year = 1900 + year;
    } else {
      return buffer.error('Decoding ' + tag + ' time is not supported yet');
    }

    return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
  };

  DERNode$1.prototype._decodeNull = function decodeNull() {
    return null;
  };

  DERNode$1.prototype._decodeBool = function decodeBool(buffer) {
    var res = buffer.readUInt8();
    if (buffer.isError(res)) return res;else return res !== 0;
  };

  DERNode$1.prototype._decodeInt = function decodeInt(buffer, values) {
    // Bigint, return as it is (assume big endian)
    var raw = buffer.raw();
    var res = new bn(raw);
    if (values) res = values[res.toString(10)] || res;
    return res;
  };

  DERNode$1.prototype._use = function use(entity, obj) {
    if (typeof entity === 'function') entity = entity(obj);
    return entity._getDecoder('der').tree;
  }; // Utility methods


  function derDecodeTag(buf, fail) {
    var tag = buf.readUInt8(fail);
    if (buf.isError(tag)) return tag;
    var cls = der.tagClass[tag >> 6];
    var primitive = (tag & 0x20) === 0; // Multi-octet tag - load

    if ((tag & 0x1f) === 0x1f) {
      var oct = tag;
      tag = 0;

      while ((oct & 0x80) === 0x80) {
        oct = buf.readUInt8(fail);
        if (buf.isError(oct)) return oct;
        tag <<= 7;
        tag |= oct & 0x7f;
      }
    } else {
      tag &= 0x1f;
    }

    var tagStr = der.tag[tag];
    return {
      cls: cls,
      primitive: primitive,
      tag: tag,
      tagStr: tagStr
    };
  }

  function derDecodeLen(buf, primitive, fail) {
    var len = buf.readUInt8(fail);
    if (buf.isError(len)) return len; // Indefinite form

    if (!primitive && len === 0x80) return null; // Definite form

    if ((len & 0x80) === 0) {
      // Short form
      return len;
    } // Long form


    var num = len & 0x7f;
    if (num > 4) return buf.error('length octect is too long');
    len = 0;

    for (var i = 0; i < num; i++) {
      len <<= 8;
      var j = buf.readUInt8(fail);
      if (buf.isError(j)) return j;
      len |= j;
    }

    return len;
  }

  var Buffer$u = bufferEs6.Buffer;

  function PEMDecoder(entity) {
    der_1$2.call(this, entity);
    this.enc = 'pem';
  }

  inherits_browser(PEMDecoder, der_1$2);
  var pem$1 = PEMDecoder;

  PEMDecoder.prototype.decode = function decode(data, options) {
    var lines = data.toString().split(/[\r\n]+/g);
    var label = options.label.toUpperCase();
    var re = /^-----(BEGIN|END) ([^-]+)-----$/;
    var start = -1;
    var end = -1;

    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(re);
      if (match === null) continue;
      if (match[2] !== label) continue;

      if (start === -1) {
        if (match[1] !== 'BEGIN') break;
        start = i;
      } else {
        if (match[1] !== 'END') break;
        end = i;
        break;
      }
    }

    if (start === -1 || end === -1) throw new Error('PEM section not found for: ' + label);
    var base64 = lines.slice(start + 1, end).join(''); // Remove excessive symbols

    base64.replace(/[^a-z0-9+/=]+/gi, '');
    var input = new Buffer$u(base64, 'base64');
    return der_1$2.prototype.decode.call(this, input, options);
  };

  var decoders_1 = createCommonjsModule(function (module, exports) {

    var decoders = exports;
    decoders.der = der_1$2;
    decoders.pem = pem$1;
  });

  var api_1 = createCommonjsModule(function (module, exports) {

    var api = exports;

    api.define = function define(name, body) {
      return new Entity(name, body);
    };

    function Entity(name, body) {
      this.name = name;
      this.body = body;
      this.decoders = {};
      this.encoders = {};
    }

    Entity.prototype._createNamed = function createNamed(Base) {
      var name = this.name;

      function Generated(entity) {
        this._initNamed(entity, name);
      }

      inherits_browser(Generated, Base);

      Generated.prototype._initNamed = function _initNamed(entity, name) {
        Base.call(this, entity, name);
      };

      return new Generated(this);
    };

    Entity.prototype._getDecoder = function _getDecoder(enc) {
      enc = enc || 'der'; // Lazily create decoder

      if (!this.decoders.hasOwnProperty(enc)) this.decoders[enc] = this._createNamed(decoders_1[enc]);
      return this.decoders[enc];
    };

    Entity.prototype.decode = function decode(data, enc, options) {
      return this._getDecoder(enc).decode(data, options);
    };

    Entity.prototype._getEncoder = function _getEncoder(enc) {
      enc = enc || 'der'; // Lazily create encoder

      if (!this.encoders.hasOwnProperty(enc)) this.encoders[enc] = this._createNamed(encoders_1[enc]);
      return this.encoders[enc];
    };

    Entity.prototype.encode = function encode(data, enc,
    /* internal */
    reporter) {
      return this._getEncoder(enc).encode(data, reporter);
    };
  });

  var base_1 = createCommonjsModule(function (module, exports) {

    var base = exports;
    base.Reporter = reporter.Reporter;
    base.DecoderBuffer = buffer.DecoderBuffer;
    base.EncoderBuffer = buffer.EncoderBuffer;
    base.Node = node;
  });

  var constants_1 = createCommonjsModule(function (module, exports) {

    var constants = exports; // Helper

    constants._reverse = function reverse(map) {
      var res = {};
      Object.keys(map).forEach(function (key) {
        // Convert key to integer if it is stringified
        if ((key | 0) == key) key = key | 0;
        var value = map[key];
        res[value] = key;
      });
      return res;
    };

    constants.der = der;
  });

  var asn1_1 = createCommonjsModule(function (module, exports) {

    var asn1 = exports;
    asn1.bignum = bn;
    asn1.define = api_1.define;
    asn1.base = base_1;
    asn1.constants = constants_1;
    asn1.decoders = decoders_1;
    asn1.encoders = encoders_1;
  });

  var Time = asn1_1.define('Time', function () {
    this.choice({
      utcTime: this.utctime(),
      generalTime: this.gentime()
    });
  });
  var AttributeTypeValue = asn1_1.define('AttributeTypeValue', function () {
    this.seq().obj(this.key('type').objid(), this.key('value').any());
  });
  var AlgorithmIdentifier = asn1_1.define('AlgorithmIdentifier', function () {
    this.seq().obj(this.key('algorithm').objid(), this.key('parameters').optional(), this.key('curve').objid().optional());
  });
  var SubjectPublicKeyInfo = asn1_1.define('SubjectPublicKeyInfo', function () {
    this.seq().obj(this.key('algorithm').use(AlgorithmIdentifier), this.key('subjectPublicKey').bitstr());
  });
  var RelativeDistinguishedName = asn1_1.define('RelativeDistinguishedName', function () {
    this.setof(AttributeTypeValue);
  });
  var RDNSequence = asn1_1.define('RDNSequence', function () {
    this.seqof(RelativeDistinguishedName);
  });
  var Name = asn1_1.define('Name', function () {
    this.choice({
      rdnSequence: this.use(RDNSequence)
    });
  });
  var Validity = asn1_1.define('Validity', function () {
    this.seq().obj(this.key('notBefore').use(Time), this.key('notAfter').use(Time));
  });
  var Extension = asn1_1.define('Extension', function () {
    this.seq().obj(this.key('extnID').objid(), this.key('critical').bool().def(false), this.key('extnValue').octstr());
  });
  var TBSCertificate = asn1_1.define('TBSCertificate', function () {
    this.seq().obj(this.key('version').explicit(0)["int"]().optional(), this.key('serialNumber')["int"](), this.key('signature').use(AlgorithmIdentifier), this.key('issuer').use(Name), this.key('validity').use(Validity), this.key('subject').use(Name), this.key('subjectPublicKeyInfo').use(SubjectPublicKeyInfo), this.key('issuerUniqueID').implicit(1).bitstr().optional(), this.key('subjectUniqueID').implicit(2).bitstr().optional(), this.key('extensions').explicit(3).seqof(Extension).optional());
  });
  var X509Certificate = asn1_1.define('X509Certificate', function () {
    this.seq().obj(this.key('tbsCertificate').use(TBSCertificate), this.key('signatureAlgorithm').use(AlgorithmIdentifier), this.key('signatureValue').bitstr());
  });
  var certificate = X509Certificate;

  var certificate$1 = certificate;
  var RSAPrivateKey = asn1_1.define('RSAPrivateKey', function () {
    this.seq().obj(this.key('version')["int"](), this.key('modulus')["int"](), this.key('publicExponent')["int"](), this.key('privateExponent')["int"](), this.key('prime1')["int"](), this.key('prime2')["int"](), this.key('exponent1')["int"](), this.key('exponent2')["int"](), this.key('coefficient')["int"]());
  });
  var RSAPrivateKey_1 = RSAPrivateKey;
  var RSAPublicKey = asn1_1.define('RSAPublicKey', function () {
    this.seq().obj(this.key('modulus')["int"](), this.key('publicExponent')["int"]());
  });
  var RSAPublicKey_1 = RSAPublicKey;
  var PublicKey = asn1_1.define('SubjectPublicKeyInfo', function () {
    this.seq().obj(this.key('algorithm').use(AlgorithmIdentifier$1), this.key('subjectPublicKey').bitstr());
  });
  var PublicKey_1 = PublicKey;
  var AlgorithmIdentifier$1 = asn1_1.define('AlgorithmIdentifier', function () {
    this.seq().obj(this.key('algorithm').objid(), this.key('none').null_().optional(), this.key('curve').objid().optional(), this.key('params').seq().obj(this.key('p')["int"](), this.key('q')["int"](), this.key('g')["int"]()).optional());
  });
  var PrivateKeyInfo = asn1_1.define('PrivateKeyInfo', function () {
    this.seq().obj(this.key('version')["int"](), this.key('algorithm').use(AlgorithmIdentifier$1), this.key('subjectPrivateKey').octstr());
  });
  var PrivateKey = PrivateKeyInfo;
  var EncryptedPrivateKeyInfo = asn1_1.define('EncryptedPrivateKeyInfo', function () {
    this.seq().obj(this.key('algorithm').seq().obj(this.key('id').objid(), this.key('decrypt').seq().obj(this.key('kde').seq().obj(this.key('id').objid(), this.key('kdeparams').seq().obj(this.key('salt').octstr(), this.key('iters')["int"]())), this.key('cipher').seq().obj(this.key('algo').objid(), this.key('iv').octstr()))), this.key('subjectPrivateKey').octstr());
  });
  var EncryptedPrivateKey = EncryptedPrivateKeyInfo;
  var DSAPrivateKey = asn1_1.define('DSAPrivateKey', function () {
    this.seq().obj(this.key('version')["int"](), this.key('p')["int"](), this.key('q')["int"](), this.key('g')["int"](), this.key('pub_key')["int"](), this.key('priv_key')["int"]());
  });
  var DSAPrivateKey_1 = DSAPrivateKey;
  var DSAparam = asn1_1.define('DSAparam', function () {
    this["int"]();
  });
  var ECPrivateKey = asn1_1.define('ECPrivateKey', function () {
    this.seq().obj(this.key('version')["int"](), this.key('privateKey').octstr(), this.key('parameters').optional().explicit(0).use(ECParameters), this.key('publicKey').optional().explicit(1).bitstr());
  });
  var ECPrivateKey_1 = ECPrivateKey;
  var ECParameters = asn1_1.define('ECParameters', function () {
    this.choice({
      namedCurve: this.objid()
    });
  });
  var signature$2 = asn1_1.define('signature', function () {
    this.seq().obj(this.key('r')["int"](), this.key('s')["int"]());
  });
  var asn1_1$1 = {
    certificate: certificate$1,
    RSAPrivateKey: RSAPrivateKey_1,
    RSAPublicKey: RSAPublicKey_1,
    PublicKey: PublicKey_1,
    PrivateKey: PrivateKey,
    EncryptedPrivateKey: EncryptedPrivateKey,
    DSAPrivateKey: DSAPrivateKey_1,
    DSAparam: DSAparam,
    ECPrivateKey: ECPrivateKey_1,
    signature: signature$2
  };

  var aesid = {
  	"2.16.840.1.101.3.4.1.1": "aes-128-ecb",
  	"2.16.840.1.101.3.4.1.2": "aes-128-cbc",
  	"2.16.840.1.101.3.4.1.3": "aes-128-ofb",
  	"2.16.840.1.101.3.4.1.4": "aes-128-cfb",
  	"2.16.840.1.101.3.4.1.21": "aes-192-ecb",
  	"2.16.840.1.101.3.4.1.22": "aes-192-cbc",
  	"2.16.840.1.101.3.4.1.23": "aes-192-ofb",
  	"2.16.840.1.101.3.4.1.24": "aes-192-cfb",
  	"2.16.840.1.101.3.4.1.41": "aes-256-ecb",
  	"2.16.840.1.101.3.4.1.42": "aes-256-cbc",
  	"2.16.840.1.101.3.4.1.43": "aes-256-ofb",
  	"2.16.840.1.101.3.4.1.44": "aes-256-cfb"
  };

  var aesid$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': aesid
  });

  var findProc = /Proc-Type: 4,ENCRYPTED[\n\r]+DEK-Info: AES-((?:128)|(?:192)|(?:256))-CBC,([0-9A-H]+)[\n\r]+([0-9A-z\n\r\+\/\=]+)[\n\r]+/m;
  var startRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----/m;
  var fullRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----([0-9A-z\n\r\+\/\=]+)-----END \1-----$/m;
  var Buffer$v = safeBuffer.Buffer;

  var fixProc = function fixProc(okey, password) {
    var key = okey.toString();
    var match = key.match(findProc);
    var decrypted;

    if (!match) {
      var match2 = key.match(fullRegex);
      decrypted = new Buffer$v(match2[2].replace(/[\r\n]/g, ''), 'base64');
    } else {
      var suite = 'aes' + match[1];
      var iv = Buffer$v.from(match[2], 'hex');
      var cipherText = Buffer$v.from(match[3].replace(/[\r\n]/g, ''), 'base64');
      var cipherKey = evp_bytestokey(password, iv.slice(0, 8), parseInt(match[1], 10)).key;
      var out = [];
      var cipher = browser$5.createDecipheriv(suite, cipherKey, iv);
      out.push(cipher.update(cipherText));
      out.push(cipher["final"]());
      decrypted = Buffer$v.concat(out);
    }

    var tag = key.match(startRegex)[1];
    return {
      tag: tag,
      data: decrypted
    };
  };

  var aesid$2 = getCjsExportFromNamespace(aesid$1);

  var Buffer$w = safeBuffer.Buffer;
  var parseAsn1 = parseKeys;

  function parseKeys(buffer) {
    var password;

    if (_typeof(buffer) === 'object' && !Buffer$w.isBuffer(buffer)) {
      password = buffer.passphrase;
      buffer = buffer.key;
    }

    if (typeof buffer === 'string') {
      buffer = Buffer$w.from(buffer);
    }

    var stripped = fixProc(buffer, password);
    var type = stripped.tag;
    var data = stripped.data;
    var subtype, ndata;

    switch (type) {
      case 'CERTIFICATE':
        ndata = asn1_1$1.certificate.decode(data, 'der').tbsCertificate.subjectPublicKeyInfo;
      // falls through

      case 'PUBLIC KEY':
        if (!ndata) {
          ndata = asn1_1$1.PublicKey.decode(data, 'der');
        }

        subtype = ndata.algorithm.algorithm.join('.');

        switch (subtype) {
          case '1.2.840.113549.1.1.1':
            return asn1_1$1.RSAPublicKey.decode(ndata.subjectPublicKey.data, 'der');

          case '1.2.840.10045.2.1':
            ndata.subjectPrivateKey = ndata.subjectPublicKey;
            return {
              type: 'ec',
              data: ndata
            };

          case '1.2.840.10040.4.1':
            ndata.algorithm.params.pub_key = asn1_1$1.DSAparam.decode(ndata.subjectPublicKey.data, 'der');
            return {
              type: 'dsa',
              data: ndata.algorithm.params
            };

          default:
            throw new Error('unknown key id ' + subtype);
        }

      case 'ENCRYPTED PRIVATE KEY':
        data = asn1_1$1.EncryptedPrivateKey.decode(data, 'der');
        data = decrypt$2(data, password);
      // falls through

      case 'PRIVATE KEY':
        ndata = asn1_1$1.PrivateKey.decode(data, 'der');
        subtype = ndata.algorithm.algorithm.join('.');

        switch (subtype) {
          case '1.2.840.113549.1.1.1':
            return asn1_1$1.RSAPrivateKey.decode(ndata.subjectPrivateKey, 'der');

          case '1.2.840.10045.2.1':
            return {
              curve: ndata.algorithm.curve,
              privateKey: asn1_1$1.ECPrivateKey.decode(ndata.subjectPrivateKey, 'der').privateKey
            };

          case '1.2.840.10040.4.1':
            ndata.algorithm.params.priv_key = asn1_1$1.DSAparam.decode(ndata.subjectPrivateKey, 'der');
            return {
              type: 'dsa',
              params: ndata.algorithm.params
            };

          default:
            throw new Error('unknown key id ' + subtype);
        }

      case 'RSA PUBLIC KEY':
        return asn1_1$1.RSAPublicKey.decode(data, 'der');

      case 'RSA PRIVATE KEY':
        return asn1_1$1.RSAPrivateKey.decode(data, 'der');

      case 'DSA PRIVATE KEY':
        return {
          type: 'dsa',
          params: asn1_1$1.DSAPrivateKey.decode(data, 'der')
        };

      case 'EC PRIVATE KEY':
        data = asn1_1$1.ECPrivateKey.decode(data, 'der');
        return {
          curve: data.parameters.value,
          privateKey: data.privateKey
        };

      default:
        throw new Error('unknown key type ' + type);
    }
  }

  parseKeys.signature = asn1_1$1.signature;

  function decrypt$2(data, password) {
    var salt = data.algorithm.decrypt.kde.kdeparams.salt;
    var iters = parseInt(data.algorithm.decrypt.kde.kdeparams.iters.toString(), 10);
    var algo = aesid$2[data.algorithm.decrypt.cipher.algo.join('.')];
    var iv = data.algorithm.decrypt.cipher.iv;
    var cipherText = data.subjectPrivateKey;
    var keylen = parseInt(algo.split('-')[1], 10) / 8;
    var key = browser$2.pbkdf2Sync(password, salt, iters, keylen, 'sha1');
    var cipher = browser$5.createDecipheriv(algo, key, iv);
    var out = [];
    out.push(cipher.update(cipherText));
    out.push(cipher["final"]());
    return Buffer$w.concat(out);
  }

  var curves = {
  	"1.3.132.0.10": "secp256k1",
  	"1.3.132.0.33": "p224",
  	"1.2.840.10045.3.1.1": "p192",
  	"1.2.840.10045.3.1.7": "p256",
  	"1.3.132.0.34": "p384",
  	"1.3.132.0.35": "p521"
  };

  var curves$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': curves
  });

  var curves$2 = getCjsExportFromNamespace(curves$1);

  var EC$1 = elliptic_1.ec;

  function sign(hash, key, hashType, signType, tag) {
    var priv = parseAsn1(key);

    if (priv.curve) {
      // rsa keys can be interpreted as ecdsa ones in openssl
      if (signType !== 'ecdsa' && signType !== 'ecdsa/rsa') throw new Error('wrong private key type');
      return ecSign(hash, priv);
    } else if (priv.type === 'dsa') {
      if (signType !== 'dsa') throw new Error('wrong private key type');
      return dsaSign(hash, priv, hashType);
    } else {
      if (signType !== 'rsa' && signType !== 'ecdsa/rsa') throw new Error('wrong private key type');
    }

    hash = Buffer.concat([tag, hash]);
    var len = priv.modulus.byteLength();
    var pad = [0, 1];

    while (hash.length + pad.length + 1 < len) {
      pad.push(0xff);
    }

    pad.push(0x00);
    var i = -1;

    while (++i < hash.length) {
      pad.push(hash[i]);
    }

    var out = browserifyRsa(pad, priv);
    return out;
  }

  function ecSign(hash, priv) {
    var curveId = curves$2[priv.curve.join('.')];
    if (!curveId) throw new Error('unknown curve ' + priv.curve.join('.'));
    var curve = new EC$1(curveId);
    var key = curve.keyFromPrivate(priv.privateKey);
    var out = key.sign(hash);
    return new Buffer(out.toDER());
  }

  function dsaSign(hash, priv, algo) {
    var x = priv.params.priv_key;
    var p = priv.params.p;
    var q = priv.params.q;
    var g = priv.params.g;
    var r = new bn(0);
    var k;
    var H = bits2int(hash, q).mod(q);
    var s = false;
    var kv = getKey(x, q, hash, algo);

    while (s === false) {
      k = makeKey(q, kv, algo);
      r = makeR(g, k, p, q);
      s = k.invm(q).imul(H.add(x.mul(r))).mod(q);

      if (s.cmpn(0) === 0) {
        s = false;
        r = new bn(0);
      }
    }

    return toDER(r, s);
  }

  function toDER(r, s) {
    r = r.toArray();
    s = s.toArray(); // Pad values

    if (r[0] & 0x80) r = [0].concat(r);
    if (s[0] & 0x80) s = [0].concat(s);
    var total = r.length + s.length + 4;
    var res = [0x30, total, 0x02, r.length];
    res = res.concat(r, [0x02, s.length], s);
    return new Buffer(res);
  }

  function getKey(x, q, hash, algo) {
    x = new Buffer(x.toArray());

    if (x.length < q.byteLength()) {
      var zeros = new Buffer(q.byteLength() - x.length);
      zeros.fill(0);
      x = Buffer.concat([zeros, x]);
    }

    var hlen = hash.length;
    var hbits = bits2octets(hash, q);
    var v = new Buffer(hlen);
    v.fill(1);
    var k = new Buffer(hlen);
    k.fill(0);
    k = browser$4(algo, k).update(v).update(new Buffer([0])).update(x).update(hbits).digest();
    v = browser$4(algo, k).update(v).digest();
    k = browser$4(algo, k).update(v).update(new Buffer([1])).update(x).update(hbits).digest();
    v = browser$4(algo, k).update(v).digest();
    return {
      k: k,
      v: v
    };
  }

  function bits2int(obits, q) {
    var bits = new bn(obits);
    var shift = (obits.length << 3) - q.bitLength();
    if (shift > 0) bits.ishrn(shift);
    return bits;
  }

  function bits2octets(bits, q) {
    bits = bits2int(bits, q);
    bits = bits.mod(q);
    var out = new Buffer(bits.toArray());

    if (out.length < q.byteLength()) {
      var zeros = new Buffer(q.byteLength() - out.length);
      zeros.fill(0);
      out = Buffer.concat([zeros, out]);
    }

    return out;
  }

  function makeKey(q, kv, algo) {
    var t;
    var k;

    do {
      t = new Buffer(0);

      while (t.length * 8 < q.bitLength()) {
        kv.v = browser$4(algo, kv.k).update(kv.v).digest();
        t = Buffer.concat([t, kv.v]);
      }

      k = bits2int(t, q);
      kv.k = browser$4(algo, kv.k).update(kv.v).update(new Buffer([0])).digest();
      kv.v = browser$4(algo, kv.k).update(kv.v).digest();
    } while (k.cmp(q) !== -1);

    return k;
  }

  function makeR(g, k, p, q) {
    return g.toRed(bn.mont(p)).redPow(k).fromRed().mod(q);
  }

  var sign_1 = sign;
  var getKey_1 = getKey;
  var makeKey_1 = makeKey;
  sign_1.getKey = getKey_1;
  sign_1.makeKey = makeKey_1;

  var EC$2 = elliptic_1.ec;

  function verify(sig, hash, key, signType, tag) {
    var pub = parseAsn1(key);

    if (pub.type === 'ec') {
      // rsa keys can be interpreted as ecdsa ones in openssl
      if (signType !== 'ecdsa' && signType !== 'ecdsa/rsa') throw new Error('wrong public key type');
      return ecVerify(sig, hash, pub);
    } else if (pub.type === 'dsa') {
      if (signType !== 'dsa') throw new Error('wrong public key type');
      return dsaVerify(sig, hash, pub);
    } else {
      if (signType !== 'rsa' && signType !== 'ecdsa/rsa') throw new Error('wrong public key type');
    }

    hash = Buffer.concat([tag, hash]);
    var len = pub.modulus.byteLength();
    var pad = [1];
    var padNum = 0;

    while (hash.length + pad.length + 2 < len) {
      pad.push(0xff);
      padNum++;
    }

    pad.push(0x00);
    var i = -1;

    while (++i < hash.length) {
      pad.push(hash[i]);
    }

    pad = new Buffer(pad);
    var red = bn.mont(pub.modulus);
    sig = new bn(sig).toRed(red);
    sig = sig.redPow(new bn(pub.publicExponent));
    sig = new Buffer(sig.fromRed().toArray());
    var out = padNum < 8 ? 1 : 0;
    len = Math.min(sig.length, pad.length);
    if (sig.length !== pad.length) out = 1;
    i = -1;

    while (++i < len) {
      out |= sig[i] ^ pad[i];
    }

    return out === 0;
  }

  function ecVerify(sig, hash, pub) {
    var curveId = curves$2[pub.data.algorithm.curve.join('.')];
    if (!curveId) throw new Error('unknown curve ' + pub.data.algorithm.curve.join('.'));
    var curve = new EC$2(curveId);
    var pubkey = pub.data.subjectPrivateKey.data;
    return curve.verify(hash, sig, pubkey);
  }

  function dsaVerify(sig, hash, pub) {
    var p = pub.data.p;
    var q = pub.data.q;
    var g = pub.data.g;
    var y = pub.data.pub_key;
    var unpacked = parseAsn1.signature.decode(sig, 'der');
    var s = unpacked.s;
    var r = unpacked.r;
    checkValue(s, q);
    checkValue(r, q);
    var montp = bn.mont(p);
    var w = s.invm(q);
    var v = g.toRed(montp).redPow(new bn(hash).mul(w).mod(q)).fromRed().mul(y.toRed(montp).redPow(r.mul(w).mod(q)).fromRed()).mod(p).mod(q);
    return v.cmp(r) === 0;
  }

  function checkValue(b, q) {
    if (b.cmpn(0) <= 0) throw new Error('invalid sig');
    if (b.cmp(q) >= q) throw new Error('invalid sig');
  }

  var verify_1 = verify;

  Object.keys(algorithms$2).forEach(function (key) {
    algorithms$2[key].id = new Buffer(algorithms$2[key].id, 'hex');
    algorithms$2[key.toLowerCase()] = algorithms$2[key];
  });

  function Sign(algorithm) {
    Stream.Writable.call(this);
    var data = algorithms$2[algorithm];
    if (!data) throw new Error('Unknown message digest');
    this._hashType = data.hash;
    this._hash = browser(data.hash);
    this._tag = data.id;
    this._signType = data.sign;
  }

  inherits_browser(Sign, Stream.Writable);

  Sign.prototype._write = function _write(data, _, done) {
    this._hash.update(data);

    done();
  };

  Sign.prototype.update = function update(data, enc) {
    if (typeof data === 'string') data = new Buffer(data, enc);

    this._hash.update(data);

    return this;
  };

  Sign.prototype.sign = function signMethod(key, enc) {
    this.end();

    var hash = this._hash.digest();

    var sig = sign_1(hash, key, this._hashType, this._signType, this._tag);
    return enc ? sig.toString(enc) : sig;
  };

  function Verify(algorithm) {
    Stream.Writable.call(this);
    var data = algorithms$2[algorithm];
    if (!data) throw new Error('Unknown message digest');
    this._hash = browser(data.hash);
    this._tag = data.id;
    this._signType = data.sign;
  }

  inherits_browser(Verify, Stream.Writable);

  Verify.prototype._write = function _write(data, _, done) {
    this._hash.update(data);

    done();
  };

  Verify.prototype.update = function update(data, enc) {
    if (typeof data === 'string') data = new Buffer(data, enc);

    this._hash.update(data);

    return this;
  };

  Verify.prototype.verify = function verifyMethod(key, sig, enc) {
    if (typeof sig === 'string') sig = new Buffer(sig, enc);
    this.end();

    var hash = this._hash.digest();

    return verify_1(sig, hash, key, this._signType, this._tag);
  };

  function createSign(algorithm) {
    return new Sign(algorithm);
  }

  function createVerify(algorithm) {
    return new Verify(algorithm);
  }

  var browser$8 = {
    Sign: createSign,
    Verify: createVerify,
    createSign: createSign,
    createVerify: createVerify
  };

  var browser$9 = function createECDH(curve) {
    return new ECDH(curve);
  };

  var aliases = {
    secp256k1: {
      name: 'secp256k1',
      byteLength: 32
    },
    secp224r1: {
      name: 'p224',
      byteLength: 28
    },
    prime256v1: {
      name: 'p256',
      byteLength: 32
    },
    prime192v1: {
      name: 'p192',
      byteLength: 24
    },
    ed25519: {
      name: 'ed25519',
      byteLength: 32
    },
    secp384r1: {
      name: 'p384',
      byteLength: 48
    },
    secp521r1: {
      name: 'p521',
      byteLength: 66
    }
  };
  aliases.p224 = aliases.secp224r1;
  aliases.p256 = aliases.secp256r1 = aliases.prime256v1;
  aliases.p192 = aliases.secp192r1 = aliases.prime192v1;
  aliases.p384 = aliases.secp384r1;
  aliases.p521 = aliases.secp521r1;

  function ECDH(curve) {
    this.curveType = aliases[curve];

    if (!this.curveType) {
      this.curveType = {
        name: curve
      };
    }

    this.curve = new elliptic_1.ec(this.curveType.name); // eslint-disable-line new-cap

    this.keys = void 0;
  }

  ECDH.prototype.generateKeys = function (enc, format) {
    this.keys = this.curve.genKeyPair();
    return this.getPublicKey(enc, format);
  };

  ECDH.prototype.computeSecret = function (other, inenc, enc) {
    inenc = inenc || 'utf8';

    if (!isBuffer(other)) {
      other = new Buffer(other, inenc);
    }

    var otherPub = this.curve.keyFromPublic(other).getPublic();
    var out = otherPub.mul(this.keys.getPrivate()).getX();
    return formatReturnValue$1(out, enc, this.curveType.byteLength);
  };

  ECDH.prototype.getPublicKey = function (enc, format) {
    var key = this.keys.getPublic(format === 'compressed', true);

    if (format === 'hybrid') {
      if (key[key.length - 1] % 2) {
        key[0] = 7;
      } else {
        key[0] = 6;
      }
    }

    return formatReturnValue$1(key, enc);
  };

  ECDH.prototype.getPrivateKey = function (enc) {
    return formatReturnValue$1(this.keys.getPrivate(), enc);
  };

  ECDH.prototype.setPublicKey = function (pub, enc) {
    enc = enc || 'utf8';

    if (!isBuffer(pub)) {
      pub = new Buffer(pub, enc);
    }

    this.keys._importPublic(pub);

    return this;
  };

  ECDH.prototype.setPrivateKey = function (priv, enc) {
    enc = enc || 'utf8';

    if (!isBuffer(priv)) {
      priv = new Buffer(priv, enc);
    }

    var _priv = new bn(priv);

    _priv = _priv.toString(16);
    this.keys = this.curve.genKeyPair();

    this.keys._importPrivate(_priv);

    return this;
  };

  function formatReturnValue$1(bn, enc, len) {
    if (!Array.isArray(bn)) {
      bn = bn.toArray();
    }

    var buf = new Buffer(bn);

    if (len && buf.length < len) {
      var zeros = new Buffer(len - buf.length);
      zeros.fill(0);
      buf = Buffer.concat([zeros, buf]);
    }

    if (!enc) {
      return buf;
    } else {
      return buf.toString(enc);
    }
  }

  var Buffer$x = safeBuffer.Buffer;

  var mgf = function mgf(seed, len) {
    var t = Buffer$x.alloc(0);
    var i = 0;
    var c;

    while (t.length < len) {
      c = i2ops(i++);
      t = Buffer$x.concat([t, browser('sha1').update(seed).update(c).digest()]);
    }

    return t.slice(0, len);
  };

  function i2ops(c) {
    var out = Buffer$x.allocUnsafe(4);
    out.writeUInt32BE(c, 0);
    return out;
  }

  var xor = function xor(a, b) {
    var len = a.length;
    var i = -1;

    while (++i < len) {
      a[i] ^= b[i];
    }

    return a;
  };

  var Buffer$y = safeBuffer.Buffer;

  function withPublic(paddedMsg, key) {
    return Buffer$y.from(paddedMsg.toRed(bn.mont(key.modulus)).redPow(new bn(key.publicExponent)).fromRed().toArray());
  }

  var withPublic_1 = withPublic;

  var Buffer$z = safeBuffer.Buffer;

  var publicEncrypt = function publicEncrypt(publicKey, msg, reverse) {
    var padding;

    if (publicKey.padding) {
      padding = publicKey.padding;
    } else if (reverse) {
      padding = 1;
    } else {
      padding = 4;
    }

    var key = parseAsn1(publicKey);
    var paddedMsg;

    if (padding === 4) {
      paddedMsg = oaep(key, msg);
    } else if (padding === 1) {
      paddedMsg = pkcs1(key, msg, reverse);
    } else if (padding === 3) {
      paddedMsg = new bn(msg);

      if (paddedMsg.cmp(key.modulus) >= 0) {
        throw new Error('data too long for modulus');
      }
    } else {
      throw new Error('unknown padding');
    }

    if (reverse) {
      return browserifyRsa(paddedMsg, key);
    } else {
      return withPublic_1(paddedMsg, key);
    }
  };

  function oaep(key, msg) {
    var k = key.modulus.byteLength();
    var mLen = msg.length;
    var iHash = browser('sha1').update(Buffer$z.alloc(0)).digest();
    var hLen = iHash.length;
    var hLen2 = 2 * hLen;

    if (mLen > k - hLen2 - 2) {
      throw new Error('message too long');
    }

    var ps = Buffer$z.alloc(k - mLen - hLen2 - 2);
    var dblen = k - hLen - 1;
    var seed = browser$3(hLen);
    var maskedDb = xor(Buffer$z.concat([iHash, ps, Buffer$z.alloc(1, 1), msg], dblen), mgf(seed, dblen));
    var maskedSeed = xor(seed, mgf(maskedDb, hLen));
    return new bn(Buffer$z.concat([Buffer$z.alloc(1), maskedSeed, maskedDb], k));
  }

  function pkcs1(key, msg, reverse) {
    var mLen = msg.length;
    var k = key.modulus.byteLength();

    if (mLen > k - 11) {
      throw new Error('message too long');
    }

    var ps;

    if (reverse) {
      ps = Buffer$z.alloc(k - mLen - 3, 0xff);
    } else {
      ps = nonZero(k - mLen - 3);
    }

    return new bn(Buffer$z.concat([Buffer$z.from([0, reverse ? 1 : 2]), ps, Buffer$z.alloc(1), msg], k));
  }

  function nonZero(len) {
    var out = Buffer$z.allocUnsafe(len);
    var i = 0;
    var cache = browser$3(len * 2);
    var cur = 0;
    var num;

    while (i < len) {
      if (cur === cache.length) {
        cache = browser$3(len * 2);
        cur = 0;
      }

      num = cache[cur++];

      if (num) {
        out[i++] = num;
      }
    }

    return out;
  }

  var Buffer$A = safeBuffer.Buffer;

  var privateDecrypt = function privateDecrypt(privateKey, enc, reverse) {
    var padding;

    if (privateKey.padding) {
      padding = privateKey.padding;
    } else if (reverse) {
      padding = 1;
    } else {
      padding = 4;
    }

    var key = parseAsn1(privateKey);
    var k = key.modulus.byteLength();

    if (enc.length > k || new bn(enc).cmp(key.modulus) >= 0) {
      throw new Error('decryption error');
    }

    var msg;

    if (reverse) {
      msg = withPublic_1(new bn(enc), key);
    } else {
      msg = browserifyRsa(enc, key);
    }

    var zBuffer = Buffer$A.alloc(k - msg.length);
    msg = Buffer$A.concat([zBuffer, msg], k);

    if (padding === 4) {
      return oaep$1(key, msg);
    } else if (padding === 1) {
      return pkcs1$1(key, msg, reverse);
    } else if (padding === 3) {
      return msg;
    } else {
      throw new Error('unknown padding');
    }
  };

  function oaep$1(key, msg) {
    var k = key.modulus.byteLength();
    var iHash = browser('sha1').update(Buffer$A.alloc(0)).digest();
    var hLen = iHash.length;

    if (msg[0] !== 0) {
      throw new Error('decryption error');
    }

    var maskedSeed = msg.slice(1, hLen + 1);
    var maskedDb = msg.slice(hLen + 1);
    var seed = xor(maskedSeed, mgf(maskedDb, hLen));
    var db = xor(maskedDb, mgf(seed, k - hLen - 1));

    if (compare$1(iHash, db.slice(0, hLen))) {
      throw new Error('decryption error');
    }

    var i = hLen;

    while (db[i] === 0) {
      i++;
    }

    if (db[i++] !== 1) {
      throw new Error('decryption error');
    }

    return db.slice(i);
  }

  function pkcs1$1(key, msg, reverse) {
    var p1 = msg.slice(0, 2);
    var i = 2;
    var status = 0;

    while (msg[i++] !== 0) {
      if (i >= msg.length) {
        status++;
        break;
      }
    }

    var ps = msg.slice(2, i - 1);

    if (p1.toString('hex') !== '0002' && !reverse || p1.toString('hex') !== '0001' && reverse) {
      status++;
    }

    if (ps.length < 8) {
      status++;
    }

    if (status) {
      throw new Error('decryption error');
    }

    return msg.slice(i);
  }

  function compare$1(a, b) {
    a = Buffer$A.from(a);
    b = Buffer$A.from(b);
    var dif = 0;
    var len = a.length;

    if (a.length !== b.length) {
      dif++;
      len = Math.min(a.length, b.length);
    }

    var i = -1;

    while (++i < len) {
      dif += a[i] ^ b[i];
    }

    return dif;
  }

  var browser$a = createCommonjsModule(function (module, exports) {
    exports.publicEncrypt = publicEncrypt;
    exports.privateDecrypt = privateDecrypt;

    exports.privateEncrypt = function privateEncrypt(key, buf) {
      return exports.publicEncrypt(key, buf, true);
    };

    exports.publicDecrypt = function publicDecrypt(key, buf) {
      return exports.privateDecrypt(key, buf, true);
    };
  });
  var browser_1$3 = browser$a.publicEncrypt;
  var browser_2$3 = browser$a.privateDecrypt;
  var browser_3$3 = browser$a.privateEncrypt;
  var browser_4$3 = browser$a.publicDecrypt;

  var browser$b = createCommonjsModule(function (module, exports) {

    function oldBrowser() {
      throw new Error('secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11');
    }

    var Buffer = safeBuffer.Buffer;
    var kBufferMaxLength = safeBuffer.kMaxLength;
    var crypto = commonjsGlobal.crypto || commonjsGlobal.msCrypto;
    var kMaxUint32 = Math.pow(2, 32) - 1;

    function assertOffset(offset, length) {
      if (typeof offset !== 'number' || offset !== offset) {
        // eslint-disable-line no-self-compare
        throw new TypeError('offset must be a number');
      }

      if (offset > kMaxUint32 || offset < 0) {
        throw new TypeError('offset must be a uint32');
      }

      if (offset > kBufferMaxLength || offset > length) {
        throw new RangeError('offset out of range');
      }
    }

    function assertSize(size, offset, length) {
      if (typeof size !== 'number' || size !== size) {
        // eslint-disable-line no-self-compare
        throw new TypeError('size must be a number');
      }

      if (size > kMaxUint32 || size < 0) {
        throw new TypeError('size must be a uint32');
      }

      if (size + offset > length || size > kBufferMaxLength) {
        throw new RangeError('buffer too small');
      }
    }

    if (crypto && crypto.getRandomValues || !browser$1) {
      exports.randomFill = randomFill;
      exports.randomFillSync = randomFillSync;
    } else {
      exports.randomFill = oldBrowser;
      exports.randomFillSync = oldBrowser;
    }

    function randomFill(buf, offset, size, cb) {
      if (!Buffer.isBuffer(buf) && !(buf instanceof commonjsGlobal.Uint8Array)) {
        throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
      }

      if (typeof offset === 'function') {
        cb = offset;
        offset = 0;
        size = buf.length;
      } else if (typeof size === 'function') {
        cb = size;
        size = buf.length - offset;
      } else if (typeof cb !== 'function') {
        throw new TypeError('"cb" argument must be a function');
      }

      assertOffset(offset, buf.length);
      assertSize(size, offset, buf.length);
      return actualFill(buf, offset, size, cb);
    }

    function actualFill(buf, offset, size, cb) {
      {
        var ourBuf = buf.buffer;
        var uint = new Uint8Array(ourBuf, offset, size);
        crypto.getRandomValues(uint);

        if (cb) {
          nextTick(function () {
            cb(null, buf);
          });
          return;
        }

        return buf;
      }
    }

    function randomFillSync(buf, offset, size) {
      if (typeof offset === 'undefined') {
        offset = 0;
      }

      if (!Buffer.isBuffer(buf) && !(buf instanceof commonjsGlobal.Uint8Array)) {
        throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
      }

      assertOffset(offset, buf.length);
      if (size === undefined) size = buf.length - offset;
      assertSize(size, offset, buf.length);
      return actualFill(buf, offset, size);
    }
  });
  var browser_1$4 = browser$b.randomFill;
  var browser_2$4 = browser$b.randomFillSync;

  var cryptoBrowserify = createCommonjsModule(function (module, exports) {

    exports.randomBytes = exports.rng = exports.pseudoRandomBytes = exports.prng = browser$3;
    exports.createHash = exports.Hash = browser;
    exports.createHmac = exports.Hmac = browser$4;
    var algoKeys = Object.keys(algos);
    var hashes = ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160'].concat(algoKeys);

    exports.getHashes = function () {
      return hashes;
    };

    exports.pbkdf2 = browser$2.pbkdf2;
    exports.pbkdf2Sync = browser$2.pbkdf2Sync;
    exports.Cipher = browser$6.Cipher;
    exports.createCipher = browser$6.createCipher;
    exports.Cipheriv = browser$6.Cipheriv;
    exports.createCipheriv = browser$6.createCipheriv;
    exports.Decipher = browser$6.Decipher;
    exports.createDecipher = browser$6.createDecipher;
    exports.Decipheriv = browser$6.Decipheriv;
    exports.createDecipheriv = browser$6.createDecipheriv;
    exports.getCiphers = browser$6.getCiphers;
    exports.listCiphers = browser$6.listCiphers;
    exports.DiffieHellmanGroup = browser$7.DiffieHellmanGroup;
    exports.createDiffieHellmanGroup = browser$7.createDiffieHellmanGroup;
    exports.getDiffieHellman = browser$7.getDiffieHellman;
    exports.createDiffieHellman = browser$7.createDiffieHellman;
    exports.DiffieHellman = browser$7.DiffieHellman;
    exports.createSign = browser$8.createSign;
    exports.Sign = browser$8.Sign;
    exports.createVerify = browser$8.createVerify;
    exports.Verify = browser$8.Verify;
    exports.createECDH = browser$9;
    exports.publicEncrypt = browser$a.publicEncrypt;
    exports.privateEncrypt = browser$a.privateEncrypt;
    exports.publicDecrypt = browser$a.publicDecrypt;
    exports.privateDecrypt = browser$a.privateDecrypt; // the least I can do is make error messages for the rest of the node.js/crypto api.
    // ;[
    //   'createCredentials'
    // ].forEach(function (name) {
    //   exports[name] = function () {
    //     throw new Error([
    //       'sorry, ' + name + ' is not implemented yet',
    //       'we accept pull requests',
    //       'https://github.com/crypto-browserify/crypto-browserify'
    //     ].join('\n'))
    //   }
    // })

    exports.randomFill = browser$b.randomFill;
    exports.randomFillSync = browser$b.randomFillSync;

    exports.createCredentials = function () {
      throw new Error(['sorry, createCredentials is not implemented yet', 'we accept pull requests', 'https://github.com/crypto-browserify/crypto-browserify'].join('\n'));
    };

    exports.constants = {
      'DH_CHECK_P_NOT_SAFE_PRIME': 2,
      'DH_CHECK_P_NOT_PRIME': 1,
      'DH_UNABLE_TO_CHECK_GENERATOR': 4,
      'DH_NOT_SUITABLE_GENERATOR': 8,
      'NPN_ENABLED': 1,
      'ALPN_ENABLED': 1,
      'RSA_PKCS1_PADDING': 1,
      'RSA_SSLV23_PADDING': 2,
      'RSA_NO_PADDING': 3,
      'RSA_PKCS1_OAEP_PADDING': 4,
      'RSA_X931_PADDING': 5,
      'RSA_PKCS1_PSS_PADDING': 6,
      'POINT_CONVERSION_COMPRESSED': 2,
      'POINT_CONVERSION_UNCOMPRESSED': 4,
      'POINT_CONVERSION_HYBRID': 6
    };
  });
  var cryptoBrowserify_1 = cryptoBrowserify.randomBytes;
  var cryptoBrowserify_2 = cryptoBrowserify.rng;
  var cryptoBrowserify_3 = cryptoBrowserify.pseudoRandomBytes;
  var cryptoBrowserify_4 = cryptoBrowserify.prng;
  var cryptoBrowserify_5 = cryptoBrowserify.createHash;
  var cryptoBrowserify_6 = cryptoBrowserify.Hash;
  var cryptoBrowserify_7 = cryptoBrowserify.createHmac;
  var cryptoBrowserify_8 = cryptoBrowserify.Hmac;
  var cryptoBrowserify_9 = cryptoBrowserify.getHashes;
  var cryptoBrowserify_10 = cryptoBrowserify.pbkdf2;
  var cryptoBrowserify_11 = cryptoBrowserify.pbkdf2Sync;
  var cryptoBrowserify_12 = cryptoBrowserify.Cipher;
  var cryptoBrowserify_13 = cryptoBrowserify.createCipher;
  var cryptoBrowserify_14 = cryptoBrowserify.Cipheriv;
  var cryptoBrowserify_15 = cryptoBrowserify.createCipheriv;
  var cryptoBrowserify_16 = cryptoBrowserify.Decipher;
  var cryptoBrowserify_17 = cryptoBrowserify.createDecipher;
  var cryptoBrowserify_18 = cryptoBrowserify.Decipheriv;
  var cryptoBrowserify_19 = cryptoBrowserify.createDecipheriv;
  var cryptoBrowserify_20 = cryptoBrowserify.getCiphers;
  var cryptoBrowserify_21 = cryptoBrowserify.listCiphers;
  var cryptoBrowserify_22 = cryptoBrowserify.DiffieHellmanGroup;
  var cryptoBrowserify_23 = cryptoBrowserify.createDiffieHellmanGroup;
  var cryptoBrowserify_24 = cryptoBrowserify.getDiffieHellman;
  var cryptoBrowserify_25 = cryptoBrowserify.createDiffieHellman;
  var cryptoBrowserify_26 = cryptoBrowserify.DiffieHellman;
  var cryptoBrowserify_27 = cryptoBrowserify.createSign;
  var cryptoBrowserify_28 = cryptoBrowserify.Sign;
  var cryptoBrowserify_29 = cryptoBrowserify.createVerify;
  var cryptoBrowserify_30 = cryptoBrowserify.Verify;
  var cryptoBrowserify_31 = cryptoBrowserify.createECDH;
  var cryptoBrowserify_32 = cryptoBrowserify.publicEncrypt;
  var cryptoBrowserify_33 = cryptoBrowserify.privateEncrypt;
  var cryptoBrowserify_34 = cryptoBrowserify.publicDecrypt;
  var cryptoBrowserify_35 = cryptoBrowserify.privateDecrypt;
  var cryptoBrowserify_36 = cryptoBrowserify.randomFill;
  var cryptoBrowserify_37 = cryptoBrowserify.randomFillSync;
  var cryptoBrowserify_38 = cryptoBrowserify.createCredentials;
  var cryptoBrowserify_39 = cryptoBrowserify.constants;

  // Base58 encoding/decoding
  // Originally written by Mike Hearn for BitcoinJ
  // Copyright (c) 2011 Google Inc
  // Ported to JavaScript by Stefan Thomas
  // Merged Buffer refactorings from base58-native by Stephen Pair
  // Copyright (c) 2013 BitPay Inc
  var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var ALPHABET_MAP = {};

  for (var i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }

  var BASE = 58;

  function encode(buffer) {
    if (buffer.length === 0) return '';
    var i,
        j,
        digits = [0];

    for (i = 0; i < buffer.length; i++) {
      for (j = 0; j < digits.length; j++) {
        digits[j] <<= 8;
      }

      digits[0] += buffer[i];
      var carry = 0;

      for (j = 0; j < digits.length; ++j) {
        digits[j] += carry;
        carry = digits[j] / BASE | 0;
        digits[j] %= BASE;
      }

      while (carry) {
        digits.push(carry % BASE);
        carry = carry / BASE | 0;
      }
    } // deal with leading zeros


    for (i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
      digits.push(0);
    } // convert digits to a string


    var stringOutput = "";

    for (var i = digits.length - 1; i >= 0; i--) {
      stringOutput = stringOutput + ALPHABET[digits[i]];
    }

    return stringOutput;
  }

  function decode(string) {
    if (string.length === 0) return [];
    var i,
        j,
        bytes = [0];

    for (i = 0; i < string.length; i++) {
      var c = string[i];
      if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');

      for (j = 0; j < bytes.length; j++) {
        bytes[j] *= BASE;
      }

      bytes[0] += ALPHABET_MAP[c];
      var carry = 0;

      for (j = 0; j < bytes.length; ++j) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }

      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    } // deal with leading zeros


    for (i = 0; string[i] === '1' && i < string.length - 1; i++) {
      bytes.push(0);
    }

    return bytes.reverse();
  }

  var bs58 = {
    encode: encode,
    decode: decode
  };

  function encode$1(payload, version) {
    if (Array.isArray(payload) || payload instanceof Uint8Array) {
      payload = new Buffer(payload);
    }

    var buf;

    if (version != null) {
      if (typeof version === 'number') {
        version = new Buffer([version]);
      }

      buf = Buffer.concat([version, payload]);
    } else {
      buf = payload;
    }

    var checksum = sha256x2(buf).slice(0, 4);
    var result = Buffer.concat([buf, checksum]);
    return bs58.encode(result);
  }

  function decode$1(base58str, version) {
    var arr = bs58.decode(base58str);
    var buf = new Buffer(arr);
    var versionLength;

    if (version == null) {
      versionLength = 0;
    } else {
      if (typeof version === 'number') version = new Buffer([version]);
      versionLength = version.length;
      var versionCompare = buf.slice(0, versionLength);

      if (versionCompare.toString('hex') !== version.toString('hex')) {
        throw new Error('Invalid version');
      }
    }

    var checksum = buf.slice(-4);
    var endPos = buf.length - 4;
    var bytes = buf.slice(0, endPos);
    var newChecksum = sha256x2(bytes).slice(0, 4);

    if (checksum.toString('hex') !== newChecksum.toString('hex')) {
      throw new Error('Invalid checksum');
    }

    return bytes.slice(versionLength);
  }

  function isValid(base58str, version) {
    try {
      decode$1(base58str, version);
    } catch (e) {
      return false;
    }

    return true;
  }

  function createEncoder(version) {
    return function (payload) {
      return encode$1(payload, version);
    };
  }

  function createDecoder(version) {
    return function (base58str) {
      return decode$1(base58str, version);
    };
  }

  function createValidator(version) {
    return function (base58str) {
      return isValid(base58str, version);
    };
  }

  function sha256x2(buffer) {
    var sha = browser('sha256').update(buffer).digest();
    return browser('sha256').update(sha).digest();
  }

  var coinstring = {
    encode: encode$1,
    decode: decode$1,
    isValid: isValid,
    createEncoder: createEncoder,
    createDecoder: createDecoder,
    createValidator: createValidator
  };

  var toString$1 = Object.prototype.toString; // TypeError

  var isArray$2 = function isArray(value, message) {
    if (!Array.isArray(value)) throw TypeError(message);
  };

  var isBoolean$1 = function isBoolean(value, message) {
    if (toString$1.call(value) !== '[object Boolean]') throw TypeError(message);
  };

  var isBuffer$1 = function isBuffer$1(value, message) {
    if (!isBuffer(value)) throw TypeError(message);
  };

  var isFunction$1 = function isFunction(value, message) {
    if (toString$1.call(value) !== '[object Function]') throw TypeError(message);
  };

  var isNumber$1 = function isNumber(value, message) {
    if (toString$1.call(value) !== '[object Number]') throw TypeError(message);
  };

  var isObject$1 = function isObject(value, message) {
    if (toString$1.call(value) !== '[object Object]') throw TypeError(message);
  }; // RangeError


  var isBufferLength = function isBufferLength(buffer, length, message) {
    if (buffer.length !== length) throw RangeError(message);
  };

  var isBufferLength2 = function isBufferLength2(buffer, length1, length2, message) {
    if (buffer.length !== length1 && buffer.length !== length2) throw RangeError(message);
  };

  var isLengthGTZero = function isLengthGTZero(value, message) {
    if (value.length === 0) throw RangeError(message);
  };

  var isNumberInInterval = function isNumberInInterval(number, x, y, message) {
    if (number <= x || number >= y) throw RangeError(message);
  };

  var assert$b = {
    isArray: isArray$2,
    isBoolean: isBoolean$1,
    isBuffer: isBuffer$1,
    isFunction: isFunction$1,
    isNumber: isNumber$1,
    isObject: isObject$1,
    isBufferLength: isBufferLength,
    isBufferLength2: isBufferLength2,
    isLengthGTZero: isLengthGTZero,
    isNumberInInterval: isNumberInInterval
  };

  // Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
  // NOTE: SIGHASH byte ignored AND restricted, truncate before use

  var Buffer$B = safeBuffer.Buffer;

  function check(buffer) {
    if (buffer.length < 8) return false;
    if (buffer.length > 72) return false;
    if (buffer[0] !== 0x30) return false;
    if (buffer[1] !== buffer.length - 2) return false;
    if (buffer[2] !== 0x02) return false;
    var lenR = buffer[3];
    if (lenR === 0) return false;
    if (5 + lenR >= buffer.length) return false;
    if (buffer[4 + lenR] !== 0x02) return false;
    var lenS = buffer[5 + lenR];
    if (lenS === 0) return false;
    if (6 + lenR + lenS !== buffer.length) return false;
    if (buffer[4] & 0x80) return false;
    if (lenR > 1 && buffer[4] === 0x00 && !(buffer[5] & 0x80)) return false;
    if (buffer[lenR + 6] & 0x80) return false;
    if (lenS > 1 && buffer[lenR + 6] === 0x00 && !(buffer[lenR + 7] & 0x80)) return false;
    return true;
  }

  function decode$2(buffer) {
    if (buffer.length < 8) throw new Error('DER sequence length is too short');
    if (buffer.length > 72) throw new Error('DER sequence length is too long');
    if (buffer[0] !== 0x30) throw new Error('Expected DER sequence');
    if (buffer[1] !== buffer.length - 2) throw new Error('DER sequence length is invalid');
    if (buffer[2] !== 0x02) throw new Error('Expected DER integer');
    var lenR = buffer[3];
    if (lenR === 0) throw new Error('R length is zero');
    if (5 + lenR >= buffer.length) throw new Error('R length is too long');
    if (buffer[4 + lenR] !== 0x02) throw new Error('Expected DER integer (2)');
    var lenS = buffer[5 + lenR];
    if (lenS === 0) throw new Error('S length is zero');
    if (6 + lenR + lenS !== buffer.length) throw new Error('S length is invalid');
    if (buffer[4] & 0x80) throw new Error('R value is negative');
    if (lenR > 1 && buffer[4] === 0x00 && !(buffer[5] & 0x80)) throw new Error('R value excessively padded');
    if (buffer[lenR + 6] & 0x80) throw new Error('S value is negative');
    if (lenS > 1 && buffer[lenR + 6] === 0x00 && !(buffer[lenR + 7] & 0x80)) throw new Error('S value excessively padded'); // non-BIP66 - extract R, S values

    return {
      r: buffer.slice(4, 4 + lenR),
      s: buffer.slice(6 + lenR)
    };
  }
  /*
   * Expects r and s to be positive DER integers.
   *
   * The DER format uses the most significant bit as a sign bit (& 0x80).
   * If the significant bit is set AND the integer is positive, a 0x00 is prepended.
   *
   * Examples:
   *
   *      0 =>     0x00
   *      1 =>     0x01
   *     -1 =>     0xff
   *    127 =>     0x7f
   *   -127 =>     0x81
   *    128 =>   0x0080
   *   -128 =>     0x80
   *    255 =>   0x00ff
   *   -255 =>   0xff01
   *  16300 =>   0x3fac
   * -16300 =>   0xc054
   *  62300 => 0x00f35c
   * -62300 => 0xff0ca4
  */


  function encode$2(r, s) {
    var lenR = r.length;
    var lenS = s.length;
    if (lenR === 0) throw new Error('R length is zero');
    if (lenS === 0) throw new Error('S length is zero');
    if (lenR > 33) throw new Error('R length is too long');
    if (lenS > 33) throw new Error('S length is too long');
    if (r[0] & 0x80) throw new Error('R value is negative');
    if (s[0] & 0x80) throw new Error('S value is negative');
    if (lenR > 1 && r[0] === 0x00 && !(r[1] & 0x80)) throw new Error('R value excessively padded');
    if (lenS > 1 && s[0] === 0x00 && !(s[1] & 0x80)) throw new Error('S value excessively padded');
    var signature = Buffer$B.allocUnsafe(6 + lenR + lenS); // 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]

    signature[0] = 0x30;
    signature[1] = signature.length - 2;
    signature[2] = 0x02;
    signature[3] = r.length;
    r.copy(signature, 4);
    signature[4 + lenR] = 0x02;
    signature[5 + lenR] = s.length;
    s.copy(signature, 6 + lenR);
    return signature;
  }

  var bip66 = {
    check: check,
    decode: decode$2,
    encode: encode$2
  };

  var Buffer$C = safeBuffer.Buffer;
  var EC_PRIVKEY_EXPORT_DER_COMPRESSED = Buffer$C.from([// begin
  0x30, 0x81, 0xd3, 0x02, 0x01, 0x01, 0x04, 0x20, // private key
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // middle
  0xa0, 0x81, 0x85, 0x30, 0x81, 0x82, 0x02, 0x01, 0x01, 0x30, 0x2c, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xcE, 0x3d, 0x01, 0x01, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfE, 0xff, 0xff, 0xfc, 0x2f, 0x30, 0x06, 0x04, 0x01, 0x00, 0x04, 0x01, 0x07, 0x04, 0x21, 0x02, 0x79, 0xbE, 0x66, 0x7E, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xcE, 0x87, 0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xcE, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16, 0xf8, 0x17, 0x98, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfE, 0xba, 0xaE, 0xdc, 0xE6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5E, 0x8c, 0xd0, 0x36, 0x41, 0x41, 0x02, 0x01, 0x01, 0xa1, 0x24, 0x03, 0x22, 0x00, // public key
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  var EC_PRIVKEY_EXPORT_DER_UNCOMPRESSED = Buffer$C.from([// begin
  0x30, 0x82, 0x01, 0x13, 0x02, 0x01, 0x01, 0x04, 0x20, // private key
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // middle
  0xa0, 0x81, 0xa5, 0x30, 0x81, 0xa2, 0x02, 0x01, 0x01, 0x30, 0x2c, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xcE, 0x3d, 0x01, 0x01, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfE, 0xff, 0xff, 0xfc, 0x2f, 0x30, 0x06, 0x04, 0x01, 0x00, 0x04, 0x01, 0x07, 0x04, 0x41, 0x04, 0x79, 0xbE, 0x66, 0x7E, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xcE, 0x87, 0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xcE, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16, 0xf8, 0x17, 0x98, 0x48, 0x3a, 0xda, 0x77, 0x26, 0xa3, 0xc4, 0x65, 0x5d, 0xa4, 0xfb, 0xfc, 0x0E, 0x11, 0x08, 0xa8, 0xfd, 0x17, 0xb4, 0x48, 0xa6, 0x85, 0x54, 0x19, 0x9c, 0x47, 0xd0, 0x8f, 0xfb, 0x10, 0xd4, 0xb8, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfE, 0xba, 0xaE, 0xdc, 0xE6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5E, 0x8c, 0xd0, 0x36, 0x41, 0x41, 0x02, 0x01, 0x01, 0xa1, 0x44, 0x03, 0x42, 0x00, // public key
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

  var privateKeyExport = function privateKeyExport(privateKey, publicKey, compressed) {
    var result = Buffer$C.from(compressed ? EC_PRIVKEY_EXPORT_DER_COMPRESSED : EC_PRIVKEY_EXPORT_DER_UNCOMPRESSED);
    privateKey.copy(result, compressed ? 8 : 9);
    publicKey.copy(result, compressed ? 181 : 214);
    return result;
  };

  var privateKeyImport = function privateKeyImport(privateKey) {
    var length = privateKey.length; // sequence header

    var index = 0;
    if (length < index + 1 || privateKey[index] !== 0x30) return;
    index += 1; // sequence length constructor

    if (length < index + 1 || !(privateKey[index] & 0x80)) return;
    var lenb = privateKey[index] & 0x7f;
    index += 1;
    if (lenb < 1 || lenb > 2) return;
    if (length < index + lenb) return; // sequence length

    var len = privateKey[index + lenb - 1] | (lenb > 1 ? privateKey[index + lenb - 2] << 8 : 0);
    index += lenb;
    if (length < index + len) return; // sequence element 0: version number (=1)

    if (length < index + 3 || privateKey[index] !== 0x02 || privateKey[index + 1] !== 0x01 || privateKey[index + 2] !== 0x01) {
      return;
    }

    index += 3; // sequence element 1: octet string, up to 32 bytes

    if (length < index + 2 || privateKey[index] !== 0x04 || privateKey[index + 1] > 0x20 || length < index + 2 + privateKey[index + 1]) {
      return;
    }

    return privateKey.slice(index + 2, index + 2 + privateKey[index + 1]);
  };

  var signatureExport = function signatureExport(sigObj) {
    var r = Buffer$C.concat([Buffer$C.from([0]), sigObj.r]);

    for (var lenR = 33, posR = 0; lenR > 1 && r[posR] === 0x00 && !(r[posR + 1] & 0x80); --lenR, ++posR) {
    }

    var s = Buffer$C.concat([Buffer$C.from([0]), sigObj.s]);

    for (var lenS = 33, posS = 0; lenS > 1 && s[posS] === 0x00 && !(s[posS + 1] & 0x80); --lenS, ++posS) {
    }

    return bip66.encode(r.slice(posR), s.slice(posS));
  };

  var signatureImport = function signatureImport(sig) {
    var r = Buffer$C.alloc(32, 0);
    var s = Buffer$C.alloc(32, 0);

    try {
      var sigObj = bip66.decode(sig);
      if (sigObj.r.length === 33 && sigObj.r[0] === 0x00) sigObj.r = sigObj.r.slice(1);
      if (sigObj.r.length > 32) throw new Error('R length is too long');
      if (sigObj.s.length === 33 && sigObj.s[0] === 0x00) sigObj.s = sigObj.s.slice(1);
      if (sigObj.s.length > 32) throw new Error('S length is too long');
    } catch (err) {
      return;
    }

    sigObj.r.copy(r, 32 - sigObj.r.length);
    sigObj.s.copy(s, 32 - sigObj.s.length);
    return {
      r: r,
      s: s
    };
  };

  var signatureImportLax = function signatureImportLax(sig) {
    var r = Buffer$C.alloc(32, 0);
    var s = Buffer$C.alloc(32, 0);
    var length = sig.length;
    var index = 0; // sequence tag byte

    if (sig[index++] !== 0x30) return; // sequence length byte

    var lenbyte = sig[index++];

    if (lenbyte & 0x80) {
      index += lenbyte - 0x80;
      if (index > length) return;
    } // sequence tag byte for r


    if (sig[index++] !== 0x02) return; // length for r

    var rlen = sig[index++];

    if (rlen & 0x80) {
      lenbyte = rlen - 0x80;
      if (index + lenbyte > length) return;

      for (; lenbyte > 0 && sig[index] === 0x00; index += 1, lenbyte -= 1) {
      }

      for (rlen = 0; lenbyte > 0; index += 1, lenbyte -= 1) {
        rlen = (rlen << 8) + sig[index];
      }
    }

    if (rlen > length - index) return;
    var rindex = index;
    index += rlen; // sequence tag byte for s

    if (sig[index++] !== 0x02) return; // length for s

    var slen = sig[index++];

    if (slen & 0x80) {
      lenbyte = slen - 0x80;
      if (index + lenbyte > length) return;

      for (; lenbyte > 0 && sig[index] === 0x00; index += 1, lenbyte -= 1) {
      }

      for (slen = 0; lenbyte > 0; index += 1, lenbyte -= 1) {
        slen = (slen << 8) + sig[index];
      }
    }

    if (slen > length - index) return;
    var sindex = index;
    index += slen; // ignore leading zeros in r

    for (; rlen > 0 && sig[rindex] === 0x00; rlen -= 1, rindex += 1) {
    } // copy r value


    if (rlen > 32) return;
    var rvalue = sig.slice(rindex, rindex + rlen);
    rvalue.copy(r, 32 - rvalue.length); // ignore leading zeros in s

    for (; slen > 0 && sig[sindex] === 0x00; slen -= 1, sindex += 1) {
    } // copy s value


    if (slen > 32) return;
    var svalue = sig.slice(sindex, sindex + slen);
    svalue.copy(s, 32 - svalue.length);
    return {
      r: r,
      s: s
    };
  };

  var der$1 = {
    privateKeyExport: privateKeyExport,
    privateKeyImport: privateKeyImport,
    signatureExport: signatureExport,
    signatureImport: signatureImport,
    signatureImportLax: signatureImportLax
  };

  var COMPRESSED_TYPE_INVALID = "compressed should be a boolean";
  var EC_PRIVATE_KEY_TYPE_INVALID = "private key should be a Buffer";
  var EC_PRIVATE_KEY_LENGTH_INVALID = "private key length is invalid";
  var EC_PRIVATE_KEY_RANGE_INVALID = "private key range is invalid";
  var EC_PRIVATE_KEY_TWEAK_ADD_FAIL = "tweak out of range or resulting private key is invalid";
  var EC_PRIVATE_KEY_TWEAK_MUL_FAIL = "tweak out of range";
  var EC_PRIVATE_KEY_EXPORT_DER_FAIL = "couldn't export to DER format";
  var EC_PRIVATE_KEY_IMPORT_DER_FAIL = "couldn't import from DER format";
  var EC_PUBLIC_KEYS_TYPE_INVALID = "public keys should be an Array";
  var EC_PUBLIC_KEYS_LENGTH_INVALID = "public keys Array should have at least 1 element";
  var EC_PUBLIC_KEY_TYPE_INVALID = "public key should be a Buffer";
  var EC_PUBLIC_KEY_LENGTH_INVALID = "public key length is invalid";
  var EC_PUBLIC_KEY_PARSE_FAIL = "the public key could not be parsed or is invalid";
  var EC_PUBLIC_KEY_CREATE_FAIL = "private was invalid, try again";
  var EC_PUBLIC_KEY_TWEAK_ADD_FAIL = "tweak out of range or resulting public key is invalid";
  var EC_PUBLIC_KEY_TWEAK_MUL_FAIL = "tweak out of range";
  var EC_PUBLIC_KEY_COMBINE_FAIL = "the sum of the public keys is not valid";
  var ECDH_FAIL = "scalar was invalid (zero or overflow)";
  var ECDSA_SIGNATURE_TYPE_INVALID = "signature should be a Buffer";
  var ECDSA_SIGNATURE_LENGTH_INVALID = "signature length is invalid";
  var ECDSA_SIGNATURE_PARSE_FAIL = "couldn't parse signature";
  var ECDSA_SIGNATURE_PARSE_DER_FAIL = "couldn't parse DER signature";
  var ECDSA_SIGNATURE_SERIALIZE_DER_FAIL = "couldn't serialize signature to DER format";
  var ECDSA_SIGN_FAIL = "nonce generation function failed or private key is invalid";
  var ECDSA_RECOVER_FAIL = "couldn't recover public key from signature";
  var MSG32_TYPE_INVALID = "message should be a Buffer";
  var MSG32_LENGTH_INVALID = "message length is invalid";
  var OPTIONS_TYPE_INVALID = "options should be an Object";
  var OPTIONS_DATA_TYPE_INVALID = "options.data should be a Buffer";
  var OPTIONS_DATA_LENGTH_INVALID = "options.data length is invalid";
  var OPTIONS_NONCEFN_TYPE_INVALID = "options.noncefn should be a Function";
  var RECOVERY_ID_TYPE_INVALID = "recovery should be a Number";
  var RECOVERY_ID_VALUE_INVALID = "recovery should have value between -1 and 4";
  var TWEAK_TYPE_INVALID = "tweak should be a Buffer";
  var TWEAK_LENGTH_INVALID = "tweak length is invalid";
  var messages = {
  	COMPRESSED_TYPE_INVALID: COMPRESSED_TYPE_INVALID,
  	EC_PRIVATE_KEY_TYPE_INVALID: EC_PRIVATE_KEY_TYPE_INVALID,
  	EC_PRIVATE_KEY_LENGTH_INVALID: EC_PRIVATE_KEY_LENGTH_INVALID,
  	EC_PRIVATE_KEY_RANGE_INVALID: EC_PRIVATE_KEY_RANGE_INVALID,
  	EC_PRIVATE_KEY_TWEAK_ADD_FAIL: EC_PRIVATE_KEY_TWEAK_ADD_FAIL,
  	EC_PRIVATE_KEY_TWEAK_MUL_FAIL: EC_PRIVATE_KEY_TWEAK_MUL_FAIL,
  	EC_PRIVATE_KEY_EXPORT_DER_FAIL: EC_PRIVATE_KEY_EXPORT_DER_FAIL,
  	EC_PRIVATE_KEY_IMPORT_DER_FAIL: EC_PRIVATE_KEY_IMPORT_DER_FAIL,
  	EC_PUBLIC_KEYS_TYPE_INVALID: EC_PUBLIC_KEYS_TYPE_INVALID,
  	EC_PUBLIC_KEYS_LENGTH_INVALID: EC_PUBLIC_KEYS_LENGTH_INVALID,
  	EC_PUBLIC_KEY_TYPE_INVALID: EC_PUBLIC_KEY_TYPE_INVALID,
  	EC_PUBLIC_KEY_LENGTH_INVALID: EC_PUBLIC_KEY_LENGTH_INVALID,
  	EC_PUBLIC_KEY_PARSE_FAIL: EC_PUBLIC_KEY_PARSE_FAIL,
  	EC_PUBLIC_KEY_CREATE_FAIL: EC_PUBLIC_KEY_CREATE_FAIL,
  	EC_PUBLIC_KEY_TWEAK_ADD_FAIL: EC_PUBLIC_KEY_TWEAK_ADD_FAIL,
  	EC_PUBLIC_KEY_TWEAK_MUL_FAIL: EC_PUBLIC_KEY_TWEAK_MUL_FAIL,
  	EC_PUBLIC_KEY_COMBINE_FAIL: EC_PUBLIC_KEY_COMBINE_FAIL,
  	ECDH_FAIL: ECDH_FAIL,
  	ECDSA_SIGNATURE_TYPE_INVALID: ECDSA_SIGNATURE_TYPE_INVALID,
  	ECDSA_SIGNATURE_LENGTH_INVALID: ECDSA_SIGNATURE_LENGTH_INVALID,
  	ECDSA_SIGNATURE_PARSE_FAIL: ECDSA_SIGNATURE_PARSE_FAIL,
  	ECDSA_SIGNATURE_PARSE_DER_FAIL: ECDSA_SIGNATURE_PARSE_DER_FAIL,
  	ECDSA_SIGNATURE_SERIALIZE_DER_FAIL: ECDSA_SIGNATURE_SERIALIZE_DER_FAIL,
  	ECDSA_SIGN_FAIL: ECDSA_SIGN_FAIL,
  	ECDSA_RECOVER_FAIL: ECDSA_RECOVER_FAIL,
  	MSG32_TYPE_INVALID: MSG32_TYPE_INVALID,
  	MSG32_LENGTH_INVALID: MSG32_LENGTH_INVALID,
  	OPTIONS_TYPE_INVALID: OPTIONS_TYPE_INVALID,
  	OPTIONS_DATA_TYPE_INVALID: OPTIONS_DATA_TYPE_INVALID,
  	OPTIONS_DATA_LENGTH_INVALID: OPTIONS_DATA_LENGTH_INVALID,
  	OPTIONS_NONCEFN_TYPE_INVALID: OPTIONS_NONCEFN_TYPE_INVALID,
  	RECOVERY_ID_TYPE_INVALID: RECOVERY_ID_TYPE_INVALID,
  	RECOVERY_ID_VALUE_INVALID: RECOVERY_ID_VALUE_INVALID,
  	TWEAK_TYPE_INVALID: TWEAK_TYPE_INVALID,
  	TWEAK_LENGTH_INVALID: TWEAK_LENGTH_INVALID
  };

  var messages$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    COMPRESSED_TYPE_INVALID: COMPRESSED_TYPE_INVALID,
    EC_PRIVATE_KEY_TYPE_INVALID: EC_PRIVATE_KEY_TYPE_INVALID,
    EC_PRIVATE_KEY_LENGTH_INVALID: EC_PRIVATE_KEY_LENGTH_INVALID,
    EC_PRIVATE_KEY_RANGE_INVALID: EC_PRIVATE_KEY_RANGE_INVALID,
    EC_PRIVATE_KEY_TWEAK_ADD_FAIL: EC_PRIVATE_KEY_TWEAK_ADD_FAIL,
    EC_PRIVATE_KEY_TWEAK_MUL_FAIL: EC_PRIVATE_KEY_TWEAK_MUL_FAIL,
    EC_PRIVATE_KEY_EXPORT_DER_FAIL: EC_PRIVATE_KEY_EXPORT_DER_FAIL,
    EC_PRIVATE_KEY_IMPORT_DER_FAIL: EC_PRIVATE_KEY_IMPORT_DER_FAIL,
    EC_PUBLIC_KEYS_TYPE_INVALID: EC_PUBLIC_KEYS_TYPE_INVALID,
    EC_PUBLIC_KEYS_LENGTH_INVALID: EC_PUBLIC_KEYS_LENGTH_INVALID,
    EC_PUBLIC_KEY_TYPE_INVALID: EC_PUBLIC_KEY_TYPE_INVALID,
    EC_PUBLIC_KEY_LENGTH_INVALID: EC_PUBLIC_KEY_LENGTH_INVALID,
    EC_PUBLIC_KEY_PARSE_FAIL: EC_PUBLIC_KEY_PARSE_FAIL,
    EC_PUBLIC_KEY_CREATE_FAIL: EC_PUBLIC_KEY_CREATE_FAIL,
    EC_PUBLIC_KEY_TWEAK_ADD_FAIL: EC_PUBLIC_KEY_TWEAK_ADD_FAIL,
    EC_PUBLIC_KEY_TWEAK_MUL_FAIL: EC_PUBLIC_KEY_TWEAK_MUL_FAIL,
    EC_PUBLIC_KEY_COMBINE_FAIL: EC_PUBLIC_KEY_COMBINE_FAIL,
    ECDH_FAIL: ECDH_FAIL,
    ECDSA_SIGNATURE_TYPE_INVALID: ECDSA_SIGNATURE_TYPE_INVALID,
    ECDSA_SIGNATURE_LENGTH_INVALID: ECDSA_SIGNATURE_LENGTH_INVALID,
    ECDSA_SIGNATURE_PARSE_FAIL: ECDSA_SIGNATURE_PARSE_FAIL,
    ECDSA_SIGNATURE_PARSE_DER_FAIL: ECDSA_SIGNATURE_PARSE_DER_FAIL,
    ECDSA_SIGNATURE_SERIALIZE_DER_FAIL: ECDSA_SIGNATURE_SERIALIZE_DER_FAIL,
    ECDSA_SIGN_FAIL: ECDSA_SIGN_FAIL,
    ECDSA_RECOVER_FAIL: ECDSA_RECOVER_FAIL,
    MSG32_TYPE_INVALID: MSG32_TYPE_INVALID,
    MSG32_LENGTH_INVALID: MSG32_LENGTH_INVALID,
    OPTIONS_TYPE_INVALID: OPTIONS_TYPE_INVALID,
    OPTIONS_DATA_TYPE_INVALID: OPTIONS_DATA_TYPE_INVALID,
    OPTIONS_DATA_LENGTH_INVALID: OPTIONS_DATA_LENGTH_INVALID,
    OPTIONS_NONCEFN_TYPE_INVALID: OPTIONS_NONCEFN_TYPE_INVALID,
    RECOVERY_ID_TYPE_INVALID: RECOVERY_ID_TYPE_INVALID,
    RECOVERY_ID_VALUE_INVALID: RECOVERY_ID_VALUE_INVALID,
    TWEAK_TYPE_INVALID: TWEAK_TYPE_INVALID,
    TWEAK_LENGTH_INVALID: TWEAK_LENGTH_INVALID,
    'default': messages
  });

  var messages$2 = getCjsExportFromNamespace(messages$1);

  function initCompressedValue(value, defaultValue) {
    if (value === undefined) return defaultValue;
    assert$b.isBoolean(value, messages$2.COMPRESSED_TYPE_INVALID);
    return value;
  }

  var lib = function lib(secp256k1) {
    return {
      privateKeyVerify: function privateKeyVerify(privateKey) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        return privateKey.length === 32 && secp256k1.privateKeyVerify(privateKey);
      },
      privateKeyExport: function privateKeyExport(privateKey, compressed) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        var publicKey = secp256k1.privateKeyExport(privateKey, compressed);
        return der$1.privateKeyExport(privateKey, publicKey, compressed);
      },
      privateKeyImport: function privateKeyImport(privateKey) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        privateKey = der$1.privateKeyImport(privateKey);
        if (privateKey && privateKey.length === 32 && secp256k1.privateKeyVerify(privateKey)) return privateKey;
        throw new Error(messages$2.EC_PRIVATE_KEY_IMPORT_DER_FAIL);
      },
      privateKeyNegate: function privateKeyNegate(privateKey) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        return secp256k1.privateKeyNegate(privateKey);
      },
      privateKeyModInverse: function privateKeyModInverse(privateKey) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        return secp256k1.privateKeyModInverse(privateKey);
      },
      privateKeyTweakAdd: function privateKeyTweakAdd(privateKey, tweak) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        assert$b.isBuffer(tweak, messages$2.TWEAK_TYPE_INVALID);
        assert$b.isBufferLength(tweak, 32, messages$2.TWEAK_LENGTH_INVALID);
        return secp256k1.privateKeyTweakAdd(privateKey, tweak);
      },
      privateKeyTweakMul: function privateKeyTweakMul(privateKey, tweak) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        assert$b.isBuffer(tweak, messages$2.TWEAK_TYPE_INVALID);
        assert$b.isBufferLength(tweak, 32, messages$2.TWEAK_LENGTH_INVALID);
        return secp256k1.privateKeyTweakMul(privateKey, tweak);
      },
      publicKeyCreate: function publicKeyCreate(privateKey, compressed) {
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.publicKeyCreate(privateKey, compressed);
      },
      publicKeyConvert: function publicKeyConvert(publicKey, compressed) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.publicKeyConvert(publicKey, compressed);
      },
      publicKeyVerify: function publicKeyVerify(publicKey) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        return secp256k1.publicKeyVerify(publicKey);
      },
      publicKeyTweakAdd: function publicKeyTweakAdd(publicKey, tweak, compressed) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        assert$b.isBuffer(tweak, messages$2.TWEAK_TYPE_INVALID);
        assert$b.isBufferLength(tweak, 32, messages$2.TWEAK_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.publicKeyTweakAdd(publicKey, tweak, compressed);
      },
      publicKeyTweakMul: function publicKeyTweakMul(publicKey, tweak, compressed) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        assert$b.isBuffer(tweak, messages$2.TWEAK_TYPE_INVALID);
        assert$b.isBufferLength(tweak, 32, messages$2.TWEAK_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.publicKeyTweakMul(publicKey, tweak, compressed);
      },
      publicKeyCombine: function publicKeyCombine(publicKeys, compressed) {
        assert$b.isArray(publicKeys, messages$2.EC_PUBLIC_KEYS_TYPE_INVALID);
        assert$b.isLengthGTZero(publicKeys, messages$2.EC_PUBLIC_KEYS_LENGTH_INVALID);

        for (var i = 0; i < publicKeys.length; ++i) {
          assert$b.isBuffer(publicKeys[i], messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
          assert$b.isBufferLength2(publicKeys[i], 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        }

        compressed = initCompressedValue(compressed, true);
        return secp256k1.publicKeyCombine(publicKeys, compressed);
      },
      signatureNormalize: function signatureNormalize(signature) {
        assert$b.isBuffer(signature, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isBufferLength(signature, 64, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        return secp256k1.signatureNormalize(signature);
      },
      signatureExport: function signatureExport(signature) {
        assert$b.isBuffer(signature, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isBufferLength(signature, 64, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        var sigObj = secp256k1.signatureExport(signature);
        return der$1.signatureExport(sigObj);
      },
      signatureImport: function signatureImport(sig) {
        assert$b.isBuffer(sig, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isLengthGTZero(sig, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        var sigObj = der$1.signatureImport(sig);
        if (sigObj) return secp256k1.signatureImport(sigObj);
        throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_DER_FAIL);
      },
      signatureImportLax: function signatureImportLax(sig) {
        assert$b.isBuffer(sig, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isLengthGTZero(sig, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        var sigObj = der$1.signatureImportLax(sig);
        if (sigObj) return secp256k1.signatureImport(sigObj);
        throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_DER_FAIL);
      },
      sign: function sign(message, privateKey, options) {
        assert$b.isBuffer(message, messages$2.MSG32_TYPE_INVALID);
        assert$b.isBufferLength(message, 32, messages$2.MSG32_LENGTH_INVALID);
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        var data = null;
        var noncefn = null;

        if (options !== undefined) {
          assert$b.isObject(options, messages$2.OPTIONS_TYPE_INVALID);

          if (options.data !== undefined) {
            assert$b.isBuffer(options.data, messages$2.OPTIONS_DATA_TYPE_INVALID);
            assert$b.isBufferLength(options.data, 32, messages$2.OPTIONS_DATA_LENGTH_INVALID);
            data = options.data;
          }

          if (options.noncefn !== undefined) {
            assert$b.isFunction(options.noncefn, messages$2.OPTIONS_NONCEFN_TYPE_INVALID);
            noncefn = options.noncefn;
          }
        }

        return secp256k1.sign(message, privateKey, noncefn, data);
      },
      verify: function verify(message, signature, publicKey) {
        assert$b.isBuffer(message, messages$2.MSG32_TYPE_INVALID);
        assert$b.isBufferLength(message, 32, messages$2.MSG32_LENGTH_INVALID);
        assert$b.isBuffer(signature, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isBufferLength(signature, 64, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        return secp256k1.verify(message, signature, publicKey);
      },
      recover: function recover(message, signature, recovery, compressed) {
        assert$b.isBuffer(message, messages$2.MSG32_TYPE_INVALID);
        assert$b.isBufferLength(message, 32, messages$2.MSG32_LENGTH_INVALID);
        assert$b.isBuffer(signature, messages$2.ECDSA_SIGNATURE_TYPE_INVALID);
        assert$b.isBufferLength(signature, 64, messages$2.ECDSA_SIGNATURE_LENGTH_INVALID);
        assert$b.isNumber(recovery, messages$2.RECOVERY_ID_TYPE_INVALID);
        assert$b.isNumberInInterval(recovery, -1, 4, messages$2.RECOVERY_ID_VALUE_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.recover(message, signature, recovery, compressed);
      },
      ecdh: function ecdh(publicKey, privateKey) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        return secp256k1.ecdh(publicKey, privateKey);
      },
      ecdhUnsafe: function ecdhUnsafe(publicKey, privateKey, compressed) {
        assert$b.isBuffer(publicKey, messages$2.EC_PUBLIC_KEY_TYPE_INVALID);
        assert$b.isBufferLength2(publicKey, 33, 65, messages$2.EC_PUBLIC_KEY_LENGTH_INVALID);
        assert$b.isBuffer(privateKey, messages$2.EC_PRIVATE_KEY_TYPE_INVALID);
        assert$b.isBufferLength(privateKey, 32, messages$2.EC_PRIVATE_KEY_LENGTH_INVALID);
        compressed = initCompressedValue(compressed, true);
        return secp256k1.ecdhUnsafe(publicKey, privateKey, compressed);
      }
    };
  };

  var elliptic = createCommonjsModule(function (module, exports) {

    var Buffer = safeBuffer.Buffer;
    var EC = elliptic_1.ec;
    var ec = new EC('secp256k1');
    var ecparams = ec.curve;

    function loadCompressedPublicKey(first, xBuffer) {
      var x = new bn(xBuffer); // overflow

      if (x.cmp(ecparams.p) >= 0) return null;
      x = x.toRed(ecparams.red); // compute corresponding Y

      var y = x.redSqr().redIMul(x).redIAdd(ecparams.b).redSqrt();
      if (first === 0x03 !== y.isOdd()) y = y.redNeg();
      return ec.keyPair({
        pub: {
          x: x,
          y: y
        }
      });
    }

    function loadUncompressedPublicKey(first, xBuffer, yBuffer) {
      var x = new bn(xBuffer);
      var y = new bn(yBuffer); // overflow

      if (x.cmp(ecparams.p) >= 0 || y.cmp(ecparams.p) >= 0) return null;
      x = x.toRed(ecparams.red);
      y = y.toRed(ecparams.red); // is odd flag

      if ((first === 0x06 || first === 0x07) && y.isOdd() !== (first === 0x07)) return null; // x*x*x + b = y*y

      var x3 = x.redSqr().redIMul(x);
      if (!y.redSqr().redISub(x3.redIAdd(ecparams.b)).isZero()) return null;
      return ec.keyPair({
        pub: {
          x: x,
          y: y
        }
      });
    }

    function loadPublicKey(publicKey) {
      var first = publicKey[0];

      switch (first) {
        case 0x02:
        case 0x03:
          if (publicKey.length !== 33) return null;
          return loadCompressedPublicKey(first, publicKey.slice(1, 33));

        case 0x04:
        case 0x06:
        case 0x07:
          if (publicKey.length !== 65) return null;
          return loadUncompressedPublicKey(first, publicKey.slice(1, 33), publicKey.slice(33, 65));

        default:
          return null;
      }
    }

    exports.privateKeyVerify = function (privateKey) {
      var bn$1 = new bn(privateKey);
      return bn$1.cmp(ecparams.n) < 0 && !bn$1.isZero();
    };

    exports.privateKeyExport = function (privateKey, compressed) {
      var d = new bn(privateKey);
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages$2.EC_PRIVATE_KEY_EXPORT_DER_FAIL);
      return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, true));
    };

    exports.privateKeyNegate = function (privateKey) {
      var bn$1 = new bn(privateKey);
      return bn$1.isZero() ? Buffer.alloc(32) : ecparams.n.sub(bn$1).umod(ecparams.n).toArrayLike(Buffer, 'be', 32);
    };

    exports.privateKeyModInverse = function (privateKey) {
      var bn$1 = new bn(privateKey);
      if (bn$1.cmp(ecparams.n) >= 0 || bn$1.isZero()) throw new Error(messages$2.EC_PRIVATE_KEY_RANGE_INVALID);
      return bn$1.invm(ecparams.n).toArrayLike(Buffer, 'be', 32);
    };

    exports.privateKeyTweakAdd = function (privateKey, tweak) {
      var bn$1 = new bn(tweak);
      if (bn$1.cmp(ecparams.n) >= 0) throw new Error(messages$2.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);
      bn$1.iadd(new bn(privateKey));
      if (bn$1.cmp(ecparams.n) >= 0) bn$1.isub(ecparams.n);
      if (bn$1.isZero()) throw new Error(messages$2.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);
      return bn$1.toArrayLike(Buffer, 'be', 32);
    };

    exports.privateKeyTweakMul = function (privateKey, tweak) {
      var bn$1 = new bn(tweak);
      if (bn$1.cmp(ecparams.n) >= 0 || bn$1.isZero()) throw new Error(messages$2.EC_PRIVATE_KEY_TWEAK_MUL_FAIL);
      bn$1.imul(new bn(privateKey));
      if (bn$1.cmp(ecparams.n)) bn$1 = bn$1.umod(ecparams.n);
      return bn$1.toArrayLike(Buffer, 'be', 32);
    };

    exports.publicKeyCreate = function (privateKey, compressed) {
      var d = new bn(privateKey);
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages$2.EC_PUBLIC_KEY_CREATE_FAIL);
      return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, true));
    };

    exports.publicKeyConvert = function (publicKey, compressed) {
      var pair = loadPublicKey(publicKey);
      if (pair === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      return Buffer.from(pair.getPublic(compressed, true));
    };

    exports.publicKeyVerify = function (publicKey) {
      return loadPublicKey(publicKey) !== null;
    };

    exports.publicKeyTweakAdd = function (publicKey, tweak, compressed) {
      var pair = loadPublicKey(publicKey);
      if (pair === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      tweak = new bn(tweak);
      if (tweak.cmp(ecparams.n) >= 0) throw new Error(messages$2.EC_PUBLIC_KEY_TWEAK_ADD_FAIL);
      var point = ecparams.g.mul(tweak).add(pair.pub);
      if (point.isInfinity()) throw new Error(messages$2.EC_PUBLIC_KEY_TWEAK_ADD_FAIL);
      return Buffer.from(point.encode(true, compressed));
    };

    exports.publicKeyTweakMul = function (publicKey, tweak, compressed) {
      var pair = loadPublicKey(publicKey);
      if (pair === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      tweak = new bn(tweak);
      if (tweak.cmp(ecparams.n) >= 0 || tweak.isZero()) throw new Error(messages$2.EC_PUBLIC_KEY_TWEAK_MUL_FAIL);
      return Buffer.from(pair.pub.mul(tweak).encode(true, compressed));
    };

    exports.publicKeyCombine = function (publicKeys, compressed) {
      var pairs = new Array(publicKeys.length);

      for (var i = 0; i < publicKeys.length; ++i) {
        pairs[i] = loadPublicKey(publicKeys[i]);
        if (pairs[i] === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      }

      var point = pairs[0].pub;

      for (var j = 1; j < pairs.length; ++j) {
        point = point.add(pairs[j].pub);
      }

      if (point.isInfinity()) throw new Error(messages$2.EC_PUBLIC_KEY_COMBINE_FAIL);
      return Buffer.from(point.encode(true, compressed));
    };

    exports.signatureNormalize = function (signature) {
      var r = new bn(signature.slice(0, 32));
      var s = new bn(signature.slice(32, 64));
      if (r.cmp(ecparams.n) >= 0 || s.cmp(ecparams.n) >= 0) throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_FAIL);
      var result = Buffer.from(signature);
      if (s.cmp(ec.nh) === 1) ecparams.n.sub(s).toArrayLike(Buffer, 'be', 32).copy(result, 32);
      return result;
    };

    exports.signatureExport = function (signature) {
      var r = signature.slice(0, 32);
      var s = signature.slice(32, 64);
      if (new bn(r).cmp(ecparams.n) >= 0 || new bn(s).cmp(ecparams.n) >= 0) throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_FAIL);
      return {
        r: r,
        s: s
      };
    };

    exports.signatureImport = function (sigObj) {
      var r = new bn(sigObj.r);
      if (r.cmp(ecparams.n) >= 0) r = new bn(0);
      var s = new bn(sigObj.s);
      if (s.cmp(ecparams.n) >= 0) s = new bn(0);
      return Buffer.concat([r.toArrayLike(Buffer, 'be', 32), s.toArrayLike(Buffer, 'be', 32)]);
    };

    exports.sign = function (message, privateKey, noncefn, data) {
      if (typeof noncefn === 'function') {
        var getNonce = noncefn;

        noncefn = function noncefn(counter) {
          var nonce = getNonce(message, privateKey, null, data, counter);
          if (!Buffer.isBuffer(nonce) || nonce.length !== 32) throw new Error(messages$2.ECDSA_SIGN_FAIL);
          return new bn(nonce);
        };
      }

      var d = new bn(privateKey);
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages$2.ECDSA_SIGN_FAIL);
      var result = ec.sign(message, privateKey, {
        canonical: true,
        k: noncefn,
        pers: data
      });
      return {
        signature: Buffer.concat([result.r.toArrayLike(Buffer, 'be', 32), result.s.toArrayLike(Buffer, 'be', 32)]),
        recovery: result.recoveryParam
      };
    };

    exports.verify = function (message, signature, publicKey) {
      var sigObj = {
        r: signature.slice(0, 32),
        s: signature.slice(32, 64)
      };
      var sigr = new bn(sigObj.r);
      var sigs = new bn(sigObj.s);
      if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_FAIL);
      if (sigs.cmp(ec.nh) === 1 || sigr.isZero() || sigs.isZero()) return false;
      var pair = loadPublicKey(publicKey);
      if (pair === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      return ec.verify(message, sigObj, {
        x: pair.pub.x,
        y: pair.pub.y
      });
    };

    exports.recover = function (message, signature, recovery, compressed) {
      var sigObj = {
        r: signature.slice(0, 32),
        s: signature.slice(32, 64)
      };
      var sigr = new bn(sigObj.r);
      var sigs = new bn(sigObj.s);
      if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages$2.ECDSA_SIGNATURE_PARSE_FAIL);

      try {
        if (sigr.isZero() || sigs.isZero()) throw new Error();
        var point = ec.recoverPubKey(message, sigObj, recovery);
        return Buffer.from(point.encode(true, compressed));
      } catch (err) {
        throw new Error(messages$2.ECDSA_RECOVER_FAIL);
      }
    };

    exports.ecdh = function (publicKey, privateKey) {
      var shared = exports.ecdhUnsafe(publicKey, privateKey, true);
      return browser('sha256').update(shared).digest();
    };

    exports.ecdhUnsafe = function (publicKey, privateKey, compressed) {
      var pair = loadPublicKey(publicKey);
      if (pair === null) throw new Error(messages$2.EC_PUBLIC_KEY_PARSE_FAIL);
      var scalar = new bn(privateKey);
      if (scalar.cmp(ecparams.n) >= 0 || scalar.isZero()) throw new Error(messages$2.ECDH_FAIL);
      return Buffer.from(pair.pub.mul(scalar).encode(true, compressed));
    };
  });
  var elliptic_1$1 = elliptic.privateKeyVerify;
  var elliptic_2 = elliptic.privateKeyExport;
  var elliptic_3 = elliptic.privateKeyNegate;
  var elliptic_4 = elliptic.privateKeyModInverse;
  var elliptic_5 = elliptic.privateKeyTweakAdd;
  var elliptic_6 = elliptic.privateKeyTweakMul;
  var elliptic_7 = elliptic.publicKeyCreate;
  var elliptic_8 = elliptic.publicKeyConvert;
  var elliptic_9 = elliptic.publicKeyVerify;
  var elliptic_10 = elliptic.publicKeyTweakAdd;
  var elliptic_11 = elliptic.publicKeyTweakMul;
  var elliptic_12 = elliptic.publicKeyCombine;
  var elliptic_13 = elliptic.signatureNormalize;
  var elliptic_14 = elliptic.signatureExport;
  var elliptic_15 = elliptic.signatureImport;
  var elliptic_16 = elliptic.sign;
  var elliptic_17 = elliptic.verify;
  var elliptic_18 = elliptic.recover;
  var elliptic_19 = elliptic.ecdh;
  var elliptic_20 = elliptic.ecdhUnsafe;

  var elliptic$1 = lib(elliptic);

  var Buffer$D = safeBuffer.Buffer;
  var MASTER_SECRET = Buffer$D.from('Bitcoin seed', 'utf8');
  var HARDENED_OFFSET = 0x80000000;
  var LEN = 78; // Bitcoin hardcoded by default, can use package `coininfo` for others

  var BITCOIN_VERSIONS = {
    "private": 0x0488ADE4,
    "public": 0x0488B21E
  };

  function HDKey(versions) {
    this.versions = versions || BITCOIN_VERSIONS;
    this.depth = 0;
    this.index = 0;
    this._privateKey = null;
    this._publicKey = null;
    this.chainCode = null;
    this._fingerprint = 0;
    this.parentFingerprint = 0;
  }

  Object.defineProperty(HDKey.prototype, 'fingerprint', {
    get: function get() {
      return this._fingerprint;
    }
  });
  Object.defineProperty(HDKey.prototype, 'identifier', {
    get: function get() {
      return this._identifier;
    }
  });
  Object.defineProperty(HDKey.prototype, 'pubKeyHash', {
    get: function get() {
      return this.identifier;
    }
  });
  Object.defineProperty(HDKey.prototype, 'privateKey', {
    get: function get() {
      return this._privateKey;
    },
    set: function set(value) {
      assert.equal(value.length, 32, 'Private key must be 32 bytes.');
      assert(elliptic$1.privateKeyVerify(value) === true, 'Invalid private key');
      this._privateKey = value;
      this._publicKey = elliptic$1.publicKeyCreate(value, true);
      this._identifier = hash160(this.publicKey);
      this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
    }
  });
  Object.defineProperty(HDKey.prototype, 'publicKey', {
    get: function get() {
      return this._publicKey;
    },
    set: function set(value) {
      assert(value.length === 33 || value.length === 65, 'Public key must be 33 or 65 bytes.');
      assert(elliptic$1.publicKeyVerify(value) === true, 'Invalid public key');
      this._publicKey = elliptic$1.publicKeyConvert(value, true); // force compressed point

      this._identifier = hash160(this.publicKey);
      this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
      this._privateKey = null;
    }
  });
  Object.defineProperty(HDKey.prototype, 'privateExtendedKey', {
    get: function get() {
      if (this._privateKey) return coinstring.encode(serialize(this, this.versions["private"], Buffer$D.concat([Buffer$D.alloc(1, 0), this.privateKey])));else return null;
    }
  });
  Object.defineProperty(HDKey.prototype, 'publicExtendedKey', {
    get: function get() {
      return coinstring.encode(serialize(this, this.versions["public"], this.publicKey));
    }
  });

  HDKey.prototype.derive = function (path) {
    if (path === 'm' || path === 'M' || path === "m'" || path === "M'") {
      return this;
    }

    var entries = path.split('/');
    var hdkey = this;
    entries.forEach(function (c, i) {
      if (i === 0) {
        assert(/^[mM]{1}/.test(c), 'Path must start with "m" or "M"');
        return;
      }

      var hardened = c.length > 1 && c[c.length - 1] === "'";
      var childIndex = parseInt(c, 10); // & (HARDENED_OFFSET - 1)

      assert(childIndex < HARDENED_OFFSET, 'Invalid index');
      if (hardened) childIndex += HARDENED_OFFSET;
      hdkey = hdkey.deriveChild(childIndex);
    });
    return hdkey;
  };

  HDKey.prototype.deriveChild = function (index) {
    var isHardened = index >= HARDENED_OFFSET;
    var indexBuffer = Buffer$D.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);
    var data;

    if (isHardened) {
      // Hardened child
      assert(this.privateKey, 'Could not derive hardened child key');
      var pk = this.privateKey;
      var zb = Buffer$D.alloc(1, 0);
      pk = Buffer$D.concat([zb, pk]); // data = 0x00 || ser256(kpar) || ser32(index)

      data = Buffer$D.concat([pk, indexBuffer]);
    } else {
      // Normal child
      // data = serP(point(kpar)) || ser32(index)
      //      = serP(Kpar) || ser32(index)
      data = Buffer$D.concat([this.publicKey, indexBuffer]);
    }

    var I = cryptoBrowserify.createHmac('sha512', this.chainCode).update(data).digest();
    var IL = I.slice(0, 32);
    var IR = I.slice(32);
    var hd = new HDKey(this.versions); // Private parent key -> private child key

    if (this.privateKey) {
      // ki = parse256(IL) + kpar (mod n)
      try {
        hd.privateKey = elliptic$1.privateKeyTweakAdd(this.privateKey, IL); // throw if IL >= n || (privateKey + IL) === 0
      } catch (err) {
        // In case parse256(IL) >= n or ki == 0, one should proceed with the next value for i
        return this.derive(index + 1);
      } // Public parent key -> public child key

    } else {
      // Ki = point(parse256(IL)) + Kpar
      //    = G*IL + Kpar
      try {
        hd.publicKey = elliptic$1.publicKeyTweakAdd(this.publicKey, IL, true); // throw if IL >= n || (g**IL + publicKey) is infinity
      } catch (err) {
        // In case parse256(IL) >= n or Ki is the point at infinity, one should proceed with the next value for i
        return this.derive(index + 1, isHardened);
      }
    }

    hd.chainCode = IR;
    hd.depth = this.depth + 1;
    hd.parentFingerprint = this.fingerprint; // .readUInt32BE(0)

    hd.index = index;
    return hd;
  };

  HDKey.prototype.sign = function (hash) {
    return elliptic$1.sign(hash, this.privateKey).signature;
  };

  HDKey.prototype.verify = function (hash, signature) {
    return elliptic$1.verify(hash, signature, this.publicKey);
  };

  HDKey.prototype.wipePrivateData = function () {
    if (this._privateKey) cryptoBrowserify.randomBytes(this._privateKey.length).copy(this._privateKey);
    this._privateKey = null;
    return this;
  };

  HDKey.prototype.toJSON = function () {
    return {
      xpriv: this.privateExtendedKey,
      xpub: this.publicExtendedKey
    };
  };

  HDKey.fromMasterSeed = function (seedBuffer, versions) {
    var I = cryptoBrowserify.createHmac('sha512', MASTER_SECRET).update(seedBuffer).digest();
    var IL = I.slice(0, 32);
    var IR = I.slice(32);
    var hdkey = new HDKey(versions);
    hdkey.chainCode = IR;
    hdkey.privateKey = IL;
    return hdkey;
  };

  HDKey.fromExtendedKey = function (base58key, versions) {
    // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
    versions = versions || BITCOIN_VERSIONS;
    var hdkey = new HDKey(versions);
    var keyBuffer = coinstring.decode(base58key);
    var version = keyBuffer.readUInt32BE(0);
    assert(version === versions["private"] || version === versions["public"], 'Version mismatch: does not match private or public');
    hdkey.depth = keyBuffer.readUInt8(4);
    hdkey.parentFingerprint = keyBuffer.readUInt32BE(5);
    hdkey.index = keyBuffer.readUInt32BE(9);
    hdkey.chainCode = keyBuffer.slice(13, 45);
    var key = keyBuffer.slice(45);

    if (key.readUInt8(0) === 0) {
      // private
      assert(version === versions["private"], 'Version mismatch: version does not match private');
      hdkey.privateKey = key.slice(1); // cut off first 0x0 byte
    } else {
      assert(version === versions["public"], 'Version mismatch: version does not match public');
      hdkey.publicKey = key;
    }

    return hdkey;
  };

  HDKey.fromJSON = function (obj) {
    return HDKey.fromExtendedKey(obj.xpriv);
  };

  function serialize(hdkey, version, key) {
    // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
    var buffer = Buffer$D.allocUnsafe(LEN);
    buffer.writeUInt32BE(version, 0);
    buffer.writeUInt8(hdkey.depth, 4);
    var fingerprint = hdkey.depth ? hdkey.parentFingerprint : 0x00000000;
    buffer.writeUInt32BE(fingerprint, 5);
    buffer.writeUInt32BE(hdkey.index, 9);
    hdkey.chainCode.copy(buffer, 13);
    key.copy(buffer, 45);
    return buffer;
  }

  function hash160(buf) {
    var sha = cryptoBrowserify.createHash('sha256').update(buf).digest();
    return cryptoBrowserify.createHash('ripemd160').update(sha).digest();
  }

  HDKey.HARDENED_OFFSET = HARDENED_OFFSET;
  var hdkey = HDKey;

  /**
   * Returns a `Boolean` on whether or not the a `String` starts with '0x'
   * @param {String} str the string input value
   * @return {Boolean} a boolean if it is or is not hex prefixed
   * @throws if the str input is not a string
   */
  var src$1 = function isHexPrefixed(str) {
    if (typeof str !== 'string') {
      throw new Error("[is-hex-prefixed] value must be type 'string', is currently type " + _typeof(str) + ", while checking isHexPrefixed.");
    }

    return str.slice(0, 2) === '0x';
  };

  /**
   * Removes '0x' from a given `String` is present
   * @param {String} str the string value
   * @return {String|Optional} a string by pass if necessary
   */

  var src$2 = function stripHexPrefix(str) {
    if (typeof str !== 'string') {
      return str;
    }

    return src$1(str) ? str.slice(2) : str;
  };

  /**
   * Pads a `String` to have an even length
   * @param {String} value
   * @return {String} output
   */


  function padToEven(value) {
    var a = value; // eslint-disable-line

    if (typeof a !== 'string') {
      throw new Error('[ethjs-util] while padding to even, value must be string, is currently ' + _typeof(a) + ', while padToEven.');
    }

    if (a.length % 2) {
      a = '0' + a;
    }

    return a;
  }
  /**
   * Converts a `Number` into a hex `String`
   * @param {Number} i
   * @return {String}
   */


  function intToHex(i) {
    var hex = i.toString(16); // eslint-disable-line

    return '0x' + hex;
  }
  /**
   * Converts an `Number` to a `Buffer`
   * @param {Number} i
   * @return {Buffer}
   */


  function intToBuffer(i) {
    var hex = intToHex(i);
    return new Buffer(padToEven(hex.slice(2)), 'hex');
  }
  /**
   * Get the binary size of a string
   * @param {String} str
   * @return {Number}
   */


  function getBinarySize(str) {
    if (typeof str !== 'string') {
      throw new Error('[ethjs-util] while getting binary size, method getBinarySize requires input \'str\' to be type String, got \'' + _typeof(str) + '\'.');
    }

    return Buffer.byteLength(str, 'utf8');
  }
  /**
   * Returns TRUE if the first specified array contains all elements
   * from the second one. FALSE otherwise.
   *
   * @param {array} superset
   * @param {array} subset
   *
   * @returns {boolean}
   */


  function arrayContainsArray(superset, subset, some) {
    if (Array.isArray(superset) !== true) {
      throw new Error('[ethjs-util] method arrayContainsArray requires input \'superset\' to be an array got type \'' + _typeof(superset) + '\'');
    }

    if (Array.isArray(subset) !== true) {
      throw new Error('[ethjs-util] method arrayContainsArray requires input \'subset\' to be an array got type \'' + _typeof(subset) + '\'');
    }

    return subset[Boolean(some) && 'some' || 'every'](function (value) {
      return superset.indexOf(value) >= 0;
    });
  }
  /**
   * Should be called to get utf8 from it's hex representation
   *
   * @method toUtf8
   * @param {String} string in hex
   * @returns {String} ascii string representation of hex value
   */


  function toUtf8(hex) {
    var bufferValue = new Buffer(padToEven(src$2(hex).replace(/^0+|0+$/g, '')), 'hex');
    return bufferValue.toString('utf8');
  }
  /**
   * Should be called to get ascii from it's hex representation
   *
   * @method toAscii
   * @param {String} string in hex
   * @returns {String} ascii string representation of hex value
   */


  function toAscii(hex) {
    var str = ''; // eslint-disable-line

    var i = 0,
        l = hex.length; // eslint-disable-line

    if (hex.substring(0, 2) === '0x') {
      i = 2;
    }

    for (; i < l; i += 2) {
      var code = parseInt(hex.substr(i, 2), 16);
      str += String.fromCharCode(code);
    }

    return str;
  }
  /**
   * Should be called to get hex representation (prefixed by 0x) of utf8 string
   *
   * @method fromUtf8
   * @param {String} string
   * @param {Number} optional padding
   * @returns {String} hex representation of input string
   */


  function fromUtf8(stringValue) {
    var str = new Buffer(stringValue, 'utf8');
    return '0x' + padToEven(str.toString('hex')).replace(/^0+|0+$/g, '');
  }
  /**
   * Should be called to get hex representation (prefixed by 0x) of ascii string
   *
   * @method fromAscii
   * @param {String} string
   * @param {Number} optional padding
   * @returns {String} hex representation of input string
   */


  function fromAscii(stringValue) {
    var hex = ''; // eslint-disable-line

    for (var i = 0; i < stringValue.length; i++) {
      // eslint-disable-line
      var code = stringValue.charCodeAt(i);
      var n = code.toString(16);
      hex += n.length < 2 ? '0' + n : n;
    }

    return '0x' + hex;
  }
  /**
   * getKeys([{a: 1, b: 2}, {a: 3, b: 4}], 'a') => [1, 3]
   *
   * @method getKeys get specific key from inner object array of objects
   * @param {String} params
   * @param {String} key
   * @param {Boolean} allowEmpty
   * @returns {Array} output just a simple array of output keys
   */


  function getKeys(params, key, allowEmpty) {
    if (!Array.isArray(params)) {
      throw new Error('[ethjs-util] method getKeys expecting type Array as \'params\' input, got \'' + _typeof(params) + '\'');
    }

    if (typeof key !== 'string') {
      throw new Error('[ethjs-util] method getKeys expecting type String for input \'key\' got \'' + _typeof(key) + '\'.');
    }

    var result = []; // eslint-disable-line

    for (var i = 0; i < params.length; i++) {
      // eslint-disable-line
      var value = params[i][key]; // eslint-disable-line

      if (allowEmpty && !value) {
        value = '';
      } else if (typeof value !== 'string') {
        throw new Error('invalid abi');
      }

      result.push(value);
    }

    return result;
  }
  /**
   * Is the string a hex string.
   *
   * @method check if string is hex string of specific length
   * @param {String} value
   * @param {Number} length
   * @returns {Boolean} output the string is a hex string
   */


  function isHexString(value, length) {
    if (typeof value !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) {
      return false;
    }

    if (length && value.length !== 2 + 2 * length) {
      return false;
    }

    return true;
  }

  var lib$1 = {
    arrayContainsArray: arrayContainsArray,
    intToBuffer: intToBuffer,
    getBinarySize: getBinarySize,
    isHexPrefixed: src$1,
    stripHexPrefix: src$2,
    padToEven: padToEven,
    intToHex: intToHex,
    fromAscii: fromAscii,
    fromUtf8: fromUtf8,
    toAscii: toAscii,
    toUtf8: toUtf8,
    getKeys: getKeys,
    isHexString: isHexString
  };

  var bytes = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    /**
     * Returns a buffer filled with 0s.
     * @param bytes the number of bytes the buffer should be
     */

    exports.zeros = function (bytes) {
      return Buffer.allocUnsafe(bytes).fill(0);
    };
    /**
     * Left Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
     * Or it truncates the beginning if it exceeds.
     * @param msg the value to pad (Buffer|Array)
     * @param length the number of bytes the output should be
     * @param right whether to start padding form the left or right
     * @return (Buffer|Array)
     */


    exports.setLengthLeft = function (msg, length, right) {
      if (right === void 0) {
        right = false;
      }

      var buf = exports.zeros(length);
      msg = exports.toBuffer(msg);

      if (right) {
        if (msg.length < length) {
          msg.copy(buf);
          return buf;
        }

        return msg.slice(0, length);
      } else {
        if (msg.length < length) {
          msg.copy(buf, length - msg.length);
          return buf;
        }

        return msg.slice(-length);
      }
    };

    exports.setLength = exports.setLengthLeft;
    /**
     * Right Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
     * Or it truncates the beginning if it exceeds.
     * @param msg the value to pad (Buffer|Array)
     * @param length the number of bytes the output should be
     * @return (Buffer|Array)
     */

    exports.setLengthRight = function (msg, length) {
      return exports.setLength(msg, length, true);
    };
    /**
     * Trims leading zeros from a `Buffer` or an `Array`.
     * @param a (Buffer|Array|String)
     * @return (Buffer|Array|String)
     */


    exports.unpad = function (a) {
      a = lib$1.stripHexPrefix(a);
      var first = a[0];

      while (a.length > 0 && first.toString() === '0') {
        a = a.slice(1);
        first = a[0];
      }

      return a;
    };

    exports.stripZeros = exports.unpad;
    /**
     * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`, null/undefined, `BN` and other objects with a `toArray()` method.
     * @param v the value
     */

    exports.toBuffer = function (v) {
      if (!isBuffer(v)) {
        if (Array.isArray(v)) {
          v = Buffer.from(v);
        } else if (typeof v === 'string') {
          if (lib$1.isHexString(v)) {
            v = Buffer.from(lib$1.padToEven(lib$1.stripHexPrefix(v)), 'hex');
          } else {
            throw new Error("Cannot convert string to buffer. toBuffer only supports 0x-prefixed hex strings and this string was given: " + v);
          }
        } else if (typeof v === 'number') {
          v = lib$1.intToBuffer(v);
        } else if (v === null || v === undefined) {
          v = Buffer.allocUnsafe(0);
        } else if (bn.isBN(v)) {
          v = v.toArrayLike(Buffer);
        } else if (v.toArray) {
          // converts a BN to a Buffer
          v = Buffer.from(v.toArray());
        } else {
          throw new Error('invalid type');
        }
      }

      return v;
    };
    /**
     * Converts a `Buffer` to a `Number`.
     * @param buf `Buffer` object to convert
     * @throws If the input number exceeds 53 bits.
     */


    exports.bufferToInt = function (buf) {
      return new bn(exports.toBuffer(buf)).toNumber();
    };
    /**
     * Converts a `Buffer` into a `0x`-prefixed hex `String`.
     * @param buf `Buffer` object to convert
     */


    exports.bufferToHex = function (buf) {
      buf = exports.toBuffer(buf);
      return '0x' + buf.toString('hex');
    };
    /**
     * Interprets a `Buffer` as a signed integer and returns a `BN`. Assumes 256-bit numbers.
     * @param num Signed integer value
     */


    exports.fromSigned = function (num) {
      return new bn(num).fromTwos(256);
    };
    /**
     * Converts a `BN` to an unsigned integer and returns it as a `Buffer`. Assumes 256-bit numbers.
     * @param num
     */


    exports.toUnsigned = function (num) {
      return Buffer.from(num.toTwos(256).toArray());
    };
    /**
     * Adds "0x" to a given `String` if it does not already start with "0x".
     */


    exports.addHexPrefix = function (str) {
      if (typeof str !== 'string') {
        return str;
      }

      return lib$1.isHexPrefixed(str) ? str : '0x' + str;
    };
    /**
     * Converts a `Buffer` or `Array` to JSON.
     * @param ba (Buffer|Array)
     * @return (Array|String|null)
     */


    exports.baToJSON = function (ba) {
      if (isBuffer(ba)) {
        return "0x" + ba.toString('hex');
      } else if (ba instanceof Array) {
        var array = [];

        for (var i = 0; i < ba.length; i++) {
          array.push(exports.baToJSON(ba[i]));
        }

        return array;
      }
    };
  });
  unwrapExports(bytes);
  var bytes_1 = bytes.zeros;
  var bytes_2 = bytes.setLengthLeft;
  var bytes_3 = bytes.setLength;
  var bytes_4 = bytes.setLengthRight;
  var bytes_5 = bytes.unpad;
  var bytes_6 = bytes.stripZeros;
  var bytes_7 = bytes.toBuffer;
  var bytes_8 = bytes.bufferToInt;
  var bytes_9 = bytes.bufferToHex;
  var bytes_10 = bytes.fromSigned;
  var bytes_11 = bytes.toUnsigned;
  var bytes_12 = bytes.addHexPrefix;
  var bytes_13 = bytes.baToJSON;

  var Buffer$E = safeBuffer.Buffer;
  var Transform$3 = Stream.Transform;

  var keccak = function keccak(KeccakState) {
    function Keccak(rate, capacity, delimitedSuffix, hashBitLength, options) {
      Transform$3.call(this, options);
      this._rate = rate;
      this._capacity = capacity;
      this._delimitedSuffix = delimitedSuffix;
      this._hashBitLength = hashBitLength;
      this._options = options;
      this._state = new KeccakState();

      this._state.initialize(rate, capacity);

      this._finalized = false;
    }

    inherits_browser(Keccak, Transform$3);

    Keccak.prototype._transform = function (chunk, encoding, callback) {
      var error = null;

      try {
        this.update(chunk, encoding);
      } catch (err) {
        error = err;
      }

      callback(error);
    };

    Keccak.prototype._flush = function (callback) {
      var error = null;

      try {
        this.push(this.digest());
      } catch (err) {
        error = err;
      }

      callback(error);
    };

    Keccak.prototype.update = function (data, encoding) {
      if (!Buffer$E.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer');
      if (this._finalized) throw new Error('Digest already called');
      if (!Buffer$E.isBuffer(data)) data = Buffer$E.from(data, encoding);

      this._state.absorb(data);

      return this;
    };

    Keccak.prototype.digest = function (encoding) {
      if (this._finalized) throw new Error('Digest already called');
      this._finalized = true;
      if (this._delimitedSuffix) this._state.absorbLastFewBits(this._delimitedSuffix);

      var digest = this._state.squeeze(this._hashBitLength / 8);

      if (encoding !== undefined) digest = digest.toString(encoding);

      this._resetState();

      return digest;
    }; // remove result from memory


    Keccak.prototype._resetState = function () {
      this._state.initialize(this._rate, this._capacity);

      return this;
    }; // because sometimes we need hash right now and little later


    Keccak.prototype._clone = function () {
      var clone = new Keccak(this._rate, this._capacity, this._delimitedSuffix, this._hashBitLength, this._options);

      this._state.copy(clone._state);

      clone._finalized = this._finalized;
      return clone;
    };

    return Keccak;
  };

  var Buffer$F = safeBuffer.Buffer;
  var Transform$4 = Stream.Transform;

  var shake = function shake(KeccakState) {
    function Shake(rate, capacity, delimitedSuffix, options) {
      Transform$4.call(this, options);
      this._rate = rate;
      this._capacity = capacity;
      this._delimitedSuffix = delimitedSuffix;
      this._options = options;
      this._state = new KeccakState();

      this._state.initialize(rate, capacity);

      this._finalized = false;
    }

    inherits_browser(Shake, Transform$4);

    Shake.prototype._transform = function (chunk, encoding, callback) {
      var error = null;

      try {
        this.update(chunk, encoding);
      } catch (err) {
        error = err;
      }

      callback(error);
    };

    Shake.prototype._flush = function () {};

    Shake.prototype._read = function (size) {
      this.push(this.squeeze(size));
    };

    Shake.prototype.update = function (data, encoding) {
      if (!Buffer$F.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer');
      if (this._finalized) throw new Error('Squeeze already called');
      if (!Buffer$F.isBuffer(data)) data = Buffer$F.from(data, encoding);

      this._state.absorb(data);

      return this;
    };

    Shake.prototype.squeeze = function (dataByteLength, encoding) {
      if (!this._finalized) {
        this._finalized = true;

        this._state.absorbLastFewBits(this._delimitedSuffix);
      }

      var data = this._state.squeeze(dataByteLength);

      if (encoding !== undefined) data = data.toString(encoding);
      return data;
    };

    Shake.prototype._resetState = function () {
      this._state.initialize(this._rate, this._capacity);

      return this;
    };

    Shake.prototype._clone = function () {
      var clone = new Shake(this._rate, this._capacity, this._delimitedSuffix, this._options);

      this._state.copy(clone._state);

      clone._finalized = this._finalized;
      return clone;
    };

    return Shake;
  };

  var api = function api(KeccakState) {
    var Keccak = keccak(KeccakState);
    var Shake = shake(KeccakState);
    return function (algorithm, options) {
      var hash = typeof algorithm === 'string' ? algorithm.toLowerCase() : algorithm;

      switch (hash) {
        case 'keccak224':
          return new Keccak(1152, 448, null, 224, options);

        case 'keccak256':
          return new Keccak(1088, 512, null, 256, options);

        case 'keccak384':
          return new Keccak(832, 768, null, 384, options);

        case 'keccak512':
          return new Keccak(576, 1024, null, 512, options);

        case 'sha3-224':
          return new Keccak(1152, 448, 0x06, 224, options);

        case 'sha3-256':
          return new Keccak(1088, 512, 0x06, 256, options);

        case 'sha3-384':
          return new Keccak(832, 768, 0x06, 384, options);

        case 'sha3-512':
          return new Keccak(576, 1024, 0x06, 512, options);

        case 'shake128':
          return new Shake(1344, 256, 0x1f, options);

        case 'shake256':
          return new Shake(1088, 512, 0x1f, options);

        default:
          throw new Error('Invald algorithm: ' + algorithm);
      }
    };
  };

  var P1600_ROUND_CONSTANTS = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649, 0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771, 2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];

  var p1600 = function p1600(s) {
    for (var round = 0; round < 24; ++round) {
      // theta
      var lo0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
      var hi0 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
      var lo1 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
      var hi1 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
      var lo2 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
      var hi2 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
      var lo3 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
      var hi3 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
      var lo4 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
      var hi4 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];
      var lo = lo4 ^ (lo1 << 1 | hi1 >>> 31);
      var hi = hi4 ^ (hi1 << 1 | lo1 >>> 31);
      var t1slo0 = s[0] ^ lo;
      var t1shi0 = s[1] ^ hi;
      var t1slo5 = s[10] ^ lo;
      var t1shi5 = s[11] ^ hi;
      var t1slo10 = s[20] ^ lo;
      var t1shi10 = s[21] ^ hi;
      var t1slo15 = s[30] ^ lo;
      var t1shi15 = s[31] ^ hi;
      var t1slo20 = s[40] ^ lo;
      var t1shi20 = s[41] ^ hi;
      lo = lo0 ^ (lo2 << 1 | hi2 >>> 31);
      hi = hi0 ^ (hi2 << 1 | lo2 >>> 31);
      var t1slo1 = s[2] ^ lo;
      var t1shi1 = s[3] ^ hi;
      var t1slo6 = s[12] ^ lo;
      var t1shi6 = s[13] ^ hi;
      var t1slo11 = s[22] ^ lo;
      var t1shi11 = s[23] ^ hi;
      var t1slo16 = s[32] ^ lo;
      var t1shi16 = s[33] ^ hi;
      var t1slo21 = s[42] ^ lo;
      var t1shi21 = s[43] ^ hi;
      lo = lo1 ^ (lo3 << 1 | hi3 >>> 31);
      hi = hi1 ^ (hi3 << 1 | lo3 >>> 31);
      var t1slo2 = s[4] ^ lo;
      var t1shi2 = s[5] ^ hi;
      var t1slo7 = s[14] ^ lo;
      var t1shi7 = s[15] ^ hi;
      var t1slo12 = s[24] ^ lo;
      var t1shi12 = s[25] ^ hi;
      var t1slo17 = s[34] ^ lo;
      var t1shi17 = s[35] ^ hi;
      var t1slo22 = s[44] ^ lo;
      var t1shi22 = s[45] ^ hi;
      lo = lo2 ^ (lo4 << 1 | hi4 >>> 31);
      hi = hi2 ^ (hi4 << 1 | lo4 >>> 31);
      var t1slo3 = s[6] ^ lo;
      var t1shi3 = s[7] ^ hi;
      var t1slo8 = s[16] ^ lo;
      var t1shi8 = s[17] ^ hi;
      var t1slo13 = s[26] ^ lo;
      var t1shi13 = s[27] ^ hi;
      var t1slo18 = s[36] ^ lo;
      var t1shi18 = s[37] ^ hi;
      var t1slo23 = s[46] ^ lo;
      var t1shi23 = s[47] ^ hi;
      lo = lo3 ^ (lo0 << 1 | hi0 >>> 31);
      hi = hi3 ^ (hi0 << 1 | lo0 >>> 31);
      var t1slo4 = s[8] ^ lo;
      var t1shi4 = s[9] ^ hi;
      var t1slo9 = s[18] ^ lo;
      var t1shi9 = s[19] ^ hi;
      var t1slo14 = s[28] ^ lo;
      var t1shi14 = s[29] ^ hi;
      var t1slo19 = s[38] ^ lo;
      var t1shi19 = s[39] ^ hi;
      var t1slo24 = s[48] ^ lo;
      var t1shi24 = s[49] ^ hi; // rho & pi

      var t2slo0 = t1slo0;
      var t2shi0 = t1shi0;
      var t2slo16 = t1shi5 << 4 | t1slo5 >>> 28;
      var t2shi16 = t1slo5 << 4 | t1shi5 >>> 28;
      var t2slo7 = t1slo10 << 3 | t1shi10 >>> 29;
      var t2shi7 = t1shi10 << 3 | t1slo10 >>> 29;
      var t2slo23 = t1shi15 << 9 | t1slo15 >>> 23;
      var t2shi23 = t1slo15 << 9 | t1shi15 >>> 23;
      var t2slo14 = t1slo20 << 18 | t1shi20 >>> 14;
      var t2shi14 = t1shi20 << 18 | t1slo20 >>> 14;
      var t2slo10 = t1slo1 << 1 | t1shi1 >>> 31;
      var t2shi10 = t1shi1 << 1 | t1slo1 >>> 31;
      var t2slo1 = t1shi6 << 12 | t1slo6 >>> 20;
      var t2shi1 = t1slo6 << 12 | t1shi6 >>> 20;
      var t2slo17 = t1slo11 << 10 | t1shi11 >>> 22;
      var t2shi17 = t1shi11 << 10 | t1slo11 >>> 22;
      var t2slo8 = t1shi16 << 13 | t1slo16 >>> 19;
      var t2shi8 = t1slo16 << 13 | t1shi16 >>> 19;
      var t2slo24 = t1slo21 << 2 | t1shi21 >>> 30;
      var t2shi24 = t1shi21 << 2 | t1slo21 >>> 30;
      var t2slo20 = t1shi2 << 30 | t1slo2 >>> 2;
      var t2shi20 = t1slo2 << 30 | t1shi2 >>> 2;
      var t2slo11 = t1slo7 << 6 | t1shi7 >>> 26;
      var t2shi11 = t1shi7 << 6 | t1slo7 >>> 26;
      var t2slo2 = t1shi12 << 11 | t1slo12 >>> 21;
      var t2shi2 = t1slo12 << 11 | t1shi12 >>> 21;
      var t2slo18 = t1slo17 << 15 | t1shi17 >>> 17;
      var t2shi18 = t1shi17 << 15 | t1slo17 >>> 17;
      var t2slo9 = t1shi22 << 29 | t1slo22 >>> 3;
      var t2shi9 = t1slo22 << 29 | t1shi22 >>> 3;
      var t2slo5 = t1slo3 << 28 | t1shi3 >>> 4;
      var t2shi5 = t1shi3 << 28 | t1slo3 >>> 4;
      var t2slo21 = t1shi8 << 23 | t1slo8 >>> 9;
      var t2shi21 = t1slo8 << 23 | t1shi8 >>> 9;
      var t2slo12 = t1slo13 << 25 | t1shi13 >>> 7;
      var t2shi12 = t1shi13 << 25 | t1slo13 >>> 7;
      var t2slo3 = t1slo18 << 21 | t1shi18 >>> 11;
      var t2shi3 = t1shi18 << 21 | t1slo18 >>> 11;
      var t2slo19 = t1shi23 << 24 | t1slo23 >>> 8;
      var t2shi19 = t1slo23 << 24 | t1shi23 >>> 8;
      var t2slo15 = t1slo4 << 27 | t1shi4 >>> 5;
      var t2shi15 = t1shi4 << 27 | t1slo4 >>> 5;
      var t2slo6 = t1slo9 << 20 | t1shi9 >>> 12;
      var t2shi6 = t1shi9 << 20 | t1slo9 >>> 12;
      var t2slo22 = t1shi14 << 7 | t1slo14 >>> 25;
      var t2shi22 = t1slo14 << 7 | t1shi14 >>> 25;
      var t2slo13 = t1slo19 << 8 | t1shi19 >>> 24;
      var t2shi13 = t1shi19 << 8 | t1slo19 >>> 24;
      var t2slo4 = t1slo24 << 14 | t1shi24 >>> 18;
      var t2shi4 = t1shi24 << 14 | t1slo24 >>> 18; // chi

      s[0] = t2slo0 ^ ~t2slo1 & t2slo2;
      s[1] = t2shi0 ^ ~t2shi1 & t2shi2;
      s[10] = t2slo5 ^ ~t2slo6 & t2slo7;
      s[11] = t2shi5 ^ ~t2shi6 & t2shi7;
      s[20] = t2slo10 ^ ~t2slo11 & t2slo12;
      s[21] = t2shi10 ^ ~t2shi11 & t2shi12;
      s[30] = t2slo15 ^ ~t2slo16 & t2slo17;
      s[31] = t2shi15 ^ ~t2shi16 & t2shi17;
      s[40] = t2slo20 ^ ~t2slo21 & t2slo22;
      s[41] = t2shi20 ^ ~t2shi21 & t2shi22;
      s[2] = t2slo1 ^ ~t2slo2 & t2slo3;
      s[3] = t2shi1 ^ ~t2shi2 & t2shi3;
      s[12] = t2slo6 ^ ~t2slo7 & t2slo8;
      s[13] = t2shi6 ^ ~t2shi7 & t2shi8;
      s[22] = t2slo11 ^ ~t2slo12 & t2slo13;
      s[23] = t2shi11 ^ ~t2shi12 & t2shi13;
      s[32] = t2slo16 ^ ~t2slo17 & t2slo18;
      s[33] = t2shi16 ^ ~t2shi17 & t2shi18;
      s[42] = t2slo21 ^ ~t2slo22 & t2slo23;
      s[43] = t2shi21 ^ ~t2shi22 & t2shi23;
      s[4] = t2slo2 ^ ~t2slo3 & t2slo4;
      s[5] = t2shi2 ^ ~t2shi3 & t2shi4;
      s[14] = t2slo7 ^ ~t2slo8 & t2slo9;
      s[15] = t2shi7 ^ ~t2shi8 & t2shi9;
      s[24] = t2slo12 ^ ~t2slo13 & t2slo14;
      s[25] = t2shi12 ^ ~t2shi13 & t2shi14;
      s[34] = t2slo17 ^ ~t2slo18 & t2slo19;
      s[35] = t2shi17 ^ ~t2shi18 & t2shi19;
      s[44] = t2slo22 ^ ~t2slo23 & t2slo24;
      s[45] = t2shi22 ^ ~t2shi23 & t2shi24;
      s[6] = t2slo3 ^ ~t2slo4 & t2slo0;
      s[7] = t2shi3 ^ ~t2shi4 & t2shi0;
      s[16] = t2slo8 ^ ~t2slo9 & t2slo5;
      s[17] = t2shi8 ^ ~t2shi9 & t2shi5;
      s[26] = t2slo13 ^ ~t2slo14 & t2slo10;
      s[27] = t2shi13 ^ ~t2shi14 & t2shi10;
      s[36] = t2slo18 ^ ~t2slo19 & t2slo15;
      s[37] = t2shi18 ^ ~t2shi19 & t2shi15;
      s[46] = t2slo23 ^ ~t2slo24 & t2slo20;
      s[47] = t2shi23 ^ ~t2shi24 & t2shi20;
      s[8] = t2slo4 ^ ~t2slo0 & t2slo1;
      s[9] = t2shi4 ^ ~t2shi0 & t2shi1;
      s[18] = t2slo9 ^ ~t2slo5 & t2slo6;
      s[19] = t2shi9 ^ ~t2shi5 & t2shi6;
      s[28] = t2slo14 ^ ~t2slo10 & t2slo11;
      s[29] = t2shi14 ^ ~t2shi10 & t2shi11;
      s[38] = t2slo19 ^ ~t2slo15 & t2slo16;
      s[39] = t2shi19 ^ ~t2shi15 & t2shi16;
      s[48] = t2slo24 ^ ~t2slo20 & t2slo21;
      s[49] = t2shi24 ^ ~t2shi20 & t2shi21; // iota

      s[0] ^= P1600_ROUND_CONSTANTS[round * 2];
      s[1] ^= P1600_ROUND_CONSTANTS[round * 2 + 1];
    }
  };

  var keccakStateUnroll = {
    p1600: p1600
  };

  var Buffer$G = safeBuffer.Buffer;

  function Keccak() {
    // much faster than `new Array(50)`
    this.state = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.blockSize = null;
    this.count = 0;
    this.squeezing = false;
  }

  Keccak.prototype.initialize = function (rate, capacity) {
    for (var i = 0; i < 50; ++i) {
      this.state[i] = 0;
    }

    this.blockSize = rate / 8;
    this.count = 0;
    this.squeezing = false;
  };

  Keccak.prototype.absorb = function (data) {
    for (var i = 0; i < data.length; ++i) {
      this.state[~~(this.count / 4)] ^= data[i] << 8 * (this.count % 4);
      this.count += 1;

      if (this.count === this.blockSize) {
        keccakStateUnroll.p1600(this.state);
        this.count = 0;
      }
    }
  };

  Keccak.prototype.absorbLastFewBits = function (bits) {
    this.state[~~(this.count / 4)] ^= bits << 8 * (this.count % 4);
    if ((bits & 0x80) !== 0 && this.count === this.blockSize - 1) keccakStateUnroll.p1600(this.state);
    this.state[~~((this.blockSize - 1) / 4)] ^= 0x80 << 8 * ((this.blockSize - 1) % 4);
    keccakStateUnroll.p1600(this.state);
    this.count = 0;
    this.squeezing = true;
  };

  Keccak.prototype.squeeze = function (length) {
    if (!this.squeezing) this.absorbLastFewBits(0x01);
    var output = Buffer$G.alloc(length);

    for (var i = 0; i < length; ++i) {
      output[i] = this.state[~~(this.count / 4)] >>> 8 * (this.count % 4) & 0xff;
      this.count += 1;

      if (this.count === this.blockSize) {
        keccakStateUnroll.p1600(this.state);
        this.count = 0;
      }
    }

    return output;
  };

  Keccak.prototype.copy = function (dest) {
    for (var i = 0; i < 50; ++i) {
      dest.state[i] = this.state[i];
    }

    dest.blockSize = this.blockSize;
    dest.count = this.count;
    dest.squeezing = this.squeezing;
  };

  var keccak$1 = Keccak;

  var js = api(keccak$1);

  var dist = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    /**
     * RLP Encoding based on: https://github.com/ethereum/wiki/wiki/%5BEnglish%5D-RLP
     * This function takes in a data, convert it to buffer if not, and a length for recursion
     * @param input - will be converted to buffer
     * @returns returns buffer of encoded data
     **/

    function encode(input) {
      if (Array.isArray(input)) {
        var output = [];

        for (var i = 0; i < input.length; i++) {
          output.push(encode(input[i]));
        }

        var buf = Buffer.concat(output);
        return Buffer.concat([encodeLength(buf.length, 192), buf]);
      } else {
        var inputBuf = toBuffer(input);
        return inputBuf.length === 1 && inputBuf[0] < 128 ? inputBuf : Buffer.concat([encodeLength(inputBuf.length, 128), inputBuf]);
      }
    }

    exports.encode = encode;
    /**
     * Parse integers. Check if there is no leading zeros
     * @param v The value to parse
     * @param base The base to parse the integer into
     */

    function safeParseInt(v, base) {
      if (v.slice(0, 2) === '00') {
        throw new Error('invalid RLP: extra zeros');
      }

      return parseInt(v, base);
    }

    function encodeLength(len, offset) {
      if (len < 56) {
        return Buffer.from([len + offset]);
      } else {
        var hexLength = intToHex(len);
        var lLength = hexLength.length / 2;
        var firstByte = intToHex(offset + 55 + lLength);
        return Buffer.from(firstByte + hexLength, 'hex');
      }
    }

    function decode(input, stream) {
      if (stream === void 0) {
        stream = false;
      }

      if (!input || input.length === 0) {
        return Buffer.from([]);
      }

      var inputBuffer = toBuffer(input);

      var decoded = _decode(inputBuffer);

      if (stream) {
        return decoded;
      }

      if (decoded.remainder.length !== 0) {
        throw new Error('invalid remainder');
      }

      return decoded.data;
    }

    exports.decode = decode;
    /**
     * Get the length of the RLP input
     * @param input
     * @returns The length of the input or an empty Buffer if no input
     */

    function getLength(input) {
      if (!input || input.length === 0) {
        return Buffer.from([]);
      }

      var inputBuffer = toBuffer(input);
      var firstByte = inputBuffer[0];

      if (firstByte <= 0x7f) {
        return inputBuffer.length;
      } else if (firstByte <= 0xb7) {
        return firstByte - 0x7f;
      } else if (firstByte <= 0xbf) {
        return firstByte - 0xb6;
      } else if (firstByte <= 0xf7) {
        // a list between  0-55 bytes long
        return firstByte - 0xbf;
      } else {
        // a list  over 55 bytes long
        var llength = firstByte - 0xf6;
        var length = safeParseInt(inputBuffer.slice(1, llength).toString('hex'), 16);
        return llength + length;
      }
    }

    exports.getLength = getLength;
    /** Decode an input with RLP */

    function _decode(input) {
      var length, llength, data, innerRemainder, d;
      var decoded = [];
      var firstByte = input[0];

      if (firstByte <= 0x7f) {
        // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
        return {
          data: input.slice(0, 1),
          remainder: input.slice(1)
        };
      } else if (firstByte <= 0xb7) {
        // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
        // The range of the first byte is [0x80, 0xb7]
        length = firstByte - 0x7f; // set 0x80 null to 0

        if (firstByte === 0x80) {
          data = Buffer.from([]);
        } else {
          data = input.slice(1, length);
        }

        if (length === 2 && data[0] < 0x80) {
          throw new Error('invalid rlp encoding: byte must be less 0x80');
        }

        return {
          data: data,
          remainder: input.slice(length)
        };
      } else if (firstByte <= 0xbf) {
        llength = firstByte - 0xb6;
        length = safeParseInt(input.slice(1, llength).toString('hex'), 16);
        data = input.slice(llength, length + llength);

        if (data.length < length) {
          throw new Error('invalid RLP');
        }

        return {
          data: data,
          remainder: input.slice(length + llength)
        };
      } else if (firstByte <= 0xf7) {
        // a list between  0-55 bytes long
        length = firstByte - 0xbf;
        innerRemainder = input.slice(1, length);

        while (innerRemainder.length) {
          d = _decode(innerRemainder);
          decoded.push(d.data);
          innerRemainder = d.remainder;
        }

        return {
          data: decoded,
          remainder: input.slice(length)
        };
      } else {
        // a list  over 55 bytes long
        llength = firstByte - 0xf6;
        length = safeParseInt(input.slice(1, llength).toString('hex'), 16);
        var totalLength = llength + length;

        if (totalLength > input.length) {
          throw new Error('invalid rlp: total length is larger than the data');
        }

        innerRemainder = input.slice(llength, totalLength);

        if (innerRemainder.length === 0) {
          throw new Error('invalid rlp, List has a invalid length');
        }

        while (innerRemainder.length) {
          d = _decode(innerRemainder);
          decoded.push(d.data);
          innerRemainder = d.remainder;
        }

        return {
          data: decoded,
          remainder: input.slice(totalLength)
        };
      }
    }
    /** Check if a string is prefixed by 0x */


    function isHexPrefixed(str) {
      return str.slice(0, 2) === '0x';
    }
    /** Removes 0x from a given String */


    function stripHexPrefix(str) {
      if (typeof str !== 'string') {
        return str;
      }

      return isHexPrefixed(str) ? str.slice(2) : str;
    }
    /** Transform an integer into its hexadecimal value */


    function intToHex(integer) {
      if (integer < 0) {
        throw new Error('Invalid integer as argument, must be unsigned!');
      }

      var hex = integer.toString(16);
      return hex.length % 2 ? "0" + hex : hex;
    }
    /** Pad a string to be even */


    function padToEven(a) {
      return a.length % 2 ? "0" + a : a;
    }
    /** Transform an integer into a Buffer */


    function intToBuffer(integer) {
      var hex = intToHex(integer);
      return Buffer.from(hex, 'hex');
    }
    /** Transform anything into a Buffer */


    function toBuffer(v) {
      if (!isBuffer(v)) {
        if (typeof v === 'string') {
          if (isHexPrefixed(v)) {
            return Buffer.from(padToEven(stripHexPrefix(v)), 'hex');
          } else {
            return Buffer.from(v);
          }
        } else if (typeof v === 'number') {
          if (!v) {
            return Buffer.from([]);
          } else {
            return intToBuffer(v);
          }
        } else if (v === null || v === undefined) {
          return Buffer.from([]);
        } else if (v instanceof Uint8Array) {
          return Buffer.from(v);
        } else if (bn.isBN(v)) {
          // converts a BN to a Buffer
          return Buffer.from(v.toArray());
        } else {
          throw new Error('invalid type');
        }
      }

      return v;
    }
  });
  unwrapExports(dist);
  var dist_1 = dist.encode;
  var dist_2 = dist.decode;
  var dist_3 = dist.getLength;

  var hash$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    /**
     * Creates Keccak hash of the input
     * @param a The input data (Buffer|Array|String|Number) If the string is a 0x-prefixed hex value
     * it's interpreted as hexadecimal, otherwise as utf8.
     * @param bits The Keccak width
     */

    exports.keccak = function (a, bits) {
      if (bits === void 0) {
        bits = 256;
      }

      if (typeof a === 'string' && !lib$1.isHexString(a)) {
        a = Buffer.from(a, 'utf8');
      } else {
        a = bytes.toBuffer(a);
      }

      if (!bits) bits = 256;
      return js("keccak" + bits).update(a).digest();
    };
    /**
     * Creates Keccak-256 hash of the input, alias for keccak(a, 256).
     * @param a The input data (Buffer|Array|String|Number)
     */


    exports.keccak256 = function (a) {
      return exports.keccak(a);
    };
    /**
     * Creates SHA256 hash of the input.
     * @param a The input data (Buffer|Array|String|Number)
     */


    exports.sha256 = function (a) {
      a = bytes.toBuffer(a);
      return browser('sha256').update(a).digest();
    };
    /**
     * Creates RIPEMD160 hash of the input.
     * @param a The input data (Buffer|Array|String|Number)
     * @param padded Whether it should be padded to 256 bits or not
     */


    exports.ripemd160 = function (a, padded) {
      a = bytes.toBuffer(a);
      var hash = browser('rmd160').update(a).digest();

      if (padded === true) {
        return bytes.setLength(hash, 32);
      } else {
        return hash;
      }
    };
    /**
     * Creates SHA-3 hash of the RLP encoded version of the input.
     * @param a The input data
     */


    exports.rlphash = function (a) {
      return exports.keccak(dist.encode(a));
    };
  });
  unwrapExports(hash$1);
  var hash_1$1 = hash$1.keccak;
  var hash_2 = hash$1.keccak256;
  var hash_3 = hash$1.sha256;
  var hash_4 = hash$1.ripemd160;
  var hash_5 = hash$1.rlphash;

  var account = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    /**
     * Returns a zero address.
     */

    exports.zeroAddress = function () {
      var addressLength = 20;
      var addr = bytes.zeros(addressLength);
      return bytes.bufferToHex(addr);
    };
    /**
     * Checks if the address is a valid. Accepts checksummed addresses too.
     */


    exports.isValidAddress = function (address) {
      return /^0x[0-9a-fA-F]{40}$/.test(address);
    };
    /**
     * Checks if a given address is a zero address.
     */


    exports.isZeroAddress = function (address) {
      var zeroAddr = exports.zeroAddress();
      return zeroAddr === bytes.addHexPrefix(address);
    };
    /**
     * Returns a checksummed address.
     *
     * If a eip1191ChainId is provided, the chainId will be included in the checksum calculation. This
     * has the effect of checksummed addresses for one chain having invalid checksums for others.
     * For more details, consult EIP-1191.
     *
     * WARNING: Checksums with and without the chainId will differ. As of 2019-06-26, the most commonly
     * used variation in Ethereum was without the chainId. This may change in the future.
     */


    exports.toChecksumAddress = function (address, eip1191ChainId) {
      address = lib$1.stripHexPrefix(address).toLowerCase();
      var prefix = eip1191ChainId !== undefined ? eip1191ChainId.toString() + '0x' : '';
      var hash = hash$1.keccak(prefix + address).toString('hex');
      var ret = '0x';

      for (var i = 0; i < address.length; i++) {
        if (parseInt(hash[i], 16) >= 8) {
          ret += address[i].toUpperCase();
        } else {
          ret += address[i];
        }
      }

      return ret;
    };
    /**
     * Checks if the address is a valid checksummed address.
     *
     * See toChecksumAddress' documentation for details about the eip1191ChainId parameter.
     */


    exports.isValidChecksumAddress = function (address, eip1191ChainId) {
      return exports.isValidAddress(address) && exports.toChecksumAddress(address, eip1191ChainId) === address;
    };
    /**
     * Generates an address of a newly created contract.
     * @param from The address which is creating this new address
     * @param nonce The nonce of the from account
     */


    exports.generateAddress = function (from, nonce) {
      from = bytes.toBuffer(from);
      var nonceBN = new bn(nonce);

      if (nonceBN.isZero()) {
        // in RLP we want to encode null in the case of zero nonce
        // read the RLP documentation for an answer if you dare
        return hash$1.rlphash([from, null]).slice(-20);
      } // Only take the lower 160bits of the hash


      return hash$1.rlphash([from, Buffer.from(nonceBN.toArray())]).slice(-20);
    };
    /**
     * Generates an address for a contract created using CREATE2.
     * @param from The address which is creating this new address
     * @param salt A salt
     * @param initCode The init code of the contract being created
     */


    exports.generateAddress2 = function (from, salt, initCode) {
      var fromBuf = bytes.toBuffer(from);
      var saltBuf = bytes.toBuffer(salt);
      var initCodeBuf = bytes.toBuffer(initCode);
      assert(fromBuf.length === 20);
      assert(saltBuf.length === 32);
      var address = hash$1.keccak256(Buffer.concat([Buffer.from('ff', 'hex'), fromBuf, saltBuf, hash$1.keccak256(initCodeBuf)]));
      return address.slice(-20);
    };
    /**
     * Returns true if the supplied address belongs to a precompiled account (Byzantium).
     */


    exports.isPrecompiled = function (address) {
      var a = bytes.unpad(address);
      return a.length === 1 && a[0] >= 1 && a[0] <= 8;
    };
    /**
     * Checks if the private key satisfies the rules of the curve secp256k1.
     */


    exports.isValidPrivate = function (privateKey) {
      return elliptic$1.privateKeyVerify(privateKey);
    };
    /**
     * Checks if the public key satisfies the rules of the curve secp256k1
     * and the requirements of Ethereum.
     * @param publicKey The two points of an uncompressed key, unless sanitize is enabled
     * @param sanitize Accept public keys in other formats
     */


    exports.isValidPublic = function (publicKey, sanitize) {
      if (sanitize === void 0) {
        sanitize = false;
      }

      if (publicKey.length === 64) {
        // Convert to SEC1 for secp256k1
        return elliptic$1.publicKeyVerify(Buffer.concat([Buffer.from([4]), publicKey]));
      }

      if (!sanitize) {
        return false;
      }

      return elliptic$1.publicKeyVerify(publicKey);
    };
    /**
     * Returns the ethereum address of a given public key.
     * Accepts "Ethereum public keys" and SEC1 encoded keys.
     * @param pubKey The two points of an uncompressed key, unless sanitize is enabled
     * @param sanitize Accept public keys in other formats
     */


    exports.pubToAddress = function (pubKey, sanitize) {
      if (sanitize === void 0) {
        sanitize = false;
      }

      pubKey = bytes.toBuffer(pubKey);

      if (sanitize && pubKey.length !== 64) {
        pubKey = elliptic$1.publicKeyConvert(pubKey, false).slice(1);
      }

      assert(pubKey.length === 64); // Only take the lower 160bits of the hash

      return hash$1.keccak(pubKey).slice(-20);
    };

    exports.publicToAddress = exports.pubToAddress;
    /**
     * Returns the ethereum address of a given private key.
     * @param privateKey A private key must be 256 bits wide
     */

    exports.privateToAddress = function (privateKey) {
      return exports.publicToAddress(exports.privateToPublic(privateKey));
    };
    /**
     * Returns the ethereum public key of a given private key.
     * @param privateKey A private key must be 256 bits wide
     */


    exports.privateToPublic = function (privateKey) {
      privateKey = bytes.toBuffer(privateKey); // skip the type flag and use the X, Y points

      return elliptic$1.publicKeyCreate(privateKey, false).slice(1);
    };
    /**
     * Converts a public key to the Ethereum format.
     */


    exports.importPublic = function (publicKey) {
      publicKey = bytes.toBuffer(publicKey);

      if (publicKey.length !== 64) {
        publicKey = elliptic$1.publicKeyConvert(publicKey, false).slice(1);
      }

      return publicKey;
    };
  });
  unwrapExports(account);
  var account_1 = account.zeroAddress;
  var account_2 = account.isValidAddress;
  var account_3 = account.isZeroAddress;
  var account_4 = account.toChecksumAddress;
  var account_5 = account.isValidChecksumAddress;
  var account_6 = account.generateAddress;
  var account_7 = account.generateAddress2;
  var account_8 = account.isPrecompiled;
  var account_9 = account.isValidPrivate;
  var account_10 = account.isValidPublic;
  var account_11 = account.pubToAddress;
  var account_12 = account.publicToAddress;
  var account_13 = account.privateToAddress;
  var account_14 = account.privateToPublic;
  var account_15 = account.importPublic;

  /**
   * Return Minter style public key string
   * @param {Buffer} publicKey
   * @return {string}
   */

  function publicToString(publicKey) {
    if (!isBuffer(publicKey)) {
      throw new Error('Public key should be of type Buffer');
    }

    if (publicKey.length === 64) {
      // Ethereum style to uncompressed
      publicKey = Buffer.concat([Buffer.from([4]), publicKey]);
    }

    if (publicKey.length === 65) {
      // uncompressed to compressed
      publicKey = elliptic$1.publicKeyConvert(publicKey, true);
    }

    assert(publicKey.length === 33);
    return "Mp".concat(publicKey.slice(1).toString('hex'));
  }

  var big = createCommonjsModule(function (module) {

    (function (GLOBAL) {

      var Big,

      /************************************** EDITABLE DEFAULTS *****************************************/
      // The default values below must be integers within the stated ranges.

      /*
       * The maximum number of decimal places (DP) of the results of operations involving division:
       * div and sqrt, and pow with negative exponents.
       */
      DP = 20,
          // 0 to MAX_DP

      /*
       * The rounding mode (RM) used when rounding to the above decimal places.
       *
       *  0  Towards zero (i.e. truncate, no rounding).       (ROUND_DOWN)
       *  1  To nearest neighbour. If equidistant, round up.  (ROUND_HALF_UP)
       *  2  To nearest neighbour. If equidistant, to even.   (ROUND_HALF_EVEN)
       *  3  Away from zero.                                  (ROUND_UP)
       */
      RM = 1,
          // 0, 1, 2 or 3
      // The maximum value of DP and Big.DP.
      MAX_DP = 1E6,
          // 0 to 1000000
      // The maximum magnitude of the exponent argument to the pow method.
      MAX_POWER = 1E6,
          // 1 to 1000000

      /*
       * The negative exponent (NE) at and beneath which toString returns exponential notation.
       * (JavaScript numbers: -7)
       * -1000000 is the minimum recommended exponent value of a Big.
       */
      NE = -7,
          // 0 to -1000000

      /*
       * The positive exponent (PE) at and above which toString returns exponential notation.
       * (JavaScript numbers: 21)
       * 1000000 is the maximum recommended exponent value of a Big.
       * (This limit is not enforced or checked.)
       */
      PE = 21,
          // 0 to 1000000

      /**************************************************************************************************/
      // Error messages.
      NAME = '[big.js] ',
          INVALID = NAME + 'Invalid ',
          INVALID_DP = INVALID + 'decimal places',
          INVALID_RM = INVALID + 'rounding mode',
          DIV_BY_ZERO = NAME + 'Division by zero',
          // The shared prototype object.
      P = {},
          UNDEFINED = void 0,
          NUMERIC = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
      /*
       * Create and return a Big constructor.
       *
       */

      function _Big_() {
        /*
         * The Big constructor and exported function.
         * Create and return a new instance of a Big number object.
         *
         * n {number|string|Big} A numeric value.
         */
        function Big(n) {
          var x = this; // Enable constructor usage without new.

          if (!(x instanceof Big)) return n === UNDEFINED ? _Big_() : new Big(n); // Duplicate.

          if (n instanceof Big) {
            x.s = n.s;
            x.e = n.e;
            x.c = n.c.slice();
          } else {
            parse(x, n);
          }
          /*
           * Retain a reference to this Big constructor, and shadow Big.prototype.constructor which
           * points to Object.
           */


          x.constructor = Big;
        }

        Big.prototype = P;
        Big.DP = DP;
        Big.RM = RM;
        Big.NE = NE;
        Big.PE = PE;
        Big.version = '5.2.2';
        return Big;
      }
      /*
       * Parse the number or string value passed to a Big constructor.
       *
       * x {Big} A Big number instance.
       * n {number|string} A numeric value.
       */


      function parse(x, n) {
        var e, i, nl; // Minus zero?

        if (n === 0 && 1 / n < 0) n = '-0';else if (!NUMERIC.test(n += '')) throw Error(INVALID + 'number'); // Determine sign.

        x.s = n.charAt(0) == '-' ? (n = n.slice(1), -1) : 1; // Decimal point?

        if ((e = n.indexOf('.')) > -1) n = n.replace('.', ''); // Exponential form?

        if ((i = n.search(/e/i)) > 0) {
          // Determine exponent.
          if (e < 0) e = i;
          e += +n.slice(i + 1);
          n = n.substring(0, i);
        } else if (e < 0) {
          // Integer.
          e = n.length;
        }

        nl = n.length; // Determine leading zeros.

        for (i = 0; i < nl && n.charAt(i) == '0';) {
          ++i;
        }

        if (i == nl) {
          // Zero.
          x.c = [x.e = 0];
        } else {
          // Determine trailing zeros.
          for (; nl > 0 && n.charAt(--nl) == '0';) {
          }

          x.e = e - i - 1;
          x.c = []; // Convert string to array of digits without leading/trailing zeros.

          for (e = 0; i <= nl;) {
            x.c[e++] = +n.charAt(i++);
          }
        }

        return x;
      }
      /*
       * Round Big x to a maximum of dp decimal places using rounding mode rm.
       * Called by stringify, P.div, P.round and P.sqrt.
       *
       * x {Big} The Big to round.
       * dp {number} Integer, 0 to MAX_DP inclusive.
       * rm {number} 0, 1, 2 or 3 (DOWN, HALF_UP, HALF_EVEN, UP)
       * [more] {boolean} Whether the result of division was truncated.
       */


      function round(x, dp, rm, more) {
        var xc = x.c,
            i = x.e + dp + 1;

        if (i < xc.length) {
          if (rm === 1) {
            // xc[i] is the digit after the digit that may be rounded up.
            more = xc[i] >= 5;
          } else if (rm === 2) {
            more = xc[i] > 5 || xc[i] == 5 && (more || i < 0 || xc[i + 1] !== UNDEFINED || xc[i - 1] & 1);
          } else if (rm === 3) {
            more = more || !!xc[0];
          } else {
            more = false;
            if (rm !== 0) throw Error(INVALID_RM);
          }

          if (i < 1) {
            xc.length = 1;

            if (more) {
              // 1, 0.1, 0.01, 0.001, 0.0001 etc.
              x.e = -dp;
              xc[0] = 1;
            } else {
              // Zero.
              xc[0] = x.e = 0;
            }
          } else {
            // Remove any digits after the required decimal places.
            xc.length = i--; // Round up?

            if (more) {
              // Rounding up may mean the previous digit has to be rounded up.
              for (; ++xc[i] > 9;) {
                xc[i] = 0;

                if (!i--) {
                  ++x.e;
                  xc.unshift(1);
                }
              }
            } // Remove trailing zeros.


            for (i = xc.length; !xc[--i];) {
              xc.pop();
            }
          }
        } else if (rm < 0 || rm > 3 || rm !== ~~rm) {
          throw Error(INVALID_RM);
        }

        return x;
      }
      /*
       * Return a string representing the value of Big x in normal or exponential notation.
       * Handles P.toExponential, P.toFixed, P.toJSON, P.toPrecision, P.toString and P.valueOf.
       *
       * x {Big}
       * id? {number} Caller id.
       *         1 toExponential
       *         2 toFixed
       *         3 toPrecision
       *         4 valueOf
       * n? {number|undefined} Caller's argument.
       * k? {number|undefined}
       */


      function stringify(x, id, n, k) {
        var e,
            s,
            Big = x.constructor,
            z = !x.c[0];

        if (n !== UNDEFINED) {
          if (n !== ~~n || n < (id == 3) || n > MAX_DP) {
            throw Error(id == 3 ? INVALID + 'precision' : INVALID_DP);
          }

          x = new Big(x); // The index of the digit that may be rounded up.

          n = k - x.e; // Round?

          if (x.c.length > ++k) round(x, n, Big.RM); // toFixed: recalculate k as x.e may have changed if value rounded up.

          if (id == 2) k = x.e + n + 1; // Append zeros?

          for (; x.c.length < k;) {
            x.c.push(0);
          }
        }

        e = x.e;
        s = x.c.join('');
        n = s.length; // Exponential notation?

        if (id != 2 && (id == 1 || id == 3 && k <= e || e <= Big.NE || e >= Big.PE)) {
          s = s.charAt(0) + (n > 1 ? '.' + s.slice(1) : '') + (e < 0 ? 'e' : 'e+') + e; // Normal notation.
        } else if (e < 0) {
          for (; ++e;) {
            s = '0' + s;
          }

          s = '0.' + s;
        } else if (e > 0) {
          if (++e > n) for (e -= n; e--;) {
            s += '0';
          } else if (e < n) s = s.slice(0, e) + '.' + s.slice(e);
        } else if (n > 1) {
          s = s.charAt(0) + '.' + s.slice(1);
        }

        return x.s < 0 && (!z || id == 4) ? '-' + s : s;
      } // Prototype/instance methods

      /*
       * Return a new Big whose value is the absolute value of this Big.
       */


      P.abs = function () {
        var x = new this.constructor(this);
        x.s = 1;
        return x;
      };
      /*
       * Return 1 if the value of this Big is greater than the value of Big y,
       *       -1 if the value of this Big is less than the value of Big y, or
       *        0 if they have the same value.
      */


      P.cmp = function (y) {
        var isneg,
            x = this,
            xc = x.c,
            yc = (y = new x.constructor(y)).c,
            i = x.s,
            j = y.s,
            k = x.e,
            l = y.e; // Either zero?

        if (!xc[0] || !yc[0]) return !xc[0] ? !yc[0] ? 0 : -j : i; // Signs differ?

        if (i != j) return i;
        isneg = i < 0; // Compare exponents.

        if (k != l) return k > l ^ isneg ? 1 : -1;
        j = (k = xc.length) < (l = yc.length) ? k : l; // Compare digit by digit.

        for (i = -1; ++i < j;) {
          if (xc[i] != yc[i]) return xc[i] > yc[i] ^ isneg ? 1 : -1;
        } // Compare lengths.


        return k == l ? 0 : k > l ^ isneg ? 1 : -1;
      };
      /*
       * Return a new Big whose value is the value of this Big divided by the value of Big y, rounded,
       * if necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
       */


      P.div = function (y) {
        var x = this,
            Big = x.constructor,
            a = x.c,
            // dividend
        b = (y = new Big(y)).c,
            // divisor
        k = x.s == y.s ? 1 : -1,
            dp = Big.DP;
        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) throw Error(INVALID_DP); // Divisor is zero?

        if (!b[0]) throw Error(DIV_BY_ZERO); // Dividend is 0? Return +-0.

        if (!a[0]) return new Big(k * 0);
        var bl,
            bt,
            n,
            cmp,
            ri,
            bz = b.slice(),
            ai = bl = b.length,
            al = a.length,
            r = a.slice(0, bl),
            // remainder
        rl = r.length,
            q = y,
            // quotient
        qc = q.c = [],
            qi = 0,
            d = dp + (q.e = x.e - y.e) + 1; // number of digits of the result

        q.s = k;
        k = d < 0 ? 0 : d; // Create version of divisor with leading zero.

        bz.unshift(0); // Add zeros to make remainder as long as divisor.

        for (; rl++ < bl;) {
          r.push(0);
        }

        do {
          // n is how many times the divisor goes into current remainder.
          for (n = 0; n < 10; n++) {
            // Compare divisor and remainder.
            if (bl != (rl = r.length)) {
              cmp = bl > rl ? 1 : -1;
            } else {
              for (ri = -1, cmp = 0; ++ri < bl;) {
                if (b[ri] != r[ri]) {
                  cmp = b[ri] > r[ri] ? 1 : -1;
                  break;
                }
              }
            } // If divisor < remainder, subtract divisor from remainder.


            if (cmp < 0) {
              // Remainder can't be more than 1 digit longer than divisor.
              // Equalise lengths using divisor with extra leading zero?
              for (bt = rl == bl ? b : bz; rl;) {
                if (r[--rl] < bt[rl]) {
                  ri = rl;

                  for (; ri && !r[--ri];) {
                    r[ri] = 9;
                  }

                  --r[ri];
                  r[rl] += 10;
                }

                r[rl] -= bt[rl];
              }

              for (; !r[0];) {
                r.shift();
              }
            } else {
              break;
            }
          } // Add the digit n to the result array.


          qc[qi++] = cmp ? n : ++n; // Update the remainder.

          if (r[0] && cmp) r[rl] = a[ai] || 0;else r = [a[ai]];
        } while ((ai++ < al || r[0] !== UNDEFINED) && k--); // Leading zero? Do not remove if result is simply zero (qi == 1).


        if (!qc[0] && qi != 1) {
          // There can't be more than one zero.
          qc.shift();
          q.e--;
        } // Round?


        if (qi > d) round(q, dp, Big.RM, r[0] !== UNDEFINED);
        return q;
      };
      /*
       * Return true if the value of this Big is equal to the value of Big y, otherwise return false.
       */


      P.eq = function (y) {
        return !this.cmp(y);
      };
      /*
       * Return true if the value of this Big is greater than the value of Big y, otherwise return
       * false.
       */


      P.gt = function (y) {
        return this.cmp(y) > 0;
      };
      /*
       * Return true if the value of this Big is greater than or equal to the value of Big y, otherwise
       * return false.
       */


      P.gte = function (y) {
        return this.cmp(y) > -1;
      };
      /*
       * Return true if the value of this Big is less than the value of Big y, otherwise return false.
       */


      P.lt = function (y) {
        return this.cmp(y) < 0;
      };
      /*
       * Return true if the value of this Big is less than or equal to the value of Big y, otherwise
       * return false.
       */


      P.lte = function (y) {
        return this.cmp(y) < 1;
      };
      /*
       * Return a new Big whose value is the value of this Big minus the value of Big y.
       */


      P.minus = P.sub = function (y) {
        var i,
            j,
            t,
            xlty,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s; // Signs differ?

        if (a != b) {
          y.s = -b;
          return x.plus(y);
        }

        var xc = x.c.slice(),
            xe = x.e,
            yc = y.c,
            ye = y.e; // Either zero?

        if (!xc[0] || !yc[0]) {
          // y is non-zero? x is non-zero? Or both are zero.
          return yc[0] ? (y.s = -b, y) : new Big(xc[0] ? x : 0);
        } // Determine which is the bigger number. Prepend zeros to equalise exponents.


        if (a = xe - ye) {
          if (xlty = a < 0) {
            a = -a;
            t = xc;
          } else {
            ye = xe;
            t = yc;
          }

          t.reverse();

          for (b = a; b--;) {
            t.push(0);
          }

          t.reverse();
        } else {
          // Exponents equal. Check digit by digit.
          j = ((xlty = xc.length < yc.length) ? xc : yc).length;

          for (a = b = 0; b < j; b++) {
            if (xc[b] != yc[b]) {
              xlty = xc[b] < yc[b];
              break;
            }
          }
        } // x < y? Point xc to the array of the bigger number.


        if (xlty) {
          t = xc;
          xc = yc;
          yc = t;
          y.s = -y.s;
        }
        /*
         * Append zeros to xc if shorter. No need to add zeros to yc if shorter as subtraction only
         * needs to start at yc.length.
         */


        if ((b = (j = yc.length) - (i = xc.length)) > 0) for (; b--;) {
          xc[i++] = 0;
        } // Subtract yc from xc.

        for (b = i; j > a;) {
          if (xc[--j] < yc[j]) {
            for (i = j; i && !xc[--i];) {
              xc[i] = 9;
            }

            --xc[i];
            xc[j] += 10;
          }

          xc[j] -= yc[j];
        } // Remove trailing zeros.


        for (; xc[--b] === 0;) {
          xc.pop();
        } // Remove leading zeros and adjust exponent accordingly.


        for (; xc[0] === 0;) {
          xc.shift();
          --ye;
        }

        if (!xc[0]) {
          // n - n = +0
          y.s = 1; // Result must be zero.

          xc = [ye = 0];
        }

        y.c = xc;
        y.e = ye;
        return y;
      };
      /*
       * Return a new Big whose value is the value of this Big modulo the value of Big y.
       */


      P.mod = function (y) {
        var ygtx,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s;
        if (!y.c[0]) throw Error(DIV_BY_ZERO);
        x.s = y.s = 1;
        ygtx = y.cmp(x) == 1;
        x.s = a;
        y.s = b;
        if (ygtx) return new Big(x);
        a = Big.DP;
        b = Big.RM;
        Big.DP = Big.RM = 0;
        x = x.div(y);
        Big.DP = a;
        Big.RM = b;
        return this.minus(x.times(y));
      };
      /*
       * Return a new Big whose value is the value of this Big plus the value of Big y.
       */


      P.plus = P.add = function (y) {
        var t,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s; // Signs differ?

        if (a != b) {
          y.s = -b;
          return x.minus(y);
        }

        var xe = x.e,
            xc = x.c,
            ye = y.e,
            yc = y.c; // Either zero? y is non-zero? x is non-zero? Or both are zero.

        if (!xc[0] || !yc[0]) return yc[0] ? y : new Big(xc[0] ? x : a * 0);
        xc = xc.slice(); // Prepend zeros to equalise exponents.
        // Note: reverse faster than unshifts.

        if (a = xe - ye) {
          if (a > 0) {
            ye = xe;
            t = yc;
          } else {
            a = -a;
            t = xc;
          }

          t.reverse();

          for (; a--;) {
            t.push(0);
          }

          t.reverse();
        } // Point xc to the longer array.


        if (xc.length - yc.length < 0) {
          t = yc;
          yc = xc;
          xc = t;
        }

        a = yc.length; // Only start adding at yc.length - 1 as the further digits of xc can be left as they are.

        for (b = 0; a; xc[a] %= 10) {
          b = (xc[--a] = xc[a] + yc[a] + b) / 10 | 0;
        } // No need to check for zero, as +x + +y != 0 && -x + -y != 0


        if (b) {
          xc.unshift(b);
          ++ye;
        } // Remove trailing zeros.


        for (a = xc.length; xc[--a] === 0;) {
          xc.pop();
        }

        y.c = xc;
        y.e = ye;
        return y;
      };
      /*
       * Return a Big whose value is the value of this Big raised to the power n.
       * If n is negative, round to a maximum of Big.DP decimal places using rounding
       * mode Big.RM.
       *
       * n {number} Integer, -MAX_POWER to MAX_POWER inclusive.
       */


      P.pow = function (n) {
        var x = this,
            one = new x.constructor(1),
            y = one,
            isneg = n < 0;
        if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) throw Error(INVALID + 'exponent');
        if (isneg) n = -n;

        for (;;) {
          if (n & 1) y = y.times(x);
          n >>= 1;
          if (!n) break;
          x = x.times(x);
        }

        return isneg ? one.div(y) : y;
      };
      /*
       * Return a new Big whose value is the value of this Big rounded using rounding mode rm
       * to a maximum of dp decimal places, or, if dp is negative, to an integer which is a
       * multiple of 10**-dp.
       * If dp is not specified, round to 0 decimal places.
       * If rm is not specified, use Big.RM.
       *
       * dp? {number} Integer, -MAX_DP to MAX_DP inclusive.
       * rm? 0, 1, 2 or 3 (ROUND_DOWN, ROUND_HALF_UP, ROUND_HALF_EVEN, ROUND_UP)
       */


      P.round = function (dp, rm) {
        var Big = this.constructor;
        if (dp === UNDEFINED) dp = 0;else if (dp !== ~~dp || dp < -MAX_DP || dp > MAX_DP) throw Error(INVALID_DP);
        return round(new Big(this), dp, rm === UNDEFINED ? Big.RM : rm);
      };
      /*
       * Return a new Big whose value is the square root of the value of this Big, rounded, if
       * necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
       */


      P.sqrt = function () {
        var r,
            c,
            t,
            x = this,
            Big = x.constructor,
            s = x.s,
            e = x.e,
            half = new Big(0.5); // Zero?

        if (!x.c[0]) return new Big(x); // Negative?

        if (s < 0) throw Error(NAME + 'No square root'); // Estimate.

        s = Math.sqrt(x + ''); // Math.sqrt underflow/overflow?
        // Re-estimate: pass x coefficient to Math.sqrt as integer, then adjust the result exponent.

        if (s === 0 || s === 1 / 0) {
          c = x.c.join('');
          if (!(c.length + e & 1)) c += '0';
          s = Math.sqrt(c);
          e = ((e + 1) / 2 | 0) - (e < 0 || e & 1);
          r = new Big((s == 1 / 0 ? '1e' : (s = s.toExponential()).slice(0, s.indexOf('e') + 1)) + e);
        } else {
          r = new Big(s);
        }

        e = r.e + (Big.DP += 4); // Newton-Raphson iteration.

        do {
          t = r;
          r = half.times(t.plus(x.div(t)));
        } while (t.c.slice(0, e).join('') !== r.c.slice(0, e).join(''));

        return round(r, Big.DP -= 4, Big.RM);
      };
      /*
       * Return a new Big whose value is the value of this Big times the value of Big y.
       */


      P.times = P.mul = function (y) {
        var c,
            x = this,
            Big = x.constructor,
            xc = x.c,
            yc = (y = new Big(y)).c,
            a = xc.length,
            b = yc.length,
            i = x.e,
            j = y.e; // Determine sign of result.

        y.s = x.s == y.s ? 1 : -1; // Return signed 0 if either 0.

        if (!xc[0] || !yc[0]) return new Big(y.s * 0); // Initialise exponent of result as x.e + y.e.

        y.e = i + j; // If array xc has fewer digits than yc, swap xc and yc, and lengths.

        if (a < b) {
          c = xc;
          xc = yc;
          yc = c;
          j = a;
          a = b;
          b = j;
        } // Initialise coefficient array of result with zeros.


        for (c = new Array(j = a + b); j--;) {
          c[j] = 0;
        } // Multiply.
        // i is initially xc.length.


        for (i = b; i--;) {
          b = 0; // a is yc.length.

          for (j = a + i; j > i;) {
            // Current sum of products at this digit position, plus carry.
            b = c[j] + yc[i] * xc[j - i - 1] + b;
            c[j--] = b % 10; // carry

            b = b / 10 | 0;
          }

          c[j] = (c[j] + b) % 10;
        } // Increment result exponent if there is a final carry, otherwise remove leading zero.


        if (b) ++y.e;else c.shift(); // Remove trailing zeros.

        for (i = c.length; !c[--i];) {
          c.pop();
        }

        y.c = c;
        return y;
      };
      /*
       * Return a string representing the value of this Big in exponential notation to dp fixed decimal
       * places and rounded using Big.RM.
       *
       * dp? {number} Integer, 0 to MAX_DP inclusive.
       */


      P.toExponential = function (dp) {
        return stringify(this, 1, dp, dp);
      };
      /*
       * Return a string representing the value of this Big in normal notation to dp fixed decimal
       * places and rounded using Big.RM.
       *
       * dp? {number} Integer, 0 to MAX_DP inclusive.
       *
       * (-0).toFixed(0) is '0', but (-0.1).toFixed(0) is '-0'.
       * (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
       */


      P.toFixed = function (dp) {
        return stringify(this, 2, dp, this.e + dp);
      };
      /*
       * Return a string representing the value of this Big rounded to sd significant digits using
       * Big.RM. Use exponential notation if sd is less than the number of digits necessary to represent
       * the integer part of the value in normal notation.
       *
       * sd {number} Integer, 1 to MAX_DP inclusive.
       */


      P.toPrecision = function (sd) {
        return stringify(this, 3, sd, sd - 1);
      };
      /*
       * Return a string representing the value of this Big.
       * Return exponential notation if this Big has a positive exponent equal to or greater than
       * Big.PE, or a negative exponent equal to or less than Big.NE.
       * Omit the sign for negative zero.
       */


      P.toString = function () {
        return stringify(this);
      };
      /*
       * Return a string representing the value of this Big.
       * Return exponential notation if this Big has a positive exponent equal to or greater than
       * Big.PE, or a negative exponent equal to or less than Big.NE.
       * Include the sign for negative zero.
       */


      P.valueOf = P.toJSON = function () {
        return stringify(this, 4);
      }; // Export


      Big = _Big_();
      Big['default'] = Big.Big = Big; //AMD.

      if ( module.exports) {
        module.exports = Big; //Browser.
      } else {
        GLOBAL.Big = Big;
      }
    })(commonjsGlobal);
  });

  var TX_TYPE_SEND = '0x01';
  var TX_TYPE_SELL = '0x02';
  var TX_TYPE_SELL_ALL = '0x03';
  var TX_TYPE_BUY = '0x04';
  var TX_TYPE_CREATE_COIN = '0x05';
  var TX_TYPE_DECLARE_CANDIDACY = '0x06';
  var TX_TYPE_DELEGATE = '0x07';
  var TX_TYPE_UNBOND = '0x08';
  var TX_TYPE_REDEEM_CHECK = '0x09';
  var TX_TYPE_SET_CANDIDATE_ON = '0x0A';
  var TX_TYPE_SET_CANDIDATE_OFF = '0x0B';
  var TX_TYPE_CREATE_MULTISIG = '0x0C';
  var TX_TYPE_MULTISEND = '0x0D';
  var TX_TYPE_EDIT_CANDIDATE = '0x0E';
  /** @type {Array<{hex: string, name: string}>} */

  var txTypeList = [];
  /**
   * @param hex
   * @param name
   */

  function fillList(hex, name) {
    var result = {};
    result.name = name;
    result.number = Number(hex);
    result.hex = hex;
    txTypeList[result.number] = result;
    return result;
  }

  fillList(TX_TYPE_SEND, 'send');
  fillList(TX_TYPE_SELL, 'sell');
  fillList(TX_TYPE_SELL_ALL, 'sell all');
  fillList(TX_TYPE_BUY, 'buy');
  fillList(TX_TYPE_CREATE_COIN, 'create coin');
  fillList(TX_TYPE_DECLARE_CANDIDACY, 'declare candidacy');
  fillList(TX_TYPE_DELEGATE, 'delegate');
  fillList(TX_TYPE_UNBOND, 'unbond');
  fillList(TX_TYPE_REDEEM_CHECK, 'redeem check');
  fillList(TX_TYPE_SET_CANDIDATE_ON, 'set candidate on');
  fillList(TX_TYPE_SET_CANDIDATE_OFF, 'set candidate off');
  fillList(TX_TYPE_CREATE_MULTISIG, 'create multisig');
  fillList(TX_TYPE_MULTISEND, 'multisend');
  fillList(TX_TYPE_EDIT_CANDIDATE, 'edit candidate');

  var _BASE_FEES;
  /**
   * Tx fees in units
   * @type {{string: number}}
   */

  var BASE_FEES = (_BASE_FEES = {}, _defineProperty(_BASE_FEES, TX_TYPE_SEND, 10), _defineProperty(_BASE_FEES, TX_TYPE_SELL, 100), _defineProperty(_BASE_FEES, TX_TYPE_SELL_ALL, 100), _defineProperty(_BASE_FEES, TX_TYPE_BUY, 100), _defineProperty(_BASE_FEES, TX_TYPE_CREATE_COIN, 0), _defineProperty(_BASE_FEES, TX_TYPE_DECLARE_CANDIDACY, 10000), _defineProperty(_BASE_FEES, TX_TYPE_DELEGATE, 200), _defineProperty(_BASE_FEES, TX_TYPE_UNBOND, 200), _defineProperty(_BASE_FEES, TX_TYPE_REDEEM_CHECK, 30), _defineProperty(_BASE_FEES, TX_TYPE_SET_CANDIDATE_ON, 100), _defineProperty(_BASE_FEES, TX_TYPE_SET_CANDIDATE_OFF, 100), _defineProperty(_BASE_FEES, TX_TYPE_CREATE_MULTISIG, 100), _defineProperty(_BASE_FEES, TX_TYPE_MULTISEND, 10), _defineProperty(_BASE_FEES, TX_TYPE_EDIT_CANDIDATE, 10000), _BASE_FEES);

  // Copyright (c) 2018 base-x contributors
  // Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
  // Distributed under the MIT software license, see the accompanying
  // file LICENSE or http://www.opensource.org/licenses/mit-license.php.
  // @ts-ignore


  var _Buffer = safeBuffer.Buffer;

  function base$1(ALPHABET) {
    if (ALPHABET.length >= 255) {
      throw new TypeError('Alphabet too long');
    }

    var BASE_MAP = new Uint8Array(256);
    BASE_MAP.fill(255);

    for (var i = 0; i < ALPHABET.length; i++) {
      var x = ALPHABET.charAt(i);
      var xc = x.charCodeAt(0);

      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + ' is ambiguous');
      }

      BASE_MAP[xc] = i;
    }

    var BASE = ALPHABET.length;
    var LEADER = ALPHABET.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up

    var iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up

    function encode(source) {
      if (!_Buffer.isBuffer(source)) {
        throw new TypeError('Expected Buffer');
      }

      if (source.length === 0) {
        return '';
      } // Skip & count leading zeroes.


      var zeroes = 0;
      var length = 0;
      var pbegin = 0;
      var pend = source.length;

      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      } // Allocate enough space in big-endian base58 representation.


      var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      var b58 = new Uint8Array(size); // Process the bytes.

      while (pbegin !== pend) {
        var carry = source[pbegin]; // Apply "b58 = b58 * 256 + ch".

        var i = 0;

        for (var it1 = size - 1; (carry !== 0 || i < length) && it1 !== -1; it1--, i++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }

        if (carry !== 0) {
          throw new Error('Non-zero carry');
        }

        length = i;
        pbegin++;
      } // Skip leading zeroes in base58 result.


      var it2 = size - length;

      while (it2 !== size && b58[it2] === 0) {
        it2++;
      } // Translate the result into a string.


      var str = LEADER.repeat(zeroes);

      for (; it2 < size; ++it2) {
        str += ALPHABET.charAt(b58[it2]);
      }

      return str;
    }

    function decodeUnsafe(source) {
      if (typeof source !== 'string') {
        throw new TypeError('Expected String');
      }

      if (source.length === 0) {
        return _Buffer.alloc(0);
      }

      var psz = 0; // Skip leading spaces.

      if (source[psz] === ' ') {
        return;
      } // Skip and count leading '1's.


      var zeroes = 0;
      var length = 0;

      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      } // Allocate enough space in big-endian base256 representation.


      var size = (source.length - psz) * FACTOR + 1 >>> 0; // log(58) / log(256), rounded up.

      var b256 = new Uint8Array(size); // Process the characters.

      while (source[psz]) {
        // Decode character
        var carry = BASE_MAP[source.charCodeAt(psz)]; // Invalid character

        if (carry === 255) {
          return;
        }

        var i = 0;

        for (var it3 = size - 1; (carry !== 0 || i < length) && it3 !== -1; it3--, i++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }

        if (carry !== 0) {
          throw new Error('Non-zero carry');
        }

        length = i;
        psz++;
      } // Skip trailing spaces.


      if (source[psz] === ' ') {
        return;
      } // Skip leading zeroes in b256.


      var it4 = size - length;

      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }

      var vch = _Buffer.allocUnsafe(zeroes + (size - it4));

      vch.fill(0x00, 0, zeroes);
      var j = zeroes;

      while (it4 !== size) {
        vch[j++] = b256[it4++];
      }

      return vch;
    }

    function decode(string) {
      var buffer = decodeUnsafe(string);

      if (buffer) {
        return buffer;
      }

      throw new Error('Non-base' + BASE + ' character');
    }

    return {
      encode: encode,
      decodeUnsafe: decodeUnsafe,
      decode: decode
    };
  }

  var src$3 = base$1;

  var ALPHABET$1 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var bs58$1 = src$3(ALPHABET$1);

  var Buffer$H = safeBuffer.Buffer;

  var base$2 = function base(checksumFn) {
    // Encode a buffer as a base58-check encoded string
    function encode(payload) {
      var checksum = checksumFn(payload);
      return bs58$1.encode(Buffer$H.concat([payload, checksum], payload.length + 4));
    }

    function decodeRaw(buffer) {
      var payload = buffer.slice(0, -4);
      var checksum = buffer.slice(-4);
      var newChecksum = checksumFn(payload);
      if (checksum[0] ^ newChecksum[0] | checksum[1] ^ newChecksum[1] | checksum[2] ^ newChecksum[2] | checksum[3] ^ newChecksum[3]) return;
      return payload;
    } // Decode a base58-check encoded string to a buffer, no result if checksum is wrong


    function decodeUnsafe(string) {
      var buffer = bs58$1.decodeUnsafe(string);
      if (!buffer) return;
      return decodeRaw(buffer);
    }

    function decode(string) {
      var buffer = bs58$1.decode(string);
      var payload = decodeRaw(buffer);
      if (!payload) throw new Error('Invalid checksum');
      return payload;
    }

    return {
      encode: encode,
      decode: decode,
      decodeUnsafe: decodeUnsafe
    };
  };

  function sha256x2$1(buffer) {
    var tmp = browser('sha256').update(buffer).digest();
    return browser('sha256').update(tmp).digest();
  }

  var bs58check = base$2(sha256x2$1);

  // @TODO remove some wordlists

  function assert$c(val, msg) {
    if (!val) {
      throw new Error(msg || 'Assertion failed');
    }
  }
  /**
   * BIP39 Master seed from mnemonic phrase
   * @param mnemonic - 12 words
   * @return {Buffer}
   */


  function seedFromMnemonic(mnemonic) {
    return src_1(mnemonic);
  }
  /**
   * BIP44 HD key from master seed
   * @param {Buffer} seed - 64 bytes
   * @return {HDKey}
   */

  function hdKeyFromSeed(seed) {
    return hdkey.fromMasterSeed(seed).derive("m/44'/60'/0'/0").deriveChild(0);
  }
  /**
   * @param {Buffer} [priv]
   * @param {string} [mnemonic]
   * @constructor
   */

  var Wallet = function Wallet(priv, mnemonic) {
    if (priv && mnemonic) {
      throw new Error('Cannot supply both a private and a mnemonic phrase to the constructor');
    }

    if (priv && !account_9(priv)) {
      throw new Error('Private key does not satisfy the curve requirements (ie. it is invalid)');
    }

    

    if (mnemonic) {
      var seed = seedFromMnemonic(mnemonic);
      priv = hdKeyFromSeed(seed)._privateKey;
    }

    this._privKey = priv;
    this._mnemonic = mnemonic;
  };

  Object.defineProperty(Wallet.prototype, 'mnemonic', {
    get: function get() {
      assert$c(this._mnemonic, 'This is a private key only wallet');
      return this._mnemonic;
    }
  });
  Object.defineProperty(Wallet.prototype, 'privKey', {
    get: function get() {
      return this._privKey;
    }
  }); // uncompressed public key

  Object.defineProperty(Wallet.prototype, 'pubKey', {
    get: function get() {
      if (!this._pubKey) {
        this._pubKey = account_14(this.privKey);
      }

      return this._pubKey;
    }
  });
  /**
   * @return {string}
   */

  Wallet.prototype.getMnemonic = function () {
    return this.mnemonic;
  };
  /**
   * @return {Buffer}
   */


  Wallet.prototype.getPrivateKey = function () {
    return this.privKey;
  };
  /**
   * @return {string}
   */


  Wallet.prototype.getPrivateKeyString = function () {
    return this.getPrivateKey().toString('hex');
  };
  /**
   * @return {Buffer}
   */


  Wallet.prototype.getPublicKey = function () {
    return this.pubKey;
  };
  /**
   * @return {string}
   */


  Wallet.prototype.getPublicKeyString = function () {
    return publicToString(this.getPublicKey());
  };
  /**
   * @return {Buffer}
   */


  Wallet.prototype.getAddress = function () {
    return account_12(this.pubKey);
  };
  /**
   * @return {string}
   */


  Wallet.prototype.getAddressString = function () {
    return "Mx".concat(this.getAddress().toString('hex'));
  };
  /**
   * Generate Wallet from random mnemonic
   * @return {Wallet}
   */


  function generateWallet() {
    var mnemonic = src_5();
    return walletFromMnemonic(mnemonic);
  }
  /**
   * MinterWallet from mnemonic phrase
   * @param {string} mnemonic - 12 words
   * @return {Wallet}
   */

  function walletFromMnemonic(mnemonic) {
    return new Wallet(null, mnemonic);
  }
  /**
   * MinterWallet from private key
   * @param {Buffer} priv - 64 bytes
   * @return {Wallet}
   */

  function walletFromPrivateKey(priv) {
    return new Wallet(priv);
  }
  /**
   * @param {string} priv
   * @return {Wallet}
   */

  function walletFromExtendedPrivateKey(priv) {
    assert$c(priv.slice(0, 4) === 'xprv', 'Not an extended private key');
    var tmp = bs58check.decode(priv);
    assert$c(tmp[45] === 0, 'Invalid extended private key');
    return walletFromPrivateKey(tmp.slice(46));
  }
  /**
   * Generate 12 words mnemonic phrase
   * @return {string}
   */

  function generateMnemonic() {
    return src_5();
  }
  /**
   * Check that mnemonic phrase has 12 words and represents valid entropy
   * @param {string} mnemonic
   * @return {boolean}
   */

  function isValidMnemonic(mnemonic) {
    return typeof mnemonic === 'string' && mnemonic.trim().split(/\s+/g).length >= 12 && src_6(mnemonic);
  }

  exports.default = Wallet;
  exports.generateMnemonic = generateMnemonic;
  exports.generateWallet = generateWallet;
  exports.hdKeyFromSeed = hdKeyFromSeed;
  exports.isValidMnemonic = isValidMnemonic;
  exports.seedFromMnemonic = seedFromMnemonic;
  exports.walletFromExtendedPrivateKey = walletFromExtendedPrivateKey;
  exports.walletFromMnemonic = walletFromMnemonic;
  exports.walletFromPrivateKey = walletFromPrivateKey;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
