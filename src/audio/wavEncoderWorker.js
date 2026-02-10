/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: wavEncoderWorker.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * WAV Encoder Worker
 * High-performance WAV audio encoding in a Web Worker
 */

class WAVEncoder {
    constructor() {
        this.sampleRate = 44100;
        this.channels = 2;
        this.bitDepth = 16;
    }

    encode(audioData, options = {}) {
        this.sampleRate = options.sampleRate || 44100;
        this.channels = options.channels || 2;
        this.bitDepth = options.bitDepth || 16;

        const length = audioData.length;
        const buffer = new ArrayBuffer(44 + length * this.channels * (this.bitDepth / 8));
        const view = new DataView(buffer);

        // WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * this.channels * (this.bitDepth / 8), true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // PCM format
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, this.channels, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * this.channels * (this.bitDepth / 8), true);
        view.setUint16(32, this.channels * (this.bitDepth / 8), true);
        view.setUint16(34, this.bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length * this.channels * (this.bitDepth / 8), true);

        // Audio data
        this.writeAudioData(view, 44, audioData);

        return buffer;
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeAudioData(view, offset, audioData) {
        if (this.bitDepth === 16) {
            for (let i = 0; i < audioData.length; i++) {
                const sample = Math.max(-1, Math.min(1, audioData[i]));
                view.setInt16(offset + i * 2, sample * 0x7FFF, true);
            }
        } else if (this.bitDepth === 24) {
            for (let i = 0; i < audioData.length; i++) {
                const sample = Math.max(-1, Math.min(1, audioData[i]));
                const intSample = Math.round(sample * 0x7FFFFF);
                view.setUint8(offset + i * 3, intSample & 0xFF);
                view.setUint8(offset + i * 3 + 1, (intSample >> 8) & 0xFF);
                view.setUint8(offset + i * 3 + 2, (intSample >> 16) & 0xFF);
            }
        } else if (this.bitDepth === 32) {
            for (let i = 0; i < audioData.length; i++) {
                view.setFloat32(offset + i * 4, audioData[i], true);
            }
        }
    }
}

// Web Worker message handling
self.onmessage = function(e) {
    const { audioData, options } = e.data;
    
    try {
        const encoder = new WAVEncoder();
        const encodedData = encoder.encode(audioData, options);
        
        self.postMessage({
            success: true,
            data: encodedData
        }, [encodedData]);
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};
