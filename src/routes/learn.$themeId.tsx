import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Btn, Card, DuckSays, Loading, ProgressBar, Screen } from "@/components/app/ui";
import { ChatStep } from "@/components/app/ChatStep";
import {
  SESSIONS,
  SESSION_TITLE,
  STEP_LABEL,
  stepWeight,
  totalItems,
  type SessionId,
  type SessionStep,
} from "@/lib/learning";
import { MEDIA, MEDIA_ALT, type MediaKey } from "@/lib/media";
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

/** 대기 카운트다운 (음성 재생 전 3초, 사진 열람 5초) — 제출 카운트다운과 시각적으로 구분 */
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

/* ---------- 공통: 제출 플로우 ---------- */

type SubmitState = "idle" | "submitting" | "submitted";

function useSubmitFlow() {
  const [state, setState] = useState<SubmitState>("idle");
  const submit = () => {
    setState("submitting");
    setTimeout(() => setState("submitted"), 900);
  };
  return { state, submit };
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

/* ---------- 공통: 녹음 패널 (텍스트 라벨 버튼) ---------- */

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

/* ---------- 세션 페이지 ---------- */

function SessionPage() {
  const { themeId } = Route.useParams();
  const navigate = useNavigate();
  const id: SessionId = (["cafe", "hospital", "daily"] as const).includes(themeId as SessionId)
    ? (themeId as SessionId)
    : "daily";
  const steps = SESSIONS[id];

  const [phase, setPhase] = useState<"intro" | "guide" | "step">("intro");
  const [introDone, setIntroDone] = useState(false);
  const [idx, setIdx] = useState(0);
  const step = steps[idx]!;
  const total = totalItems(steps);
  const done = steps.slice(0, idx).reduce((n, s) => n + stepWeight(s), 0);

  // 1. 세션 진입: 로딩 → 로딩 완료 → [시작]
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const startSession = async () => {
    // 마이크 권한 선확인 (거절해도 세션 진행은 가능)
    try {
      await navigator.mediaDevices?.getUserMedia({ audio: true });
    } catch {
      /* 권한 거절 시에도 진행 */
    }
    setPhase("guide");
  };

  const next = () => {
    if (idx + 1 >= steps.length) navigate({ to: "/report" });
    else {
      setIdx(idx + 1);
      setPhase("guide");
    }
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
          <ProgressBar value={((done + stepWeight(step)) / total) * 100} label="세션 진행률" />
        </div>
        <span className="text-[14px] font-semibold text-muted-foreground">
          {done + 1}/{total}
        </span>
      </header>

      {phase === "intro" ? (
        <div className="pt-16">
          {introDone ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <img src={duck} alt="덕분이" width={120} height={120} className="object-contain" />
              <h2 className="text-[22px] font-bold">로딩 완료!</h2>
              <p className="text-[15px] text-muted-foreground">
                {SESSION_TITLE[id]} 준비가 끝났어요.
              </p>
              <Btn full onClick={startSession}>
                시작
              </Btn>
            </div>
          ) : (
            <Loading message="학습을 준비하고 있어요" />
          )}
        </div>
      ) : phase === "guide" ? (
        <GuideView key={`g-${idx}`} step={step} onReady={() => setPhase("step")} />
      ) : (
        <>
          <p className="mb-2 inline-flex rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-accent">
            {SESSION_TITLE[id]} · {STEP_LABEL[step.kind]}
          </p>
          <h2 className="mb-4 text-[15px] font-semibold text-muted-foreground">{step.title}</h2>
          <StepView key={idx} step={step} onNext={next} />
        </>
      )}
    </Screen>
  );
}

/* ---------- 2. 문제 가이드 화면 ---------- */

