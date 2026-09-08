import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Btn, Card, DuckSays, Loading, ProgressBar, Screen } from "@/components/app/ui";
import {
  ApiError,
  createTodaySession,
  createThemeSession,
  submitListen,
  submitNaming,
  submitShadowing,
  submitSelfTalk,
  requestHint,
  submitTalk,
  finishSession,
  resolveMediaUrl,
  imageFileUrl,
  type SessionCreateData,
  type SessionTurn,
  type TurnType,
} from "@/lib/api";
import { ensureMicPermission, startRecording, stopRecording } from "@/lib/audioRecorder";
import { SESSION_TITLE, type SessionId } from "@/lib/learning";
import duck from "@/assets/duck.png";
import { Volume2, Lightbulb, Mic, X, Check } from "lucide-react";

export const Route = createFileRoute("/learn/$themeId")({
  head: () => ({
    meta: [
      { title: "학습 세션 — 덕분이" },
      { name: "description", content: "알아듣기, 이름대기, 따라말하기, 자발화와 AI 대화를 차례로 연습해요." },
      { property: "og:title", content: "학습 세션 — 덕분이" },
      { property: "og:description", content: "생활 상황 속에서 한 걸음씩 말하기를 연습하는 세션이에요." },
    ],
  }),
  component: SessionPage,
});

const SUBMIT_SECONDS = 30;
const ANSWER_SECONDS = 30;
const CHAT_MIN_TURNS = 4;
const CHAT_MAX_TURNS = 8;

const THEMA_MAP: Record<"cafe" | "hospital", string> = { cafe: "CAFE", hospital: "HOSPITAL" };

type UiKind = "listen" | "naming" | "shadowing" | "selftalk";

function uiKind(type: TurnType): UiKind {
  if (type === "LISTEN_TEXT" || type === "LISTEN_PICTURE") return "listen";
  if (type === "NAMING") return "naming";
  if (type === "SHADOWING") return "shadowing";
  return "selftalk";
}

const STEP_LABEL: Record<UiKind, string> = {
  listen: "알아듣기",
  naming: "이름대기",
  shadowing: "따라말하기",
  selftalk: "자발화",
};

/* ---------- 공통: 카운트다운 ---------- */

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

/** 대기 카운트다운 (음성 재생 전 3초, 사진 열람 5초) */
function WaitCountdown({ seconds, message }: { seconds: number; message: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8" aria-live="polite">
      <span className="grid size-20 place-items-center rounded-full bg-secondary text-[32px] font-extrabold text-accent">
        {seconds}
      </span>
      <p className="text-[16px] font-semibold text-foreground">{message}</p>
    </Card>
  );
}

