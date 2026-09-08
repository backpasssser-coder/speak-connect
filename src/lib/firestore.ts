/**
 * Firestore 헬퍼
 *
 * 프로젝트: sesac-teamproject (Firestore 위치: asia-northeast3 / Seoul)
 * 보안 규칙(firestore.rules): 로그인한 본인(uid)만 users/{uid} 문서를 읽고 쓸 수 있습니다.
 */
import { FirebaseFirestore } from "@capacitor-firebase/firestore";

export interface UserProfileDoc {
  name: string;
  gender: string;
  birthDate: string;
  hobby: string;
  interestTags: string[];
  updatedAt: string;
}

/** users/{uid} 문서에 프로필을 병합 저장합니다. */
export async function saveUserProfile(
  uid: string,
  profile: Partial<Omit<UserProfileDoc, "updatedAt">>,
) {
  await FirebaseFirestore.setDocument({
    reference: `users/${uid}`,
    data: { ...profile, updatedAt: new Date().toISOString() },
    merge: true,
  });
}

/** users/{uid} 문서를 읽어옵니다. 문서가 없으면 null을 반환합니다. */
export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const { snapshot } = await FirebaseFirestore.getDocument<UserProfileDoc>({
    reference: `users/${uid}`,
  });
  return (snapshot.data as UserProfileDoc | undefined) ?? null;
}
