import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApiLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  duration?: number;
  error?: string;
}

// Global store for API logs
const apiLogs: ApiLog[] = [];
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function addApiLog(log: ApiLog) {
  apiLogs.unshift(log);
  if (apiLogs.length > 50) apiLogs.pop();
  notifyListeners();
}

export function updateApiLog(id: string, updates: Partial<ApiLog>) {
  const log = apiLogs.find((l) => l.id === id);
  if (log) {
    Object.assign(log, updates);
    notifyListeners();
  }
}

function clearLogs() {
  apiLogs.length = 0;
  notifyListeners();
}

// Fallback UUID generator for environments where crypto.randomUUID is unavailable
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Intercept fetch (dev only)
const isDev = import.meta.env.DEV;
const originalFetch = window.fetch;

// Avoid patching multiple times during HMR
const globalAny = window as unknown as { __secuirdFetchPatched?: boolean };
if (isDev && !globalAny.__secuirdFetchPatched) {
  globalAny.__secuirdFetchPatched = true;

  try {
    window.fetch = async function (input, init) {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Log calls that look like our backend API (support both absolute + relative base URLs)
      const shouldLog =
        url.includes("/api/") ||
        url.includes("/api/v1") ||
        url.includes("/auth/") ||
        url.includes("/users/") ||
        url.includes("/org/");

      if (!shouldLog) {
        return originalFetch.apply(this, [input, init]);
      }

      const id = generateUUID();
  const method = init?.method || "GET";
  let requestBody: unknown;

  try {
    if (init?.body) {
      requestBody = JSON.parse(init.body as string);
    }
  } catch {
    requestBody = init?.body;
  }

  // Extract request headers
  const requestHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    } else {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (value) requestHeaders[key] = value;
      });
    }
  }

  addApiLog({
    id,
    timestamp: new Date(),
    method,
    url,
    requestBody,
    requestHeaders,
  });

  const start = performance.now();

  try {
    const response = await originalFetch.apply(this, [input, init]);
    const duration = Math.round(performance.now() - start);

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Clone response to read body
    const cloned = response.clone();
    let responseBody: unknown;
    try {
      responseBody = await cloned.json();
    } catch {
      responseBody = await cloned.text();
    }

    updateApiLog(id, {
      status: response.status,
      statusText: response.statusText,
      responseBody,
      responseHeaders,
      duration,
    });

    return response;
  } catch (err) {
    updateApiLog(id, {
      error: err instanceof Error ? err.message : "Unknown error",
      duration: Math.round(performance.now() - start),
    });
    throw err;
  }
    };
  } catch (patchError) {
    // Log any errors during fetch patching with full stack trace
    console.error("[Secuird DevTools] Failed to patch fetch:", patchError);
    if (patchError instanceof Error) {
      console.error("[Secuird DevTools] Stack trace:", patchError.stack);
    }
  }
}
export default function ApiDevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ApiLog[]>([...apiLogs]);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  useEffect(() => {
    if (!isDev) return;
    
    const update = () => setLogs([...apiLogs]);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const getStatusColor = (status?: number) => {
    if (!status) return "secondary";
    if (status >= 200 && status < 300) return "default";
    if (status >= 400) return "destructive";
    return "secondary";
  };

  // Don't render in production
  if (!isDev) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-mono hover:bg-slate-800 transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
        API DevTools
        {logs.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {logs.length}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-slate-100 border-t border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Secuird API DevTools</span>
          <Badge variant="outline" className="text-xs border-slate-600">
            {logs.length} requests
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-700"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex h-64">
        {/* Request list */}
        <ScrollArea className="w-1/2 border-r border-slate-700">
          {logs.length === 0 ? (
            <div className="p-4 text-slate-500 text-sm text-center">
              No API requests yet
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors ${
                    selectedLog?.id === log.id ? "bg-slate-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Badge
                      variant={getStatusColor(log.status)}
                      className="font-mono text-[10px] px-1.5"
                    >
                      {log.method}
                    </Badge>
                    <span className="text-slate-400 truncate flex-1 font-mono">
                      {log.url.replace("/api/v1", "")}
                    </span>
                    {log.status && (
                      <Badge
                        variant={getStatusColor(log.status)}
                        className="text-[10px]"
                      >
                        {log.status}
                      </Badge>
                    )}
                    {log.duration && (
                      <span className="text-slate-500 text-[10px]">
                        {log.duration}ms
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Detail view */}
        <ScrollArea className="w-1/2 p-3">
          {selectedLog ? (
            <div className="space-y-3 text-xs font-mono">
              {/* Status & URL Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getStatusColor(selectedLog.status)} className="text-xs">
                  {selectedLog.method}
                </Badge>
                {selectedLog.status && (
                  <Badge 
                    variant={getStatusColor(selectedLog.status)} 
                    className={`text-xs ${selectedLog.status >= 400 ? 'bg-red-900/50 text-red-300' : ''}`}
                  >
                    {selectedLog.status} {selectedLog.statusText}
                  </Badge>
                )}
                {selectedLog.duration && (
                  <span className="text-slate-500">{selectedLog.duration}ms</span>
                )}
              </div>

              <div>
                <div className="text-slate-500 mb-1">URL</div>
                <div className="text-slate-200 break-all">{selectedLog.url}</div>
              </div>

              {/* Network Error */}
              {selectedLog.error && (
                <div className="bg-red-950/50 border border-red-800 rounded p-2">
                  <div className="text-red-400 font-semibold mb-1">Network Error</div>
                  <div className="text-red-300">{selectedLog.error}</div>
                </div>
              )}

              {/* Request Headers (collapsible) */}
              {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 && (
                <details className="group" open>
                  <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                    Request Headers ({Object.keys(selectedLog.requestHeaders).length})
                  </summary>
                  <pre className="bg-slate-800 p-2 rounded text-[10px] overflow-auto text-yellow-400 mt-1">
                    {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                  </pre>
                </details>
              )}

              {selectedLog.requestBody && (
                <div>
                  <div className="text-slate-500 mb-1">Request Body</div>
                  <pre className="bg-slate-800 p-2 rounded text-[10px] overflow-auto text-green-400">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Section with Status Context */}
              {selectedLog.status && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500">Response</span>
                    {selectedLog.status >= 400 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Error Response
                      </Badge>
                    )}
                  </div>
                  {selectedLog.responseBody ? (
                    <pre className={`bg-slate-800 p-2 rounded text-[10px] overflow-auto ${
                      selectedLog.status >= 400 ? 'text-red-400 border border-red-800/50' : 'text-blue-400'
                    }`}>
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-600 italic">No response body</div>
                  )}
                </div>
              )}

              {/* Response Headers (collapsible) */}
              {selectedLog.responseHeaders && Object.keys(selectedLog.responseHeaders).length > 0 && (
                <details className="group">
                  <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                    Response Headers ({Object.keys(selectedLog.responseHeaders).length})
                  </summary>
                  <pre className="bg-slate-800 p-2 rounded text-[10px] overflow-auto text-slate-400 mt-1">
                    {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              Select a request to view details
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
