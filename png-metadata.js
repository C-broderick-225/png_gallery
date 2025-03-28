/**
 * PNG Metadata Editor
 * A JavaScript module to read and write PNG metadata tags
 */

class PNGMetadata {
    constructor() {
        this.decoder = new TextDecoder('utf-8');
        this.encoder = new TextEncoder();
    }

    /**
     * Read metadata from a PNG file
     * @param {File|Blob} file - The PNG file
     * @returns {Promise<Object>} - Metadata object
     */
    async readMetadata(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const buffer = reader.result;
                    const metadata = this.extractMetadata(buffer);
                    resolve(metadata);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extract metadata from PNG buffer
     * @param {ArrayBuffer} buffer - The PNG file buffer
     * @returns {Object} - Metadata object
     */
    extractMetadata(buffer) {
        const view = new DataView(buffer);
        const metadata = {};
        
        // Check PNG signature
        if (!this.isPNG(view)) {
            throw new Error('Not a valid PNG file');
        }
        
        // Skip PNG signature (8 bytes) and get to the chunks
        let offset = 8;
        
        while (offset < view.byteLength) {
            // Read chunk length
            const length = view.getUint32(offset, false);
            offset += 4;
            
            // Read chunk type
            const typeBytes = new Uint8Array(buffer, offset, 4);
            const chunkType = this.decoder.decode(typeBytes);
            offset += 4;
            
            // If it's a tEXt chunk, extract the metadata
            if (chunkType === 'tEXt') {
                const chunkData = new Uint8Array(buffer, offset, length);
                const nullIndex = chunkData.indexOf(0);
                
                if (nullIndex !== -1) {
                    const keyBytes = chunkData.slice(0, nullIndex);
                    const valueBytes = chunkData.slice(nullIndex + 1);
                    
                    const key = this.decoder.decode(keyBytes);
                    const value = this.decoder.decode(valueBytes);
                    
                    metadata[key] = value;
                }
            }
            
            // Move to the next chunk (skip data + CRC)
            offset += length + 4;
        }
        
        return metadata;
    }

    /**
     * Write metadata to a PNG file
     * @param {File|Blob} file - The PNG file
     * @param {Object} metadata - Key-value pairs of metadata
     * @returns {Promise<Blob>} - New PNG file with metadata
     */
    async writeMetadata(file, metadata) {
        // For PDF files, we can't add PNG metadata
        if (file.type === 'application/pdf') {
            throw new Error('Cannot add PNG metadata to PDF files. Please convert to PNG first.');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const buffer = reader.result;
                    
                    // Verify it's a valid PNG file
                    const view = new DataView(buffer);
                    if (!this.isPNG(view)) {
                        throw new Error('The selected file is not a valid PNG image');
                    }
                    
                    const newPNG = this.injectMetadata(buffer, metadata);
                    resolve(new Blob([newPNG], { type: 'image/png' }));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Inject metadata into PNG buffer
     * @param {ArrayBuffer} buffer - The PNG file buffer
     * @param {Object} metadata - Key-value pairs of metadata
     * @returns {ArrayBuffer} - New PNG buffer with metadata
     */
    injectMetadata(buffer, metadata) {
        const originalData = new Uint8Array(buffer);
        
        // Check for existing metadata chunks to remove
        const { chunks, idatIndex } = this.analyzeChunks(buffer);
        
        if (idatIndex === -1) {
            throw new Error('Invalid PNG structure: no IDAT chunk found');
        }
        
        // Create tEXt chunks for metadata
        const metadataChunks = Object.entries(metadata)
            .filter(([key, value]) => key && value) // Filter out empty entries
            .map(([key, value]) => this.createTextChunk(key, value));
        
        // Calculate the total size for new file
        let newSize = 8; // PNG signature
        
        // Add size of chunks before IDAT (excluding any existing tEXt chunks)
        for (let i = 0; i < idatIndex; i++) {
            if (chunks[i].type !== 'tEXt') {
                newSize += chunks[i].length;
            }
        }
        
        // Add size of new metadata chunks
        for (const chunk of metadataChunks) {
            newSize += chunk.length;
        }
        
        // Add size of IDAT and remaining chunks
        for (let i = idatIndex; i < chunks.length; i++) {
            newSize += chunks[i].length;
        }
        
        // Create new buffer with proper size
        const newBuffer = new ArrayBuffer(newSize);
        const newView = new Uint8Array(newBuffer);
        
        // Copy PNG signature (first 8 bytes)
        newView.set(originalData.subarray(0, 8), 0);
        let writeOffset = 8;
        
        // Copy chunks before IDAT (excluding any existing tEXt chunks)
        for (let i = 0; i < idatIndex; i++) {
            if (chunks[i].type !== 'tEXt') {
                const startOffset = chunks[i].offset;
                const length = chunks[i].length;
                newView.set(originalData.subarray(startOffset, startOffset + length), writeOffset);
                writeOffset += length;
            }
        }
        
        // Insert new metadata chunks
        for (const chunk of metadataChunks) {
            newView.set(chunk, writeOffset);
            writeOffset += chunk.length;
        }
        
        // Copy IDAT and remaining chunks
        for (let i = idatIndex; i < chunks.length; i++) {
            const startOffset = chunks[i].offset;
            const length = chunks[i].length;
            newView.set(originalData.subarray(startOffset, startOffset + length), writeOffset);
            writeOffset += length;
        }
        
        return newBuffer;
    }

    /**
     * Analyze PNG chunks
     * @param {ArrayBuffer} buffer - The PNG file buffer
     * @returns {Object} - Information about chunks
     */
    analyzeChunks(buffer) {
        const view = new DataView(buffer);
        const chunks = [];
        let offset = 8; // Skip PNG signature
        let idatIndex = -1;
        
        while (offset < view.byteLength) {
            const length = view.getUint32(offset, false);
            const typeBytes = new Uint8Array(buffer, offset + 4, 4);
            const type = this.decoder.decode(typeBytes);
            
            chunks.push({
                offset: offset,
                length: length + 12, // Include length (4) + type (4) + data (length) + CRC (4)
                type: type
            });
            
            if (type === 'IDAT' && idatIndex === -1) {
                idatIndex = chunks.length - 1;
            }
            
            offset += length + 12; // Move to next chunk
        }
        
        return { chunks, idatIndex };
    }

    /**
     * Create a tEXt chunk for metadata
     * @param {string} key - Metadata key
     * @param {string} value - Metadata value
     * @returns {Uint8Array} - tEXt chunk bytes
     */
    createTextChunk(key, value) {
        // Encode key and value
        const keyBytes = this.encoder.encode(key);
        const valueBytes = this.encoder.encode(value);
        
        // Calculate chunk length (key + null separator + value)
        const length = keyBytes.length + 1 + valueBytes.length;
        
        // Create chunk data
        const chunk = new Uint8Array(length + 12); // length(4) + type(4) + data(length) + CRC(4)
        const view = new DataView(chunk.buffer);
        
        // Write length
        view.setUint32(0, length, false);
        
        // Write type ('tEXt')
        const typeBytes = this.encoder.encode('tEXt');
        chunk.set(typeBytes, 4);
        
        // Write key
        chunk.set(keyBytes, 8);
        
        // Write null separator
        chunk[8 + keyBytes.length] = 0;
        
        // Write value
        chunk.set(valueBytes, 8 + keyBytes.length + 1);
        
        // Calculate and write CRC
        const crcData = new Uint8Array(4 + length);
        crcData.set(typeBytes);
        crcData.set(chunk.subarray(8, 8 + length), 4);
        const crc = this.calculateCRC(crcData);
        view.setUint32(8 + length, crc, false);
        
        return chunk;
    }

    /**
     * Check if buffer is a valid PNG file
     * @param {DataView} view - DataView of the buffer
     * @returns {boolean} - True if valid PNG
     */
    isPNG(view) {
        const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        
        if (view.byteLength < PNG_SIGNATURE.length) {
            return false;
        }
        
        for (let i = 0; i < PNG_SIGNATURE.length; i++) {
            if (view.getUint8(i) !== PNG_SIGNATURE[i]) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Calculate CRC32 for chunk
     * @param {Uint8Array} data - Data to calculate CRC for
     * @returns {number} - CRC32 value
     */
    calculateCRC(data) {
        let crc = 0xffffffff;
        const crcTable = this.getCRCTable();
        
        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
        }
        
        return crc ^ 0xffffffff;
    }

    /**
     * Get CRC32 lookup table
     * @returns {Uint32Array} - CRC32 table
     */
    getCRCTable() {
        const table = new Uint32Array(256);
        
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[i] = c;
        }
        
        return table;
    }

    /**
     * Get common metadata keys
     * @returns {string[]} - Array of common metadata keys
     */
    getCommonKeys() {
        return [
            'Title',
            'Author',
            'Description',
            'Copyright',
            'Creation Time',
            'Software',
            'Disclaimer',
            'Warning',
            'Source',
            'Comment',
            'Keywords'
        ];
    }
}

// Export the class
window.PNGMetadata = PNGMetadata; 