import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
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

    // Mode State (Whiteboard or Coding)
    const [activeMode, setActiveMode] = useState('whiteboard');
    const [canEditCode, setCanEditCode] = useState(user?.role === 'teacher');
    const socketRef = useRef(null);

    // Coding States
    const [code, setCode] = useState('// Write your code here...\nconsole.log("Hello, Classroom!");');
    const [language, setLanguage] = useState('javascript');
    const [executingCode, setExecutingCode] = useState(false);
    const [executionResult, setExecutionResult] = useState(null);
    const [stdin, setStdin] = useState('');

    // Recording States & Refs
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const streamRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';

    useEffect(() => {
        // --- Socket Initialization ---
        const socket = io(API_URL);
        socketRef.current = socket;

        socket.emit('join-room', roomId);

        socket.on('incoming-draw', ({ x, y, lastX, lastY, color, width, type }) => {
            const ctx = ctxRef.current;
            if (!ctx) return;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            if (type === 'start') {
                ctx.moveTo(x, y);
            } else {
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        });

        socket.on('canvas-cleared', () => {
            const canvas = canvasRef.current;
            if (canvas && ctxRef.current) {
                ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
            }
        });

        socket.on('incoming-code', (newCode) => {
            if (user.role === 'student') {
                setCode(newCode);
            }
        });

        socket.on('incoming-permission', ({ canEdit }) => {
            if (user.role === 'student') {
                setCanEditCode(canEdit);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId]);

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
    const lastPos = useRef({ x: 0, y: 0 });

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        setIsPainting(true);
        lastPos.current = { x: offsetX, y: offsetY };

        socketRef.current?.emit('draw-event', {
            roomId,
            x: offsetX,
            y: offsetY,
            color,
            width,
            type: 'start'
        });
    };

    const draw = ({ nativeEvent }) => {
        if (!isPainting) return;
        const { offsetX, offsetY } = nativeEvent;
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        socketRef.current?.emit('draw-event', {
            roomId,
            x: offsetX,
            y: offsetY,
            lastX: lastPos.current.x,
            lastY: lastPos.current.y,
            color,
            width,
            type: 'move'
        });
        lastPos.current = { x: offsetX, y: offsetY };
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
        socketRef.current?.emit('clear-canvas', roomId);
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

    // --- Screen Recording Functions ---
    const startRecording = async () => {
        try {
            // 1. Get screen stream
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: true // Captures system/tab audio
            });

            // 2. Get microphone stream
            let micStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                console.warn("Microphone access denied or not available:", micErr);
            }

            // 3. Combine audio tracks
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            if (screenStream.getAudioTracks().length > 0) {
                const source1 = audioContext.createMediaStreamSource(new MediaStream([screenStream.getAudioTracks()[0]]));
                source1.connect(destination);
            }

            if (micStream && micStream.getAudioTracks().length > 0) {
                const source2 = audioContext.createMediaStreamSource(micStream);
                source2.connect(destination);
            }

            // 4. Create final combined stream
            const tracks = [
                ...screenStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
            ];
            const combinedStream = new MediaStream(tracks);

            streamRef.current = screenStream; // Keep track of original for stopping
            const micStreamForCleanup = micStream;

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm; codecs=vp9'
            });

            mediaRecorderRef.current = mediaRecorder;
            recordedChunks.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks.current, {
                    type: 'video/webm'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `LiveClass-${roomId}-${new Date().getTime()}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);

                // Stop all tracks
                streamRef.current.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please ensure you grant screen capture permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleExecuteCode = async () => {
        setExecutingCode(true);
        setExecutionResult(null);
        try {
            const res = await axios.post(`${API_URL}/api/assignments/execute`, {
                code,
                language,
                stdin
            });
            setExecutionResult(res.data);
        } catch (err) {
            console.error('Execution error:', err);
            setExecutionResult({ output: 'Error executing code: ' + (err.response?.data?.message || err.message) });
        } finally {
            setExecutingCode(false);
        }
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
            {/* Left: Whiteboard/Coding area (ONLY FOR TEACHER) */}
            {isTeacher && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
                    {/* Header with Switcher */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                            onClick={() => setActiveMode('whiteboard')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: activeMode === 'whiteboard' ? '#4F46E5' : '#1E293B',
                                color: 'white',
                                border: activeMode === 'whiteboard' ? 'none' : '1px solid #334155',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🖌️ Whiteboard
                        </button>
                        <button
                            onClick={() => setActiveMode('coding')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: activeMode === 'coding' ? '#4F46E5' : '#1E293B',
                                color: 'white',
                                border: activeMode === 'coding' ? 'none' : '1px solid #334155',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            💻 Coding Area
                        </button>
                    </div>

                    <div style={{ background: activeMode === 'whiteboard' ? 'white' : '#1e1e2e', flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' }}>
                        {activeMode === 'whiteboard' ? (
                            <>
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
                            </>
                        ) : (
                            <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ color: 'white', margin: 0 }}>Live Coding</h3>
                                    {user.role === 'teacher' && (
                                        <button
                                            onClick={() => {
                                                const newStatus = !canEditCode;
                                                setCanEditCode(newStatus);
                                                socketRef.current?.emit('permission-update', { roomId, canEdit: newStatus });
                                            }}
                                            style={{
                                                padding: '5px 12px',
                                                background: canEditCode ? '#10B981' : '#F59E0B',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {canEditCode ? '🔓 Students Can Edit' : '🔒 Read-Only for Students'}
                                        </button>
                                    )}
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        style={{ padding: '5px 10px', background: '#334155', color: 'white', border: 'none', borderRadius: '5px' }}
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                    </select>
                                </div>
                                                                <div style={{ flex: 2, borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                    <Editor
                                        height="100%"
                                        language={language === 'cpp' ? 'cpp' : language}
                                        value={code}
                                        theme="vs-dark"
                                        options={{
                                            fontSize: 14,
                                            minimap: { enabled: false },
                                            readOnly: !canEditCode,
                                            automaticLayout: true
                                        }}
                                        onChange={(value) => {
                                            setCode(value);
                                            socketRef.current?.emit('code-update', { roomId, code: value });
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <textarea
                                        value={stdin}
                                        onChange={(e) => setStdin(e.target.value)}
                                        placeholder="Input (stdin)"
                                        style={{
                                            flex: 1,
                                            height: '60px',
                                            background: '#0f172a',
                                            color: 'white',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            fontSize: '0.9rem',
                                            resize: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleExecuteCode}
                                        disabled={executingCode}
                                        style={{
                                            width: '120px',
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: executingCode ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {executingCode ? '⚡...' : '▶ Run'}
                                    </button>
                                </div>
                                {executionResult && (
                                    <div style={{ flex: 1, background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155', overflowY: 'auto' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 5px 0' }}>Result:</p>
                                        <pre style={{ color: '#10b981', margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                            {executionResult.output}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
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

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            style={{
                                background: isRecording ? '#EF4444' : '#10B981',
                                color: 'white',
                                border: 'none',
                                padding: '8px 15px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: isRecording ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
                            }}
                        >
                            {isRecording ? (
                                <>
                                    <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                    Stop Recording
                                </>
                            ) : (
                                <>⏺ Record Class</>
                            )}
                        </button>

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
