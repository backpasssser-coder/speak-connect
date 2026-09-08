/**
 * 네이티브 오디오 녹음 브리지 (ios/App/App/AudioRecorderPlugin.swift)
 *
 * 이름대기 / 따라말하기 / 자발화 / AI 대화 답변 녹음에 사용.
 * 서드파티 Capacitor 녹음 플러그인 대신 직접 만든 최소 네이티브 플러그인을 사용합니다.
 */
import { registerPlugin } from "@capacitor/core";

export interface AudioRecorderResult {
  base64: string;
  mimeType: string;
}

export interface AudioRecorderPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<AudioRecorderResult>;
}

const AudioRecorder = registerPlugin<AudioRecorderPlugin>("AudioRecorder");

/** base64 오디오 문자열을 업로드 가능한 Blob으로 변환 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

let permissionAsked = false;

/** 세션 진입 시 한 번 선요청 (거절해도 학습 진행은 가능 — 실제 녹음 시점에 다시 실패 처리) */
export async function ensureMicPermission(): Promise<void> {
  if (permissionAsked) return;
  permissionAsked = true;
  try {
    await AudioRecorder.requestPermission();
  } catch {
    /* 무시 — 녹음 시작 시 다시 실패하면 그때 사용자에게 안내 */
  }
}

export async function startRecording(): Promise<void> {
  await AudioRecorder.startRecording();
}

export async function stopRecording(): Promise<Blob> {
  const { base64, mimeType } = await AudioRecorder.stopRecording();
  return base64ToBlob(base64, mimeType);
}
