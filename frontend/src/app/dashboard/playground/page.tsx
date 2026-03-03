import { useState, useEffect, useCallback } from 'react';

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'poll';

interface PlaygroundSession {
    id: string;
    status: string;
}

interface ApiResponse {
    status?: number;
    statusText?: string;
    data?: unknown;
    error?: string;
}

export default function Playground() {
    const [apiKey, setApiKey] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('text');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    // Session Management
    const [sessions, setSessions] = useState<PlaygroundSession[]>([]);
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

    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [requestPreview, setRequestPreview] = useState<unknown>(null);

    useEffect(() => {
        // Fetch sessions
        const token = localStorage.getItem('token');
        if (token) {
            // Get API Key
            fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));

            // Get Sessions
            fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSessions(data);
                        // Auto-select first connected or first available
                        const connected = data.find((s: PlaygroundSession) => s.status === 'CONNECTED');
                        if (connected && selectedSession === 'default') setSelectedSession(connected.id);
                        else if (data.length > 0 && selectedSession === 'default') setSelectedSession(data[0].id);
                    }
                })
                .catch(err => console.error(err));
        }
    }, [selectedSession]);

    const [category, setCategory] = useState<'messaging' | 'groups'>('messaging');
    const [groupAction, setGroupAction] = useState('create');
    const [groupJid, setGroupJid] = useState('');
    const [groupSubject, setGroupSubject] = useState('');
    const [participants, setParticipants] = useState(''); // Comma separated

    // Construct the payload dynamically based on selected type
    const constructPayload = useCallback(() => {
        const base = {
            sessionId: selectedSession
        };

        if (category === 'messaging') {
            const msgBase = { ...base, phone };
            switch (messageType) {
                case 'text': return { ...msgBase, message };
                case 'image': return { ...msgBase, imageUrl: mediaUrl, caption };
                case 'video': return { ...msgBase, videoUrl: mediaUrl, caption };
                case 'audio': return { ...msgBase, audioUrl: mediaUrl };
                case 'document': return { ...msgBase, documentUrl: mediaUrl, fileName };
                case 'location': return { ...msgBase, latitude, longitude };
                case 'poll':
                    return {
                        ...msgBase,
                        name: pollName,
                        values: pollValues.split(',').map(v => v.trim()).filter(v => v),
                        singleSelect: true
                    };
                default: return msgBase;
            }
        } else {
            // Groups
            switch (groupAction) {
                case 'create':
                    return {
                        ...base,
                        subject: groupSubject,
                        participants: participants.split(',').map(p => p.trim()).filter(p => p)
                    };
                case 'participants':
                    return {
                        ...base,
                        jid: groupJid,
                        action: 'add', // Default for preview, user should select
                        participants: participants.split(',').map(p => p.trim()).filter(p => p)
                    };
                default:
                    return { ...base, jid: groupJid };
            }
        }
    }, [selectedSession, category, phone, messageType, message, mediaUrl, caption, fileName, latitude, longitude, pollName, pollValues, groupAction, groupSubject, participants, groupJid]);

    useEffect(() => {
        setRequestPreview(constructPayload());
    }, [constructPayload]);

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);

        const payload = constructPayload();
        let endpoint = '';
        let method = 'POST';

        if (category === 'messaging') {
            endpoint = `/api/messages/${messageType}`;
        } else {
            // Group Endpoints
            if (groupAction === 'create') endpoint = `/api/chats/groups`;
            else if (groupAction === 'metadata') {
                endpoint = `/api/chats/groups/${encodeURIComponent(groupJid)}?sessionId=${selectedSession}`;
                method = 'GET';
            }
            else if (groupAction === 'participants') {
                endpoint = `/api/chats/groups/${encodeURIComponent(groupJid)}/participants`;
            }
            else if (groupAction === 'invite-code') {
                endpoint = `/api/chats/groups/${encodeURIComponent(groupJid)}/invite-code?sessionId=${selectedSession}`;
                method = 'GET';
            }
        }

        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                }
            };
            if (method !== 'GET') options.body = JSON.stringify(payload);

            const res = await fetch(endpoint, options);
            const data = await res.json();
            setResponse({
                status: res.status,
                statusText: res.statusText,
                data: data as unknown
            });
        } catch (error: unknown) {
            setResponse({ error: error instanceof Error ? error.message : String(error) });
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

                    {/* Category Selector */}
                    <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">
                        <button
                            onClick={() => setCategory('messaging')}
                            className={`pb-2 px-1 font-semibold ${category === 'messaging' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500'}`}
                        >
                            Messaging
                        </button>
                        <button
                            onClick={() => setCategory('groups')}
                            className={`pb-2 px-1 font-semibold ${category === 'groups' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500'}`}
                        >
                            Groups
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">WhatsApp Session</label>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="default">default</option>
                            {sessions.map((s: PlaygroundSession) => (
                                <option key={s.id} value={s.id}>
                                    {s.id} ({s.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {category === 'messaging' ? (
                        <div className="space-y-4">
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

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Phone</label>
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
                                    {messageType === 'document' && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">File Name</label>
                                            <input
                                                type="text"
                                                value={fileName}
                                                onChange={e => setFileName(e.target.value)}
                                                placeholder="document.pdf"
                                                className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                            />
                                        </div>
                                    )}
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
                            {messageType === 'location' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Latitude</label>
                                        <input
                                            type="text"
                                            value={latitude}
                                            onChange={e => setLatitude(e.target.value)}
                                            placeholder="-2.17"
                                            className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Longitude</label>
                                        <input
                                            type="text"
                                            value={longitude}
                                            onChange={e => setLongitude(e.target.value)}
                                            placeholder="-79.92"
                                            className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Group Action</label>
                                <select
                                    value={groupAction}
                                    onChange={(e) => setGroupAction(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    <option value="create">Create Group</option>
                                    <option value="metadata">Get Group Metadata</option>
                                    <option value="participants">Manage Participants</option>
                                    <option value="invite-code">Get Invite Code</option>
                                </select>
                            </div>

                            {groupAction === 'create' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Group Subject</label>
                                        <input
                                            type="text"
                                            value={groupSubject}
                                            onChange={e => setGroupSubject(e.target.value)}
                                            placeholder="My Awesome Group"
                                            className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Participants (Phone numbers, comma sep)</label>
                                        <input
                                            type="text"
                                            value={participants}
                                            onChange={e => setParticipants(e.target.value)}
                                            placeholder="593991234567, 593997654321"
                                            className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </>
                            )}

                            {['metadata', 'participants', 'invite-code'].includes(groupAction) && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Group JID</label>
                                    <input
                                        type="text"
                                        value={groupJid}
                                        onChange={e => setGroupJid(e.target.value)}
                                        placeholder="123456789@g.us"
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                    />
                                </div>
                            )}

                            {groupAction === 'participants' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Participants to Add/Remove</label>
                                    <input
                                        type="text"
                                        value={participants}
                                        onChange={e => setParticipants(e.target.value)}
                                        placeholder="593991234567"
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded border border-gray-300 dark:border-zinc-700 dark:text-white text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

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
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg'}`}
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
                            <span className="text-xs font-mono text-green-400">
                                {category === 'messaging' ? `POST /messages/${messageType}` : `${groupAction === 'metadata' ? 'GET' : 'POST'} /chats/groups...`}
                            </span>
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
                            {response?.status && (
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
