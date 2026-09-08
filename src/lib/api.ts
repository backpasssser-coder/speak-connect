/**
 * 백엔드 API 클라이언트
 *
 * 명세서: 05a 클라이언트 ↔ 백엔드 API 명세서 (v1.7, 2026-09-06) 기준
 * Base URL: http://{VM주소}:80 (nginx 경유)
 *
 * 인증 현황 (2026-09-07 기준):
 * - /auth/**, /users/** : JWT 필수 (Firebase 로그인 연동 전까지 미사용)
 * - /sessions/**, /voice/**, /content/** : permitAll (dev 임시 계약) — userId를 쿼리파라미터로 전달
 *
 * 응답 봉투: { success, data, timestamp } / 에러: { success: false, error: { code, message, detail, timestamp } }
 */

// ---------- 기본 설정 ----------

import { getAccessToken } from "./session";

export const API_BASE_URL = "http://132.145.95.251:80";

/**
 * 임시 테스트 userId (로그인 미연동 상태의 dev 임시 계약용).
 * 실제 로그인(Firebase) 연동 후에는 로그인된 사용자의 id로 교체됩니다.
 */
export const TEST_USER_ID = 26;

// ---------- 공통 타입 ----------

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; detail?: string; timestamp?: string } | null;
  timestamp: string;
}

export class ApiError extends Error {
  code: string;
  detail?: string;
  status: number;
  constructor(status: number, code: string, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { rawBody?: boolean },
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    const accessToken = getAccessToken();
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.rawBody ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    // fetch()가 던지는 실제 예외 메시지를 그대로 노출 (CORS 차단, DNS 실패, 타임아웃 등 원인이 제각각이라
    // 뭉뚱그린 안내 문구만으로는 진단이 불가능함 — Mac 없이 기기 콘솔을 볼 수 없는 환경이라 더더욱 필요)
    const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    throw new ApiError(0, "E_NETWORK", `네트워크 요청 실패 (${url}) — ${raw}`, raw);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // 응답 본문이 JSON이 아닌 경우 (예: 204 No Content)
    if (res.ok) return undefined as T;
    throw new ApiError(res.status, "E_PARSE", `서버 응답을 처리할 수 없어요 (HTTP ${res.status})`);
  }

