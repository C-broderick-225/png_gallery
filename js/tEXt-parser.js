    (function(global, factory) {
      typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.tEXt = factory();
    })(this, function() {
      'use strict';
      var CHUNK_TYPE = [ 116, 69, 88, 116 ];
      var IEND_TYPE = [ 73, 69, 78, 68 ];
      var PNG_HEAD = [ 137, 80, 78, 71, 13, 10, 26, 10 ];
      function tEXt() {}
      tEXt.encode = function encode(values, buf) {
        var png = new Uint8Array(buf);
        var i = 8; // Start after PNG header [137, 80, 78, 71, 13, 10, 26, 10]
        var head = png.slice(0, 8);
        var tail = null; // To store the IEND chunk's full data
        var outChunks = []; // Array to hold the Uint8Arrays of chunks to keep/add

        outChunks.push(head); // Start with the PNG header

        var keys = Object.keys(values);

        // Loop through existing chunks
        while (i < png.length) {
          // Read chunk header
          var length = (png[i] << 24 | png[i+1] << 16 | png[i+2] << 8 | png[i+3]) >>> 0;
          var typeBytes = png.slice(i + 4, i + 8);
          var typeName = String.fromCharCode.apply(null, typeBytes);
          var chunkFullData = png.slice(i, i + 12 + length); // Get the complete chunk (length+type+data+crc)

          var nextChunkPos = i + 12 + length;
          // Sanity check for chunk position
          if (nextChunkPos > png.length) {
              console.error("PNG parsing error: Chunk position exceeds buffer length.", { index: i, length: length, type: typeName, bufferLength: png.length });
              throw new Error("PNG parsing error: Chunk position exceeds buffer length.");
          }
          i = nextChunkPos; // Move index to the next chunk

          if (typeName === 'IEND') {
            tail = chunkFullData; // Found the end chunk, store it
            break; // Stop processing chunks after IEND
          }

          // Handle tEXt chunks: keep only if keyword is not in the new 'values'
          if (typeName === 'tEXt') {
            var dataPart = chunkFullData.slice(8, chunkFullData.length - 4); // Extract data part
            var k = 0;
            while (k < dataPart.length && dataPart[k] !== 0) { k++; } // Find null separator

            if (k < dataPart.length) { // Check if null separator found
              var keyword = String.fromCharCode.apply(null, dataPart.slice(0, k));
              // Only keep this chunk if its keyword is NOT among the keys we intend to write/overwrite
              if (keys.indexOf(keyword) === -1) {
                 outChunks.push(chunkFullData);
              }
              // If the keyword IS in keys, we intentionally discard the old chunk here.
              // The loop later will add the new chunk if the value is non-empty.
            } else {
               // Malformed tEXt chunk? Keep it just in case.
               console.warn("Malformed tEXt chunk found (no null separator), keeping it.");
               outChunks.push(chunkFullData);
            }
          } else {
            // Keep all other chunk types (IDAT, PLTE, IHDR etc.)
            outChunks.push(chunkFullData);
          }
        }

        // Add the new/updated tEXt chunks
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          // Only add if the value is non-empty
          if (values[key] && values[key].trim() !== '' && key.trim() !== '') {
             try {
               outChunks.push(this.pack(key.trim(), values[key].trim()));
             } catch (packError) {
                console.error("Error packing tEXt chunk for keyword '" + key + "':", packError);
                // Decide if you want to throw or just skip this key
                // throw packError; // Option: Stop encoding
             }
          }
        }

        // Append the IEND chunk data
        if (tail === null) {
          console.error("Original PNG data seems to be missing the IEND chunk.");
          throw new Error('Failed to find IEND chunk in original PNG data. Cannot re-encode.');
        }
        outChunks.push(tail);

        // Calculate total length and assemble the new PNG bytes
        var totalLength = 0;
        for (var c = 0; c < outChunks.length; c++) {
          if (outChunks[c] === null || !(outChunks[c] instanceof Uint8Array)) {
              console.error("Invalid chunk found in outChunks at index " + c + ":", outChunks[c]);
              throw new Error("Internal error: Invalid chunk data during PNG assembly.");
          }
          totalLength += outChunks[c].length;
        }

        var newPngBytes = new Uint8Array(totalLength);
        var offset = 0;
        for (var c = 0; c < outChunks.length; c++) {
          newPngBytes.set(outChunks[c], offset);
          offset += outChunks[c].length;
        }

        return newPngBytes; // Return the raw bytes of the new PNG
      };
      tEXt.decode = function decode(buf) {
        var png = new Uint8Array(buf);
        var i = 0;
        var header = png.slice(i, i += 8);
        for (var j = 0; j < PNG_HEAD.length; j++) {
          if (header[j] !== PNG_HEAD[j]) {
            throw new Error('Invalid PNG header');
          }
        }
        var chunks = [];
        while (i < png.length) {
          var length = (png[i++] << 24 | png[i++] << 16 | png[i++] << 8 | png[i++]) >>> 0;
          var type = png.slice(i, i += 4);
          var chunkData = png.slice(i, i += length);
          var crc = png.slice(i, i += 4);
          var typeName = '';
          for (var j = 0; j < type.length; j++) {
            typeName += String.fromCharCode(type[j]);
          }
          var chunk = {
            length: length,
            type: typeName,
            data: new Uint8Array(length + 12)
          };
          var off = 0;
          chunk.data[off++] = length >> 24 & 255;
          chunk.data[off++] = length >> 16 & 255;
          chunk.data[off++] = length >> 8 & 255;
          chunk.data[off++] = length & 255;
          chunk.data[off++] = type[0];
          chunk.data[off++] = type[1];
          chunk.data[off++] = type[2];
          chunk.data[off++] = type[3];
          for (var j = 0; j < chunkData.length; j++) {
            chunk.data[off++] = chunkData[j];
          }
          chunk.data[off++] = crc[0];
          chunk.data[off++] = crc[1];
          chunk.data[off++] = crc[2];
          chunk.data[off++] = crc[3];
          chunks.push(chunk);
        }
        var values = {};
        for (var i = 0; i < chunks.length; i++) {
          var chunk = chunks[i];
          if (chunk.type !== 'tEXt') {
            continue;
          }
          var data = chunk.data.slice(8, chunk.data.length - 4);
          var k = 0;
          while (data[k]) {
            k++;
          }
          var keyword = String.fromCharCode.apply(null, data.slice(0, k));
          var text = String.fromCharCode.apply(null, data.slice(k + 1));
          values[keyword] = text;
        }
        return values;
      };
      tEXt.pack = function pack(keyword, text) {
        if (!keyword) {
          throw new Error('cannot pack tEXt chunk without keyword');
        }
        var key = new Uint8Array(keyword.length);
        for (var i = 0; i < keyword.length; i++) {
          key[i] = keyword.charCodeAt(i);
          if (key[i] > 127 || key[i] < 32) {
            throw new Error('keywords must be latin-1 characters');
          }
        }
        var txt = new Uint8Array(text.length);
        for (var i = 0; i < text.length; i++) {
          txt[i] = text.charCodeAt(i);
        }
        var length = key.length + txt.length + 1;
        var chunkData = new Uint8Array(length);
        var off = 0;
        for (var i = 0; i < key.length; i++) {
          chunkData[off++] = key[i];
        }
        chunkData[off++] = 0;
        for (var i = 0; i < txt.length; i++) {
          chunkData[off++] = txt[i];
        }
        var type = new Uint8Array(4);
        for (var i = 0; i < CHUNK_TYPE.length; i++) {
          type[i] = CHUNK_TYPE[i];
        }
        var data = new Uint8Array(length + 12);
        var off = 0;
        data[off++] = length >> 24 & 255;
        data[off++] = length >> 16 & 255;
        data[off++] = length >> 8 & 255;
        data[off++] = length & 255;
        data[off++] = type[0];
        data[off++] = type[1];
        data[off++] = type[2];
        data[off++] = type[3];
        for (var i = 0; i < chunkData.length; i++) {
          data[off++] = chunkData[i];
        }
        var crcTable = [];
        var c;
        for (var n = 0; n < 256; n++) {
          c = n;
          for (var k = 0; k < 8; k++) {
            c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
          }
          crcTable[n] = c;
        }
        var crc = -1;
        for (var i = 4; i < length + 8; i++) {
          crc = crcTable[(crc ^ data[i]) & 255] ^ crc >>> 8;
        }
        crc = crc ^ -1;
        data[off++] = crc >> 24 & 255;
        data[off++] = crc >> 16 & 255;
        data[off++] = crc >> 8 & 255;
        data[off++] = crc & 255;
        return data;
      };
      return tEXt;
    });
