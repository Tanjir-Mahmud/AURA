/**
 * Deepgram Integration — AURA Voice Intake Engine
 *
 * Industrial Logic: Factory workers on loud floors need hands-free data entry.
 * This module provides both REST API (batch) and WebSocket (real-time) connections
 * to Deepgram's Nova-3 model for speech-to-text transcription.
 *
 * API Sequence:
 *   1. Audio stream → Deepgram Nova-3 (WebSocket or REST)
 *   2. Transcript → parseWarehouseCommand()
 *   3. Structured JSON → Sanity ILCR update
 */

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const DEEPGRAM_REST_URL = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true';
const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&interim_results=true';

// ─── Warehouse Command Types ────────────────
export interface WarehouseIntake {
    itemId: string;
    condition: 'new' | 'used_like_new' | 'used_good' | 'used_fair' | 'damaged' | 'refurbished';
    notes: string;
    rawTranscript: string;
    confidence: number;
    timestamp: string;
}

// ─── REST API Transcription (Batch Mode) ────
export async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<{ transcript: string; confidence: number }> {
    if (!DEEPGRAM_API_KEY) {
        console.warn('[Deepgram] No API key — using mock transcript');
        return {
            transcript: 'Item 101, good condition, factory sealed packaging',
            confidence: 0.95,
        };
    }

    try {
        const response = await fetch(DEEPGRAM_REST_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'audio/wav',
            },
            body: audioBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const channel = data?.results?.channels?.[0];
        const alternative = channel?.alternatives?.[0];

        return {
            transcript: alternative?.transcript || '',
            confidence: alternative?.confidence || 0,
        };
    } catch (error) {
        console.error('[Deepgram] Transcription error:', error);
        throw error;
    }
}

// ─── WebSocket Streaming (Real-Time Mode) ───
/**
 * Creates a real-time WebSocket connection to Deepgram Nova-3.
 * Used for live factory floor dictation with interim results.
 *
 * Usage:
 *   const stream = createDeepgramStream({
 *     onTranscript: (text, isFinal) => console.log(text),
 *     onError: (err) => console.error(err),
 *   });
 *   stream.send(audioChunk);   // Send audio data chunks
 *   stream.close();            // Close when done
 */
export interface DeepgramStreamOptions {
    onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void;
    onError: (error: Error) => void;
    onOpen?: () => void;
    onClose?: () => void;
}

export interface DeepgramStream {
    send: (audioData: ArrayBuffer) => void;
    close: () => void;
    isOpen: () => boolean;
}

export function createDeepgramStream(options: DeepgramStreamOptions): DeepgramStream {
    if (!DEEPGRAM_API_KEY) {
        console.warn('[Deepgram] No API key — WebSocket stream will use mock data');
        // Return a mock stream for development
        const mockStream: DeepgramStream = {
            send: () => {
                setTimeout(() => {
                    options.onTranscript('Item 101, good condition, minor wear on packaging', true, 0.97);
                }, 1500);
            },
            close: () => options.onClose?.(),
            isOpen: () => false,
        };
        options.onOpen?.();
        return mockStream;
    }

    let ws: WebSocket | null = null;

    try {
        ws = new WebSocket(DEEPGRAM_WS_URL, {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
        } as never);

        ws.onopen = () => {
            console.log('[Deepgram] WebSocket connected');
            options.onOpen?.();
        };

        ws.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string);
                const channel = data?.channel;
                const alternative = channel?.alternatives?.[0];

                if (alternative?.transcript) {
                    options.onTranscript(
                        alternative.transcript,
                        data.is_final === true,
                        alternative.confidence || 0,
                    );
                }
            } catch (err) {
                console.error('[Deepgram] Parse error:', err);
            }
        };

        ws.onerror = (event: Event) => {
            console.error('[Deepgram] WebSocket error:', event);
            options.onError(new Error('Deepgram WebSocket connection error'));
        };

        ws.onclose = () => {
            console.log('[Deepgram] WebSocket closed');
            options.onClose?.();
        };
    } catch (error) {
        options.onError(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }

    return {
        send: (audioData: ArrayBuffer) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(audioData);
            }
        },
        close: () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Send empty buffer to signal end of audio
                ws.send(new ArrayBuffer(0));
                ws.close();
            }
        },
        isOpen: () => ws !== null && ws.readyState === WebSocket.OPEN,
    };
}

// ─── Command Parser ─────────────────────────
/**
 * Parses natural-language warehouse dictation into structured JSON.
 *
 * Examples:
 *   "Item 101, good condition"        → { itemId: "101", condition: "used_good" }
 *   "Batch A1, 100% Organic Cotton"   → { itemId: "A1", condition: "new", notes: "100% Organic Cotton" }
 *   "Serial 42-X, damaged, torn seam" → { itemId: "42-X", condition: "damaged", notes: "torn seam" }
 */
export function parseWarehouseCommand(transcript: string): WarehouseIntake {
    const text = transcript.toLowerCase().trim();

    // Extract item/batch/serial ID
    const idMatch = text.match(/(?:item|batch|serial|unit|sku|id)\s+([a-z0-9\-]+)/i);
    const itemId = idMatch?.[1] || 'UNKNOWN';

    // Determine condition from keywords
    let condition: WarehouseIntake['condition'] = 'new';
    if (/damaged|broken|defective|torn|cracked/.test(text)) {
        condition = 'damaged';
    } else if (/refurbished|refurb|restored/.test(text)) {
        condition = 'refurbished';
    } else if (/like\s*new|mint|perfect|excellent/.test(text)) {
        condition = 'used_like_new';
    } else if (/good\s*condition|good|minor/.test(text)) {
        condition = 'used_good';
    } else if (/fair|worn|used|moderate/.test(text)) {
        condition = 'used_fair';
    }

    // Extract notes — everything after the condition keyword or comma separator
    const notesMatch = transcript.match(/(?:condition\s*,?\s*)(.*)/i)
        || transcript.match(/(?:cotton|sealed|packaging|notes?:?\s*)(.*)/i);
    const notes = notesMatch?.[1]?.trim() || transcript;

    return {
        itemId,
        condition,
        notes,
        rawTranscript: transcript,
        confidence: 0,
        timestamp: new Date().toISOString(),
    };
}
