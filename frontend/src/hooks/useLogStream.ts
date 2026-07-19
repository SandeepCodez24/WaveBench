import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string; // HH:MM:ss.SSS
  level: 'info' | 'warning' | 'error';
  src: 'frontend' | 'gateway' | 'engine';
  msg: string;
  blockId?: string;
}

export function useLogStream(maxLogs = 500) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [droppedCount, setDroppedCount] = useState(0);

  // Store logs in ref to bypass React render cycle lag when receiving messages quickly
  const logsRef = useRef<LogEntry[]>([]);

  const appendLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const newEntry: LogEntry = {
      ...entry,
      id: `${now.getTime()}_${Math.random()}`,
      timestamp,
    };

    if (isPaused) {
      setDroppedCount(prev => prev + 1);
      return;
    }

    logsRef.current = [...logsRef.current, newEntry].slice(-maxLogs);
    setLogs(logsRef.current);
  }, [isPaused, maxLogs]);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
    setDroppedCount(0);
  }, []);

  useEffect(() => {
    const handleMessage = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (msg && msg.type === 'log') {
        appendLog({
          level: msg.level || 'info',
          src: msg.src || 'engine',
          msg: msg.msg || '',
          blockId: msg.blockId,
        });
      }
    };

    window.addEventListener('simulation-message', handleMessage);
    return () => {
      window.removeEventListener('simulation-message', handleMessage);
    };
  }, [appendLog]);

  return {
    logs,
    isPaused,
    setIsPaused,
    droppedCount,
    setDroppedCount,
    clearLogs,
    appendLog,
  };
}
