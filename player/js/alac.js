/**
 * alac.js is released under the same terms as the original ALAC decoder from Apple,
 * which is the Apache 2 license. http://www.apache.org/licenses/LICENSE-2.0
 * https://github.com/ofmlabs/alac.js
 */

var Buffer;

Buffer = (function() {

  function Buffer(data) {
    this.data = data;
    this.length = this.data.length;
  }

  Buffer.allocate = function(size) {
    return new Buffer(new Uint8Array(size));
  };

  Buffer.prototype.copy = function() {
    return new Buffer(new Uint8Array(this.data));
  };

  Buffer.prototype.slice = function(position, length) {
    if (position === 0 && length >= this.length) {
      return new Buffer(this.data);
    } else {
      return new Buffer(this.data.subarray(position, position + length));
    }
  };

  return Buffer;

})();

var BufferList;

BufferList = (function() {

  function BufferList() {
    this.buffers = [];
    this.availableBytes = 0;
    this.availableBuffers = 0;
    this.first = null;
  }

  BufferList.prototype.copy = function() {
    var result;
    result = new BufferList;
    result.buffers = this.buffers.slice(0);
    result.first = result.buffers[0];
    result.availableBytes = this.availableBytes;
    result.availableBuffers = this.availableBuffers;
    return result;
  };

  BufferList.prototype.shift = function() {
    var result;
    result = this.buffers.shift();
    this.availableBytes -= result.length;
    this.availableBuffers -= 1;
    this.first = this.buffers[0];
    return result;
  };

  BufferList.prototype.push = function(buffer) {
    this.buffers.push(buffer);
    this.availableBytes += buffer.length;
    this.availableBuffers += 1;
    if (!this.first) this.first = buffer;
    return this;
  };

  BufferList.prototype.unshift = function(buffer) {
    this.buffers.unshift(buffer);
    this.availableBytes += buffer.length;
    this.availableBuffers += 1;
    this.first = buffer;
    return this;
  };

  return BufferList;

})();

var Stream;

Stream = (function() {
  var buf, float32, float64, float64Fallback, float80, int16, int32, int8, nativeEndian, uint16, uint32, uint8;

  buf = new ArrayBuffer(16);

  uint8 = new Uint8Array(buf);

  int8 = new Int8Array(buf);

  uint16 = new Uint16Array(buf);

  int16 = new Int16Array(buf);

  uint32 = new Uint32Array(buf);

  int32 = new Int32Array(buf);

  float32 = new Float32Array(buf);

  if (typeof Float64Array !== "undefined" && Float64Array !== null) {
    float64 = new Float64Array(buf);
  }

  nativeEndian = new Uint16Array(new Uint8Array([0x12, 0x34]).buffer)[0] === 0x3412;

  function Stream(list) {
    this.list = list;
    this.localOffset = 0;
    this.offset = 0;
  }

  Stream.fromBuffer = function(buffer) {
    var list;
    list = new BufferList;
    list.push(buffer);
    return new Stream(list);
  };

  Stream.prototype.copy = function() {
    var result;
    result = new Stream(this.list.copy());
    result.localOffset = this.localOffset;
    result.offset = this.offset;
    return result;
  };

  Stream.prototype.available = function(bytes) {
    return bytes <= this.list.availableBytes - this.localOffset;
  };

  Stream.prototype.remainingBytes = function() {
    return this.list.availableBytes - this.localOffset;
  };

  Stream.prototype.advance = function(bytes) {
    this.localOffset += bytes;
    this.offset += bytes;
    while (this.list.first && (this.localOffset >= this.list.first.length)) {
      this.localOffset -= this.list.shift().length;
    }
    return this;
  };

  Stream.prototype.readUInt8 = function() {
    var a;
    a = this.list.first.data[this.localOffset];
    this.localOffset += 1;
    this.offset += 1;
    if (this.localOffset === this.list.first.length) {
      this.localOffset = 0;
      this.list.shift();
    }
    return a;
  };

  Stream.prototype.peekUInt8 = function(offset) {
    var buffer, list, _i, _len;
    if (offset == null) offset = 0;
    offset = this.localOffset + offset;
    list = this.list.buffers;
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      buffer = list[_i];
      if (buffer.length > offset) return buffer.data[offset];
      offset -= buffer.length;
    }
    return 0;
  };

  Stream.prototype.read = function(bytes, littleEndian) {
    var i, _ref;
    if (littleEndian == null) littleEndian = false;
    if (littleEndian === nativeEndian) {
      for (i = 0; i < bytes; i += 1) {
        uint8[i] = this.readUInt8();
      }
    } else {
      for (i = _ref = bytes - 1; i >= 0; i += -1) {
        uint8[i] = this.readUInt8();
      }
    }
  };

  Stream.prototype.peek = function(bytes, offset, littleEndian) {
    var i;
    if (littleEndian == null) littleEndian = false;
    if (littleEndian === nativeEndian) {
      for (i = 0; i < bytes; i += 1) {
        uint8[i] = this.peekUInt8(offset + i);
      }
    } else {
      for (i = 0; i < bytes; i += 1) {
        uint8[bytes - i - 1] = this.peekUInt8(offset + i);
      }
    }
  };

  Stream.prototype.readInt8 = function() {
    this.read(1);
    return int8[0];
  };

  Stream.prototype.peekInt8 = function(offset) {
    if (offset == null) offset = 0;
    this.peek(1, offset);
    return int8[0];
  };

  Stream.prototype.readUInt16 = function(littleEndian) {
    this.read(2, littleEndian);
    return uint16[0];
  };

  Stream.prototype.peekUInt16 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(2, offset, littleEndian);
    return uint16[0];
  };

  Stream.prototype.readInt16 = function(littleEndian) {
    this.read(2, littleEndian);
    return int16[0];
  };

  Stream.prototype.peekInt16 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(2, offset, littleEndian);
    return int16[0];
  };

  Stream.prototype.readUInt24 = function(littleEndian) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readUInt8() << 16);
    } else {
      return (this.readUInt16() << 8) + this.readUInt8();
    }
  };

  Stream.prototype.peekUInt24 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekUInt8(offset + 2) << 16);
    } else {
      return (this.peekUInt16(offset) << 8) + this.peekUInt8(offset + 2);
    }
  };

  Stream.prototype.readInt24 = function(littleEndian) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readInt8() << 16);
    } else {
      return (this.readInt16() << 8) + this.readUInt8();
    }
  };

  Stream.prototype.peekInt24 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekInt8(offset + 2) << 16);
    } else {
      return (this.peekInt16(offset) << 8) + this.peekUInt8(offset + 2);
    }
  };

  Stream.prototype.readUInt32 = function(littleEndian) {
    this.read(4, littleEndian);
    return uint32[0];
  };

  Stream.prototype.peekUInt32 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(4, offset, littleEndian);
    return uint32[0];
  };

  Stream.prototype.readInt32 = function(littleEndian) {
    this.read(4, littleEndian);
    return int32[0];
  };

  Stream.prototype.peekInt32 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(4, offset, littleEndian);
    return int32[0];
  };

  Stream.prototype.readFloat32 = function(littleEndian) {
    this.read(4, littleEndian);
    return float32[0];
  };

  Stream.prototype.peekFloat32 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(4, offset, littleEndian);
    return float32[0];
  };

  Stream.prototype.readFloat64 = function(littleEndian) {
    this.read(8, littleEndian);
    if (float64) {
      return float64[0];
    } else {
      return float64Fallback();
    }
  };

  float64Fallback = function() {
    var exp, frac, high, low, out, sign;
    low = uint32[0], high = uint32[1];
    if (!high || high === 0x80000000) return 0.0;
    sign = 1 - (high >>> 31) * 2;
    exp = (high >>> 20) & 0x7ff;
    frac = high & 0xfffff;
    if (exp === 0x7ff) {
      if (frac) return NaN;
      return sign * Infinity;
    }
    exp -= 1023;
    out = (frac | 0x100000) * Math.pow(2, exp - 20);
    out += low * Math.pow(2, exp - 52);
    return sign * out;
  };

  Stream.prototype.peekFloat64 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(8, offset, littleEndian);
    if (float64) {
      return float64[0];
    } else {
      return float64Fallback();
    }
  };

  Stream.prototype.readFloat80 = function(littleEndian) {
    this.read(10, littleEndian);
    return float80();
  };

  float80 = function() {
    var a0, a1, exp, high, low, out, sign;
    high = uint32[0], low = uint32[1];
    a0 = uint8[9];
    a1 = uint8[8];
    sign = 1 - (a0 >>> 7) * 2;
    exp = ((a0 & 0x7F) << 8) | a1;
    if (exp === 0 && low === 0 && high === 0) return 0;
    if (exp === 0x7fff) {
      if (low === 0 && high === 0) return sign * Infinity;
      return NaN;
    }
    exp -= 16383;
    out = low * Math.pow(2, exp - 31);
    out += high * Math.pow(2, exp - 63);
    return sign * out;
  };

  Stream.prototype.peekFloat80 = function(offset, littleEndian) {
    if (offset == null) offset = 0;
    this.peek(10, offset, littleEndian);
    return float80();
  };

  Stream.prototype.readString = function(length) {
    var i, result;
    result = [];
    for (i = 0; i < length; i += 1) {
      result.push(String.fromCharCode(this.readUInt8()));
    }
    return result.join('');
  };

  Stream.prototype.peekString = function(offset, length) {
    var i, result;
    result = [];
    for (i = 0; i < length; i += 1) {
      result.push(String.fromCharCode(this.peekUInt8(offset + i)));
    }
    return result.join('');
  };

  Stream.prototype.readBuffer = function(length) {
    var i, result, to;
    result = Buffer.allocate(length);
    to = result.data;
    for (i = 0; i < length; i += 1) {
      to[i] = this.readUInt8();
    }
    return result;
  };

  Stream.prototype.peekBuffer = function(offset, length) {
    var i, result, to;
    if (offset == null) offset = 0;
    result = Buffer.allocate(length);
    to = result.data;
    for (i = 0; i < length; i += 1) {
      to[i] = this.peekUInt8(offset + i);
    }
    return result;
  };

  Stream.prototype.readSingleBuffer = function(length) {
    var result;
    result = this.list.first.slice(this.localOffset, length);
    this.advance(result.length);
    return result;
  };

  Stream.prototype.peekSingleBuffer = function(length) {
    var result;
    result = this.list.first.slice(this.localOffset, length);
    return result;
  };

  return Stream;

})();

var Bitstream;

