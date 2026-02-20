'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * MISSION: DEVELOP AURA - Step 3.2
 * Factory UI: Voice-Activated Data Entry
 * 
 * High-visibility interface for factory floors.
 * Large "Press to Speak" button for Deepgram voice intake.
 */

export default function FactoryUI() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [parsedData, setParsedData] = useState<any>(null);
    const [status, setStatus] = useState<string>('IDLE');
    const [productId, setProductId] = useState('PROD-2026-X');

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                await sendToVoiceEntry(audioBlob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setStatus('RECORDING');
        } catch (err) {
            console.error('Microphone error:', err);
            setStatus('ERROR');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            setStatus('PROCESSING');
        }
    };

    const sendToVoiceEntry = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('audio', blob, 'intake.wav');
        formData.append('productId', productId);
        formData.append('operatorId', 'factory-node-1');

        try {
            const res = await fetch('/api/voice-entry', {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();
            if (result.success) {
                setTranscript(result.data.rawTranscript);
                setParsedData(result.data);
                setStatus('SUCCESS');
                setTimeout(() => setStatus('IDLE'), 5000);
            } else {
                setStatus('ERROR');
            }
        } catch (err) {
            console.error('Processing error:', err);
            setStatus('ERROR');
        }
    };

    return (
        <div className="factory-layout" style={{
            height: '100vh',
            background: '#050510',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif'
        }}>
            {/* Header */}
            <header style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '2px', color: '#00f2ff' }}>AURA FACTORY NODE</h1>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Industrial-Grade Voice Intake v1.0.4</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={`status-dot ${status === 'IDLE' ? 'active' : 'warning'}`} style={{ width: 12, height: 12 }} />
                    <span style={{ fontSize: 14 }}>NODE: ALPHA-7</span>
                </div>
            </header>

            {/* Main Section */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>

                <div style={{ marginBottom: 40, width: '100%', maxWidth: 400 }}>
                    <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', marginBottom: 8, color: 'rgba(255,255,255,0.6)' }}>Current Product ID</label>
                    <input
                        type="text"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center' }}
                    />
                </div>

                <div className="voice-control" style={{ textAlign: 'center' }}>
                    <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        style={{
                            width: 250,
                            height: 250,
                            borderRadius: '50%',
                            background: isRecording ? '#ff003c' : 'linear-gradient(135deg, #00f2ff, #0066ff)',
                            border: 'none',
                            color: '#fff',
                            fontSize: 24,
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: isRecording ? '0 0 80px #ff003c' : '0 0 40px rgba(0,242,255,0.3)',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transform: isRecording ? 'scale(0.9)' : 'scale(1.0)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12
                        }}
                    >
                        <span style={{ fontSize: 48 }}>{isRecording ? '⏺' : '🎤'}</span>
                        <span>{isRecording ? 'LISTENING' : 'PRESS TO SPEAK'}</span>
                    </button>
                    <p style={{ marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                        {isRecording ? 'RELEASE TO PROCESS' : 'HOLD SPACE OR CLICK TO INTAKE DATA'}
                    </p>
                </div>

                {/* Live Feedback */}
                <div style={{ marginTop: 60, width: '100%', maxWidth: 600, background: 'rgba(0,0,0,0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 30, minHeight: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>Real-time Feed</h3>
                        <span style={{ fontSize: 12, color: status === 'SUCCESS' ? '#00ffa3' : '#fff' }}>STATUS: {status}</span>
                    </div>

                    {status === 'RECORDING' && <div className="pulse" style={{ height: 2, background: '#00f2ff', width: '100%' }} />}

                    {transcript && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Transcription:</div>
                            <div style={{ fontSize: 18, color: '#fff', fontStyle: 'italic' }}>"{transcript}"</div>
                        </div>
                    )}

                    {parsedData && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Material</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#00f2ff' }}>{parsedData.material}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Weight</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#00f2ff' }}>{parsedData.weight}</div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer style={{ padding: '20px 40px', background: 'rgba(255,255,255,0.02)', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                SECURED BY AURA AES-256 | CONTINUOUS COMPLIANCE ACTIVE
            </footer>

            <style jsx>{`
                .pulse {
                    animation: pulse-animation 1.5s infinite;
                }
                @keyframes pulse-animation {
                    0% { opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}
