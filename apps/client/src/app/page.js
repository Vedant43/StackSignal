"use client";
import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const formatRelative = (ts) => {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `${s}s ago`;
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const badgeColor = (type) => {
  switch (type) {
    case "error": return "bg-red-100 text-red-700 border-red-200";
    case "warn": return "bg-amber-100 text-amber-700 border-amber-200";
    case "info": return "bg-blue-100 text-blue-700 border-blue-200";
    case "log": return "bg-gray-100 text-gray-700 border-gray-200";
    case "xhr-error": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const MAX_PREVIEW_CHARS = 160;

const buildUrlFromAxiosConfig = (cfg) => {
  if (!cfg) return undefined;
  const method = cfg.method ? String(cfg.method).toUpperCase() : undefined;
  let url;
  try {
    if (cfg.baseURL) {
      url = new URL(cfg.url || "", cfg.baseURL).toString();
    } else if (cfg.url) {
      url = cfg.url;
    }
  } catch (_) {
    url = cfg.url || cfg.baseURL || undefined;
  }
  return { method, url };
};

const formatArgPreview = (arg) => {
  if (arg == null) return "";
  if (typeof arg === "string") return arg;
  if (Array.isArray(arg)) return `[Array(${arg.length})]`;
  if (typeof arg === "object") {
    // AxiosError summary
    if (arg.name === "AxiosError" || (arg.stack && String(arg.stack).includes("AxiosError"))) {
      const code = arg.code ? ` [${arg.code}]` : "";
      const { method, url } = buildUrlFromAxiosConfig(arg.config) || {};
      const tail = [method, url].filter(Boolean).join(" ");
      return `AxiosError${code}: ${arg.message}${tail ? ` ${tail}` : ""}`;
    }
    // XHR/network object summary
    if ("status" in arg || "url" in arg) {
      const status = arg.status != null ? ` ${arg.status}` : "";
      const url = arg.url ? ` ${arg.url}` : "";
      return `XHR${status}${url}`;
    }
    // Generic object: show a few keys
    const keys = Object.keys(arg);
    const preview = keys.slice(0, 3).map(k => {
      const v = arg[k];
      if (typeof v === "string") return `${k}: ${v}`;
      if (Array.isArray(v)) return `${k}: [Array(${v.length})]`;
      if (v && typeof v === "object") return `${k}: {…}`;
      return `${k}: ${typeof v}`;
    }).join(", ");
    return `{ ${preview}${keys.length > 3 ? ", …" : ""} }`;
  }
  return String(arg);
};

const getLogPreview = (log) => {
  const args = log?.data?.args ?? [];
  if (!Array.isArray(args) || args.length === 0) return typeof log?.message === "string" ? log.message : "";
  const text = args.map(formatArgPreview).filter(Boolean).join(" ");
  return text.length > MAX_PREVIEW_CHARS ? `${text.slice(0, MAX_PREVIEW_CHARS - 1)}…` : text;
};

const groupLogsBySubmission = (logsArr = [], fallbackBug) => {
  const map = new Map();
  for (const l of logsArr) {
    const subId = l?.submissionId ?? l?.submission?.id ?? 'default';
    let g = map.get(subId);
    if (!g) {
      g = {
        id: subId,
        bug: l?.submissionMessage ?? fallbackBug ?? `Submission ${subId}`,
        createdAt: l?.timestamp ?? Date.now(),
        logs: []
      };
      map.set(subId, g);
    }
    g.createdAt = Math.min(g.createdAt, l?.timestamp ?? Date.now());
    g.logs.push(l);
  }
  return Array.from(map.values()).map(sub => {
    const errorCount = sub.logs.filter(l => l.type === 'error').length;
    const warnCount = sub.logs.filter(l => l.type === 'warn').length;
    const infoCount = sub.logs.filter(l => l.type === 'info').length;
    return { ...sub, totalLogs: sub.logs.length, errorCount, warnCount, infoCount };
  });
};

function DashboardPage() {
  const params = useParams();
  const { logout, user } = useAuth();
  const clientId = params?.clientId ?? "unknown-client";

  const [logs, setLogs] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [embedScript, setEmbedScript] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/bug');
        setLogs(res.data.data);
        console.log('Fetched logs:', res.data.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cid = localStorage.getItem('clientId') || '';
    // const script = `<script>
    //   (function(){
    //     var s = document.createElement("script");
    //     s.src = "https://raw.githubusercontent.com/Vedant43/StackSignal---widget/v0.1.1/sdk/stacksignal.js";
    //     s.onload = function(){
    //       window.StackSignalWidget.init({
    //         clientId: "${cid}",
    //         apiBase: "https://api.stacksignal.io"
    //       });
    //     };
    //     document.head.appendChild(s);
    //   })();
    //   <\/script>`;
    const script = `<script src="https://cdn.jsdelivr.net/gh/Vedant43/StackSignal---widget/sdk/stacksignal.js"><\/script>
      <script>
        window.StackSignalWidget.init({
          clientId: "${cid}"
        });
      <\/script>`;
    setEmbedScript(script);
  }, []);

  const sessions = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];

    if (Array.isArray(logs[0]?.logs)) {
      return logs.map(session => {
        const errorCount = (session.logs ?? []).filter(l => l.type === "error").length;
        const warnCount = (session.logs ?? []).filter(l => l.type === 'warn').length;
        const infoCount = (session.logs ?? []).filter(l => l.type === 'info').length;
        // NEW: build submissions per submissionId
        const submissions = groupLogsBySubmission(session.logs ?? [], session.bug);
        return { ...session, totalLogs: (session.logs ?? []).length, errorCount, warnCount, infoCount, submissions };
      });
    }

    if (Array.isArray(logs[0]?.data) && ('sessionId' in logs[0])) {
      const grouped = new Map();
      for (const report of logs) {
        const sid = report.sessionId ?? 'unknown';
        const createdTs = report.createdAt ? new Date(report.createdAt).getTime() : Date.now();
        let s = grouped.get(sid);
        if (!s) {
          s = { id: sid, createdAt: createdTs, bug: report.message || `Session ${sid}`, logs: [] };
          grouped.set(sid, s);
        } else {
          s.createdAt = Math.min(s.createdAt, createdTs);
          if (report.message) s.bug = report.message;
        }
        if (Array.isArray(report.data)) {
          report.data.forEach((entry, idx) => {
            const ts = entry.timestamp ?? createdTs;
            s.logs.push({
              id: `${report.id}-${idx}`,
              timestamp: ts,
              type: entry.type || 'log',
              message: Array.isArray(entry.args)
                ? entry.args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
                : report.message,
              data: { args: entry.args ?? [report.message ?? ''], stack: entry.stack ?? null },
              submissionId: entry.submissionId ?? report.submissionId,
              submissionMessage: report.message
            });
          });
        }
      }
      const arr = Array.from(grouped.values());
      return arr.map(s => {
        const errorCount = s.logs.filter(l => l.type === 'error').length;
        const warnCount = s.logs.filter(l => l.type === 'warn').length;
        const infoCount = s.logs.filter(l => l.type === 'info').length;
        const submissions = groupLogsBySubmission(s.logs, s.bug);
        return { ...s, totalLogs: s.logs.length, errorCount, warnCount, infoCount, submissions };
      });
    }

    const grouped = new Map();
    for (const row of logs) {
      const sid = row.sessionId ?? row.session?.id ?? 'unknown';
      let s = grouped.get(sid);
      if (!s) {
        s = {
          id: sid,
          createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
          bug: row.message || `Session ${sid}`,
          logs: []
        };
        grouped.set(sid, s);
      }
      const ts = row.timestamp ?? (row.createdAt ? new Date(row.createdAt).getTime() : Date.now());
      s.createdAt = Math.min(s.createdAt, ts);
      s.logs.push({
        id: row.id,
        timestamp: ts,
        type: row.type || 'log',
        message: row.message,
        data: row.data ?? { args: [row.message ?? ''], stack: null },
        submissionId: row.submissionId ?? row.submission?.id,
        submissionMessage: row.submissionMessage ?? row.message
      });
    }
    const arr = Array.from(grouped.values());
    return arr.map(s => {
      const errorCount = s.logs.filter(l => l.type === 'error').length;
      const warnCount = s.logs.filter(l => l.type === 'warn').length;
      const infoCount = s.logs.filter(l => l.type === 'info').length;
      const submissions = groupLogsBySubmission(s.logs, s.bug);
      return { ...s, totalLogs: s.logs.length, errorCount, warnCount, infoCount, submissions };
    });
  }, [logs]);

  useEffect(() => {
    if(sessions.length && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find(s => s.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) return;
    if (!selectedSubmissionId || !selectedSession.submissions?.some(sub => sub.id === selectedSubmissionId)) {
      setSelectedSubmissionId(selectedSession.submissions?.[0]?.id ?? null);
    }
  }, [selectedSession]); 

  const selectedSubmission = useMemo(() => {
    if (!selectedSession || !selectedSubmissionId) return null;
    return selectedSession.submissions?.find(sub => sub.id === selectedSubmissionId) ?? null;
  }, [selectedSession, selectedSubmissionId]);

  const logsToShow = useMemo(() => {
    return selectedSubmission?.logs ?? selectedSession?.logs ?? [];
  }, [selectedSubmission, selectedSession]);

  const toggleExpand = (id) => setExpandedLogId(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">StackSignal Dashboard</h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Client ID:</span>
                <code className="text-sm font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded-lg">
                  {clientId}
                </code>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back!</p>
                <p className="text-sm font-medium text-gray-900">{user?.email || 'User'}</p> */}
              {/* </div> */}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 text-black">
          <h2 className="text-lg font-semibold mb-2">Integrate StackSignal Widget</h2>
          <p className="text-gray-600 mb-2">
            Copy and paste this script into your website&apos;s <code>&lt;head&gt;</code> or before <code>&lt;/body&gt;</code><br />
          </p>
          <div className="relative w-full">
            <textarea
              className="w-full font-mono text-xs bg-gray-100 border border-gray-300 rounded-lg p-2 pr-12"
              rows={8}
              readOnly
              value={embedScript}
              style={{ minWidth: 320 }}
            />
            <button
              type="button"
              aria-label="Copy script to clipboard"
              className="absolute top-2 right-5 p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {
                navigator.clipboard.writeText(embedScript);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              title={copied ? "Copied!" : "Copy script"}
            >
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-600">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sessions Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSessionId === session.id
                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{session.bug}</h3>
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-gray-400">{session.id}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{session.totalLogs} logs</span>
                        <span>{formatRelative(session.createdAt)}</span>
                      </div>
                      {session.errorCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-xs text-red-600">{session.errorCount} errors</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {selectedSubmission?.bug ?? (selectedSession ? selectedSession.bug : "No session selected")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Session ID</p>
                    <code className="text-sm font-mono text-gray-700">{selectedSession?.id ?? "-"}</code>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Created</p>
                    <p className="text-sm text-gray-700">
                      {selectedSubmission
                        ? formatRelative(selectedSubmission.createdAt)
                        : (selectedSession ? formatRelative(selectedSession.createdAt) : "-")
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total Logs</p>
                    <p className="text-sm text-gray-700">{logsToShow.length}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {((selectedSubmission?.errorCount ?? selectedSession?.errorCount ?? 0) > 0) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                      {(selectedSubmission?.errorCount ?? selectedSession?.errorCount) } Errors
                    </span>
                  )}
                  {((selectedSubmission?.warnCount ?? selectedSession?.warnCount ?? 0) > 0) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      {(selectedSubmission?.warnCount ?? selectedSession?.warnCount)} Warnings
                    </span>
                  )}
                  {((selectedSubmission?.infoCount ?? selectedSession?.infoCount ?? 0) > 0) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      {(selectedSubmission?.infoCount ?? selectedSession?.infoCount)} Info
                    </span>
                  )}
                </div>

                {selectedSession?.submissions?.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <div className="inline-flex items-center gap-2">
                      {selectedSession.submissions.map(sub => {
                        const active = sub.id === selectedSubmissionId;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubmissionId(sub.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                            title={sub.id}
                          >
                            {sub.id}
                            <span className="ml-2 text-[10px] opacity-80">{sub.totalLogs} logs</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Logs */}
              <div className="p-6">
                <div className="space-y-2">
                  {logsToShow
                    .slice()
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map(log => (
                      <div key={log.id} className="group">
                        <div 
                          className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                            log.type === 'error' 
                              ? 'bg-red-50 border-red-100 hover:bg-red-100' 
                              : log.type === 'warn' 
                              ? 'bg-amber-50 border-amber-100 hover:bg-amber-100'
                              : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                          } ${expandedLogId === log.id ? 'ring-2 ring-blue-200' : ''}`}
                          onClick={() => toggleExpand(log.id)}
                        >
                          <div className="flex-shrink-0 w-20">
                            <span className="text-xs font-mono text-gray-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeColor(log.type)}`}>
                              {log.type}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 font-medium break-words">
                              {getLogPreview(log)}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        
                        {expandedLogId === log.id && (
                          <div className="mt-2 ml-4 mr-4">
                            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                              <div className="mb-3">
                                <div className="text-xs text-gray-400 mb-2">
                                  {new Date(log.timestamp).toISOString()}
                                </div>
                                <div className="space-y-2">
                                  {log.data.args.map((arg, i) => (
                                    <div key={i} className="text-gray-200">
                                      {typeof arg === 'string' 
                                        ? arg 
                                        : <pre className="whitespace-pre-wrap">{JSON.stringify(arg, null, 2)}</pre>
                                      }
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {log.data.stack && (
                                <div className="pt-3 border-t border-gray-700">
                                  <div className="text-xs text-gray-400 mb-2">Stack Trace:</div>
                                  <pre className="text-red-300 whitespace-pre-wrap text-xs">{log.data.stack}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedDashboardPage() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}