Bitstream = (function() {

  function Bitstream(stream) {
    this.stream = stream;
    this.bitPosition = 0;
  }

  Bitstream.prototype.copy = function() {
    var result;
    result = new Bitstream(this.stream.copy());
    result.bitPosition = this.bitPosition;
    return result;
  };

  Bitstream.prototype.offset = function() {
    return 8 * this.stream.offset + this.bitPosition;
  };

  Bitstream.prototype.available = function(bits) {
    return this.stream.available((bits + 8 - this.bitPosition) / 8);
  };

  Bitstream.prototype.advance = function(bits) {
    this.bitPosition += bits;
    this.stream.advance(this.bitPosition >> 3);
    this.bitPosition = this.bitPosition & 7;
    return this;
  };

  Bitstream.prototype.align = function() {
    if (this.bitPosition !== 0) {
      this.bitPosition = 0;
      this.stream.advance(1);
    }
    return this;
  };

  Bitstream.prototype.readBig = function(bits) {
    var val;
    val = this.peekBig(bits);
    this.advance(bits);
    return val;
  };

  Bitstream.prototype.peekBig = function(bits) {
    var a, a0, a1, a2, a3, a4;
    a0 = this.stream.peekUInt8(0) * 0x0100000000;
    a1 = this.stream.peekUInt8(1) * 0x0001000000;
    a2 = this.stream.peekUInt8(2) * 0x0000010000;
    a3 = this.stream.peekUInt8(3) * 0x0000000100;
    a4 = this.stream.peekUInt8(4) * 0x0000000001;
    a = a0 + a1 + a2 + a3 + a4;
    a = a % Math.pow(2, 40 - this.bitPosition);
    a = a / Math.pow(2, 40 - this.bitPosition - bits);
    return a << 0;
  };

  Bitstream.prototype.read = function(bits) {
    var a;
    a = this.stream.peekUInt32(0);
    a = (a << this.bitPosition) >>> (32 - bits);
    this.advance(bits);
    return a;
  };

  Bitstream.prototype.peek = function(bits) {
    var a;
    a = this.stream.peekUInt32(0);
    a = (a << this.bitPosition) >>> (32 - bits);
    return a;
  };

  Bitstream.prototype.readSmall = function(bits) {
    var a;
    a = this.stream.peekUInt16(0);
    a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
    this.advance(bits);
    return a;
  };

  Bitstream.prototype.peekSmall = function(bits) {
    var a;
    a = this.stream.peekUInt16(0);
    a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
    return a;
  };

  Bitstream.prototype.readOne = function() {
    var a;
    a = this.stream.peekUInt8(0);
    a = ((a << this.bitPosition) & 0xFF) >>> 7;
    this.advance(1);
    return a;
  };

  Bitstream.prototype.peekOne = function() {
    var a;
    a = this.stream.peekUInt8(0);
    a = ((a << this.bitPosition) & 0xFF) >>> 7;
    return a;
  };

  return Bitstream;

})();

var EventEmitter,
  __slice = Array.prototype.slice;

EventEmitter = (function() {

  function EventEmitter() {}

  EventEmitter.prototype.on = function(event, fn) {
    var _base;
    if (this.events == null) this.events = {};
    if ((_base = this.events)[event] == null) _base[event] = [];
    return this.events[event].push(fn);
  };

  EventEmitter.prototype.off = function(event, fn) {
    var index, _ref;
    if (!((_ref = this.events) != null ? _ref[event] : void 0)) return;
    index = this.events[event].indexOf(fn);
    if (~index) return this.events[event].splice(index, 1);
  };

  EventEmitter.prototype.once = function(event, fn) {
    var cb,
      _this = this;
    return this.on(event, cb = function() {
      _this.off(event, cb);
      return fn.apply(null, arguments);
    });
  };

  EventEmitter.prototype.emit = function() {
    var args, event, fn, _i, _len, _ref, _ref2;
    event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!((_ref = this.events) != null ? _ref[event] : void 0)) return;
    _ref2 = this.events[event];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      fn = _ref2[_i];
      fn.apply(null, args);
    }
  };

  return EventEmitter;

})();

var Demuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Demuxer = (function(_super) {
  var formats;

  __extends(Demuxer, _super);

  Demuxer.probe = function(buffer) {
    return false;
  };

  function Demuxer(source, chunk) {
    var list, received,
      _this = this;
    list = new BufferList;
    list.push(chunk);
    this.stream = new Stream(list);
    received = false;
    source.on('data', function(chunk) {
      received = true;
      list.push(chunk);
      return _this.readChunk(chunk);
    });
    source.on('error', function(err) {
      return _this.emit('error', err);
    });
    source.on('end', function() {
      if (!received) _this.readChunk(chunk);
      return _this.emit('end');
    });
  }

  Demuxer.prototype.readChunk = function(chunk) {};

  Demuxer.prototype.seek = function(timestamp) {
    return 0;
  };

  formats = [];

  Demuxer.register = function(demuxer) {
    return formats.push(demuxer);
  };

  Demuxer.find = function(buffer) {
    var format, stream, _i, _len;
    stream = Stream.fromBuffer(buffer);
    for (_i = 0, _len = formats.length; _i < _len; _i++) {
      format = formats[_i];
      if (format.probe(stream)) return format;
    }
    return null;
  };

  return Demuxer;

})(EventEmitter);

var Decoder,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Decoder = (function(_super) {
  var codecs;

  __extends(Decoder, _super);

  function Decoder(demuxer, format) {
    var list,
      _this = this;
    this.format = format;
    list = new BufferList;
    this.stream = new Stream(list);
    this.bitstream = new Bitstream(this.stream);
    this.receivedFinalBuffer = false;
    demuxer.on('cookie', function(cookie) {
      return _this.setCookie(cookie);
    });
    demuxer.on('data', function(chunk, final) {
      _this.receivedFinalBuffer = !!final;
      list.push(chunk);
      return _this.emit('available');
    });
  }

  Decoder.prototype.setCookie = function(cookie) {};

  Decoder.prototype.readChunk = function(chunk) {};

  Decoder.prototype.seek = function(position) {
    return 'Not Implemented.';
  };

  codecs = {};

  Decoder.register = function(id, decoder) {
    return codecs[id] = decoder;
  };

  Decoder.find = function(id) {
    return codecs[id] || null;
  };

  return Decoder;

})(EventEmitter);

var Queue,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Queue = (function(_super) {

  __extends(Queue, _super);

  function Queue(decoder) {
    this.decoder = decoder;
    this.write = __bind(this.write, this);
    this.readyMark = 64;
    this.finished = false;
    this.buffering = true;
    this.buffers = [];
    this.decoder.on('data', this.write);
    this.decoder.readChunk();
  }

  Queue.prototype.write = function(buffer) {
    if (buffer) this.buffers.push(buffer);
    if (this.buffering) {
      if (this.buffers.length >= this.readyMark || this.decoder.receivedFinalBuffer) {
        this.buffering = false;
        return this.emit('ready');
      } else {
        return this.decoder.readChunk();
      }
    }
  };

  Queue.prototype.read = function() {
    if (this.buffers.length === 0) return null;
    this.decoder.readChunk();
    return this.buffers.shift();
  };

  return Queue;

})(EventEmitter);

var AudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

AudioDevice = (function(_super) {
  var devices;

  __extends(AudioDevice, _super);

  function AudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.updateTime = __bind(this.updateTime, this);
    this.playing = false;
    this.currentTime = 0;
    this._lastTime = 0;
  }

  AudioDevice.prototype.start = function() {
    var _this = this;
    if (this.playing) return;
    this.playing = true;
    if (this.device == null) {
      this.device = AudioDevice.create(this.sampleRate, this.channels);
    }
    this._lastTime = this.device.getDeviceTime();
    this._timer = setInterval(this.updateTime, 200);
    return this.device.on('refill', this.refill = function(buffer) {
      return _this.emit('refill', buffer);
    });
  };

  AudioDevice.prototype.stop = function() {
    if (!this.playing) return;
    this.playing = false;
    this.device.off('refill', this.refill);
    return clearInterval(this._timer);
  };

  AudioDevice.prototype.destroy = function() {
    this.stop();
    return this.device.destroy();
  };

  AudioDevice.prototype.seek = function(currentTime) {
    this.currentTime = currentTime;
    this._lastTime = this.device.getDeviceTime();
    return this.emit('timeUpdate', this.currentTime);
  };

  AudioDevice.prototype.updateTime = function() {
    var time;
    time = this.device.getDeviceTime();
    this.currentTime += (time - this._lastTime) / this.device.sampleRate * 1000 | 0;
    this._lastTime = time;
    return this.emit('timeUpdate', this.currentTime);
  };

  devices = [];

  AudioDevice.register = function(device) {
    return devices.push(device);
  };

  AudioDevice.create = function(sampleRate, channels) {
    var device, _i, _len;
    for (_i = 0, _len = devices.length; _i < _len; _i++) {
      device = devices[_i];
      if (device.supported) return new device(sampleRate, channels);
    }
    return null;
  };

  return AudioDevice;

})(EventEmitter);

var Asset,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Asset = (function(_super) {

  __extends(Asset, _super);

  window.Asset = Asset;

  function Asset(source) {
    var _this = this;
    this.source = source;
    this.findDecoder = __bind(this.findDecoder, this);
    this.probe = __bind(this.probe, this);
    this.buffered = 0;
    this.duration = null;
    this.format = null;
    this.metadata = null;
    this.active = false;
    this.demuxer = null;
    this.decoder = null;
    this.source.once('data', this.probe);
    this.source.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
    this.source.on('progress', function(buffered) {
      _this.buffered = buffered;
      return _this.emit('buffer', _this.buffered);
    });
  }

  Asset.fromURL = function(url) {
    var source;
    source = new HTTPSource(url);
    return new Asset(source);
  };

  Asset.fromFile = function(file) {
    var source;
    source = new FileSource(file);
    return new Asset(source);
  };

  Asset.prototype.start = function() {
    if (this.active) return;
    this.active = true;
    return this.source.start();
  };

  Asset.prototype.stop = function() {
    if (!this.active) return;
    this.active = false;
    return this.source.pause();
  };

  Asset.prototype.get = function(event, callback) {
    var _this = this;
    if (event !== 'format' && event !== 'duration' && event !== 'metadata') return;
    if (this[event] != null) {
      return callback(this[event]);
    } else {
      this.once(event, function(value) {
        _this.stop();
        return callback(value);
      });
      return this.start();
    }
  };

  Asset.prototype.probe = function(chunk) {
    var demuxer,
      _this = this;
    if (!this.active) return;
    demuxer = Demuxer.find(chunk);
    if (!demuxer) {
      return this.emit('error', 'A demuxer for this container was not found.');
    }
    this.demuxer = new demuxer(this.source, chunk);
    this.demuxer.on('format', this.findDecoder);
    this.demuxer.on('duration', function(duration) {
      _this.duration = duration;
      return _this.emit('duration', _this.duration);
    });
    this.demuxer.on('metadata', function(metadata) {
      _this.metadata = metadata;
      return _this.emit('metadata', _this.metadata);
    });
    return this.demuxer.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
  };

  Asset.prototype.findDecoder = function(format) {
    var decoder,
      _this = this;
    this.format = format;
    if (!this.active) return;
    this.emit('format', this.format);
    console.log(this.format);
    decoder = Decoder.find(this.format.formatID);
    if (!decoder) {
      return this.emit('error', "A decoder for " + this.format.formatID + " was not found.");
    }
    this.decoder = new decoder(this.demuxer, this.format);
    this.decoder.on('data', function(buffer) {
      return _this.emit('data', buffer);
    });
    this.decoder.on('error', function(err) {
      _this.emit('error', err);
      return _this.stop();
    });
    return this.emit('decodeStart');
  };

  return Asset;

})(EventEmitter);