const GUIDE_TEXT: Record<SessionStep["kind"], { main: string; audio?: string }> = {
  listen: {
    main: "이번 문제는 '알아듣기'입니다. 질문을 듣고 올바른 선택지를 고른 후 [제출] 버튼을 눌러주세요. 질문을 듣고 30초 안에 선택지를 골라야 해요. 질문이 잘 기억나지 않는다면 [다시 듣기] 버튼을 눌러주세요.",
    audio: "이번 문제는 AI 음성을 들어야 해요. 사용 중인 스마트폰의 음량을 확인해 주세요.",
  },
  naming: {
    main: "이번 문제는 '이름대기'입니다. 사진을 보고 어떤 사물인지 말해주세요. 잘 생각이 나지 않는다면 '힌트' 버튼을 눌러주세요 (최대 2회). 녹음이 끝났다면 [녹음 완료] 버튼을 눌러주세요. 녹음은 30초가 지나면 자동으로 종료돼요. 30초 안에 말해주세요.",
  },
  repeat: {
    main: "이번 문제는 '따라말하기'입니다. AI가 말하는 문장을 끝까지 들은 후 3초 후에 녹음이 시작돼요. 녹음이 시작되면 AI가 말했던 문장을 똑같이 따라 말해주세요. (30초 안에 녹음을 마쳐주세요.) 다시 듣고 싶다면 [다시 듣기] 버튼을 눌러주세요.",
    audio: "이번 문제는 AI 음성을 들어야 해요. 사용 중인 스마트폰의 음량을 확인해 주세요.",
  },
  spontaneous: {
    main: "이번 문제는 '스스로말하기'입니다. 사진을 보고 30초 안에 상황을 자유롭게 표현해주세요. 예를 들어 '남자가 주문표를 가리키면서 말하고 있고, 의자가 넘어져 있어요'처럼 말해주면 돼요. 30초를 다 채울 필요는 없어요. 상황을 정확하게 말하는 데 더 집중해주세요.",
  },
  chat: {
    main: "모든 학습을 마쳤어요! 이제 덕분이와 자유롭게 이야기해보아요!",
  },
};

function GuideView({ step, onReady }: { step: SessionStep; onReady: () => void }) {
  const guide = GUIDE_TEXT[step.kind];
  const image: MediaKey | null =
    step.kind === "naming" || step.kind === "spontaneous" ? step.image : null;
  const isChat = step.kind === "chat";

  return (
    <div className="space-y-5 pt-4">
      <DuckSays>{guide.main}</DuckSays>
      {guide.audio ? (
        <Card className="flex items-center gap-3">
          <Volume2 size={22} className="shrink-0 text-accent" aria-hidden />
          <p className="text-[15px] text-muted-foreground">{guide.audio}</p>
        </Card>
      ) : null}
      {image ? (
        <img
          src={MEDIA[image]}
          alt={MEDIA_ALT[image]}
          loading="lazy"
          className="h-44 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
      ) : null}
      <Btn full onClick={onReady}>
        {isChat ? "다음" : "준비됐어요!"}
      </Btn>
    </div>
  );
}

function StepView({ step, onNext }: { step: SessionStep; onNext: () => void }) {
  if (step.kind === "listen") return <ListenStep step={step} onNext={onNext} />;
  if (step.kind === "naming") return <NamingStep step={step} onNext={onNext} />;
  if (step.kind === "repeat") return <RepeatStep onNext={onNext} />;
  if (step.kind === "spontaneous") return <SpontaneousStep image={step.image} onNext={onNext} />;
  return <ChatStep step={step} onNext={onNext} />;
}

/* ---------- 3-1. 알아듣기 ---------- */

