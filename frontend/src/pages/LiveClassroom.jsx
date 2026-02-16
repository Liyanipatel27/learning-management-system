import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Editor, { loader } from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configure Monaco loader to use CDN to avoid local AMD conflicts
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

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
    const [isTextMode, setIsTextMode] = useState(false);
    const [textInput, setTextInput] = useState({ x: 0, y: 0, show: false, value: '' });
    const [slides, setSlides] = useState([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    // Jitsi States
    const jitsiApiRef = useRef(null);
    const jitsiContainerRef = useRef(null);
    const [jitsiLoaded, setJitsiLoaded] = useState(false);
    const [canvasInitialized, setCanvasInitialized] = useState(false);

    // Undo/Redo State
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const joinedConferenceRef = useRef(false);

    // Mode State (Whiteboard or Coding)
    const [activeMode, setActiveMode] = useState('whiteboard');
    const [canEditCode, setCanEditCode] = useState(true);
    const socketRef = useRef(null);

    // Coding States
    const [code, setCode] = useState('// Write your code here...\nconsole.log("Hello, Classroom!");');
    const [language, setLanguage] = useState('javascript');
    const [executingCode, setExecutingCode] = useState(false);
    const [executionResult, setExecutionResult] = useState(null);
    const [stdin, setStdin] = useState('');

    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);

    // Recording States & Refs
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const streamRef = useRef(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const classroomRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        // --- Socket Initialization ---
        const socket = io(API_URL);
        socketRef.current = socket;

        socket.emit('join-room', roomId);

        socket.on('incoming-draw', ({ x, y, lastX, lastY, color, width, type }) => {
            const ctx = ctxRef.current;
            if (!ctx) return;
            const canvas = canvasRef.current;
            // Scale coordinates if they were sent from a client with different dimensions
            // For now, assume relative or rely on socket broadcasting correct coords. 
            // Better: socket should send normalized coords (0-1) but that's a bigger refactor.
            // For now, let's just draw.

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
            setCode(newCode);
        });

        socket.on('incoming-permission', ({ canEdit }) => {
            if (user.role === 'student') {
                setCanEditCode(canEdit);
            }
        });

        socket.on('class-ended', () => {
            if (user.role === 'student') {
                alert("The teacher has ended this class.");
                window.location.href = '/student-dashboard';
            }
        });

        socket.on('incoming-slide-change', ({ index }) => {
            if (user.role === 'student') {
                setCurrentSlideIndex(index);
            }
        });

        socket.on('incoming-slide-add', ({ slideData }) => {
            if (user.role === 'student') {
                setSlides(prev => [...prev, slideData]);
            }
        });

        socket.on('incoming-slide-delete', ({ index }) => {
            if (user.role === 'student') {
                setSlides(prev => {
                    const newSlides = [...prev];
                    if (index >= 0 && index < newSlides.length) {
                        newSlides.splice(index, 1);
                    }
                    return newSlides;
                });
                setCurrentSlideIndex(prev => {
                    if (index < prev) return prev - 1;
                    if (index === prev) return Math.max(0, prev - 1);
                    return prev;
                });
            }
        });

        socket.on('incoming-canvas-update', ({ imageData }) => {
            const img = new Image();
            img.onload = () => {
                if (ctxRef.current && canvasRef.current) {
                    // Reset transform to identity before clearing to ensure full clear
                    ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
                    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                    // Re-apply scale for drawing
                    // actually, drawImage with full canvas data should probably just fill.
                    ctxRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);

                    // Restore scale for user drawing
                    const dpr = window.devicePixelRatio || 1;
                    ctxRef.current.scale(dpr, dpr);

                    setSlides(prev => {
                        const newSlides = [...prev];
                        newSlides[currentSlideIndex] = imageData;
                        return newSlides;
                    });
                }
            };
            img.src = imageData;
        });

        return () => {
            socket.disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [roomId]);

    useEffect(() => {
        const fetchRoomState = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/live-class/state/${roomId}`);
                if (res.data) {
                    if (res.data.slides && res.data.slides.length > 0) {
                        setSlides(res.data.slides);
                        setCurrentSlideIndex(res.data.currentSlideIndex || 0);
                    } else if (canvasRef.current && user.role === 'teacher') {
                        // DB is empty, create first slide with a white background
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        setSlides([canvas.toDataURL()]);
                    }
                    if (res.data.code) setCode(res.data.code);
                    if (res.data.language) setLanguage(res.data.language);
                }
            } catch (err) {
                console.warn("Could not fetch room state", err);
            }
        };
        fetchRoomState();

        return () => {
            // Cleanup handled in separate effect
        };
    }, [roomId]);

    // Timer Logic for Recording
    useEffect(() => {
        let interval;
        if (isRecording) {
            setElapsedTime(0);
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Save state when slides or index or code changes (Debounced)
    useEffect(() => {
        if (user.role !== 'teacher') return;

        const saveTimer = setTimeout(async () => {
            try {
                await axios.post(`${API_URL}/api/live-class/update/${roomId}`, {
                    slides,
                    currentSlideIndex,
                    code,
                    language
                });
            } catch (err) {
                console.error("Error saving room state:", err);
            }
        }, 5000); // Save every 5 seconds if changed

        return () => clearTimeout(saveTimer);
    }, [slides, currentSlideIndex, code, language]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        // --- 1. Load Jitsi Script (using fetch-eval to bypass Monaco AMD conflict) ---
        const loadJitsiScript = async () => {
            if (window.JitsiMeetExternalAPI) {
                console.log("Jitsi API already exists.");
                setJitsiLoaded(true);
                return;
            }

            try {
                console.log("Attempting to load Jitsi via fetch-eval...");
                const response = await fetch('https://meet.element.io/external_api.js');
                if (!response.ok) throw new Error("Network response was not ok");
                const scriptText = await response.text();

                // Execute the script in a scope where 'define' is hidden.
                // This prevents Jitsi from trying to register as an AMD module.
                const scriptFunction = new Function('define', scriptText);
                scriptFunction(undefined);

                if (typeof window.JitsiMeetExternalAPI === 'function') {
                    console.log("Jitsi API loaded successfully via fetch-eval.");
                    setJitsiLoaded(true);
                } else {
                    throw new Error("Jitsi API global not found after eval.");
                }
            } catch (err) {
                console.error("fetch-eval failed, falling back to aggressive script tag:", err);
                // Fallback: Aggressive script tag with AMD disable
                const originalDefine = window.define;
                window.define = undefined;

                const script = document.createElement('script');
                script.src = 'https://meet.element.io/external_api.js';
                script.async = true;
                script.onload = () => {
                    setTimeout(() => {
                        if (typeof window.JitsiMeetExternalAPI === 'function') {
                            console.log("Jitsi API loaded via fallback script tag.");
                            setJitsiLoaded(true);
                        }
                        if (originalDefine) window.define = originalDefine;
                    }, 500);
                };
                script.onerror = () => {
                    if (originalDefine) window.define = originalDefine;
                    console.error("Jitsi fallback script failed.");
                };
                document.body.appendChild(script);
            }
        };

        loadJitsiScript();
        // --- 2. Initialize Canvas (Teacher mode) ---
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // High DPI Support
                const dpr = window.devicePixelRatio || 1;
                // Get CSS size
                const rect = canvas.getBoundingClientRect();

                // Set actual size in memory (scaled to account for extra pixel density)
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;

                // Scale the context to match
                ctx.scale(dpr, dpr);

                // Initial fill
                if (!canvasInitialized) {
                    ctx.fillStyle = "white";
                    // Clear rect uses physical pixels when transform is identity, so we fill logical
                    ctx.fillRect(0, 0, rect.width, rect.height);
                }
                ctx.lineCap = 'round';
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctxRef.current = ctx;
                setCanvasInitialized(true);
            }
        }

        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;

                // Update internal resolution
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;

                // Normalize coordinate system to use CSS pixels
                const ctx = ctxRef.current;
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                }

                // Re-draw current slide after resize
                if (slides[currentSlideIndex]) {
                    const img = new Image();
                    img.onload = () => {
                        if (ctxRef.current) {
                            // Reset transform for full clear
                            ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
                            ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
                            // Draw image stretched to fit
                            ctxRef.current.drawImage(img, 0, 0, canvas.width, canvas.height);
                            // Restore scale
                            ctxRef.current.scale(dpr, dpr);
                        }
                    };
                    img.src = slides[currentSlideIndex];
                }
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('fullscreenchange', handleResize);
        document.addEventListener('webkitfullscreenchange', handleResize); // Safari/Chrome older
        document.addEventListener('mozfullscreenchange', handleResize); // Firefox older
        document.addEventListener('MSFullscreenChange', handleResize); // IE/Edge older

        // Initial size
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('fullscreenchange', handleResize);
            document.removeEventListener('webkitfullscreenchange', handleResize);
            document.removeEventListener('mozfullscreenchange', handleResize);
            document.removeEventListener('MSFullscreenChange', handleResize);
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [currentSlideIndex, sidebarVisible, activeMode]); // Re-bind on mode change to catch layout shifts

    // Simplified Jitsi Initialization
    useEffect(() => {
        if (jitsiLoaded && jitsiContainerRef.current && !jitsiApiRef.current) {
            startMeeting();
        }
    }, [jitsiLoaded, roomId]);

    const startMeeting = () => {
        if (!jitsiContainerRef.current || jitsiApiRef.current) return;

        try {
            const domain = 'meet.element.io';
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
                    prejoinPageEnabled: false,
                    disableThirdPartyRequests: true,
                    enableWelcomePage: false,
                    enableNoAudioDetection: true,
                    enableInsecureRoomNameWarning: false,
                    enableClosePage: false // Disable the "Meeting ended" page
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
                    MOBILE_APP_PROMO: false,
                    SHOW_PROMOTIONAL_CLOSE_PAGE: false, // Critical: Prevent promo page
                    SHOW_POWERED_BY: false
                }
            };

            const api = new window.JitsiMeetExternalAPI(domain, options);
            jitsiApiRef.current = api;

            // Handle Jitsi Events
            api.addEventListeners({
                videoConferenceJoined: () => {
                    console.log("[LIVE CLASS DEBUG] Video conference joined");
                    joinedConferenceRef.current = true;
                },
                videoConferenceLeft: () => {
                    console.log("[LIVE CLASS DEBUG] Video conference left");
                    // We DO NOT want to auto-end the class or redirect immediately.
                    // This allows users to rejoin if they were disconnected or if Jitsi timed out.
                    joinedConferenceRef.current = false;
                    // Optional: You could show a UI notice here, e.g., "You have left the audio/video call."
                },
                readyToClose: () => {
                    console.log("[LIVE CLASS DEBUG] Jitsi ready to close (Hangup)");
                    try {
                        if (jitsiApiRef.current) {
                            jitsiApiRef.current.dispose();
                            jitsiApiRef.current = null;
                        }
                    } catch (err) {
                        console.warn("Error disposing Jitsi API:", err);
                    }
                    if (user.role === 'teacher') {
                        // endClass(true); // Don't destroy the room on local hangup
                        window.location.href = '/teacher-dashboard';
                    } else {
                        window.location.href = '/student-dashboard';
                    }
                },
                screenSharingStatusChanged: (event) => {
                    if (event.on) {
                        api.executeCommand('setTileView', false);
                    }
                }
            });
        } catch (err) {
            console.error("Failed to start Jitsi meeting:", err);
        }
    };
    // --- Whiteboard Functions ---
    const lastPos = useRef({ x: 0, y: 0 });

    const getCoordinates = (event) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        // Use standard offsetX/Y if available (Mouse)
        // This automatically handles borders/padding relative to the target code
        if (event.nativeEvent && typeof event.nativeEvent.offsetX === 'number') {
            return {
                x: event.nativeEvent.offsetX,
                y: event.nativeEvent.offsetY
            };
        }

        // Fallback for Touch Events
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else if (event.nativeEvent && event.nativeEvent.touches && event.nativeEvent.touches.length > 0) {
            clientX = event.nativeEvent.touches[0].clientX;
            clientY = event.nativeEvent.touches[0].clientY;
        } else {
            // Fallback to clientX on event (rare but possible)
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (event) => {
        // Prevent scrolling on touch
        if (event.type === 'touchstart') event.preventDefault();

        const { x, y } = getCoordinates(event);
        if (!ctxRef.current) return;

        ctxRef.current.beginPath();
        ctxRef.current.moveTo(x, y);
        setIsPainting(true);
        lastPos.current = { x, y };

        // Save state for Undo before drawing starts
        if (canvasRef.current && history.length === 0) {
            // Only save initial blank state if history is empty? 
            // Logic: Usually we save *after* works. But for undoing to blank, we need blank state.
            // Current logic saved on every start. Let's keep it.
            const currentData = canvasRef.current.toDataURL();
            setHistory(prev => [...prev, currentData]);
            setRedoStack([]);
        } else if (canvasRef.current) {
            const currentData = canvasRef.current.toDataURL();
            setHistory(prev => [...prev, currentData]);
            setRedoStack([]);
        }

        socketRef.current?.emit('draw-event', {
            roomId,
            x: x,
            y: y,
            color,
            width,
            type: 'start'
        });
    };

    const draw = (event) => {
        if (!isPainting || !ctxRef.current) return;
        if (event.type === 'touchmove') event.preventDefault(); // Stop scrolling

        const { x, y } = getCoordinates(event);
        const ctx = ctxRef.current;

        // Quadratic Curve Smoothing
        // We draw a curve from the Last Point to the mid-point of (Last, Current)
        // Control point is the Last Point.
        // Wait, standard smoothing uses: p0->mid(p0,p1) with p0 is control?
        // simple: Curve from LastPos to Midpoint(LastPos, CurrentPos) ? No.

        // Better Algorithm for real-time:
        // Draw line to current? No, that's jagged.
        // We need 3 points. But we only have last and current.
        // Strategy: Treat 'lastPos' as the control point?
        // Let's stick to simple lineTo but relying on high-frequency events + LineCap Round.
        // Actually, the user says "small writing". The issue is likely 'points skipping'.

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        socketRef.current?.emit('draw-event', {
            roomId,
            x: x,
            y: y,
            lastX: lastPos.current.x,
            lastY: lastPos.current.y,
            color,
            width,
            type: 'move'
        });
        lastPos.current = { x, y };
    };

    const stopDrawing = () => {
        if (!ctxRef.current) return;
        ctxRef.current.closePath();
        setIsPainting(false);
        saveSlide();
        // Emit the final canvas state after drawing is complete
        if (canvasRef.current) {
            socketRef.current?.emit('canvas-update', { roomId, imageData: canvasRef.current.toDataURL() });
        }
    };



    const toggleTextMode = () => {
        setIsTextMode(!isTextMode);
        setIsEraser(false);
        setIsPainting(false);
    };

    const handleCanvasClick = (event) => {
        if (!isTextMode) return;

        // Prevent default to avoid double-firing (touch -> mouse)
        // and prevent generic canvas behavior
        event.preventDefault();
        event.stopPropagation();

        const { x, y } = getCoordinates(event);
        setTextInput({ x, y, show: true, value: '' });
    };

    const handleTextSubmit = () => {
        if (!textInput.show || !textInput.value) {
            setTextInput({ ...textInput, show: false });
            return;
        }

        const ctx = ctxRef.current;
        if (ctx) {
            // Save state for undo
            if (canvasRef.current) {
                const currentData = canvasRef.current.toDataURL();
                setHistory(prev => [...prev, currentData]);
                setRedoStack([]);
            }

            ctx.font = `${width * 5}px Arial`; // Scale font with brush size? 
            // Or fixed? Let's use brush size * 4 for visibility
            ctx.fillStyle = color;
            ctx.fillText(textInput.value, textInput.x, textInput.y);

            // Emit to sync
            socketRef.current?.emit('canvas-update', { roomId, imageData: canvasRef.current.toDataURL() });
        }

        setTextInput({ ...textInput, show: false, value: '' });
        saveSlide();
    };

    // Auto-focus input when it appears
    useEffect(() => {
        if (textInput.show) {
            // Small timeout to ensure DOM is ready and transition is done
            setTimeout(() => {
                const input = document.getElementById('wb-text-input');
                if (input) {
                    input.focus();
                }
            }, 10);
        }
    }, [textInput.show]);

    const toggleEraser = () => {
        const newVal = !isEraser;
        setIsEraser(newVal);
        setIsTextMode(false);
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = newVal ? 'destination-out' : 'source-over';
        }
    };

    const changeColor = (newColor) => {
        setIsEraser(false);
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = 'source-over';
            setColor(newColor);
            ctxRef.current.strokeStyle = newColor;
        }
    };

    const changeWidth = (val) => {
        setWidth(val);
        if (ctxRef.current) {
            ctxRef.current.lineWidth = val;
        }
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
        if (ctxRef.current) {
            // Fill white relative to logical size? 
            // Since we scaled ctx, we fill logical size
            const rect = canvas.getBoundingClientRect();
            ctxRef.current.fillStyle = "white";
            ctxRef.current.fillRect(0, 0, rect.width, rect.height);
        }
        socketRef.current?.emit('clear-canvas', roomId);
        const newSlideData = canvas.toDataURL();
        const newSlides = [...slides, newSlideData];
        setSlides(newSlides);
        setCurrentSlideIndex(newSlides.length - 1);

        // Emit to students
        socketRef.current?.emit('slide-add-event', { roomId, slideData: newSlideData });
    };

    const loadSlide = (index) => {
        if (index < 0 || index >= slides.length) return;
        saveSlide();
        setCurrentSlideIndex(index);

        // Emit to students
        socketRef.current?.emit('slide-change-event', { roomId, index });
    };

    const deleteSlide = () => {
        if (slides.length <= 1) {
            alert("Cannot delete the only slide!");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this slide?")) return;

        const indexToDelete = currentSlideIndex;
        const newSlides = [...slides];
        newSlides.splice(indexToDelete, 1);
        setSlides(newSlides);

        let newIndex = indexToDelete;
        if (newIndex >= newSlides.length) {
            newIndex = newSlides.length - 1;
        }
        setCurrentSlideIndex(newIndex);

        socketRef.current?.emit('slide-delete-event', { roomId, index: indexToDelete });
    };

    useEffect(() => {
        if (canvasInitialized && slides[currentSlideIndex] && ctxRef.current) {
            const img = new Image();
            img.onload = () => {
                if (ctxRef.current) {
                    ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
                    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctxRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    const dpr = window.devicePixelRatio || 1;
                    ctxRef.current.scale(dpr, dpr);
                }
            };
            img.src = slides[currentSlideIndex];
        }
    }, [currentSlideIndex, slides.length, canvasInitialized]); // Redraw when data or canvas is ready

    const downloadSlide = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a temporary canvas to draw with a white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with white
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the original content on top
        tempCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `slide-${currentSlideIndex + 1}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            classroomRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
        // Force resize check after transition
        setTimeout(handleResize, 100);
        setTimeout(handleResize, 500);
    };

    const undo = () => {
        if (history.length === 0 || !canvasRef.current || !ctxRef.current) return;

        const previousState = history[history.length - 1];
        const currentData = canvasRef.current.toDataURL();

        setRedoStack(prev => [...prev, currentData]);
        setHistory(prev => prev.slice(0, -1));

        const img = new Image();
        img.onload = () => {
            ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctxRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const dpr = window.devicePixelRatio || 1;
            ctxRef.current.scale(dpr, dpr);
            saveSlide(); // Update slides array
            socketRef.current?.emit('canvas-update', { roomId, imageData: previousState });
        };
        img.src = previousState;
    };

    const redo = () => {
        if (redoStack.length === 0 || !canvasRef.current || !ctxRef.current) return;

        const nextState = redoStack[redoStack.length - 1];
        const currentData = canvasRef.current.toDataURL();

        setHistory(prev => [...prev, currentData]);
        setRedoStack(prev => prev.slice(0, -1));

        const img = new Image();
        img.onload = () => {
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctxRef.current.drawImage(img, 0, 0);
            saveSlide(); // Update slides array
            socketRef.current?.emit('canvas-update', { roomId, imageData: nextState });
        };
        img.src = nextState;
    };

    const clearCanvas = () => {
        if (!canvasRef.current || !ctxRef.current) return;

        const currentData = canvasRef.current.toDataURL();
        setHistory(prev => [...prev, currentData]);
        setRedoStack([]);

        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctxRef.current.fillStyle = "white";
        ctxRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveSlide();
        socketRef.current?.emit('clear-canvas', roomId);
        socketRef.current?.emit('canvas-update', { roomId, imageData: canvasRef.current.toDataURL() });
    };

    // --- Screen Recording Functions ---
    const startRecording = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: true
            });

            let micStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                console.warn("Microphone access denied:", micErr);
            }

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

            const tracks = [
                ...screenStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
            ];
            const combinedStream = new MediaStream(tracks);

            streamRef.current = screenStream;

            // Handle user stopping screen share via browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                console.log("[LIVE CLASS DEBUG] Screen share tracks ended manually");
                stopRecording();
            };

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
                    ? 'video/webm; codecs=vp9'
                    : 'video/webm'
            });

            mediaRecorderRef.current = mediaRecorder;
            recordedChunks.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `LiveClass-${roomId}-${new Date().getTime()}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                streamRef.current.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            };

            mediaRecorder.start();
            setIsRecording(true);
            console.log("[LIVE CLASS DEBUG] Recording started successfully");
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please grant permissions and select a screen to share.");
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

    const leaveClass = () => {
        const message = user.role === 'teacher'
            ? "Are you sure you want to exit? The class will remain active for students."
            : "Are you sure you want to leave the class?";

        if (window.confirm(message)) {
            window.location.href = user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';
        }
    };

    const endClass = async (silent = false) => {
        if (silent || window.confirm("Are you sure you want to end the class for everyone?")) {
            console.log(`[LIVE CLASS DEBUG] endClass called logic.`);

            if (user.role === 'teacher') {
                try {
                    socketRef.current?.emit('end-class', { roomId });
                    // Don't await the backend call to ensure instant UI response (Fire & Forget)
                    axios.post(`${API_URL}/api/live-class/end`, { roomId }).catch(err => console.error("Error ending class in backend:", err));
                } catch (err) {
                    console.error("Error sending socket event:", err);
                }
            }

            // Navigate immediately using hard redirect
            window.location.href = user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';
        }
    };

    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const isTeacher = user.role === 'teacher';

    return (
        <div
            ref={classroomRef}
            style={{
                display: 'grid',
                gridTemplateColumns: !isFullScreen ? '1fr 350px' : '1fr',
                height: '100vh',
                background: '#0F172A',
                overflow: 'hidden',
                transition: 'grid-template-columns 0.3s ease'
            }}
        >
            {/* Left: Whiteboard/Coding area (Visible to ALL, Read-only for students) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px',
                    background: '#0F172A',
                    zIndex: 10,
                    flexShrink: 0
                }}>
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
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
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
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        💻 Coding Area
                    </button>
                    {/* Explicit End Class Button (TEACHER ONLY) */}
                    {isTeacher && (
                        <button
                            onClick={() => endClass(false)}
                            style={{
                                padding: '10px 20px',
                                background: '#DC2626',
                                color: 'white',
                                border: '2px solid #991B1B',
                                borderRadius: '5px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            ⛔ End Class
                        </button>
                    )}
                    <button
                        onClick={downloadSlide}
                        style={{
                            padding: '10px 20px',
                            background: '#64748B',
                            color: 'white',
                            border: '2px solid #475569',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        💾 Save
                    </button>
                    <button
                        onClick={leaveClass}
                        style={{
                            padding: '10px 20px',
                            background: '#334155',
                            color: 'white',
                            border: '2px solid #475569',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        🚪 {isTeacher ? 'Exit Workspace' : 'Exit'}
                    </button>
                </div>

                <div style={{ flex: 1, margin: '0 10px 10px 10px', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #334155', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Session Timer Overlay - Only visible when recording */}
                    {isRecording && (
                        <div style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            zIndex: 10,
                            background: 'rgba(239, 68, 68, 0.9)', // Red background for recording
                            color: 'white',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                            REC: {formatTime(elapsedTime)}
                        </div>
                    )}

                    {/* Whiteboard Container */}
                    <div style={{
                        display: activeMode === 'whiteboard' ? 'block' : 'none',
                        height: '100%',
                        background: 'white',
                        position: 'relative'
                    }}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={(e) => {
                                if (!isTeacher) return; // Students cannot draw
                                if (isTextMode) return; // Wait for click
                                startDrawing(e);
                            }}
                            onClick={(e) => {
                                if (!isTeacher) return;
                                if (isTextMode) handleCanvasClick(e);
                            }}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={(e) => {
                                if (!isTeacher) return;
                                if (isTextMode) {
                                    // For touch, click might be unreliable, use TouchStart but prevent drawing
                                    handleCanvasClick(e);
                                } else {
                                    startDrawing(e);
                                }
                            }}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            style={{
                                cursor: isTeacher ? (isTextMode ? 'text' : 'crosshair') : 'default',
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                touchAction: 'none'
                            }}
                        />
                        {textInput.show && (
                            <input
                                id="wb-text-input"
                                type="text"
                                value={textInput.value}
                                onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                                onBlur={handleTextSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleTextSubmit();
                                }}
                                placeholder="Type here..."
                                style={{
                                    position: 'absolute',
                                    left: textInput.x,
                                    top: textInput.y,
                                    fontSize: `${width * 5}px`,
                                    color: color,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    border: '2px solid #4F46E5', // Distinct blue border
                                    borderRadius: '4px',
                                    padding: '2px 4px',
                                    outline: 'none',
                                    margin: 0,
                                    zIndex: 9999, // Ensure it's on top of everything
                                    minWidth: '100px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                autoFocus
                            />
                        )}

                        <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#64748B', fontWeight: 'bold', background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '4px' }}>
                            👨‍🏫 Teaching Whiteboard
                        </div>
                    </div>

                    {/* Coding Container */}
                    <div style={{
                        display: activeMode === 'coding' ? 'block' : 'none',
                        height: '100%',
                        background: '#1e1e2e',
                        minHeight: 0
                    }}>
                        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '10px', borderBottom: '1px solid #334155' }}>
                                <h3 style={{ color: 'white', margin: 0 }}>Live Coding</h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Language:</span>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#334155',
                                            color: 'white',
                                            border: '1px solid #475569',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                        <option value="c">C</option>
                                        <option value="csharp">C#</option>
                                        <option value="php">PHP</option>
                                        <option value="ruby">Ruby</option>
                                        <option value="go">Go</option>
                                        <option value="rust">Rust</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="swift">Swift</option>
                                        <option value="kotlin">Kotlin</option>
                                        <option value="sql">SQL</option>
                                        <option value="html">HTML</option>
                                        <option value="css">CSS</option>
                                    </select>
                                </div>
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
                    </div>
                </div>

                {/* Toolbar (Teaching Tools - Editing Hidden for Students, Layout Visible) */}
                <div style={{
                    height: '75px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0 15px',
                    background: '#1E293B',
                    borderTop: '1px solid #334155',
                    flexShrink: 0,
                    zIndex: 10
                }}>
                    {isTeacher && (
                        <>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={undo} disabled={history.length === 0} style={{ background: history.length === 0 ? '#1E293B' : '#334155', color: history.length === 0 ? '#64748B' : 'white', border: '1px solid #475569', padding: '10px', borderRadius: '8px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', fontSize: '16px' }} title="Undo">↩️</button>
                                <button onClick={redo} disabled={redoStack.length === 0} style={{ background: redoStack.length === 0 ? '#1E293B' : '#334155', color: redoStack.length === 0 ? '#64748B' : 'white', border: '1px solid #475569', padding: '10px', borderRadius: '8px', cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer', fontSize: '16px' }} title="Redo">↪️</button>
                                <button onClick={deleteSlide} style={{ background: '#EF4444', color: 'white', border: '1px solid #991B1B', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }} title="Delete Slide">🗑️</button>
                                <div style={{ width: '1px', height: '20px', background: '#334155', margin: 'auto 5px' }}></div>
                                <button onClick={() => toggleEraser()} style={{ background: isEraser ? '#EF4444' : '#334155', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {isEraser ? '🧽 Erasing' : '✏️ Pen'}
                                </button>
                                <button onClick={toggleTextMode} style={{ background: isTextMode ? '#10B981' : '#334155', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    🔤 Text
                                </button>

                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['#4F46E5', '#EF4444', '#10B981', '#000000'].map(c => (
                                    <div key={c} onClick={() => changeColor(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '1px solid #475569', cursor: 'pointer' }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0F172A', padding: '5px 12px', borderRadius: '8px' }}>
                                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 'bold' }}>SIZE:</span>
                                <input type="range" min="1" max="25" value={width} onChange={(e) => changeWidth(e.target.value)} style={{ cursor: 'pointer' }} />
                            </div>
                            <div style={{ borderLeft: '1px solid #334155', height: '30px', margin: '0 5px' }} />
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <button onClick={() => loadSlide(currentSlideIndex - 1)} disabled={currentSlideIndex === 0} style={{ padding: '8px 12px', borderRadius: '8px', background: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>⬅️</button>
                                <span style={{ color: 'white', fontSize: '14px', fontWeight: '600', minWidth: '50px', textAlign: 'center' }}>{currentSlideIndex + 1} / {slides.length}</span>
                                <button onClick={() => loadSlide(currentSlideIndex + 1)} disabled={currentSlideIndex === slides.length - 1} style={{ padding: '8px 12px', borderRadius: '8px', background: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>➡️</button>
                                <button onClick={addSlide} style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>➕ New</button>

                            </div>
                            <div style={{ borderLeft: '1px solid #334155', height: '30px', margin: '0 5px' }} />
                        </>
                    )}
                    <button onClick={toggleFullScreen} style={{ background: '#475569', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {document.fullscreenElement ? '🗗 Exit' : '⛶ Full'}
                    </button>
                    <button onClick={() => setSidebarVisible(!sidebarVisible)} style={{ background: '#475569', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {sidebarVisible ? '⬅ Hide' : '➡ Show'}
                    </button>
                    {isTeacher && (
                        <button onClick={isRecording ? stopRecording : startRecording} style={{ background: isRecording ? '#EF4444' : '#10B981', color: 'white', border: 'none', padding: '10px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                            {isRecording ? '⏹ Stop' : '⏺ Record'}
                        </button>
                    )}



                </div>
            </div>


            {/* Right: Jitsi Call Area */}
            <div style={{
                background: '#1E293B',
                height: '100%',
                display: (sidebarVisible && !isFullScreen) ? 'flex' : 'none',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                borderLeft: '1px solid #334155'
            }}>
                <div ref={jitsiContainerRef} style={{ flex: 1, height: '100%', width: '100%', background: '#1E293B' }}>
                    {!jitsiLoaded && (
                        <div style={{ color: 'white', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            Initializing Video...
                        </div>
                    )}
                </div>
                <div style={{ height: '40px', background: '#0F172A', display: 'flex', alignItems: 'center', padding: '0 15px', color: '#94A3B8', fontSize: '12px' }}>
                    <span>{isTeacher ? '👨‍🏫 Teacher' : '🎓 Student'} | Room: {roomId}</span>
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div >
    );
};

export default LiveClassroom;