  if (!json.success) {
    const err = json.error;
    throw new ApiError(res.status, err?.code ?? "E_UNKNOWN", err?.message ?? "요청이 실패했어요", err?.detail);
  }
  return json.data as T;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// ---------- 3. 세션 플로우 ----------

export type TurnType = "LISTEN_TEXT" | "LISTEN_PICTURE" | "NAMING" | "SHADOWING" | "SELF_TALK";

export interface TurnChoice {
  order: number;
  mediaType: "text" | "image";
  context: string;
}

export interface SessionTurn {
  turnId: number;
  turnNumber: number;
  type: TurnType;
  ttsUrl?: string | null;
  passage?: string | null;
  choices?: TurnChoice[] | null;
  imageId?: number | null;
  imageUrl?: string | null;
  hintAvailable?: number | null;
}

export interface SessionCreateData {
  sessionId: number;
  theme: string;
  type: "today" | "theme";
  turns: SessionTurn[];
}

/** POST /api/v1/sessions/today — 테마 랜덤 + 무작위 출제 */
export function createTodaySession(userId: number = TEST_USER_ID) {
  return request<SessionCreateData>(`/api/v1/sessions/today${qs({ userId })}`, { method: "POST" });
}

/** POST /api/v1/sessions/theme — 테마 고정 (TEST | HOSPITAL | CAFE) */
export function createThemeSession(thema: string, userId: number = TEST_USER_ID) {
  return request<SessionCreateData>(`/api/v1/sessions/theme${qs({ userId, thema })}`, { method: "POST" });
}

// ---- 답안 제출 ----

export interface ListenSubmitData {
  turnId: number;
  score: number;
  correct: boolean;
}

export interface UserVoiceEval {
  durationSecond: number;
  syllables: number;
  speakingTime: number;
  articulationTime: number;
  text: string;
}

export interface VoiceSubmitData {
  turnId: number;
  score: number;
  voiceRecordId: number;
  userVoiceEval: UserVoiceEval;
}

/** LISTEN 타입 제출 — selected는 1-based order (Int) */
export function submitListen(
  sessionId: number,
  turnId: number,
  selected: number,
  userId: number = TEST_USER_ID,
) {
  return request<ListenSubmitData>(`/api/v1/sessions/${sessionId}/turns/${turnId}/listen${qs({ userId })}`, {
    method: "POST",
    body: JSON.stringify({ selected }),
  });
}

function submitVoiceAnswer(
  kind: "naming" | "shadowing" | "selftalk",
  sessionId: number,
  turnId: number,
  audioBlob: Blob,
  userId: number = TEST_USER_ID,
) {
  const form = new FormData();
  form.append("file", audioBlob, "answer.m4a");
  return request<VoiceSubmitData>(
    `/api/v1/sessions/${sessionId}/turns/${turnId}/${kind}${qs({ userId })}`,
    { method: "POST", body: form, rawBody: true },
  );
}

export const submitNaming = (sessionId: number, turnId: number, audioBlob: Blob, userId?: number) =>
  submitVoiceAnswer("naming", sessionId, turnId, audioBlob, userId);

export const submitShadowing = (sessionId: number, turnId: number, audioBlob: Blob, userId?: number) =>
  submitVoiceAnswer("shadowing", sessionId, turnId, audioBlob, userId);

export const submitSelfTalk = (sessionId: number, turnId: number, audioBlob: Blob, userId?: number) =>
  submitVoiceAnswer("selftalk", sessionId, turnId, audioBlob, userId);

// ---- 힌트 ----

export interface HintData {
  hintOrder: 1 | 2;
  cueType: "SEMANTIC" | "ARTICULATORY";
  text: string;
}

/** 3번째 요청 시 서버가 E0401(힌트 소진)로 거절함 — 클라는 사전에 2회로 비활성화 처리 */
export function requestHint(sessionId: number, turnId: number, userId: number = TEST_USER_ID) {
  return request<HintData>(`/api/v1/sessions/${sessionId}/turns/${turnId}/hint${qs({ userId })}`, {
    method: "POST",
  });
}

// ---- AI 대화 (STORYTELLING) ----

export interface TalkData {
  turnId: number;
  turnNumber: number;
  aiText: string;
  userText: string | null;
}

/** 첫 호출은 audioBlob 없이 호출 (AI가 먼저 개시) */
export function submitTalk(sessionId: number, audioBlob?: Blob, userId: number = TEST_USER_ID) {
  if (!audioBlob) {
    return request<TalkData>(`/api/v1/sessions/${sessionId}/turns/talk${qs({ userId })}`, { method: "POST" });
  }
  const form = new FormData();
  form.append("file", audioBlob, "talk.m4a");
  return request<TalkData>(`/api/v1/sessions/${sessionId}/turns/talk${qs({ userId })}`, {
    method: "POST",
    body: form,
    rawBody: true,
  });
}

// ---- 세션 종료 ----

export interface FinishData {
  sessionAQ: number;
  feedbacks: {
    listenFeedback: string | null;
    namingFeedback: string | null;
    shadowingFeedback: string | null;
    selfTalkFeedback: string | null;
    talkFeedback: string | null;
    totalFeedback: string | null;
  };
}

export function finishSession(sessionId: number, userId: number = TEST_USER_ID) {
  return request<FinishData>(`/api/v1/sessions/${sessionId}/finish${qs({ userId })}`, { method: "POST" });
}

// ---------- 4. 음성/콘텐츠 스트리밍 ----------

/** 상대경로(ttsUrl 등)는 Base URL과 결합, 이미 절대경로면 그대로 사용 */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export function voiceUrl(voiceRecordId: number): string {
  return `${API_BASE_URL}/api/v1/voice/${voiceRecordId}`;
}

export function imageFileUrl(imageId: number): string {
  return `${API_BASE_URL}/api/v1/content/images/${imageId}/file`;
}

// ---------- 8. 대시보드 / 세부 보고서 (JWT 필요 — 로그인 연동 후 사용) ----------

export interface UserScores {
  userAq: number | null;
  listen: number | null;
  naming: number | null;
  shadowing: number | null;
  selfTalk: number | null;
}

/** GET /api/v1/users/me/scores — JWT 필요 */
export function getMyScores() {
  return request<UserScores>(`/api/v1/users/me/scores`, { method: "GET" });
}

export interface SessionHistoryItem {
  sessionId: number;
  sessionName: string;
  createdAt: string;
  aq: number;
}

/** GET /api/v1/users/me/sessions/history — JWT 필요 */
export function getSessionHistory() {
  return request<{ sessions: SessionHistoryItem[] }>(`/api/v1/users/me/sessions/history`, { method: "GET" });
}

/** GET /api/v1/sessions/{sessionId}/report — permitAll이지만 userId 소유 검증 필요 */
export function getSessionReport(sessionId: number, userId: number = TEST_USER_ID) {
  return request<unknown>(`/api/v1/sessions/${sessionId}/report${qs({ userId })}`, { method: "GET" });
}

// ---------- 1. 인증 (Firebase 로그인 연동 후 사용) ----------

export interface FirebaseLoginData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: number;
    uuid: string;
    email: string;
    nickname: string | null;
    profile_image_url: string | null;
    level: number;
    created_at: string;
  };
  is_new_user: boolean;
}

/** POST /api/v1/auth/firebase — Firebase ID Token으로 로그인 */
export function loginWithFirebase(idToken: string) {
  return request<FirebaseLoginData>(`/api/v1/auth/firebase`, {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}