var Player,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Player = (function(_super) {

  __extends(Player, _super);

  window.Player = Player;

  function Player(asset) {
    var _this = this;
    this.asset = asset;
    this.startPlaying = __bind(this.startPlaying, this);
    this.playing = false;
    this.buffered = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 100;
    this.pan = 0;
    this.metadata = {};
    this.filters = [new VolumeFilter(this, 'volume'), new BalanceFilter(this, 'pan')];
    this.asset.on('decodeStart', function() {
      _this.queue = new Queue(_this.asset.decoder);
      return _this.queue.once('ready', _this.startPlaying);
    });
    this.asset.on('format', function(format) {
      _this.format = format;
      return _this.emit('format', _this.format);
    });
    this.asset.on('metadata', function(metadata) {
      _this.metadata = metadata;
      return _this.emit('metadata', _this.metadata);
    });
    this.asset.on('duration', function(duration) {
      _this.duration = duration;
      return _this.emit('duration', _this.duration);
    });
  }

  Player.fromURL = function(url) {
    var asset;
    asset = Asset.fromURL(url);
    return new Player(asset);
  };

  Player.fromFile = function(file) {
    var asset;
    asset = Asset.fromFile(file);
    return new Player(asset);
  };

  Player.prototype.preload = function() {
    if (!this.asset) return;
    this.startedPreloading = true;
    return this.asset.start();
  };

  Player.prototype.play = function() {
    var _ref;
    if (this.playing) return;
    if (!this.startedPreloading) this.preload();
    this.playing = true;
    return (_ref = this.device) != null ? _ref.start() : void 0;
  };

  Player.prototype.pause = function() {
    if (!this.playing) return;
    this.playing = false;
    return this.device.stop();
  };

  Player.prototype.togglePlayback = function() {
    if (this.playing) {
      return this.pause();
    } else {
      return this.play();
    }
  };

  Player.prototype.stop = function() {
    var _ref;
    this.pause();
    this.asset.stop();
    return (_ref = this.device) != null ? _ref.destroy() : void 0;
  };

  Player.prototype.startPlaying = function() {
    var decoder, div, format, frame, frameOffset, _ref,
      _this = this;
    frame = this.queue.read();
    frameOffset = 0;
    _ref = this.asset, format = _ref.format, decoder = _ref.decoder;
    div = decoder.floatingPoint ? 1 : Math.pow(2, format.bitsPerChannel - 1);
    this.device = new AudioDevice(format.sampleRate, format.channelsPerFrame);
    this.device.on('timeUpdate', function(currentTime) {
      _this.currentTime = currentTime;
      return _this.emit('progress', _this.currentTime);
    });
    this.refill = function(buffer) {
      var bufferOffset, filter, i, max, _i, _len, _ref2;
      if (!_this.playing) return;
      bufferOffset = 0;
      while (frame && bufferOffset < buffer.length) {
        max = Math.min(frame.length - frameOffset, buffer.length - bufferOffset);
        for (i = 0; i < max; i += 1) {
          buffer[bufferOffset++] = frame[frameOffset++] / div;
        }
        if (frameOffset === frame.length) {
          frame = _this.queue.read();
          frameOffset = 0;
        }
      }
      _ref2 = _this.filters;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        filter = _ref2[_i];
        filter.process(buffer);
      }
      if (!frame) {
        if (decoder.receivedFinalBuffer) {
          _this.currentTime = _this.duration;
          _this.emit('progress', _this.currentTime);
          _this.pause();
        } else {
          _this.device.stop();
        }
      }
    };
    this.device.on('refill', this.refill);
    if (this.playing) this.device.start();
    return this.emit('ready');
  };

  return Player;

})(EventEmitter);

var WebKitAudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

WebKitAudioDevice = (function(_super) {
  var AudioContext, sharedContext;

  __extends(WebKitAudioDevice, _super);

  AudioDevice.register(WebKitAudioDevice);

  AudioContext = window.AudioContext || window.webkitAudioContext;

  WebKitAudioDevice.supported = AudioContext != null;

  sharedContext = null;

  function WebKitAudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.refill = __bind(this.refill, this);
    this.context = sharedContext != null ? sharedContext : sharedContext = new AudioContext;
    this.deviceChannels = this.context.destination.numberOfChannels;
    this.deviceSampleRate = this.context.sampleRate;
    this.node = this.context.createJavaScriptNode(4096, 0, 1);
    this.node.onaudioprocess = this.refill;
    this.node.connect(this.context.destination);
  }

  WebKitAudioDevice.prototype.refill = function(event) {
    var channelCount, channels, data, i, n, outputBuffer, _ref;
    outputBuffer = event.outputBuffer;
    channelCount = outputBuffer.numberOfChannels;
    channels = new Array(channelCount);
    for (i = 0; i < channelCount; i += 1) {
      channels[i] = outputBuffer.getChannelData(i);
    }
    data = new Float32Array(outputBuffer.length * channelCount);
    this.emit('refill', data);
    for (i = 0, _ref = outputBuffer.length; i < _ref; i += 1) {
      for (n = 0; n < channelCount; n += 1) {
        channels[n][i] = data[i * channelCount + n];
      }
    }
  };

  WebKitAudioDevice.prototype.destroy = function() {
    return this.node.disconnect(0);
  };

  WebKitAudioDevice.prototype.getDeviceTime = function() {
    return this.context.currentTime * this.deviceSampleRate;
  };

  return WebKitAudioDevice;

})(EventEmitter);

var MozillaAudioDevice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

MozillaAudioDevice = (function(_super) {
  var createTimer, destroyTimer;

  __extends(MozillaAudioDevice, _super);

  AudioDevice.register(MozillaAudioDevice);

  MozillaAudioDevice.supported = 'mozWriteAudio' in new Audio;

  function MozillaAudioDevice(sampleRate, channels) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.refill = __bind(this.refill, this);
    this.audio = new Audio;
    this.audio.mozSetup(this.channels, this.sampleRate);
    this.writePosition = 0;
    this.prebufferSize = this.sampleRate / 2;
    this.tail = null;
    this.timer = createTimer(this.refill, 100);
  }

  MozillaAudioDevice.prototype.refill = function() {
    var available, buffer, currentPosition, written;
    if (this.tail) {
      written = this.audio.mozWriteAudio(this.tail);
      this.writePosition += written;
      if (this.tailPosition < this.tail.length) {
        this.tail = this.tail.subarray(written);
      } else {
        this.tail = null;
      }
    }
    currentPosition = this.audio.mozCurrentSampleOffset();
    available = currentPosition + this.prebufferSize - this.writePosition;
    if (available > 0) {
      buffer = new Float32Array(available);
      this.emit('refill', buffer);
      written = this.audio.mozWriteAudio(buffer);
      if (written < buffer.length) this.tail = buffer.subarray(written);
      this.writePosition += written;
    }
  };

  MozillaAudioDevice.prototype.destroy = function() {
    return destroyTimer(this.timer);
  };

  MozillaAudioDevice.prototype.getDeviceTime = function() {
    return this.audio.mozCurrentSampleOffset() / this.channels;
  };

  createTimer = function(fn, interval) {
    var BlobBuilder, bb, url, worker;
    BlobBuilder = window.BlobBuilder || window.MozBlobBuilder;
    if (!(BlobBuilder && URL && Worker)) return setInterval(fn, interval);
    bb = new BlobBuilder;
    bb.append("setInterval(function() { postMessage('ping'); }, " + interval + ");");
    url = URL.createObjectURL(bb.getBlob());
    worker = new Worker(url);
    worker.onmessage = fn;
    worker.url = url;
    return worker;
  };

  destroyTimer = function(timer) {
    if (timer.terminate) {
      timer.terminate();
      return URL.revokeObjectURL(timer.url);
    } else {
      return clearInterval(timer);
    }
  };

  return MozillaAudioDevice;

})(EventEmitter);

var HTTPSource,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

