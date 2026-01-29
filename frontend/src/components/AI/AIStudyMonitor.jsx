import React, { useState, useEffect, useRef } from 'react';

const AIStudyMonitor = ({ targetHours, onSessionComplete }) => {
    const [timeLeft, setTimeLeft] = useState(targetHours * 3600); // in seconds
    const [isActive, setIsActive] = useState(false);
    const [isFocused, setIsFocused] = useState(true);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // 1. Webcam Handling
    const startMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setIsActive(true);
            setIsFocused(true);
        } catch (err) {
            alert("Camera permission is required for AI Proctoring!");
            console.error(err);
        }
    };

    const stopMonitoring = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsActive(false);
    };

    // 2. Focus Tracking (Visibility API)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsFocused(false);
                // alert("Please focus on your study!"); // Optional: annoying popup
            } else {
                setIsFocused(true);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // 3. Timer Logic
    useEffect(() => {
        let interval = null;
        if (isActive && isFocused && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            stopMonitoring();
            if (onSessionComplete) onSessionComplete();
        }

        return () => clearInterval(interval);
    }, [isActive, isFocused, timeLeft]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{
            background: '#1a202c',
            color: 'white',
            padding: '20px',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <h3>👁️ AI Study Monitor</h3>

            <div style={{ position: 'relative', width: '300px', height: '225px', margin: '20px auto', background: '#000', borderRadius: '10px', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isFocused ? 1 : 0.3 }}
                />
                {!isFocused && isActive && (
                    <div style={{
                        position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,0,0,0.5)', color: 'white', fontWeight: 'bold'
                    }}>
                        ⚠️ FOCUS LOST!
                    </div>
                )}
            </div>

            <div style={{ fontSize: '2rem', fontFamily: 'monospace', margin: '15px 0', color: isFocused ? '#48bb78' : '#f56565' }}>
                {formatTime(timeLeft)}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {!isActive ? (
                    <button
                        onClick={startMonitoring}
                        style={{ padding: '10px 20px', background: '#48bb78', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
                    >
                        Start Session
                    </button>
                ) : (
                    <button
                        onClick={stopMonitoring}
                        style={{ padding: '10px 20px', background: '#f56565', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
                    >
                        Pause Session
                    </button>
                )}
            </div>

            <p style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: '10px' }}>
                {isActive ? (isFocused ? "Monitoring Active. Keep studying!" : "Timer Paused! Please return to this tab.") : "Click start to begin tracking."}
            </p>
        </div>
    );
};

export default AIStudyMonitor;
