'use client';

export default function LogsPage() {
    const logs = [
        { id: 1, type: 'OUTBOUND', to: '593991234567', status: 'SENT', time: '2 mins ago' },
        { id: 2, type: 'INBOUND', from: '593991234567', message: 'Hello!', time: '5 mins ago' },
        { id: 3, type: 'OUTBOUND', to: '593987654321', status: 'DELIVERED', time: '1 hour ago' },
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-black dark:text-white">Logs & Activity</h2>

            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="p-4">Type</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Status/Message</th>
                            <th className="p-4">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.type === 'OUTBOUND'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                        {log.type}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-800 dark:text-gray-300">
                                    {log.type === 'OUTBOUND' ? log.to : log.from}
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-400">
                                    {log.type === 'OUTBOUND' ? log.status : log.message}
                                </td>
                                <td className="p-4 text-gray-500 text-sm">{log.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-200 dark:border-zinc-800">
                    Listening for real-time updates...
                </div>
            </div>
        </div>
    );
}