function ListenStep({
  step,
  onNext,
}: {
  step: Extract<SessionStep, { kind: "listen" }>;
  onNext: () => void;
}) {
  // wait(3초 대기) → play(음성 재생) → answer(30초 제출 카운트)
  const [stage, setStage] = useState<"wait" | "play" | "answer">("wait");
  const [picked, setPicked] = useState<number | null>(null);
  const pickedRef = useRef<number | null>(null);
  pickedRef.current = picked;
  const { state, submit } = useSubmitFlow();

  const waitLeft = useCountdown(3, stage === "wait", () => setStage("play"));

  useEffect(() => {
    if (stage !== "play") return;
    const t = setTimeout(() => setStage("answer"), 1500);
    return () => clearTimeout(t);
  }, [stage]);

  // 30초 내 미선택 시 오답(미선택) 처리 / 선택만 하고 제출 안 하면 최근 선택값으로 자동 제출
  const answerLeft = useCountdown(
    SUBMIT_SECONDS,
    stage === "answer" && state === "idle",
    () => submit(),
  );

  const replay = () => {
    if (stage === "answer" && state === "idle") {
      setStage("play");
    }
  };

  if (stage === "wait") {
    return <WaitCountdown seconds={waitLeft} message="3초 후 질문 음성이 나와요. 집중하세요!" />;
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">
        질문을 듣고 올바른 선택지를 골라주세요.
      </h3>

      <Card className="flex flex-col items-center gap-3 py-6">
        <span className="grid size-16 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-soft)]">
          <Volume2 size={28} fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
        <p className="text-[15px] text-muted-foreground" aria-live="polite">
          {stage === "play" ? "질문을 들려드리고 있어요" : "질문을 다 들으셨나요?"}
        </p>
        {stage === "answer" && state === "idle" ? (
          <Btn variant="outline" onClick={replay}>
            다시 듣기
          </Btn>
        ) : null}
      </Card>

      {stage === "answer" && state === "idle" ? <SubmitCountdown left={answerLeft} /> : null}

      {stage === "answer" ? (
        <ul className={step.mode === "image" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
          {step.options.map((o, i) => {
            const on = picked === i;
            const correct = state === "submitted" && i === step.answer;
            const wrong = state === "submitted" && on && i !== step.answer;
            const tone = correct
              ? "border-success bg-success/10"
              : wrong
                ? "border-destructive bg-destructive/10"
                : on
                  ? "border-primary bg-secondary"
                  : "border-border bg-card";
            return (
              <li key={o.label}>
                <button
                  disabled={state !== "idle"}
                  aria-pressed={on}
                  onClick={() => setPicked(i)}
                  className={
                    step.mode === "image"
                      ? `w-full overflow-hidden rounded-2xl border-2 p-2 text-center ${tone}`
                      : `min-h-[64px] w-full rounded-2xl border-2 px-4 text-left text-[17px] font-medium ${tone}`
                  }
                >
                  {step.mode === "image" && o.image ? (
                    <img
                      src={MEDIA[o.image]}
                      alt={MEDIA_ALT[o.image]}
                      loading="lazy"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  {step.mode === "text" ? <span>{o.label}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : state === "submitted" ? (
        <>
          <DuckSays>
            {pickedRef.current === step.answer
              ? "정확히 들으셨어요. 잘하셨어요!"
              : `정답은 "${step.options[step.answer].label}"예요.`}
          </DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      ) : stage === "answer" ? (
        <Btn full disabled={picked === null} onClick={submit}>
          제출
        </Btn>
      ) : null}
    </div>
  );
}

/* ---------- 3-2. 이름대기 ---------- */

function NamingStep({
  step,
  onNext,
}: {
  step: Extract<SessionStep, { kind: "naming" }>;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<"wait" | "record">("wait");
  const [hintCount, setHintCount] = useState(0);
  const { state, submit } = useSubmitFlow();

  const waitLeft = useCountdown(5, stage === "wait", () => setStage("record"));
  const recLeft = useCountdown(SUBMIT_SECONDS, stage === "record" && state === "idle", () =>
    submit(),
  );

  if (stage === "wait") {
    return (
      <div className="space-y-5">
        <img
          src={MEDIA[step.image]}
          alt={MEDIA_ALT[step.image]}
          className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
        <WaitCountdown seconds={waitLeft} message="5초 후 녹음이 시작돼요." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">사진 안의 물건은 무엇인가요?</h3>
      <img
        src={MEDIA[step.image]}
        alt={MEDIA_ALT[step.image]}
        className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
      />

      {state === "idle" ? (
        <>
          <RecordPanel left={recLeft} onFinish={submit} />
          <Btn
            full
            variant="outline"
            disabled={hintCount >= 2}
            onClick={() => setHintCount((c) => c + 1)}
          >
            <Lightbulb size={20} fill="currentColor" strokeWidth={0} aria-hidden />
            힌트 보기 ({hintCount}/2)
          </Btn>
          {hintCount > 0 ? <DuckSays>{step.hint}</DuckSays> : null}
        </>
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : (
        <>
          <Card className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-success/15 text-success">
              <Check size={22} strokeWidth={2.5} aria-hidden />
            </span>
            <p className="text-[17px]">
              정답은 <strong>{step.answer}</strong>예요.
            </p>
          </Card>
          <SubmitResult onNext={onNext} />
        </>
      )}
    </div>
  );
}

/* ---------- 3-3. 따라말하기 ---------- */

function RepeatStep({ onNext }: { onNext: () => void }) {
  // wait1(3초) → play(음성 재생) → wait2(3초 재대기) → record(30초)
  const [stage, setStage] = useState<"wait1" | "play" | "wait2" | "record">("wait1");
  const { state, submit } = useSubmitFlow();

  const wait1Left = useCountdown(3, stage === "wait1", () => setStage("play"));
  const wait2Left = useCountdown(3, stage === "wait2", () => setStage("record"));
  const recLeft = useCountdown(SUBMIT_SECONDS, stage === "record" && state === "idle", () =>
    submit(),
  );

  useEffect(() => {
    if (stage !== "play") return;
    const t = setTimeout(() => setStage("wait2"), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === "wait1") {
    return <WaitCountdown seconds={wait1Left} message="3초 후 따라 말할 음성이 나와요. 집중하세요!" />;
  }
  if (stage === "play") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8" aria-live="polite">
        <span className="grid size-20 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-soft)]">
          <Volume2 size={34} fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
        <p className="text-[16px] font-semibold">문장을 들려드리고 있어요</p>
      </Card>
    );
  }
  if (stage === "wait2") {
    return <WaitCountdown seconds={wait2Left} message="3초 후에 녹음이 시작돼요." />;
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">문장을 듣고 똑같이 따라 말해주세요.</h3>

      {state === "idle" ? (
        <>
          <RecordPanel left={recLeft} onFinish={submit} />
          <Btn full variant="outline" onClick={() => setStage("play")}>
            다시 듣기
          </Btn>
        </>
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : (
        <>
          <DuckSays>또박또박 따라 말씀해 주셨어요.</DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      )}
    </div>
  );
}

/* ---------- 3-4. 스스로말하기(자발화) ---------- */

function SpontaneousStep({ image, onNext }: { image: MediaKey; onNext: () => void }) {
  const [stage, setStage] = useState<"wait" | "record">("wait");
  const { state, submit } = useSubmitFlow();

  const waitLeft = useCountdown(5, stage === "wait", () => setStage("record"));
  const recLeft = useCountdown(SUBMIT_SECONDS, stage === "record" && state === "idle", () =>
    submit(),
  );

  if (stage === "wait") {
    return (
      <div className="space-y-5">
        <img
          src={MEDIA[image]}
          alt={MEDIA_ALT[image]}
          className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
        <WaitCountdown seconds={waitLeft} message="5초 후 녹음이 시작돼요." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-bold leading-snug">사진을 보고 상황을 자유롭게 표현해주세요.</h3>
      <img
        src={MEDIA[image]}
        alt={MEDIA_ALT[image]}
        className="h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
      />

      {state === "idle" ? (
        <RecordPanel left={recLeft} onFinish={submit} />
      ) : state === "submitting" ? (
        <Loading message="답안을 제출 중이에요" />
      ) : (
        <>
          <DuckSays>상황을 잘 설명해 주셨어요.</DuckSays>
          <SubmitResult onNext={onNext} />
        </>
      )}
    </div>
  );
}