/** 제출 카운트다운 (30초) */
function SubmitCountdown({ left }: { left: number }) {
  const danger = left <= 10;
  return (
    <div
      role="timer"
      aria-label={`제출까지 남은 시간 ${left}초`}
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-[16px] font-bold ${
        danger ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card text-foreground"
      }`}
    >
      남은 시간 {left}초
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <p className="break-all text-[13px] text-destructive">{message}</p>
    </Card>
  );
}

function SubmitResult({ onNext }: { onNext: () => void }) {
  return (
    <>
      <Card className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-success/15 text-success">
          <Check size={22} strokeWidth={2.5} aria-hidden />
        </span>
        <p className="text-[17px] font-semibold">답안이 제출되었어요</p>
      </Card>
      <Btn full onClick={onNext}>
        다음으로
      </Btn>
    </>
  );
}

/* ---------- 공통: 녹음 패널 ---------- */

function RecordPanel({ left, onFinish }: { left: number; onFinish: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 py-8">
      <span className="grid size-24 animate-pulse place-items-center rounded-full bg-accent text-primary-foreground shadow-[var(--shadow-soft)]">
        <Mic size={40} fill="currentColor" strokeWidth={0} aria-hidden />
      </span>
      <p className="text-[16px] font-semibold" aria-live="polite">
        녹음 중이에요 · 남은 시간 {left}초
      </p>
      <Btn full onClick={onFinish}>
        녹음 완료
      </Btn>
    </Card>
  );
}

/** 녹음 → Blob 변환 → 제출까지 공통 처리하는 훅 */
function useRecordAndSubmit(submitFn: (blob: Blob) => Promise<void>) {
  const [state, setState] = useState<"idle" | "recording" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const begin = async () => {
    setError(null);
    try {
      await startRecording();
      setState("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "녹음을 시작할 수 없어요");
    }
  };

  const finish = async () => {
    setState("submitting");
    try {
      const blob = await stopRecording();
      await submitFn(blob);
      setState("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "제출에 실패했어요");
      setState("idle");
    }
  };

  return { state, error, begin, finish };
}

/* ---------- 문제 가이드 화면 ---------- */

const GUIDE_TEXT: Record<UiKind, { main: string; audio?: string }> = {
  listen: {
    main: "이번 문제는 '알아듣기'입니다. 질문을 듣고 올바른 선택지를 고른 후 [제출] 버튼을 눌러주세요. 질문을 듣고 30초 안에 선택지를 골라야 해요. 질문이 잘 기억나지 않는다면 [다시 듣기] 버튼을 눌러주세요.",
    audio: "이번 문제는 AI 음성을 들어야 해요. 사용 중인 스마트폰의 음량을 확인해 주세요.",
  },
  naming: {
    main: "이번 문제는 '이름대기'입니다. 사진을 보고 어떤 사물인지 말해주세요. 잘 생각이 나지 않는다면 '힌트' 버튼을 눌러주세요 (최대 2회). 녹음이 끝났다면 [녹음 완료] 버튼을 눌러주세요. 녹음은 30초가 지나면 자동으로 종료돼요.",
  },
  shadowing: {
    main: "이번 문제는 '따라말하기'입니다. AI가 말하는 문장을 끝까지 들은 후 3초 후에 녹음이 시작돼요. 녹음이 시작되면 AI가 말했던 문장을 똑같이 따라 말해주세요. (30초 안에 녹음을 마쳐주세요.)",
    audio: "이번 문제는 AI 음성을 들어야 해요. 사용 중인 스마트폰의 음량을 확인해 주세요.",
  },
  selftalk: {
    main: "이번 문제는 '스스로말하기'입니다. 사진을 보고 30초 안에 상황을 자유롭게 표현해주세요. 30초를 다 채울 필요는 없어요. 상황을 정확하게 말하는 데 더 집중해주세요.",
  },
};

function GuideView({ kind, turn, onReady }: { kind: UiKind; turn: SessionTurn; onReady: () => void }) {
  const guide = GUIDE_TEXT[kind];
  const imageUrl = kind === "naming" || kind === "selftalk" ? resolveMediaUrl(turn.imageUrl) : undefined;

  return (
    <div className="space-y-5 pt-4">
      <DuckSays>{guide.main}</DuckSays>
      {guide.audio ? (
        <Card className="flex items-center gap-3">
          <Volume2 size={22} className="shrink-0 text-accent" aria-hidden />
          <p className="text-[15px] text-muted-foreground">{guide.audio}</p>
        </Card>
      ) : null}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="문제 이미지"
          loading="lazy"
          className="h-44 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
      ) : null}
      <Btn full onClick={onReady}>
        준비됐어요!
      </Btn>
    </div>
  );
}

function StepView({
  sessionId,
  turn,
  onNext,
}: {
  sessionId: number;
  turn: SessionTurn;
  onNext: () => void;
}) {
  const kind = uiKind(turn.type);
  if (kind === "listen") return <ListenStep sessionId={sessionId} turn={turn} onNext={onNext} />;
  if (kind === "naming") return <NamingStep sessionId={sessionId} turn={turn} onNext={onNext} />;
  if (kind === "shadowing") return <RepeatStep sessionId={sessionId} turn={turn} onNext={onNext} />;
  return <SpontaneousStep sessionId={sessionId} turn={turn} onNext={onNext} />;
}

/* ---------- 알아듣기 ---------- */

function ListenStep({
  sessionId,
  turn,
  onNext,
}: {
  sessionId: number;
  turn: SessionTurn;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<"wait" | "play" | "answer">("wait");
  const [picked, setPicked] = useState<number | null>(null);
  const pickedRef = useRef<number | null>(null);
  pickedRef.current = picked;
  const [result, setResult] = useState<{ correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const submittedRef = useRef(false);

  const waitLeft = useCountdown(3, stage === "wait", () => setStage("play"));

  const ttsSrc = resolveMediaUrl(turn.ttsUrl);
  const isImageMode = turn.type === "LISTEN_PICTURE";
  const choices = turn.choices ?? [];

  useEffect(() => {
    if (stage !== "play") return;
    const el = audioRef.current;
    if (!el || !ttsSrc) {
      const t = setTimeout(() => setStage("answer"), 1500);
      return () => clearTimeout(t);
    }
    const onEnd = () => setStage("answer");
    el.addEventListener("ended", onEnd);
    el.currentTime = 0;
    el.play().catch(() => setStage("answer"));
    return () => el.removeEventListener("ended", onEnd);
  }, [stage, ttsSrc]);

  const doSubmit = async (selectedOrder: number) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await submitListen(sessionId, turn.turnId, selectedOrder);
      setResult({ correct: data.correct });
    } catch (e) {
      submittedRef.current = false;
      setSubmitError(e instanceof ApiError ? e.message : "제출에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  const answerLeft = useCountdown(SUBMIT_SECONDS, stage === "answer" && !result && !submitting, () => {
    const selected = pickedRef.current;
    doSubmit(selected !== null ? choices[selected]?.order ?? 0 : 0);
  });

  const replay = () => {
    if (stage === "answer" && !result && !submitting) setStage("play");
  };

  if (stage === "wait") {
    return <WaitCountdown seconds={waitLeft} message="3초 후 질문 음성이 나와요. 집중하세요!" />;
  }

  return (
    <div className="space-y-5">
      {ttsSrc ? <audio ref={audioRef} src={ttsSrc} preload="auto" /> : null}
      <h3 className="text-[20px] font-bold leading-snug">질문을 듣고 올바른 선택지를 골라주세요.</h3>

      <Card className="flex flex-col items-center gap-3 py-6">
        <span className="grid size-16 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-soft)]">
          <Volume2 size={28} fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
        <p className="text-[15px] text-muted-foreground" aria-live="polite">
          {stage === "play" ? "질문을 들려드리고 있어요" : "질문을 다 들으셨나요?"}
        </p>
        {stage === "answer" && !result && !submitting ? (
          <Btn variant="outline" onClick={replay}>
            다시 듣기
          </Btn>
        ) : null}
      </Card>

      {stage === "answer" && !result ? <SubmitCountdown left={answerLeft} /> : null}

      {stage === "answer" ? (
        <ul className={isImageMode ? "grid grid-cols-2 gap-3" : "space-y-3"}>
          {choices.map((c, i) => {
            const on = picked === i;
            const tone = on ? "border-primary bg-secondary" : "border-border bg-card";
            return (
              <li key={c.order}>
                <button
                  disabled={submitting || !!result}
                  aria-pressed={on}
                  onClick={() => setPicked(i)}
                  className={
                    isImageMode
                      ? `w-full overflow-hidden rounded-2xl border-2 p-2 text-center ${tone}`
                      : `min-h-[64px] w-full rounded-2xl border-2 px-4 text-left text-[17px] font-medium ${tone}`
                  }
                >
                  {isImageMode ? (
                    <img
                      src={imageFileUrl(Number(c.context))}
                      alt="선택지 이미지"
                      loading="lazy"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <span>{c.context}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {submitError ? <ErrorCard message={submitError} /> : null}

      {submitting ? (
        <Loading message="답안을 제출 중이에요" />
      ) : result ? (
        <>
          <DuckSays>
            {result.correct ? "정확히 들으셨어요. 잘하셨어요!" : "아쉬워요, 다음 문제에서 다시 도전해봐요!"}
          </DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      ) : stage === "answer" ? (
        <Btn full disabled={picked === null} onClick={() => doSubmit(choices[picked!]?.order ?? 0)}>
          제출
        </Btn>
      ) : null}
    </div>
  );
}

/* ---------- 이름대기 ---------- */

function NamingStep({
  sessionId,
  turn,
  onNext,
}: {
  sessionId: number;
  turn: SessionTurn;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<"wait" | "record">("wait");
  const [hintCount, setHintCount] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const { state, error, begin, finish } = useRecordAndSubmit(async (blob) => {
    await submitNaming(sessionId, turn.turnId, blob);
  });

  const waitLeft = useCountdown(5, stage === "wait", () => setStage("record"));

  useEffect(() => {
    if (stage === "record") begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const recLeft = useCountdown(SUBMIT_SECONDS, state === "recording", () => finish());

  const imageUrl = resolveMediaUrl(turn.imageUrl);

  const askHint = async () => {
    if (hintCount >= 2 || hintLoading) return;
    setHintLoading(true);
    try {
      const hint = await requestHint(sessionId, turn.turnId);
      setHintText(hint.text);
      setHintCount((c) => c + 1);
    } catch (e) {
      setHintText(e instanceof ApiError ? e.message : "힌트를 가져오지 못했어요");
    } finally {
      setHintLoading(false);
    }
  };

  if (stage === "wait") {
    return (
      <div className="space-y-5">
        {imageUrl ? (
          <img src={imageUrl} alt="문제 이미지" className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]" />
        ) : null}
        <WaitCountdown seconds={waitLeft} message="5초 후 녹음이 시작돼요." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">사진 안의 물건은 무엇인가요?</h3>
      {imageUrl ? (
        <img src={imageUrl} alt="문제 이미지" className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]" />
      ) : null}

      {error ? <ErrorCard message={error} /> : null}

      {state === "recording" ? (
        <>
          <RecordPanel left={recLeft} onFinish={finish} />
          <Btn full variant="outline" disabled={hintCount >= 2 || hintLoading} onClick={askHint}>
            <Lightbulb size={20} fill="currentColor" strokeWidth={0} aria-hidden />
            힌트 보기 ({hintCount}/2)
          </Btn>
          {hintText ? <DuckSays>{hintText}</DuckSays> : null}
        </>
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : state === "done" ? (
        <SubmitResult onNext={onNext} />
      ) : (
        <Loading message="녹음을 준비하고 있어요" />
      )}
    </div>
  );
}

/* ---------- 따라말하기 ---------- */

function RepeatStep({
  sessionId,
  turn,
  onNext,
}: {
  sessionId: number;
  turn: SessionTurn;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<"wait1" | "play" | "wait2" | "record">("wait1");
  const { state, error, begin, finish } = useRecordAndSubmit(async (blob) => {
    await submitShadowing(sessionId, turn.turnId, blob);
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsSrc = resolveMediaUrl(turn.ttsUrl);

  const wait1Left = useCountdown(3, stage === "wait1", () => setStage("play"));
  const wait2Left = useCountdown(3, stage === "wait2", () => setStage("record"));
  const recLeft = useCountdown(SUBMIT_SECONDS, state === "recording", () => finish());

  useEffect(() => {
    if (stage !== "play") return;
    const el = audioRef.current;
    if (!el || !ttsSrc) {
      const t = setTimeout(() => setStage("wait2"), 1800);
      return () => clearTimeout(t);
    }
    const onEnd = () => setStage("wait2");
    el.addEventListener("ended", onEnd);
    el.currentTime = 0;
    el.play().catch(() => setStage("wait2"));
    return () => el.removeEventListener("ended", onEnd);
  }, [stage, ttsSrc]);

  useEffect(() => {
    if (stage === "record") begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (stage === "wait1") {
    return <WaitCountdown seconds={wait1Left} message="3초 후 따라 말할 음성이 나와요. 집중하세요!" />;
  }
  if (stage === "play") {
    return (
      <>
        {ttsSrc ? <audio ref={audioRef} src={ttsSrc} preload="auto" /> : null}
        <Card className="flex flex-col items-center gap-3 py-8" aria-live="polite">
          <span className="grid size-20 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Volume2 size={34} fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
          <p className="text-[16px] font-semibold">문장을 들려드리고 있어요</p>
        </Card>
      </>
    );
  }
  if (stage === "wait2") {
    return <WaitCountdown seconds={wait2Left} message="3초 후에 녹음이 시작돼요." />;
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">문장을 듣고 똑같이 따라 말해주세요.</h3>
      {error ? <ErrorCard message={error} /> : null}
      {state === "recording" ? (
        <RecordPanel left={recLeft} onFinish={finish} />
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : state === "done" ? (
        <>
          <DuckSays>또박또박 따라 말씀해 주셨어요.</DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      ) : (
        <Loading message="녹음을 준비하고 있어요" />
      )}
    </div>
  );
}

/* ---------- 스스로말하기(자발화) ---------- */

function SpontaneousStep({
  sessionId,
  turn,
  onNext,
}: {
  sessionId: number;
  turn: SessionTurn;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<"wait" | "record">("wait");
  const { state, error, begin, finish } = useRecordAndSubmit(async (blob) => {
    await submitSelfTalk(sessionId, turn.turnId, blob);
  });
  const waitLeft = useCountdown(5, stage === "wait", () => setStage("record"));

  useEffect(() => {
    if (stage === "record") begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const recLeft = useCountdown(SUBMIT_SECONDS, state === "recording", () => finish());
  const imageUrl = resolveMediaUrl(turn.imageUrl);

  if (stage === "wait") {
    return (
      <div className="space-y-5">
        {imageUrl ? (
          <img src={imageUrl} alt="문제 이미지" className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]" />
        ) : null}
        <WaitCountdown seconds={waitLeft} message="5초 후 녹음이 시작돼요." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">사진을 보고 상황을 자유롭게 표현해주세요.</h3>
      {imageUrl ? (
        <img src={imageUrl} alt="문제 이미지" className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]" />
      ) : null}
      {error ? <ErrorCard message={error} /> : null}
      {state === "recording" ? (
        <RecordPanel left={recLeft} onFinish={finish} />
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : state === "done" ? (
        <>
          <DuckSays>상황을 잘 설명해 주셨어요.</DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      ) : (
        <Loading message="녹음을 준비하고 있어요" />
      )}
    </div>
  );
}

/* ---------- AI 대화 ---------- */

function ChatFlow({ sessionId, onFinished }: { sessionId: number; onFinished: () => void }) {
  const [turnNumber, setTurnNumber] = useState(0);
  const [log, setLog] = useState<{ who: "ai" | "me"; text: string }[]>([]);
  const [waiting, setWaiting] = useState(true);
  const [recording, setRecording] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const data = await submitTalk(sessionId);
        setLog([{ who: "ai", text: data.aiText }]);
        setTurnNumber(data.turnNumber);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "대화를 시작하지 못했어요");
      } finally {
        setWaiting(false);
      }
    })();
  }, [sessionId]);

  const atMax = turnNumber >= CHAT_MAX_TURNS;
  const canFinish = turnNumber >= CHAT_MIN_TURNS;

  const beginRecording = async () => {
    setError(null);
    try {
      await startRecording();
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "녹음을 시작할 수 없어요");
    }
  };

  const finishRecording = async () => {
    setRecording(false);
    setWaiting(true);
    try {
      const blob = await stopRecording();
      const data = await submitTalk(sessionId, blob);
      setLog((l) => [...l, { who: "me", text: data.userText ?? "(음성으로 답변했어요)" }, { who: "ai", text: data.aiText }]);
      setTurnNumber(data.turnNumber);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "답변 제출에 실패했어요");
    } finally {
      setWaiting(false);
    }
  };

  const recLeft = useCountdown(ANSWER_SECONDS, recording, () => finishRecording());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-muted-foreground">덕분이와 이야기 나누기</p>
        <span className="rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-accent">
          {Math.min(turnNumber, CHAT_MAX_TURNS)}/{CHAT_MAX_TURNS}턴
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

      {error ? <ErrorCard message={error} /> : null}
      {waiting ? <Loading message="덕분이가 답변을 생각중이에요" /> : null}

      {atMax && !waiting ? (
        <Btn full onClick={onFinished}>
          학습 마치기
        </Btn>
      ) : !waiting ? (
        <>
          <Btn full disabled={recording} onClick={beginRecording}>
            <Mic size={20} fill="currentColor" strokeWidth={0} aria-hidden />
            음성으로 답변하기
          </Btn>
          {canFinish ? (
            <Btn full variant="outline" disabled={recording} onClick={() => setExitAsk(true)}>
              그만하기
            </Btn>
          ) : (
            <Btn full variant="ghost" disabled={recording} onClick={() => setExitAsk(true)}>
              나가기
            </Btn>
          )}
        </>
      ) : null}

      {recording ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-6" role="dialog" aria-label="녹음 중">
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

      {exitAsk ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-6" role="alertdialog" aria-label="나가기 확인">
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
              <Btn className="flex-1" onClick={onFinished}>
                {canFinish ? "예" : "그래도 나가기"}
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 세션 페이지 ---------- */

function SessionPage() {
  const { themeId } = Route.useParams();
  const navigate = useNavigate();
  const id: SessionId = (["cafe", "hospital", "daily"] as const).includes(themeId as SessionId)
    ? (themeId as SessionId)
    : "daily";

  const [session, setSession] = useState<SessionCreateData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "guide" | "step" | "chat-guide" | "chat">("loading");
  const [idx, setIdx] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensureMicPermission();
    (async () => {
      try {
        const data =
          id === "daily" ? await createTodaySession() : await createThemeSession(THEMA_MAP[id as "cafe" | "hospital"]);
        setSession(data);
        setPhase("intro");
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : "세션을 시작할 수 없어요");
      }
    })();
  }, [id]);

  if (loadError) {
    return (
      <Screen>
        <div className="space-y-4 pt-16 text-center">
          <p className="text-[17px] font-semibold text-destructive">세션을 불러오지 못했어요</p>
          <ErrorCard message={loadError} />
          <Btn full onClick={() => window.location.reload()}>
            다시 시도
          </Btn>
        </div>
      </Screen>
    );
  }

  if (!session || phase === "loading") {
    return (
      <Screen>
        <div className="pt-24">
          <Loading message="학습을 준비하고 있어요" />
        </div>
      </Screen>
    );
  }

  const turns = session.turns;
  const turn = turns[idx];
  const total = turns.length + 4;
  const done = phase === "chat" || phase === "chat-guide" ? turns.length : idx;

  const startSession = () => setPhase("guide");

  const next = () => {
    if (idx + 1 >= turns.length) {
      setPhase("chat-guide");
    } else {
      setIdx((v) => v + 1);
      setPhase("guide");
    }
  };

  const finishAndGoReport = async () => {
    try {
      await finishSession(session.sessionId);
    } catch {
      /* 종료 집계 실패해도 결과 화면은 보여줌 */
    }
    navigate({ to: "/report" });
  };

  return (
    <Screen className="pb-10">
      <header className="mb-5 flex items-center gap-3">
        <Link
          to="/learn"
          aria-label="학습 목록으로 나가기"
          className="grid size-11 place-items-center rounded-2xl bg-card text-muted-foreground"
        >
          <X size={22} strokeWidth={2.2} aria-hidden />
        </Link>
        <div className="flex-1">
          <ProgressBar value={((done + 1) / total) * 100} label="세션 진행률" />
        </div>
        <span className="text-[14px] font-semibold text-muted-foreground">
          {Math.min(done + 1, total)}/{total}
        </span>
      </header>

      {phase === "intro" ? (
        <div className="flex flex-col items-center gap-6 pt-16 text-center">
          <img src={duck} alt="덕분이" width={120} height={120} className="object-contain" />
          <h2 className="text-[22px] font-bold">로딩 완료!</h2>
          <p className="text-[15px] text-muted-foreground">{SESSION_TITLE[id]} 준비가 끝났어요.</p>
          <Btn full onClick={startSession}>
            시작
          </Btn>
        </div>
      ) : phase === "chat-guide" ? (
        <div className="space-y-5 pt-4">
          <DuckSays>모든 학습을 마쳤어요! 이제 덕분이와 자유롭게 이야기해보아요!</DuckSays>
          <Btn full onClick={() => setPhase("chat")}>
            다음
          </Btn>
        </div>
      ) : phase === "chat" ? (
        <ChatFlow sessionId={session.sessionId} onFinished={finishAndGoReport} />
      ) : phase === "guide" ? (
        <GuideView key={`g-${idx}`} kind={uiKind(turn!.type)} turn={turn!} onReady={() => setPhase("step")} />
      ) : (
        <>
          <p className="mb-2 inline-flex rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-accent">
            {SESSION_TITLE[id]} · {STEP_LABEL[uiKind(turn!.type)]}
          </p>
          <StepView key={idx} sessionId={session.sessionId} turn={turn!} onNext={next} />
        </>
      )}
    </Screen>
  );
}
