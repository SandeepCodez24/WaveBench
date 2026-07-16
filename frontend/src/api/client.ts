/**
 * api/client.ts — Typed REST API client for WaveBench Studio.
 *
 * All requests go to the Java gateway's HTTP API on port 8081.
 * The JWT token is read from localStorage and automatically attached
 * as a `Authorization: Bearer` header on every request.
 */

const BASE_URL = `http://${window.location.hostname}:8081`;

function getToken(): string | null {
  return localStorage.getItem('wb_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg = (data as Record<string, string>)?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  organization: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function apiSignup(
  email: string,
  password: string,
  displayName: string,
  organization: string,
  role: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password, displayName, organization, role }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function apiGetMe(): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders() });
  return handleResponse<User>(res);
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectMeta {
  name: string;
  description: string;
  updatedAt: string;
}

export async function apiListProjects(): Promise<ProjectMeta[]> {
  const res = await fetch(`${BASE_URL}/api/projects`, { headers: authHeaders() });
  const data = await handleResponse<{ projects: ProjectMeta[] }>(res);
  return data.projects;
}

export async function apiSaveProject(name: string, diagram: object, description = ''): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, description, diagram, updatedAt: new Date().toISOString() }),
  });
  await handleResponse(res);
}

export async function apiLoadProject(name: string): Promise<object> {
  const res = await fetch(`${BASE_URL}/api/projects/${encodeURIComponent(name)}`, {
    headers: authHeaders(),
  });
  return handleResponse<object>(res);
}

export async function apiDeleteProject(name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ── Exports ───────────────────────────────────────────────────────────────────

export interface ExportRecord {
  userId: string;
  type: 'scope_png' | 'data_csv' | 'report_html';
  projectId: string;
  fileUrl: string;
  createdAt: string;
}

export async function apiLogExport(
  type: ExportRecord['type'],
  fileUrl: string,
  projectId = '',
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/exports`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ type, fileUrl, projectId }),
  });
  await handleResponse(res);
}

export async function apiGetExports(): Promise<ExportRecord[]> {
  const res = await fetch(`${BASE_URL}/api/exports`, { headers: authHeaders() });
  const data = await handleResponse<{ exports: ExportRecord[] }>(res);
  return data.exports;
}
