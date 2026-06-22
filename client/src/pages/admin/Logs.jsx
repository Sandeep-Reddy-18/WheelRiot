import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Shield, ShoppingBag, Server, X } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs(1, true);
  }, [filter]);

  const fetchLogs = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = filter !== 'ALL' ? { type: filter } : {};
      params.page = pageNum;
      params.limit = 10;
      
      const res = await axios.get('/api/logs', { params });
      
      const { logs: newLogs, total, pages } = res.data;
      
      setLogs(newLogs);
      setPage(pageNum);
      setTotalPages(pages);
      setTotal(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [total, setTotal] = useState(0);

  const getIcon = (type) => {
    const className = "shrink-0";
    switch (type) {
      case 'SECURITY': return <Shield size={18} className={`text-red-500 ${className}`} />;
      case 'ECOMMERCE': return <ShoppingBag size={18} className={`text-green-500 ${className}`} />;
      case 'SYSTEM': return <Server size={18} className={`text-yellow-500 ${className}`} />;
      case 'ADMIN_ACTION': return <Activity size={18} className={`text-blue-500 ${className}`} />;
      default: return <Activity size={18} className={className} />;
    }
  };
  
  const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
      });
  };

  return (
    <div className="p-4 md:p-6 text-white text-sm">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <select 
          className="bg-black/50 border border-white/20 rounded-lg px-4 py-2 outline-none focus:border-primary w-full md:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">All Events</option>
          <option value="SECURITY">Security</option>
          <option value="ADMIN_ACTION">Admin Actions</option>
          <option value="ECOMMERCE">E-commerce</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="p-4">Type</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr 
                    key={log._id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 flex items-center gap-2 font-mono">
                      {getIcon(log.type)}
                      <span>{log.type}</span>
                    </td>
                    <td className="p-4 font-medium max-w-[200px] md:max-w-none overflow-hidden text-ellipsis">
                      {log.action}
                    </td>
                    <td className="p-4 text-gray-400">
                      {log.actor?.username || 'System'}
                    </td>
                    <td className="p-4 text-right text-gray-500 font-mono text-xs">
                      {formatDate(log.createdAt || log.timestamp)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      No logs found.
                    </td>
                  </tr>
                )}
                 {loading && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-white/10 mt-4">
              <span className="text-sm text-gray-400">
                  Page {page} of {totalPages} (Total: {total})
              </span>
              <div className="flex gap-2">
                  <button 
                      onClick={() => fetchLogs(Math.max(page - 1, 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Prev
                  </button>
                  <span className="px-3 py-1 text-sm bg-white/10 rounded">{page} / {totalPages}</span>
                  <button 
                      onClick={() => fetchLogs(Math.min(page + 1, totalPages))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}
      
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedLog(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
                
                <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                    {getIcon(selectedLog.type)}
                    {selectedLog.action}
                </h2>
                <p className="text-gray-500 text-xs mb-6 font-mono">{selectedLog._id} • {formatDate(selectedLog.createdAt || selectedLog.timestamp)}</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-gray-400 block mb-1">Type</span>
                            <span className="font-mono text-sm">{selectedLog.type}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-gray-400 block mb-1">Actor</span>
                            <span className="font-mono text-sm">{selectedLog.actor?.username || 'System'}</span>
                        </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-xs overflow-x-auto">
                        <span className="text-gray-400 block mb-2 uppercase tracking-wider text-[10px]">Details Payload</span>
                        {selectedLog.details && typeof selectedLog.details === 'object' ? (
                            <div className="space-y-1">
                                {Object.entries(selectedLog.details).map(([key, val]) => (
                                    <div key={key} className="flex gap-2">
                                        <span className="text-blue-400">{key}:</span>
                                        <span className="text-green-300">
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <pre className="text-green-400 whitespace-pre-wrap">
                                {JSON.stringify(selectedLog.details, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
