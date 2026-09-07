import { useEffect, useRef, useState } from "react";
import { Btn, DuckSays, Loading } from "@/components/app/ui";
import { Mic } from "lucide-react";
import type { SessionStep } from "@/lib/learning";

const ANSWER_SECONDS = 30;

function useCountdown(seconds: number, active: boolean, onDone?: () => void) {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setLeft(seconds);
  }, [seconds, active]);

  useEffect(() => {
    if (!active) return;
    if (left <= 0) {
      doneRef.current?.();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [active, left]);

  return left;
}

export function ChatStep({
  step,
  onNext,
}: {
  step: Extract<SessionStep, { kind: "chat" }>;
  onNext: () => void;
}) {
  const [turn, setTurn] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [log, setLog] = useState<{ who: "ai" | "me"; text: string }[]>([
    { who: "ai", text: step.turns[0]! },
  ]);

  const atMax = turn >= step.maxTurns;
  const canFinish = turn >= step.minTurns;

  const finishRecording = () => {
    setRecording(false);
    setLog((l) => [...l, { who: "me", text: "네, 말씀드렸어요." }]);
    setWaiting(true);
    setTimeout(() => {
      setWaiting(false);
      const nextIdx = turn;
      if (step.turns[nextIdx] && nextIdx < step.maxTurns) {
        setLog((l) => [...l, { who: "ai", text: step.turns[nextIdx]! }]);
        setTurn(nextIdx + 1);
      } else {
        setLog((l) => [...l, { who: "ai", text: "오늘 이야기 나눠 주셔서 고맙습니다!" }]);
        setTurn(step.maxTurns);
      }
    }, 1200);
  };

  // 답변 녹음은 30초 제한 — 시간 도달 시 자동 제출
  const recLeft = useCountdown(ANSWER_SECONDS, recording, () => finishRecording());

  const requestExit = () => setExitAsk(true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-muted-foreground">덕분이와 이야기 나누기</p>
        <span className="rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-accent">
          {turn}/{step.maxTurns}턴
        </span>
      </div>

      <ul className="space-y-4 rounded-3xl bg-secondary/50 p-4">
        {log.map((m, i) => (
          <li key={i} className={m.who === "me" ? "flex justify-end" : ""}>
            {m.who === "ai" ? (
              <DuckSays size={48}>{m.text}</DuckSays>
            ) : (
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-[image:var(--gradient-brand)] px-4 py-3 text-[15px] text-primary-foreground">
                {m.text}
              </p>
            )}
          </li>
        ))}
      </ul>

      {waiting ? <Loading message="덕분이가 답변을 생각중이에요" /> : null}

      {atMax && !waiting ? (
        <Btn full onClick={onNext}>
          학습 마치기
        </Btn>
      ) : (
        <>
          <Btn full disabled={waiting || recording} onClick={() => setRecording(true)}>
            <Mic size={20} fill="currentColor" strokeWidth={0} aria-hidden />
            음성으로 답변하기
          </Btn>
          {canFinish ? (
            <Btn full variant="outline" disabled={waiting || recording} onClick={requestExit}>
              그만하기
            </Btn>
          ) : (
            <Btn full variant="ghost" disabled={waiting || recording} onClick={requestExit}>
              나가기
            </Btn>
          )}
        </>
      )}

      {/* 녹음 중 오버레이: 반투명 패널 + 대형 마이크 */}
      {recording ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-6"
          role="dialog"
          aria-label="녹음 중"
        >
          <div className="card-soft flex w-full max-w-sm flex-col items-center gap-5 p-8">
            <span className="grid size-28 animate-pulse place-items-center rounded-full bg-accent text-primary-foreground shadow-[var(--shadow-soft)]">
              <Mic size={52} fill="currentColor" strokeWidth={0} aria-hidden />
            </span>
            <p className="text-[18px] font-bold" aria-live="polite">
              녹음 중이에요
            </p>
            <p className="text-[15px] text-muted-foreground">남은 시간 {recLeft}초</p>
            <Btn full onClick={finishRecording}>
              녹음 완료
            </Btn>
          </div>
        </div>
      ) : null}

      {/* 중도 이탈 경고/확인 팝업 */}
      {exitAsk ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-6"
          role="alertdialog"
          aria-label="나가기 확인"
        >
          <div className="card-soft w-full max-w-sm space-y-4 p-6 text-center">
            {canFinish ? (
              <p className="text-[17px] font-bold leading-relaxed">정말로 나가시겠어요?</p>
            ) : (
              <p className="text-[17px] font-bold leading-relaxed">
                잠깐만! 지금 나가면 피드백을 받을 수 없고, 학습 기록을 다시 확인할 수 없어요!
              </p>
            )}
            <div className="flex gap-3">
              <Btn className="flex-1" variant="outline" onClick={() => setExitAsk(false)}>
                {canFinish ? "아니오" : "계속 이야기하기"}
              </Btn>
              <Btn className="flex-1" onClick={onNext}>
                {canFinish ? "예" : "그래도 나가기"}
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
