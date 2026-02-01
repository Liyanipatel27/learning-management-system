import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LiveClassroom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    // Whiteboard States
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isPainting, setIsPainting] = useState(false);
    const [color, setColor] = useState('#4F46E5');
    const [width, setWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const [slides, setSlides] = useState([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    // Jitsi API Ref
    const jitsiApiRef = useRef(null);
    const jitsiContainerRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        // --- 1. Load Jitsi Script ---
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => startMeeting();
        document.body.appendChild(script);

        // --- 2. Initialize Canvas (ONLY IF IT EXISTS - Teacher mode) ---
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.parentElement?.clientWidth || 800;
            canvas.height = (canvas.parentElement?.clientHeight || 600) - 20;
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctxRef.current = ctx;

            // Init first slide
            setSlides([canvas.toDataURL()]);
        }

        return () => {
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const startMeeting = () => {
        if (!jitsiContainerRef.current || jitsiApiRef.current) return;
        const domain = 'meet.jit.si';
        const options = {
            roomName: roomId,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: user?.name || 'User'
            },
            configOverwrite: {
                startWithAudioMuted: user.role === 'student',
                startWithVideoMuted: false,
                disableThirdPartyRequests: true,
                prejoinPageEnabled: false,
                enableWelcomePage: false,
                enableNoAudioDetection: true,
                enableNoVideoDetection: true,
                // UI Refinements
                toolbarButtons: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
                // Focus on presentation
                disableFocusOnSendMessage: true,
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'fullscreen', 'hangup'
                ],
                SETTINGS_SECTIONS: ['devices', 'language', 'profile', 'calendar'],
                SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                // Ensure names and mic status are easily visible in the filmstrip
                VERTICAL_FILMSTRIP: true,
                MOBILE_APP_PROMO: false,
            }
        };
        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        // Auto-maximize the screen share when teacher presents
        api.addEventListener('screenSharingStatusChanged', (event) => {
            if (event.on) {
                api.executeCommand('setTileView', false);
            }
        });

        // Handle hangup event from Jitsi UI
        api.addEventListener('readyToClose', () => {
            endClass(true);
        });
    };

    // --- Whiteboard Functions ---
    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        setIsPainting(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isPainting) return;
        const { offsetX, offsetY } = nativeEvent;
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();
    };

    const stopDrawing = () => {
        ctxRef.current.closePath();
        setIsPainting(false);
        saveSlide();
    };

    const toggleEraser = () => {
        const newVal = !isEraser;
        setIsEraser(newVal);
        ctxRef.current.globalCompositeOperation = newVal ? 'destination-out' : 'source-over';
    };

    const changeColor = (newColor) => {
        setIsEraser(false);
        ctxRef.current.globalCompositeOperation = 'source-over';
        setColor(newColor);
        ctxRef.current.strokeStyle = newColor;
    };

    const changeWidth = (val) => {
        setWidth(val);
        ctxRef.current.lineWidth = val;
    };

    const saveSlide = () => {
        if (!canvasRef.current) return;
        const updatedSlides = [...slides];
        updatedSlides[currentSlideIndex] = canvasRef.current.toDataURL();
        setSlides(updatedSlides);
    };

    const addSlide = () => {
        saveSlide();
        const canvas = canvasRef.current;
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        const newSlides = [...slides, canvas.toDataURL()];
        setSlides(newSlides);
        setCurrentSlideIndex(newSlides.length - 1);
    };

    const loadSlide = (index) => {
        if (index < 0 || index >= slides.length) return;
        saveSlide();
        const img = new Image();
        img.onload = () => {
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctxRef.current.drawImage(img, 0, 0);
        };
        img.src = slides[index];
        setCurrentSlideIndex(index);
    };

    const downloadSlide = () => {
        const link = document.createElement('a');
        link.download = `slide-${currentSlideIndex + 1}.png`;
        link.href = canvasRef.current.toDataURL();
        link.click();
    };

    const endClass = async (silent = false) => {
        if (silent || window.confirm("Are you sure you want to leave the class?")) {
            if (user.role === 'teacher') {
                await axios.post(`${API_URL}/api/live-class/end`, { roomId });
            }
            navigate(user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
        }
    };

    const isTeacher = user.role === 'teacher';

    return (
        <div style={{
            display: isTeacher ? 'grid' : 'block',
            gridTemplateColumns: isTeacher ? '1fr 400px' : 'none',
            height: '100vh',
            background: '#0F172A',
            overflow: 'hidden'
        }}>
            {/* Left: Whiteboard area (ONLY FOR TEACHER) */}
            {isTeacher && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
                    <div style={{ background: 'white', flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            style={{ cursor: isEraser ? 'crosshair' : 'pencil', width: '100%', height: '100%' }}
                        />
                        <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#64748B', fontWeight: 'bold', background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '4px' }}>
                            👨‍🏫 Teaching Whiteboard
                        </div>
                        {isTeacher && slides.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#4F46E5',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '30px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                                animation: 'pulse 2s infinite',
                                zIndex: 10
                            }}>
                                💡 Tip: Click "Share Screen" in Video area to show Whiteboard to students
                            </div>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', gap: '15px', padding: '0 10px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => toggleEraser()} style={{ background: isEraser ? '#EF4444' : '#334155', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                                {isEraser ? '🧽 Erasing' : '✏️ Pen'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {['#4F46E5', '#EF4444', '#10B981', '#000000'].map(c => (
                                <div
                                    key={c}
                                    onClick={() => changeColor(c)}
                                    style={{ width: '25px', height: '25px', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '1px solid #ddd', cursor: 'pointer' }}
                                />
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ color: 'white', fontSize: '12px' }}>Size:</span>
                            <input type="range" min="1" max="25" value={width} onChange={(e) => changeWidth(e.target.value)} />
                        </div>

                        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '15px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <button onClick={() => loadSlide(currentSlideIndex - 1)} disabled={currentSlideIndex === 0} style={{ padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>⬅️</button>
                            <span style={{ color: 'white', fontSize: '14px' }}>{currentSlideIndex + 1} / {slides.length}</span>
                            <button onClick={() => loadSlide(currentSlideIndex + 1)} disabled={currentSlideIndex === slides.length - 1} style={{ padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>➡️</button>
                            <button onClick={addSlide} style={{ background: '#10B981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>➕ New</button>
                        </div>

                        <button onClick={downloadSlide} style={{ marginLeft: 'auto', background: '#64748B', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>💾 Save</button>
                        <button onClick={endClass} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>End Class</button>
                    </div>
                </div>
            )}

            {/* Right: Jitsi Call Area (FULL SCREEN FOR STUDENT) */}
            <div style={{
                background: '#1E293B',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>
                <div ref={jitsiContainerRef} style={{ flex: 1 }} />
                {!isTeacher && (
                    <button
                        onClick={endClass}
                        style={{
                            position: 'absolute',
                            bottom: '80px',
                            right: '20px',
                            background: '#EF4444',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            zIndex: 1000,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}>
                        Leave Class
                    </button>
                )}
                <div style={{
                    height: '40px',
                    background: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 15px',
                    color: '#94A3B8',
                    fontSize: '13px',
                    fontWeight: '500'
                }}>
                    <span>{isTeacher ? '👨‍🏫 Teacher Portal' : '🎓 Student Portal'}</span>
                    <span style={{ marginLeft: 'auto' }}>Room ID: {roomId}</span>
                </div>
            </div>
        </div>
    );
};

export default LiveClassroom;
