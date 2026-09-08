/**
 * Google 로그인 (Firebase Authentication)
 *
 * 흐름:
 * 1. @capacitor-firebase/authentication로 Google 로그인 (네이티브 iOS에서는 네이티브 Google Sign-In UI,
 *    웹에서는 Firebase JS SDK의 팝업/리디렉션 방식 사용 — 플러그인이 플랫폼을 자동으로 구분합니다)
 * 2. Firebase ID Token 발급
 * 3. 백엔드 POST /api/v1/auth/firebase 로 ID Token 전달 → 백엔드 자체 access_token 발급
 * 4. 세션 저장 (src/lib/session.ts)
 *
 * 각 단계를 구분된 에러로 감싸서, 실패 시 정확히 어느 단계인지 화면에 표시되도록 함
 * (Mac이 없어 기기 콘솔 로그를 볼 수 없는 환경이라, 에러 메시지 자체가 유일한 진단 수단)
 */
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { ensureFirebaseApp } from "./firebase";
import { loginWithFirebase } from "./api";
import { setSession, clearSession, type StoredSession } from "./session";

export interface SignInOutcome {
  isNewUser: boolean;
  session: StoredSession;
}

function stepError(step: string, e: unknown): Error {
  const msg = e instanceof Error ? e.message : JSON.stringify(e);
  return new Error(`[${step}] ${msg}`);
}

export async function signInWithGoogle(): Promise<SignInOutcome> {
  try {
    ensureFirebaseApp();
  } catch (e) {
    throw stepError("Firebase 앱 초기화", e);
  }

  let result: Awaited<ReturnType<typeof FirebaseAuthentication.signInWithGoogle>>;
  try {
    result = await FirebaseAuthentication.signInWithGoogle();
  } catch (e) {
    throw stepError("구글 계정 인증", e);
  }
  if (!result.user) {
    throw new Error("[구글 계정 인증] 사용자 정보 없음 (취소되었거나 실패)");
  }

  let idToken: string;
  try {
    const r = await FirebaseAuthentication.getIdToken();
    idToken = r.token;
  } catch (e) {
    throw stepError("Firebase 토큰 발급", e);
  }
  if (!idToken) {
    throw new Error("[Firebase 토큰 발급] 토큰이 비어있음");
  }

  let data: Awaited<ReturnType<typeof loginWithFirebase>>;
  try {
    data = await loginWithFirebase(idToken);
  } catch (e) {
    throw stepError("백엔드 로그인 연동", e);
  }

  try {
    const session: StoredSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        id: data.user.id,
        uuid: data.user.uuid,
        email: data.user.email,
        nickname: data.user.nickname,
        profileImageUrl: data.user.profile_image_url,
        level: data.user.level,
      },
    };
    setSession(session);
    return { isNewUser: data.is_new_user, session };
  } catch (e) {
    throw stepError("세션 저장", e);
  }
}

export async function signOut(): Promise<void> {
  try {
    await FirebaseAuthentication.signOut();
  } finally {
    clearSession();
  }
}

/** 현재 Firebase 로그인 사용자의 uid (Firestore 문서 경로 등에 사용) */
export async function getCurrentFirebaseUid(): Promise<string | null> {
  const { user } = await FirebaseAuthentication.getCurrentUser();
  return user?.uid ?? null;
}
