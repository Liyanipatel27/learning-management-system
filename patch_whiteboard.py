import os

file_path = r'e:\lms\frontend\src\pages\LiveClassroom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target the container with conditional rendering
target_old = """                    <div style={{ background: activeMode === 'whiteboard' ? 'white' : '#1e1e2e', flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' }}>
                        {activeMode === 'whiteboard' ? ("""

# Replace from line 445 to 556
# I'll use a more generic approach: find the start and end of the conditional block

start_marker = "                    <div style={{ background: activeMode === 'whiteboard' ? 'white' : '#1e1e2e', flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' }}>"
end_marker = "                        )}\n                    </div>"

# Actually, let's just replace the specific lines 445-556
lines = content.split('\n')
# Lines are 1-indexed, so 445 is index 444
# 556 is index 555

new_block = """                    <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                        {/* Whiteboard Container */}
                        <div style={{ 
                            display: activeMode === 'whiteboard' ? 'block' : 'none', 
                            height: '100%', 
                            background: 'white',
                            position: 'relative'
                        }}>
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
                        </div>

                        {/* Coding Container */}
                        <div style={{ 
                            display: activeMode === 'coding' ? 'block' : 'none', 
                            height: '100%', 
                            background: '#1e1e2e'
                        }}>
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
                        </div>"""

final_lines = lines[:444] + [new_block] + lines[556:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(final_lines))

print("Successfully updated LiveClassroom.jsx")
 Riverside