HTTPSource = (function(_super) {

  __extends(HTTPSource, _super);

  function HTTPSource(url) {
    this.url = url;
    this.chunkSize = 1 << 20;
    this.inflight = false;
    this.reset();
  }

  HTTPSource.prototype.start = function() {
    var _this = this;
    this.inflight = true;
    this.xhr = new XMLHttpRequest();
    this.xhr.onload = function(event) {
      _this.length = parseInt(_this.xhr.getResponseHeader("Content-Length"));
      _this.inflight = false;
      return _this.loop();
    };
    this.xhr.onerror = function(err) {
      _this.pause();
      return _this.emit('error', err);
    };
    this.xhr.onabort = function(event) {
      console.log("HTTP Aborted: Paused?");
      return _this.inflight = false;
    };
    this.xhr.open("HEAD", this.url, true);
    return this.xhr.send(null);
  };

  HTTPSource.prototype.loop = function() {
    var endPos,
      _this = this;
    if (this.inflight || !this.length) {
      return this.emit('error', 'Something is wrong in HTTPSource.loop');
    }
    if (this.offset === this.length) {
      this.inflight = false;
      this.emit('end');
      return;
    }
    this.inflight = true;
    this.xhr = new XMLHttpRequest();
    this.xhr.onprogress = function(event) {
      return _this.emit('progress', (_this.offset + event.loaded) / _this.length * 100);
    };
    this.xhr.onload = function(event) {
      var buf, buffer, i, txt, _ref;
      if (_this.xhr.response) {
        buf = new Uint8Array(_this.xhr.response);
      } else {
        txt = _this.xhr.responseText;
        buf = new Uint8Array(txt.length);
        for (i = 0, _ref = txt.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          buf[i] = txt.charCodeAt(i) & 0xff;
        }
      }
      buffer = new Buffer(buf);
      _this.offset += buffer.length;
      _this.emit('data', buffer);
      if (_this.offset === _this.length) _this.emit('end');
      _this.emit('progress', _this.offset / _this.length * 100);
      _this.inflight = false;
      return _this.loop();
    };
    this.xhr.onerror = function(err) {
      _this.emit('error', err);
      return _this.pause();
    };
    this.xhr.onabort = function(event) {
      return _this.inflight = false;
    };
    this.xhr.open("GET", this.url, true);
    this.xhr.responseType = "arraybuffer";
    endPos = Math.min(this.offset + this.chunkSize, this.length);
    this.xhr.setRequestHeader("Range", "bytes=" + this.offset + "-" + endPos);
    this.xhr.overrideMimeType('text/plain; charset=x-user-defined');
    return this.xhr.send(null);
  };

  HTTPSource.prototype.pause = function() {
    var _ref;
    this.inflight = false;
    return (_ref = this.xhr) != null ? _ref.abort() : void 0;
  };

  HTTPSource.prototype.reset = function() {
    this.pause();
    return this.offset = 0;
  };

  return HTTPSource;

})(EventEmitter);

var FileSource,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

FileSource = (function(_super) {

  __extends(FileSource, _super);

  function FileSource(file) {
    this.file = file;
    if (!window.FileReader) {
      return this.emit('error', 'This browser does not have FileReader support.');
    }
    this.offset = 0;
    this.length = this.file.size;
    this.chunkSize = 1 << 20;
  }

  FileSource.prototype.start = function() {
    var _this = this;
    this.reader = new FileReader;
    this.reader.onload = function(e) {
      var buf;
      buf = new Buffer(new Uint8Array(e.target.result));
      _this.offset += buf.length;
      _this.emit('data', buf);
      _this.emit('progress', _this.offset / _this.length * 100);
      if (_this.offset < _this.length) return _this.loop();
    };
    this.reader.onloadend = function() {
      if (_this.offset === _this.length) {
        _this.emit('end');
        return _this.reader = null;
      }
    };
    this.reader.onerror = function(e) {
      return _this.emit('error', e);
    };
    this.reader.onprogress = function(e) {
      return _this.emit('progress', (_this.offset + e.loaded) / _this.length * 100);
    };
    return this.loop();
  };

  FileSource.prototype.loop = function() {
    var blob, endPos, slice;
    this.file[slice = 'slice'] || this.file[slice = 'webkitSlice'] || this.file[slice = 'mozSlice'];
    endPos = Math.min(this.offset + this.chunkSize, this.length);
    blob = this.file[slice](this.offset, endPos);
    return this.reader.readAsArrayBuffer(blob);
  };

  FileSource.prototype.pause = function() {
    var _ref;
    return (_ref = this.reader) != null ? _ref.abort() : void 0;
  };

  FileSource.prototype.reset = function() {
    this.pause();
    return this.offset = 0;
  };

  return FileSource;

})(EventEmitter);

var Filter;

Filter = (function() {

  function Filter(context, key) {
    if (context && key) {
      Object.defineProperty(this, 'value', {
        get: function() {
          return context[key];
        }
      });
    }
  }

  Filter.prototype.process = function(buffer) {};

  return Filter;

})();

var VolumeFilter,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

VolumeFilter = (function(_super) {

  __extends(VolumeFilter, _super);

  function VolumeFilter() {
    VolumeFilter.__super__.constructor.apply(this, arguments);
  }

  VolumeFilter.prototype.process = function(buffer) {
    var i, vol, _ref;
    if (this.value >= 100) return;
    vol = Math.max(0, Math.min(100, this.value)) / 100;
    for (i = 0, _ref = buffer.length; i < _ref; i += 1) {
      buffer[i] *= vol;
    }
  };

  return VolumeFilter;

})(Filter);

var BalanceFilter,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

BalanceFilter = (function(_super) {

  __extends(BalanceFilter, _super);

  function BalanceFilter() {
    BalanceFilter.__super__.constructor.apply(this, arguments);
  }

  BalanceFilter.prototype.process = function(buffer) {
    var i, pan, _ref;
    if (this.value === 0) return;
    pan = Math.max(-50, Math.min(50, this.value));
    for (i = 0, _ref = buffer.length; i < _ref; i += 2) {
      buffer[i] *= Math.min(1, (50 - pan) / 50);
      buffer[i + 1] *= Math.min(1, (50 + pan) / 50);
    }
  };

  return BalanceFilter;

})(Filter);

var EarwaxFilter,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

EarwaxFilter = (function(_super) {
  var NUMTAPS, filt;

  __extends(EarwaxFilter, _super);

  filt = new Int8Array([4, -6, 4, -11, -1, -5, 3, 3, -2, 5, -5, 0, 9, 1, 6, 3, -4, -1, -5, -3, -2, -5, -7, 1, 6, -7, 30, -29, 12, -3, -11, 4, -3, 7, -20, 23, 2, 0, 1, -6, -14, -5, 15, -18, 6, 7, 15, -10, -14, 22, -7, -2, -4, 9, 6, -12, 6, -6, 0, -11, 0, -5, 4, 0]);

  NUMTAPS = 64;

  function EarwaxFilter() {
    this.taps = new Float32Array(NUMTAPS * 2);
  }

  EarwaxFilter.prototype.process = function(buffer) {
    var i, len, output, _ref;
    len = buffer.length;
    i = 0;
    while (len--) {
      output = 0;
      for (i = _ref = NUMTAPS - 1; i > 0; i += -1) {
        this.taps[i] = this.taps[i - 1];
        output += this.taps[i] * filt[i];
      }
      this.taps[0] = buffer[i] / 64;
      output += this.taps[0] * filt[0];
      buffer[i++] = output;
    }
  };

  return EarwaxFilter;

})(Filter);

var CAFDemuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

CAFDemuxer = (function(_super) {

  __extends(CAFDemuxer, _super);

  function CAFDemuxer() {
    CAFDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(CAFDemuxer);

  CAFDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === 'caff';
  };

  CAFDemuxer.prototype.readChunk = function() {
    var buffer;
    if (!this.format && this.stream.available(64)) {
      if (this.stream.readString(4) !== 'caff') {
        return this.emit('error', "Invalid CAF, does not begin with 'caff'");
      }
      this.stream.advance(4);
      if (this.stream.readString(4) !== 'desc') {
        return this.emit('error', "Invalid CAF, 'caff' is not followed by 'desc'");
      }
      if (!(this.stream.readUInt32() === 0 && this.stream.readUInt32() === 32)) {
        return this.emit('error', "Invalid 'desc' size, should be 32");
      }
      this.format = {
        sampleRate: this.stream.readFloat64(),
        formatID: this.stream.readString(4),
        formatFlags: this.stream.readUInt32(),
        bytesPerPacket: this.stream.readUInt32(),
        framesPerPacket: this.stream.readUInt32(),
        channelsPerFrame: this.stream.readUInt32(),
        bitsPerChannel: this.stream.readUInt32()
      };
      this.emit('format', this.format);
    }
    while ((this.headerCache && this.stream.available(1)) || this.stream.available(13)) {
      if (!this.headerCache) {
        this.headerCache = {
          type: this.stream.readString(4),
          oversize: this.stream.readUInt32() !== 0,
          size: this.stream.readUInt32()
        };
        if (this.headerCache.type === 'data') {
          this.stream.advance(4);
          this.headerCache.size -= 4;
        }
      }
      if (this.headerCache.oversize) {
        return this.emit('error', "Holy Shit, an oversized file, not supported in JS");
      }
      switch (this.headerCache.type) {
        case 'kuki':
          if (this.stream.available(this.headerCache.size)) {
            buffer = this.stream.readBuffer(this.headerCache.size);
            this.emit('cookie', buffer);
            this.headerCache = null;
          }
          break;
        case 'pakt':
          if (this.stream.available(this.headerCache.size)) {
            if (this.stream.readUInt32() !== 0) {
              return this.emit('error', 'Sizes greater than 32 bits are not supported.');
            }
            this.numPackets = this.stream.readUInt32();
            if (this.stream.readUInt32() !== 0) {
              return this.emit('error', 'Sizes greater than 32 bits are not supported.');
            }
            this.numFrames = this.stream.readUInt32();
            this.primingFrames = this.stream.readUInt32();
            this.remainderFrames = this.stream.readUInt32();
            this.emit('duration', this.numFrames / this.format.sampleRate * 1000 | 0);
            this.stream.advance(this.headerCache.size - 24);
            this.headerCache = null;
          }
          break;
        case 'data':
          buffer = this.stream.readSingleBuffer(this.headerCache.size);
          this.headerCache.size -= buffer.length;
          this.emit('data', buffer, this.headerCache.size === 0);
          if (this.headerCache.size <= 0) this.headerCache = null;
          break;
        default:
          if (this.stream.available(this.headerCache.size)) {
            this.stream.advance(this.headerCache.size);
            this.headerCache = null;
          }
      }
    }
  };

  return CAFDemuxer;

})(Demuxer);

var M4ADemuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

