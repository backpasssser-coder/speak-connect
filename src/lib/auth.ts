/**
 * Google 로그인 (Firebase Authentication)
 *
 * 흐름:
 * 1. @capacitor-firebase/authentication로 Google 로그인 (네이티브 iOS에서는 네이티브 Google Sign-In UI,
 *    웹에서는 Firebase JS SDK의 팝업/리디렉션 방식 사용 — 플러그인이 플랫폼을 자동으로 구분합니다)
 * 2. Firebase ID Token 발급
 * 3. 백엔드 POST /api/v1/auth/firebase 로 ID Token 전달 → 백엔드 자체 access_token 발급
 * 4. 세션 저장 (src/lib/session.ts)
 */
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { ensureFirebaseApp } from "./firebase";
import { loginWithFirebase } from "./api";
import { setSession, clearSession, type StoredSession } from "./session";

export interface SignInOutcome {
  isNewUser: boolean;
  session: StoredSession;
}

export async function signInWithGoogle(): Promise<SignInOutcome> {
  ensureFirebaseApp();

  const result = await FirebaseAuthentication.signInWithGoogle();
  if (!result.user) {
    throw new Error("Google 로그인이 취소되었거나 실패했어요.");
  }

  const { token: idToken } = await FirebaseAuthentication.getIdToken();

  const data = await loginWithFirebase(idToken);

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
