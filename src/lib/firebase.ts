/**
 * Firebase 초기화
 *
 * 프로젝트: sesac-teamproject
 * - Authentication: Google 로그인
 * - Firestore: 사용자 프로필 등 저장
 *
 * 이 파일은 브라우저(웹)와 Capacitor 네이티브(iOS) 양쪽에서 동작합니다.
 *  - 네이티브(iOS)에서는 @capacitor-firebase 플러그인이 ios/App/App/GoogleService-Info.plist
 *    설정을 사용해 네이티브 Firebase SDK로 직접 동작합니다.
 *  - 브라우저(SSR 프리뷰, 일반 웹 접속)에서는 아래 initializeApp()으로 만든 JS SDK 앱을
 *    @capacitor-firebase 플러그인들이 내부적으로 사용합니다.
 *
 * TanStack Start는 서버(SSR)에서도 이 모듈을 import할 수 있으므로, window가 없는
 * 환경(Node 서버)에서는 초기화를 건너뜁니다.
 */
import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";

const env = import.meta.env;

export const firebaseConfig: FirebaseOptions = {
  apiKey: env["VITE_FIREBASE_API_KEY"],
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: env["VITE_FIREBASE_PROJECT_ID"],
  storageBucket: env["VITE_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
  appId: env["VITE_FIREBASE_APP_ID"],
};

export function ensureFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
}

// 모듈이 브라우저에서 로드되는 순간 바로 초기화 (SSR에서는 no-op)
ensureFirebaseApp();