M4ADemuxer = (function(_super) {
  var genres, metafields;

  __extends(M4ADemuxer, _super);

  function M4ADemuxer() {
    M4ADemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(M4ADemuxer);

  M4ADemuxer.probe = function(buffer) {
    return buffer.peekString(8, 4) === 'M4A ';
  };

  metafields = {
    '©alb': 'Album',
    '©arg': 'Arranger',
    '©art': 'Artist',
    '©ART': 'Album Artist',
    'catg': 'Category',
    '©com': 'Composer',
    'covr': 'Cover Art',
    'cpil': 'Compilation',
    '©cpy': 'Copyright',
    'cprt': 'Copyright',
    'desc': 'Description',
    'disk': 'Disk Number',
    '©gen': 'Genre',
    'gnre': 'Genre',
    '©grp': 'Grouping',
    '©isr': 'ISRC Code',
    'keyw': 'Keyword',
    '©lab': 'Record Label',
    '©lyr': 'Lyrics',
    '©nam': 'Title',
    'pcst': 'Podcast',
    'pgap': 'Gapless',
    '©phg': 'Recording Copyright',
    '©prd': 'Producer',
    '©prf': 'Performers',
    'purl': 'Podcast URL',
    'rtng': 'Rating',
    '©swf': 'Songwriter',
    'tmpo': 'Tempo',
    '©too': 'Encoder',
    'trkn': 'Track Number',
    '©wrt': 'Composer'
  };

  genres = ["Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Other", "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Pranks", "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental", "Acid", "House", "Game", "Sound Clip", "Gospel", "Noise", "AlternRock", "Bass", "Soul", "Punk", "Space", "Meditative", "Instrumental Pop", "Instrumental Rock", "Ethnic", "Gothic", "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk", "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta", "Top 40", "Christian Rap", "Pop/Funk", "Jungle", "Native American", "Cabaret", "New Wave", "Psychadelic", "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal", "Acid Punk", "Acid Jazz", "Polka", "Retro", "Musical", "Rock & Roll", "Hard Rock", "Folk", "Folk/Rock", "National Folk", "Swing", "Fast Fusion", "Bebob", "Latin", "Revival", "Celtic", "Bluegrass", "Avantgarde", "Gothic Rock", "Progressive Rock", "Psychedelic Rock", "Symphonic Rock", "Slow Rock", "Big Band", "Chorus", "Easy Listening", "Acoustic", "Humour", "Speech", "Chanson", "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus", "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba", "Folklore", "Ballad", "Power Ballad", "Rhythmic Soul", "Freestyle", "Duet", "Punk Rock", "Drum Solo", "A Capella", "Euro-House", "Dance Hall"];

  M4ADemuxer.prototype.readChunk = function() {
    var buffer, duration, field, interval, maxpos, numEntries, pos, rating, sampleRate,
      _this = this;
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.len = this.stream.readUInt32() - 8;
        this.type = this.stream.readString(4);
        if (this.len === 0) continue;
        this.readHeaders = true;
      }
      if (this.type in metafields) {
        this.metafield = this.type;
        this.readHeaders = false;
        continue;
      }
      switch (this.type) {
        case 'ftyp':
          if (!this.stream.available(this.len)) return;
          if (this.stream.readString(4) !== 'M4A ') {
            return this.emit('error', 'Not a valid M4A file.');
          }
          this.stream.advance(this.len - 4);
          break;
        case 'moov':
        case 'trak':
        case 'mdia':
        case 'minf':
        case 'stbl':
        case 'udta':
        case 'ilst':
          break;
        case 'meta':
          this.metadata = {};
          this.metaMaxPos = this.stream.offset + this.len;
          this.stream.advance(4);
          break;
        case 'data':
          if (!this.stream.available(this.len)) return;
          field = metafields[this.metafield];
          switch (this.metafield) {
            case 'disk':
            case 'trkn':
              pos = this.stream.offset;
              this.stream.advance(10);
              this.metadata[field] = this.stream.readUInt16() + ' of ' + this.stream.readUInt16();
              this.stream.advance(this.len - (this.stream.offset - pos));
              break;
            case 'cpil':
            case 'pgap':
            case 'pcst':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readUInt8() === 1;
              break;
            case 'gnre':
              this.stream.advance(8);
              this.metadata[field] = genres[this.stream.readUInt16() - 1];
              break;
            case 'rtng':
              this.stream.advance(8);
              rating = this.stream.readUInt8();
              this.metadata[field] = rating === 2 ? 'Clean' : rating !== 0 ? 'Explicit' : 'None';
              break;
            case 'tmpo':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readUInt16();
              break;
            case 'covr':
              this.stream.advance(8);
              this.metadata[field] = this.stream.readBuffer(this.len - 8).data.buffer;
              break;
            default:
              this.metadata[field] = decodeURIComponent(escape(this.stream.readString(this.len)));
          }
          break;
        case 'mdhd':
          if (!this.stream.available(this.len)) return;
          this.stream.advance(4);
          this.stream.advance(8);
          sampleRate = this.stream.readUInt32();
          duration = this.stream.readUInt32();
          this.emit('duration', duration / sampleRate * 1000 | 0);
          this.stream.advance(4);
          break;
        case 'stsd':
          if (!this.stream.available(this.len)) return;
          maxpos = this.stream.offset + this.len;
          this.stream.advance(4);
          numEntries = this.stream.readUInt32();
          if (numEntries !== 1) {
            return this.emit('error', "Only expecting one entry in sample description atom!");
          }
          this.stream.advance(4);
          this.format = {};
          this.format.formatID = this.stream.readString(4);
          this.stream.advance(6);
          if (this.stream.readUInt16() !== 1) {
            return this.emit('error', 'Unknown version in stsd atom.');
          }
          this.stream.advance(6);
          this.stream.advance(2);
          this.format.channelsPerFrame = this.stream.readUInt16();
          this.format.bitsPerChannel = this.stream.readUInt16();
          this.stream.advance(4);
          this.format.sampleRate = this.stream.readUInt16();
          this.stream.advance(2);
          this.emit('format', this.format);
          this.emit('cookie', this.stream.readBuffer(maxpos - this.stream.offset));
          this.sentCookie = true;
          if (this.dataSections) {
            interval = setInterval(function() {
              _this.emit('data', _this.dataSections.shift());
              if (_this.dataSections.length === 0) return clearInterval(interval);
            }, 100);
          }
          break;
        case 'mdat':
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          if (this.sentCookie) {
            this.emit('data', buffer, this.len === 0);
          } else {
            if (this.dataSections == null) this.dataSections = [];
            this.dataSections.push(buffer);
          }
          break;
        default:
          if (!this.stream.available(this.len)) return;
          this.stream.advance(this.len);
      }
      if (this.stream.offset === this.metaMaxPos) {
        this.emit('metadata', this.metadata);
      }
      if (this.type !== 'mdat') this.readHeaders = false;
    }
  };

  return M4ADemuxer;

})(Demuxer);

var AIFFDemuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

AIFFDemuxer = (function(_super) {

  __extends(AIFFDemuxer, _super);

  function AIFFDemuxer() {
    AIFFDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(AIFFDemuxer);

  AIFFDemuxer.probe = function(buffer) {
    var _ref;
    return buffer.peekString(0, 4) === 'FORM' && ((_ref = buffer.peekString(8, 4)) === 'AIFF' || _ref === 'AIFC');
  };

  AIFFDemuxer.prototype.readChunk = function() {
    var buffer, format, offset, _ref;
    if (!this.readStart && this.stream.available(12)) {
      if (this.stream.readString(4) !== 'FORM') {
        return this.emit('error', 'Invalid AIFF.');
      }
      this.fileSize = this.stream.readUInt32();
      this.fileType = this.stream.readString(4);
      this.readStart = true;
      if ((_ref = this.fileType) !== 'AIFF' && _ref !== 'AIFC') {
        return this.emit('error', 'Invalid AIFF.');
      }
    }
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.type = this.stream.readString(4);
        this.len = this.stream.readUInt32();
      }
      switch (this.type) {
        case 'COMM':
          if (!this.stream.available(this.len)) return;
          this.format = {
            formatID: 'lpcm',
            formatFlags: 0,
            channelsPerFrame: this.stream.readUInt16(),
            sampleCount: this.stream.readUInt32(),
            bitsPerChannel: this.stream.readUInt16(),
            sampleRate: this.stream.readFloat80()
          };
          if (this.fileType === 'AIFC') {
            format = this.stream.readString(4);
            if (format === 'sowt') {
              this.format.formatFlags |= LPCMDecoder.LITTLE_ENDIAN;
            }
            if (format === 'fl32' || format === 'fl64') {
              this.format.formatFlags |= LPCMDecoder.FLOATING_POINT;
            }
            if (format === 'twos' || format === 'sowt' || format === 'fl32' || format === 'fl64' || format === 'NONE') {
              format = 'lpcm';
            }
            this.format.formatID = format;
            this.len -= 4;
          }
          this.stream.advance(this.len - 18);
          this.emit('format', this.format);
          this.emit('duration', this.format.sampleCount / this.format.sampleRate * 1000 | 0);
          break;
        case 'SSND':
          if (!(this.readSSNDHeader && this.stream.available(4))) {
            offset = this.stream.readUInt32();
            this.stream.advance(4);
            this.stream.advance(offset);
            this.readSSNDHeader = true;
          }
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          this.emit('data', buffer, this.len === 0);
          break;
        default:
          if (!this.stream.available(this.len)) return;
          this.stream.advance(this.len);
      }
      if (this.type !== 'SSND') this.readHeaders = false;
    }
  };

  return AIFFDemuxer;

})(Demuxer);

var WAVEDemuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

WAVEDemuxer = (function(_super) {
  var formats;

  __extends(WAVEDemuxer, _super);

  function WAVEDemuxer() {
    WAVEDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(WAVEDemuxer);

  WAVEDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === 'RIFF' && buffer.peekString(8, 4) === 'WAVE';
  };

  formats = {
    0x0001: 'lpcm',
    0x0003: 'lpcm',
    0x0006: 'alaw',
    0x0007: 'ulaw'
  };

  WAVEDemuxer.prototype.readChunk = function() {
    var buffer, bytes, encoding, flags;
    if (!this.readStart && this.stream.available(12)) {
      if (this.stream.readString(4) !== 'RIFF') {
        return this.emit('error', 'Invalid WAV file.');
      }
      this.fileSize = this.stream.readUInt32(true);
      this.readStart = true;
      if (this.stream.readString(4) !== 'WAVE') {
        return this.emit('error', 'Invalid WAV file.');
      }
    }
    while (this.stream.available(1)) {
      if (!this.readHeaders && this.stream.available(8)) {
        this.type = this.stream.readString(4);
        this.len = this.stream.readUInt32(true);
      }
      switch (this.type) {
        case 'fmt ':
          encoding = this.stream.readUInt16(true);
          if (!(encoding in formats)) {
            return this.emit('error', 'Unsupported format in WAV file.');
          }
          flags = 0;
          if (formats[encoding] === 'lpcm') flags |= LPCMDecoder.LITTLE_ENDIAN;
          if (encoding === 0x0003) flags |= LPCMDecoder.FLOATING_POINT;
          this.format = {
            formatID: formats[encoding],
            formatFlags: flags,
            channelsPerFrame: this.stream.readUInt16(true),
            sampleRate: this.stream.readUInt32(true)
          };
          this.stream.advance(4);
          this.stream.advance(2);
          this.format.bitsPerChannel = this.bitsPerChannel = this.stream.readUInt16(true);
          this.emit('format', this.format);
          break;
        case 'data':
          if (!this.sentDuration) {
            bytes = this.bitsPerChannel / 8;
            this.emit('duration', this.len / bytes / this.format.channelsPerFrame / this.format.sampleRate * 1000 | 0);
            this.sentDuration = true;
          }
          buffer = this.stream.readSingleBuffer(this.len);
          this.len -= buffer.length;
          this.readHeaders = this.len > 0;
          this.emit('data', buffer, this.len === 0);
          break;
        default:
          if (!this.stream.available(this.len)) return;
          this.stream.advance(this.len);
      }
      if (this.type !== 'data') this.readHeaders = false;
    }
  };

  return WAVEDemuxer;

})(Demuxer);

