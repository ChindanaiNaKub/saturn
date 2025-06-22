// Engine Logger Utility

const logs: string[] = [];

export function logEngine(message: string) {
  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] ${message}`);
  // Also log to console for live debugging
  console.log('[EngineLog]', message);
}

export function exportEngineLogs() {
  const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `engine-debug-log-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clearEngineLogs() {
  logs.length = 0;
} 