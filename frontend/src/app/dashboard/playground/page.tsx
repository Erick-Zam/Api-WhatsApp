'use client';
import { useState, useEffect } from 'react';

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'poll';

export default function Playground() {
    const [apiKey, setApiKey] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('text');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    // Session Management
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');

    // Type specific fields
    const [message, setMessage] = useState('Hello from the Playground! 🚀');
    const [mediaUrl, setMediaUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [fileName, setFileName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [pollName, setPollName] = useState('');
    const [pollValues, setPollValues] = useState(''); // Comma separated

    const [response, setResponse] = useState<any>(null);
    const [requestPreview, setRequestPreview] = useState<any>(null);

    useEffect(() => {
        // Fetch sessions
        fetch('http://localhost:3001/sessions')
            .then(res => res.json())
            .then(data => {
                setSessions(data);
                if (data.length > 0) {
                    // Default to first connected session if available?
                    const connected = data.find((s: any) => s.status === 'CONNECTED');
                    if (connected) setSelectedSession(connected.id);
                }
            })
            .catch(err => console.error(err));

        // Auto-fill API key for convenience if available
        const token = localStorage.getItem('token');
        if (token) {
            fetch('http://localhost:3001/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));
        }
    }, []);

    // Construct the payload dynamically based on selected type
    const constructPayload = () => {
        const base = {
            phone,
            sessionId: selectedSession
        };

        switch (messageType) {
            case 'text':
                return { ...base, message };
            case 'image':
                return { ...base, imageUrl: mediaUrl, caption };
            case 'video':
                return { ...base, videoUrl: mediaUrl, caption };
            case 'audio':
                return { ...base, audioUrl: mediaUrl };
            case 'document':
                return { ...base, documentUrl: mediaUrl, fileName };
            case 'location':
                return { ...base, latitude, longitude };
            case 'poll':
                return {
                    ...base,
                    name: pollName,
                    values: pollValues.split(',').map(v => v.trim()).filter(v => v),
                    singleSelect: true
                };
            default:
                return base;
        }
    };

    useEffect(() => {
        setRequestPreview(constructPayload());
    }, [messageType, phone, message, mediaUrl, caption, fileName, latitude, longitude, pollName, pollValues, selectedSession]);

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);

        const payload = constructPayload();
        const endpoint = `http://localhost:3001/messages/${messageType}`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            setResponse({ status: res.status, statusText: res.statusText, data });
        } catch (error: any) {
            setResponse({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-black dark:text-white">API Playground</h2>
            <p className="mb-8 text-gray-600 dark:text-gray-400">Test your API integration instantly. Select a session, fill in the fields, and send the request.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Controls */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow border border-gray-200 dark:border-zinc-800">

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">WhatsApp Session</label>
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="default">default</option>
                                {sessions.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.id} ({s.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message Type</label>
                            <select
                                value={messageType}
                                onChange={(e) => setMessageType(e.target.value as MessageType)}
                                className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="text">Text Message</option>
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="document">Document</option>
                                <option value="location">Location</option>
                                <option value="poll">Poll</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* ... rest of the form ... */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Phone (Ex: 59399...)</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="593991234567"
                                className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                            />
                        </div>

                        {messageType === 'text' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message Content</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows={4}
                                    className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                ></textarea>
                            </div>
                        )}

                        {['image', 'video', 'audio', 'document'].includes(messageType) && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Media URL</label>
                                <input
                                    type="text"
                                    value={mediaUrl}
                                    onChange={e => setMediaUrl(e.target.value)}
                                    placeholder="https://example.com/file.jpg"
                                    className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                />
                            </div>
                        )}

                        {['image', 'video'].includes(messageType) && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Caption</label>
                                <input
                                    type="text"
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder="Check this out!"
                                    className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                />
                            </div>
                        )}

                        {messageType === 'poll' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Poll Question</label>
                                    <input
                                        type="text"
                                        value={pollName}
                                        onChange={e => setPollName(e.target.value)}
                                        placeholder="What is your favorite color?"
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Options (comma separated)</label>
                                    <input
                                        type="text"
                                        value={pollValues}
                                        onChange={e => setPollValues(e.target.value)}
                                        placeholder="Red, Blue, Green"
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-800">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">API Key used for request</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-zinc-800 p-2 rounded border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-400 text-xs font-mono mb-4"
                        />

                        <button
                            onClick={handleSend}
                            disabled={loading || !phone}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 ${loading || !phone ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg'}`}
                        >
                            {loading ? 'Sending...' : 'Send Request 🚀'}
                        </button>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="space-y-6">
                    {/* Request Preview */}
                    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
                        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Request Body (JSON)</span>
                            <span className="text-xs font-mono text-green-400">POST /messages/{messageType}</span>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-blue-300">
                                {JSON.stringify(requestPreview, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Response Preview */}
                    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 min-h-[200px]">
                        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Server Response</span>
                            {response && (
                                <span className={`text-xs font-bold px-2 py-1 rounded ${response.status >= 200 && response.status < 300 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {response.status} {response.statusText}
                                </span>
                            )}
                        </div>
                        <div className="p-4 overflow-x-auto relative">
                            {response ? (
                                <pre className={`text-sm font-mono ${response.error || (response.status && response.status >= 400) ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {JSON.stringify(response.data || response, null, 2)}
                                </pre>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30">
                                    <svg className="w-12 h-12 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <span className="text-gray-500 text-sm">Response will appear here</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