var AUDemuxer,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

AUDemuxer = (function(_super) {
  var bps;

  __extends(AUDemuxer, _super);

  function AUDemuxer() {
    AUDemuxer.__super__.constructor.apply(this, arguments);
  }

  Demuxer.register(AUDemuxer);

  AUDemuxer.probe = function(buffer) {
    return buffer.peekString(0, 4) === '.snd';
  };

  bps = [8, 8, 16, 24, 32, 32, 64];

  bps[26] = 8;

  AUDemuxer.prototype.readChunk = function() {
    var buf, bytes, dataSize, encoding, size, _results;
    if (!this.readHeader && this.stream.available(24)) {
      if (this.stream.readString(4) !== '.snd') {
        return this.emit('error', 'Invalid AU file.');
      }
      size = this.stream.readUInt32();
      dataSize = this.stream.readUInt32();
      encoding = this.stream.readUInt32();
      this.format = {
        formatID: 'lpcm',
        formatFlags: 0,
        bitsPerChannel: bps[encoding - 1],
        sampleRate: this.stream.readUInt32(),
        channelsPerFrame: this.stream.readUInt32()
      };
      if (!(this.format.bitsPerChannel != null)) {
        return this.emit('error', 'Unsupported encoding in AU file.');
      }
      switch (encoding) {
        case 1:
          this.format.formatID = 'ulaw';
          break;
        case 6:
        case 7:
          this.format.formatFlags |= LPCMDecoder.FLOATING_POINT;
          break;
        case 27:
          this.format.formatID = 'alaw';
      }
      if (dataSize !== 0xffffffff) {
        bytes = this.format.bitsPerChannel / 8;
        this.emit('duration', dataSize / bytes / this.format.channelsPerFrame / this.format.sampleRate * 1000 | 0);
      }
      this.emit('format', this.format);
      this.readHeader = true;
    }
    if (this.readHeader) {
      _results = [];
      while (this.stream.available(1)) {
        buf = this.stream.readSingleBuffer(this.stream.remainingBytes());
        _results.push(this.emit('data', buf, this.stream.remainingBytes() === 0));
      }
      return _results;
    }
  };

  return AUDemuxer;

})(Demuxer);

var ALAC;

ALAC = {};

ALAC.channelAtomSize = 12;

ALAC.maxChannels = 8;

ALAC.maxEscapeHeaderBytes = 8;

ALAC.maxSearches = 16;

ALAC.maxCoefs = 16;

ALAC.defaultFramesPerPacket = 4096;

ALAC.errors = {
  noError: 0,
  unimplementedError: -4,
  fileNotFoundError: -43,
  paramError: -50,
  memFullError: -108
};

ALAC.formats = {
  appleLossless: 'alac',
  linearPCM: 'lpcm'
};

ALAC.sampleTypes = {
  isFloat: 1 << 0,
  isBigEndian: 1 << 1,
  isSignedInteger: 1 << 2,
  isPacked: 1 << 3,
  isAlignedHigh: 1 << 4
};

ALAC.channelLayouts = {
  mono: (100 << 16) | 1,
  stereo: (101 << 16) | 2,
  MPEG_3_0_B: (113 << 16) | 3,
  MPEG_4_0_B: (116 << 16) | 4,
  MPEG_5_0_D: (120 << 16) | 5,
  MPEG_5_1_D: (124 << 16) | 6,
  AAC_6_1: (142 << 16) | 7,
  MPEG_7_1_B: (127 << 16) | 8
};

ALAC.channelLayoutArray = [ALAC.channelLayouts.mono, ALAC.channelLayouts.stereo, ALAC.channelLayouts.MPEG_3_0_B, ALAC.channelLayouts.MPEG_4_0_B, ALAC.channelLayouts.MPEG_5_0_D, ALAC.channelLayouts.MPEG_5_1_D, ALAC.channelLayouts.AAC_6_1, ALAC.channelLayouts.MPEG_7_1_B];

var ALACDecoder;

ALACDecoder = (function() {
  var ID_CCE, ID_CPE, ID_DSE, ID_END, ID_FIL, ID_LFE, ID_PCE, ID_SCE;

  ID_SCE = 0;

  ID_CPE = 1;

  ID_CCE = 2;

  ID_LFE = 3;

  ID_DSE = 4;

  ID_PCE = 5;

  ID_FIL = 6;

  ID_END = 7;

  function ALACDecoder(cookie) {
    var data, predictorBuffer;
    data = Stream.fromBuffer(cookie);
    if (data.peekString(4, 4) === 'frma') {
      console.log("Skipping 'frma'");
      data.advance(12);
    }
    if (data.peekString(4, 4) === 'alac') {
      console.log("Skipping 'alac'");
      data.advance(12);
    }
    if (!data.available(24)) {
      console.log("Cookie too short");
      return [ALAC.errors.paramError];
    }
    this.config = {
      frameLength: data.readUInt32(),
      compatibleVersion: data.readUInt8(),
      bitDepth: data.readUInt8(),
      pb: data.readUInt8(),
      mb: data.readUInt8(),
      kb: data.readUInt8(),
      numChannels: data.readUInt8(),
      maxRun: data.readUInt16(),
      maxFrameBytes: data.readUInt32(),
      avgBitRate: data.readUInt32(),
      sampleRate: data.readUInt32()
    };
    this.mixBuffers = [new Int32Array(this.config.frameLength), new Int32Array(this.config.frameLength)];
    predictorBuffer = new ArrayBuffer(this.config.frameLength * 4);
    this.predictor = new Int32Array(predictorBuffer);
    this.shiftBuffer = new Int16Array(predictorBuffer);
  }

  ALACDecoder.prototype.decode = function(data) {
    var buf, bytesShifted, ch, chanBits, channelIndex, channels, coefs, count, dataByteAlignFlag, denShift, elementInstanceTag, end, escapeFlag, i, j, kb, maxRun, mb, mixBits, mixRes, mode, num, numChannels, out16, output, params, partialFrame, pb, pbFactor, samples, shift, shiftbits, status, table, tag, unused, val, _ref, _ref2, _ref3;
    samples = this.config.frameLength;
    numChannels = this.config.numChannels;
    channelIndex = 0;
    output = new ArrayBuffer(samples * numChannels * this.config.bitDepth / 8);
    status = ALAC.errors.noError;
    end = false;
    while (status === ALAC.errors.noError && end === false) {
      if (!data.available(3)) return [status, output];
      tag = data.readSmall(3);
      switch (tag) {
        case ID_SCE:
        case ID_LFE:
        case ID_CPE:
          channels = tag === ID_CPE ? 2 : 1;
          if (channelIndex + channels > numChannels) {
            console.log("No more channels, please");
            return [ALAC.errors.paramError];
          }
          elementInstanceTag = data.readSmall(4);
          unused = data.read(12);
          if (unused !== 0) {
            console.log("Unused part of header does not contain 0, it should");
            return [ALAC.errors.paramError];
          }
          partialFrame = data.readOne();
          bytesShifted = data.readSmall(2);
          escapeFlag = data.readOne();
          if (bytesShifted === 3) {
            console.log("Bytes are shifted by 3, they shouldn't be");
            return [ALAC.errors.paramError];
          }
          if (partialFrame) samples = data.readBig(32);
          if (escapeFlag === 0) {
            shift = bytesShifted * 8;
            chanBits = this.config.bitDepth - shift + channels - 1;
            mixBits = data.read(8);
            mixRes = data.read(8);
            mode = [];
            denShift = [];
            pbFactor = [];
            num = [];
            coefs = [];
            for (ch = 0; ch < channels; ch += 1) {
              mode[ch] = data.readSmall(4);
              denShift[ch] = data.readSmall(4);
              pbFactor[ch] = data.readSmall(3);
              num[ch] = data.readSmall(5);
              table = coefs[ch] = new Int16Array(32);
              for (i = 0, _ref = num[ch]; i < _ref; i += 1) {
                table[i] = data.read(16);
              }
            }
            if (bytesShifted) {
              shiftbits = data.copy();
              data.advance(shift * channels * samples);
            }
            _ref2 = this.config, mb = _ref2.mb, pb = _ref2.pb, kb = _ref2.kb, maxRun = _ref2.maxRun;
            for (ch = 0; ch < channels; ch += 1) {
              params = Aglib.ag_params(mb, (pb * pbFactor[ch]) / 4, kb, samples, samples, maxRun);
              status = Aglib.dyn_decomp(params, data, this.predictor, samples, chanBits);
              if (status !== ALAC.errors.noError) return [status];
              if (mode[ch] === 0) {
                Dplib.unpc_block(this.predictor, this.mixBuffers[ch], samples, coefs[ch], num[ch], chanBits, denShift[ch]);
              } else {
                Dplib.unpc_block(this.predictor, this.predictor, samples, null, 31, chanBits, 0);
                Dplib.unpc_block(this.predictor, this.mixBuffers[ch], samples, coefs[ch], num[ch], chanBits, denShift[ch]);
              }
            }
          } else {
            chanBits = this.config.bitDepth;
            shift = 32 - chanBits;
            for (i = 0; i < samples; i += 1) {
              for (ch = 0; ch < channels; ch += 1) {
                val = (data.readBig(chanBits) << shift) >> shift;
                this.mixBuffers[ch][i] = val;
              }
            }
            mixBits = mixRes = 0;
            bytesShifted = 0;
          }
          if (bytesShifted) {
            shift = bytesShifted * 8;
            for (i = 0, _ref3 = samples * channels; i < _ref3; i += 1) {
              this.shiftBuffer[i] = shiftbits.read(shift);
            }
          }
          switch (this.config.bitDepth) {
            case 16:
              out16 = new Int16Array(output, channelIndex);
              if (channels === 2) {
                Matrixlib.unmix16(this.mixBuffers[0], this.mixBuffers[1], out16, numChannels, samples, mixBits, mixRes);
              } else {
                j = 0;
                buf = this.mixBuffers[0];
                for (i = 0; i < samples; i += 1) {
                  out16[j] = buf[i];
                  j += numChannels;
                }
              }
              break;
            default:
              console.log("Only supports 16-bit samples right now");
              return -9000;
          }
          channelIndex += channels;
          break;
        case ID_CCE:
        case ID_PCE:
          console.log("Unsupported element");
          return [ALAC.errors.paramError];
        case ID_DSE:
          console.log("Data Stream element, ignoring");
          elementInstanceTag = data.readSmall(4);
          dataByteAlignFlag = data.readOne();
          count = data.readSmall(8);
          if (count === 255) count += data.readSmall(8);
          if (dataByteAlignFlag) data.align();
          data.advance(count * 8);
          if (!(data.pos < data.length)) {
            console.log("My first overrun");
            return [ALAC.errors.paramError];
          }
          status = ALAC.errors.noError;
          break;
        case ID_FIL:
          console.log("Fill element, ignoring");
          count = data.readSmall(4);
          if (count === 15) count += data.readSmall(8) - 1;
          data.advance(count * 8);
          if (!(data.pos < data.length)) {
            console.log("Another overrun");
            return [ALAC.errors.paramError];
          }
          status = ALAC.errors.noError;
          break;
        case ID_END:
          data.align();
          end = true;
          break;
        default:
          console.log("Error in frame");
          return [ALAC.errors.paramError];
      }
      if (channelIndex > numChannels) {
        console.log("Channel Index is high");
        break;
      }
    }
    return [status, output];
  };

  return ALACDecoder;

})();

