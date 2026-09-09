/**
 * 로그인 세션 저장소
 *
 * Firebase 로그인 후 백엔드(/api/v1/auth/firebase)가 발급한 access_token/refresh_token과
 * 사용자 정보를 로컬에 보관합니다. (네이티브 iOS의 WKWebView와 일반 브라우저 모두 localStorage 사용 가능)
 */

export interface StoredUser {
  id: number;
  uuid: string;
  email: string;
  nickname: string | null;
  profileImageUrl: string | null;
  level: number;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

const STORAGE_KEY = "speak-connect.session";

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage를 사용할 수 없는 환경 — 무시
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

/** 로그인된 사용자의 실제 id. 로그인 전에는 null (호출부에서 TEST_USER_ID로 폴백) */
export function getCurrentUserId(): number | null {
  return getSession()?.user.id ?? null;
}