var Aglib;

Aglib = (function() {
  var BITOFF, KB0, MAX_DATATYPE_BITS_16, MAX_PREFIX_16, MAX_PREFIX_32, MAX_RUN_DEFAULT, MB0, MDENSHIFT, MMULSHIFT, MOFF, N_MAX_MEAN_CLAMP, N_MEAN_CLAMP_VAL, PB0, QB, QBSHIFT, dyn_get_16, dyn_get_32, lead;

  function Aglib() {}

  PB0 = 40;

  MB0 = 10;

  KB0 = 14;

  MAX_RUN_DEFAULT = 255;

  MAX_PREFIX_16 = 9;

  MAX_PREFIX_32 = 9;

  QBSHIFT = 9;

  QB = 1 << QBSHIFT;

  MMULSHIFT = 2;

  MDENSHIFT = QBSHIFT - MMULSHIFT - 1;

  MOFF = 1 << (MDENSHIFT - 2);

  N_MAX_MEAN_CLAMP = 0xFFFF;

  N_MEAN_CLAMP_VAL = 0xFFFF;

  MMULSHIFT = 2;

  BITOFF = 24;

  MAX_DATATYPE_BITS_16 = 16;

  lead = function(input) {
    var curbyte, output;
    output = 0;
    curbyte = 0;
    while (1) {
      curbyte = input >>> 24;
      if (curbyte) break;
      output += 8;
      curbyte = input >>> 16;
      if (curbyte & 0xff) break;
      output += 8;
      curbyte = input >>> 8;
      if (curbyte & 0xff) break;
      output += 8;
      curbyte = input;
      if (curbyte & 0xff) break;
      output += 8;
      return output;
    }
    if (curbyte & 0xf0) {
      curbyte >>>= 4;
    } else {
      output += 4;
    }
    if (curbyte & 0x8) return output;
    if (curbyte & 0x4) return output + 1;
    if (curbyte & 0x2) return output + 2;
    if (curbyte & 0x1) return output + 3;
    return output + 4;
  };

  dyn_get_16 = function(data, m, k) {
    var bitsInPrefix, offs, result, stream, v;
    offs = data.bitPosition;
    stream = data.peekBig(32 - offs) << offs;
    bitsInPrefix = lead(~stream);
    if (bitsInPrefix >= MAX_PREFIX_16) {
      data.advance(MAX_PREFIX_16 + MAX_DATATYPE_BITS_16);
      stream <<= MAX_PREFIX_16;
      result = stream >>> (32 - MAX_DATATYPE_BITS_16);
    } else {
      data.advance(bitsInPrefix + k);
      stream <<= bitsInPrefix + 1;
      v = stream >>> (32 - k);
      result = bitsInPrefix * m + v - 1;
      if (v < 2) {
        result -= v - 1;
      } else {
        data.advance(1);
      }
    }
    return result;
  };

  dyn_get_32 = function(data, m, k, maxbits) {
    var offs, result, stream, v;
    offs = data.bitPosition;
    stream = data.peekBig(32 - offs) << offs;
    result = lead(~stream);
    if (result >= MAX_PREFIX_32) {
      data.advance(MAX_PREFIX_32);
      return data.readBig(maxbits);
    } else {
      data.advance(result + 1);
      if (k !== 1) {
        stream <<= result + 1;
        result *= m;
        v = stream >>> (32 - k);
        data.advance(k - 1);
        if (v > 1) {
          result += v - 1;
          data.advance(1);
        }
      }
    }
    return result;
  };

  Aglib.standard_ag_params = function(fullwidth, sectorwidth) {
    return this.ag_params(MB0, PB0, KB0, fullwidth, sectorwidth, MAX_RUN_DEFAULT);
  };

  Aglib.ag_params = function(m, p, k, f, s, maxrun) {
    return {
      mb: m,
      mb0: m,
      pb: p,
      kb: k,
      wb: (1 << k) - 1,
      qb: QB - p,
      fw: f,
      sw: s,
      maxrun: maxrun
    };
  };

  Aglib.dyn_decomp = function(params, data, pc, samples, maxSize) {
    var c, j, k, kb, m, mb, multiplier, mz, n, ndecode, pb, status, wb, zmode;
    pb = params.pb, kb = params.kb, wb = params.wb, mb = params.mb0;
    zmode = 0;
    c = 0;
    status = ALAC.errors.noError;
    while (c < samples) {
      m = mb >>> QBSHIFT;
      k = Math.min(31 - lead(m + 3), kb);
      m = (1 << k) - 1;
      n = dyn_get_32(data, m, k, maxSize);
      ndecode = n + zmode;
      multiplier = -(ndecode & 1) | 1;
      pc[c++] = ((ndecode + 1) >>> 1) * multiplier;
      mb = pb * (n + zmode) + mb - ((pb * mb) >> QBSHIFT);
      if (n > N_MAX_MEAN_CLAMP) mb = N_MEAN_CLAMP_VAL;
      zmode = 0;
      if (((mb << MMULSHIFT) < QB) && (c < samples)) {
        zmode = 1;
        k = lead(mb) - BITOFF + ((mb + MOFF) >> MDENSHIFT);
        mz = ((1 << k) - 1) & wb;
        n = dyn_get_16(data, mz, k);
        if (!(c + n <= samples)) return ALAC.errors.paramError;
        for (j = 0; j < n; j += 1) {
          pc[c++] = 0;
        }
        if (n >= 65535) zmode = 0;
        mb = 0;
      }
    }
    return status;
  };

  return Aglib;

})();

var Dplib;

Dplib = (function() {
  var copy;

  function Dplib() {}

  copy = function(dst, dstOffset, src, srcOffset, n) {
    var destination, source;
    destination = new Uint8Array(dst, dstOffset, n);
    source = new Uint8Array(src, srcOffset, n);
    destination.set(source);
    return dst;
  };

  Dplib.unpc_block = function(pc1, out, num, coefs, active, chanbits, denshift) {
    var a0, a1, a2, a3, a4, a5, a6, a7, b0, b1, b2, b3, b4, b5, b6, b7, chanshift, dd, del, del0, denhalf, i, j, lim, offset, prev, sg, sgn, sum1, top, _ref, _ref2;
    chanshift = 32 - chanbits;
    denhalf = 1 << (denshift - 1);
    out[0] = pc1[0];
    if (active === 0) return copy(out, 0, pc1, 0, num * 4);
    if (active === 31) {
      prev = out[0];
      for (i = 1; i < num; i += 1) {
        del = pc1[i] + prev;
        prev = (del << chanshift) >> chanshift;
        out[i] = prev;
      }
      return;
    }
    for (i = 1; i <= active; i += 1) {
      del = pc1[i] + out[i - 1];
      out[i] = (del << chanshift) >> chanshift;
    }
    lim = active + 1;
    if (active === 4) {
      a0 = coefs[0], a1 = coefs[1], a2 = coefs[2], a3 = coefs[3];
      for (j = lim; j < num; j += 1) {
        top = out[j - lim];
        offset = j - 1;
        b0 = top - out[offset];
        b1 = top - out[offset - 1];
        b2 = top - out[offset - 2];
        b3 = top - out[offset - 3];
        sum1 = (denhalf - a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3) >> denshift;
        del = del0 = pc1[j];
        sg = (-del >>> 31) | (del >> 31);
        del += top + sum1;
        out[j] = (del << chanshift) >> chanshift;
        if (sg > 0) {
          sgn = (-b3 >>> 31) | (b3 >> 31);
          a3 -= sgn;
          del0 -= 1 * ((sgn * b3) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b2 >>> 31) | (b2 >> 31);
          a2 -= sgn;
          del0 -= 2 * ((sgn * b2) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b1 >>> 31) | (b1 >> 31);
          a1 -= sgn;
          del0 -= 3 * ((sgn * b1) >> denshift);
          if (del0 <= 0) continue;
          a0 -= (-b0 >>> 31) | (b0 >> 31);
        } else if (sg < 0) {
          sgn = -((-b3 >>> 31) | (b3 >> 31));
          a3 -= sgn;
          del0 -= 1 * ((sgn * b3) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b2 >>> 31) | (b2 >> 31));
          a2 -= sgn;
          del0 -= 2 * ((sgn * b2) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b1 >>> 31) | (b1 >> 31));
          a1 -= sgn;
          del0 -= 3 * ((sgn * b1) >> denshift);
          if (del0 >= 0) continue;
          a0 += (-b0 >>> 31) | (b0 >> 31);
        }
      }
      coefs[0] = a0;
      coefs[1] = a1;
      coefs[2] = a2;
      coefs[3] = a3;
    } else if (active === 8) {
      a0 = coefs[0], a1 = coefs[1], a2 = coefs[2], a3 = coefs[3], a4 = coefs[4], a5 = coefs[5], a6 = coefs[6], a7 = coefs[7];
      for (j = lim; j < num; j += 1) {
        top = out[j - lim];
        offset = j - 1;
        b0 = top - out[offset];
        b1 = top - out[offset - 1];
        b2 = top - out[offset - 2];
        b3 = top - out[offset - 3];
        b4 = top - out[offset - 4];
        b5 = top - out[offset - 5];
        b6 = top - out[offset - 6];
        b7 = top - out[offset - 7];
        sum1 = (denhalf - a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3 - a4 * b4 - a5 * b5 - a6 * b6 - a7 * b7) >> denshift;
        del = del0 = pc1[j];
        sg = (-del >>> 31) | (del >> 31);
        del += top + sum1;
        out[j] = (del << chanshift) >> chanshift;
        if (sg > 0) {
          sgn = (-b7 >>> 31) | (b7 >> 31);
          a7 -= sgn;
          del0 -= 1 * ((sgn * b7) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b6 >>> 31) | (b6 >> 31);
          a6 -= sgn;
          del0 -= 2 * ((sgn * b6) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b5 >>> 31) | (b5 >> 31);
          a5 -= sgn;
          del0 -= 3 * ((sgn * b5) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b4 >>> 31) | (b4 >> 31);
          a4 -= sgn;
          del0 -= 4 * ((sgn * b4) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b3 >>> 31) | (b3 >> 31);
          a3 -= sgn;
          del0 -= 5 * ((sgn * b3) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b2 >>> 31) | (b2 >> 31);
          a2 -= sgn;
          del0 -= 6 * ((sgn * b2) >> denshift);
          if (del0 <= 0) continue;
          sgn = (-b1 >>> 31) | (b1 >> 31);
          a1 -= sgn;
          del0 -= 7 * ((sgn * b1) >> denshift);
          if (del0 <= 0) continue;
          a0 -= (-b0 >>> 31) | (b0 >> 31);
        } else if (sg < 0) {
          sgn = -((-b7 >>> 31) | (b7 >> 31));
          a7 -= sgn;
          del0 -= 1 * ((sgn * b7) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b6 >>> 31) | (b6 >> 31));
          a6 -= sgn;
          del0 -= 2 * ((sgn * b6) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b5 >>> 31) | (b5 >> 31));
          a5 -= sgn;
          del0 -= 3 * ((sgn * b5) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b4 >>> 31) | (b4 >> 31));
          a4 -= sgn;
          del0 -= 4 * ((sgn * b4) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b3 >>> 31) | (b3 >> 31));
          a3 -= sgn;
          del0 -= 5 * ((sgn * b3) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b2 >>> 31) | (b2 >> 31));
          a2 -= sgn;
          del0 -= 6 * ((sgn * b2) >> denshift);
          if (del0 >= 0) continue;
          sgn = -((-b1 >>> 31) | (b1 >> 31));
          a1 -= sgn;
          del0 -= 7 * ((sgn * b1) >> denshift);
          if (del0 >= 0) continue;
          a0 += (-b0 >>> 31) | (b0 >> 31);
        }
      }
      coefs[0] = a0;
      coefs[1] = a1;
      coefs[2] = a2;
      coefs[3] = a3;
      coefs[4] = a4;
      coefs[5] = a5;
      coefs[6] = a6;
      coefs[7] = a7;
    } else {
      for (i = lim; i < num; i += 1) {
        sum1 = 0;
        top = out[i - lim];
        offset = i - 1;
        for (j = 0; j < active; j += 1) {
          sum1 += coefs[j] * (out[offset - j] - top);
        }
        del = del0 = pc1[i];
        sg = (-del >>> 31) | (del >> 31);
        del += top + ((sum1 + denhalf) >> denshift);
        out[i] = (del << chanshift) >> chanshift;
        if (sg > 0) {
          for (j = _ref = active - 1; j >= 0; j += -1) {
            dd = top - out[offset - j];
            sgn = (-dd >>> 31) | (dd >> 31);
            coefs[j] -= sgn;
            del0 -= (active - j) * ((sgn * dd) >> denshift);
            if (del0 <= 0) break;
          }
        } else if (sg < 0) {
          for (j = _ref2 = active - 1; j >= 0; j += -1) {
            dd = top - out[offset - j];
            sgn = (-dd >>> 31) | (dd >> 31);
            coefs[j] += sgn;
            del0 -= (active - j) * ((-sgn * dd) >> denshift);
            if (del0 >= 0) break;
          }
        }
      }
    }
  };

  return Dplib;

})();

var Matrixlib;

Matrixlib = (function() {

  function Matrixlib() {}

  Matrixlib.unmix16 = function(u, v, out, stride, samples, mixbits, mixres) {
    var i, l;
    if (mixres === 0) {
      for (i = 0; i < samples; i += 1) {
        out[i * stride + 0] = u[i];
        out[i * stride + 1] = v[i];
      }
    } else {
      for (i = 0; i < samples; i += 1) {
        l = u[i] + v[i] - ((mixres * v[i]) >> mixbits);
        out[i * stride + 0] = l;
        out[i * stride + 1] = l - v[i];
      }
    }
  };

  return Matrixlib;

})();

var ALACDec,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

ALACDec = (function(_super) {

  __extends(ALACDec, _super);

  function ALACDec() {
    this.readChunk = __bind(this.readChunk, this);
    ALACDec.__super__.constructor.apply(this, arguments);
  }

  Decoder.register('alac', ALACDec);

  ALACDec.prototype.setCookie = function(buffer) {
    var _base;
    this.decoder = new ALACDecoder(buffer);
    return (_base = this.format).bitsPerChannel || (_base.bitsPerChannel = this.decoder.config.bitDepth);
  };

  ALACDec.prototype.readChunk = function() {
    var out;
    if (!(this.bitstream.available(4096 << 6) || (this.receivedFinalBuffer && this.bitstream.available(32)))) {
      return this.once('available', this.readChunk);
    }
    out = this.decoder.decode(this.bitstream);
    if (out[0] !== 0) {
      return this.emit('error', "Error in ALAC decoder: " + out[0]);
    }
    if (out[1]) return this.emit('data', new Int16Array(out[1]));
  };

  return ALACDec;

})(Decoder);

var LPCMDecoder,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

LPCMDecoder = (function(_super) {
  var FLOATING_POINT, LITTLE_ENDIAN;

  __extends(LPCMDecoder, _super);

  Decoder.register('lpcm', LPCMDecoder);

  LPCMDecoder.FLOATING_POINT = 1 << 0;

  LPCMDecoder.LITTLE_ENDIAN = 1 << 1;

  FLOATING_POINT = LPCMDecoder.FLOATING_POINT, LITTLE_ENDIAN = LPCMDecoder.LITTLE_ENDIAN;

  function LPCMDecoder() {
    this.readChunk = __bind(this.readChunk, this);
    var flags;
    LPCMDecoder.__super__.constructor.apply(this, arguments);
    flags = this.format.formatFlags || 0;
    this.floatingPoint = Boolean(flags & FLOATING_POINT);
    this.littleEndian = Boolean(flags & LITTLE_ENDIAN);
  }

  LPCMDecoder.prototype.readChunk = function() {
    var chunkSize, i, littleEndian, output, samples, stream;
    stream = this.stream, littleEndian = this.littleEndian;
    chunkSize = Math.min(4096, this.stream.remainingBytes());
    samples = chunkSize / (this.format.bitsPerChannel / 8) >> 0;
    if (chunkSize === 0) return this.once('available', this.readChunk);
    if (this.floatingPoint) {
      switch (this.format.bitsPerChannel) {
        case 32:
          output = new Float32Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readFloat32(littleEndian);
          }
          break;
        case 64:
          output = new Float64Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readFloat64(littleEndian);
          }
          break;
        default:
          return this.emit('error', 'Unsupported bit depth.');
      }
    } else {
      switch (this.format.bitsPerChannel) {
        case 8:
          output = new Int8Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readInt8();
          }
          break;
        case 16:
          output = new Int16Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readInt16(littleEndian);
          }
          break;
        case 24:
          output = new Int32Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readInt24(littleEndian);
          }
          break;
        case 32:
          output = new Int32Array(samples);
          for (i = 0; i < samples; i += 1) {
            output[i] = stream.readInt32(littleEndian);
          }
          break;
        default:
          return this.emit('error', 'Unsupported bit depth.');
      }
    }
    return this.emit('data', output);
  };

  return LPCMDecoder;

})(Decoder);

var XLAWDecoder,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

XLAWDecoder = (function(_super) {
  var BIAS, QUANT_MASK, SEG_MASK, SEG_SHIFT, SIGN_BIT;

  __extends(XLAWDecoder, _super);

  Decoder.register('ulaw', XLAWDecoder);

  Decoder.register('alaw', XLAWDecoder);

  SIGN_BIT = 0x80;

  QUANT_MASK = 0xf;

  SEG_SHIFT = 4;

  SEG_MASK = 0x70;

  BIAS = 0x84;

  function XLAWDecoder() {
    this.readChunk = __bind(this.readChunk, this);
    var i, seg, t, table, val;
    XLAWDecoder.__super__.constructor.apply(this, arguments);
    this.format.bitsPerChannel = 16;
    this.table = table = new Float32Array(256);
    if (this.format.formatID === 'ulaw') {
      for (i = 0; i < 256; i++) {
        val = ~i;
        t = ((val & QUANT_MASK) << 3) + BIAS;
        t <<= (val & SEG_MASK) >>> SEG_SHIFT;
        table[i] = val & SIGN_BIT ? BIAS - t : t - BIAS;
      }
    } else {
      for (i = 0; i < 256; i++) {
        val = i ^ 0x55;
        t = val & QUANT_MASK;
        seg = (val & SEG_MASK) >>> SEG_SHIFT;
        if (seg) {
          t = (t + t + 1 + 32) << (seg + 2);
        } else {
          t = (t + t + 1) << 3;
        }
        table[i] = val & SIGN_BIT ? t : -t;
      }
    }
    return;
  }

  XLAWDecoder.prototype.readChunk = function() {
    var chunkSize, i, output, samples, stream, table;
    stream = this.stream, table = this.table;
    chunkSize = Math.min(4096, this.stream.remainingBytes());
    samples = chunkSize / (this.format.bitsPerChannel / 8) >> 0;
    if (chunkSize === 0) return this.once('available', this.readChunk);
    output = new Int16Array(samples);
    for (i = 0; i < samples; i += 1) {
      output[i] = table[stream.readUInt8()];
    }
    return this.emit('data', output);
  };

  return XLAWDecoder;

})(Decoder);



