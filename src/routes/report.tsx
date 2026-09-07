import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Play, Pause } from "lucide-react";
import { useState } from "react";
import { MEDIA, MEDIA_ALT, type MediaKey } from "@/lib/media";
import { Btn, Card, DuckSays, PageTitle, Screen } from "@/components/app/ui";
import { calcAQ, type Scores } from "@/lib/learning";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "학습 보고서 — 덕분이" },
      { name: "description", content: "AQ 지수와 자발화·이해력·따라말하기·이름대기 항목별 점수를 확인하세요." },
      { property: "og:title", content: "학습 보고서 — 덕분이" },
      { property: "og:description", content: "오늘 연습의 결과를 방사형 그래프로 한눈에 살펴봐요." },
    ],
  }),
  component: ReportPage,
});

const scores: Scores = { spontaneous: 16, comprehension: 8, repetition: 7, naming: 9 };

type Detail = {
  /** 문제 음성(또는 제시 문장) */
  q: string;
  /** "둘 중 정답을 골라 주세요" 안내 표시 (알아듣기) */
  choiceGuide?: boolean;
  /** 문제 그림 (그림 선택 문제·이름대기·자발화) */
  image?: MediaKey;
  /** 그림 선택지 2개 (알아듣기 그림 문제) */
  optionImages?: [MediaKey, MediaKey];
  /** 문제가 음성 버튼으로 제시되는 경우 */
  questionAudio?: boolean;
  /** 정답: 텍스트 */
  answer?: string;
  /** 사용자가 선택/답한 텍스트 */
  userAnswer?: string;
  /** 정답: 그림 */
  answerImage?: MediaKey;
  /** 사용자가 선택한 그림 */
  userImage?: MediaKey;
  /** 정답이 사용자 녹음인 경우 재생 버튼 */
  audio?: boolean;
};

const rows: { key: string; score: number; max: number; note: string; details: Detail[] }[] = [
  {
    key: "자발화",
    score: scores.spontaneous,
    max: 20,
    note: "문장의 핵심을 잘 파악했어요.",
    details: [
      { q: "카페에서 음료를 주문해 보세요.", image: "cafe_order", audio: true },
      { q: "음료를 받는 장면을 설명해 주세요.", image: "cafe_receive", audio: true },
    ],
  },
  {
    key: "이해력(알아듣기)",
    score: scores.comprehension,
    max: 10,
    note: "두 번 들으면 더 또렷해져요.",
    details: [
      {
        q: "이 음료는 우유를 넣어 부드러워요.",
        choiceGuide: true,
        answer: "우유를 넣어 부드러워요",
        userAnswer: "우유를 넣어 부드러워요",
      },
      {
        q: "따뜻한 커피 한 잔 주세요.",
        choiceGuide: true,
        optionImages: ["coffee", "icedjuice"],
        answerImage: "coffee",
        userImage: "icedjuice",
      },
    ],
  },
  {
    key: "따라말하기",
    score: scores.repetition,
    max: 10,
    note: "긴 문장에서 잠시 쉬어가면 좋아요.",
    details: [
      { q: "따뜻한 커피 한 잔 주세요.", questionAudio: true, audio: true },
      { q: "네, 여기서 마시고 갈게요.", questionAudio: true, audio: true },
    ],
  },
  {
    key: "이름대기",
    score: scores.naming,
    max: 10,
    note: "사물 이름을 빠르게 떠올리셨어요.",
    details: [
      { q: "사진 속 음료의 이름을 말씀해 주세요.", image: "coffee", audio: true },
      { q: "사진 속 물건의 이름을 말씀해 주세요.", image: "coffeecup", audio: true },
    ],
  },
];

const chartData = rows.map((r) => ({
  item: r.key.replace("(알아듣기)", ""),
  value: (r.score / r.max) * 100,
}));

function RecordingPlayer({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl bg-card px-3 py-2">
      <button
        onClick={() => {
          setPlaying(true);
          setTimeout(() => setPlaying(false), 1600);
        }}
        aria-label={playing ? "녹음 재생 중" : "녹음 들어보기"}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-soft)]"
      >
        {playing ? (
          <Pause size={20} fill="currentColor" strokeWidth={0} aria-hidden />
        ) : (
          <Play size={20} fill="currentColor" strokeWidth={0} aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-[13px] text-muted-foreground" aria-live="polite">
          {playing ? "녹음을 들려드리고 있어요" : "녹음 00:06 · 눌러서 들어보기"}
        </p>
      </div>
    </div>
  );
}

function ReportPage() {
  const aq = calcAQ(scores);

  return (
    <Screen className="pb-12">
      <PageTitle title="오늘의 보고서" desc="차분히 살펴보시면 돼요." />
      <DuckSays>오늘도 끝까지 함께해 주셔서 고맙습니다.</DuckSays>
      <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-[15px] text-foreground">
        AI 대화: 덕분이와의 대화에서 말문이 편하게 트이셨어요.
      </p>

      <Card className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">AQ 지수</h2>
          <p className="text-[15px] text-muted-foreground">100점 만점</p>
        </div>
        <p className="mt-1 text-[44px] font-bold leading-none text-accent">{aq}</p>

        <div className="mt-4 h-64" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="item"
                tick={{ fill: "var(--foreground)", fontSize: 13 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke="var(--accent)"
                fill="var(--primary)"
                fillOpacity={0.55}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="sr-only">
          {rows.map((r) => `${r.key} ${r.score}점 만점 ${r.max}점`).join(", ")}
        </p>
      </Card>

      <h2 className="mb-3 mt-7 text-[17px] font-bold">항목별 점수</h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key}>
            <Card className="p-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    size={20}
                    strokeWidth={2.2}
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[16px] font-semibold">{r.key}</h3>
                      <p className="text-[17px] font-bold text-accent">
                        {r.score}
                        <span className="text-[14px] font-medium text-muted-foreground">
                          {" "}
                          / {r.max}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-[image:var(--gradient-brand)]"
                        style={{ width: `${(r.score / r.max) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[14px] text-muted-foreground">{r.note}</p>
                  </div>
                </summary>
                <ul className="space-y-2 border-t border-border px-4 py-3">
                  {r.details.map((d, i) => (
                    <li key={i} className="rounded-xl bg-secondary px-3 py-2 text-[14px]">
                      <p className="font-semibold text-foreground">문제 {i + 1}</p>
                      {d.choiceGuide ? (
                        <>
                          <p className="mt-1 text-muted-foreground">
                            안내: 둘 중 정답을 골라 주세요.
                          </p>
                          <RecordingPlayer label="문제 음성 듣기" />
                        </>
                      ) : d.questionAudio ? (
                        <RecordingPlayer label="문제 음성 듣기" />
                      ) : (
                        <p className="mt-1 text-muted-foreground">{d.q}</p>
                      )}
                      {d.image ? (
                        <img
                          src={MEDIA[d.image]}
                          alt={MEDIA_ALT[d.image]}
                          loading="lazy"
                          width={768}
                          height={576}
                          className="mt-2 h-32 w-full rounded-xl object-cover"
                        />
                      ) : null}
                      {d.optionImages ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {d.optionImages.map((key) => (
                            <img
                              key={key}
                              src={MEDIA[key]}
                              alt={`선택지: ${MEDIA_ALT[key]}`}
                              loading="lazy"
                              width={768}
                              height={576}
                              className="h-24 w-full rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 rounded-xl bg-card px-3 py-2">
                        <p className="text-[13px] font-semibold text-muted-foreground">정답</p>
                        {d.answer ? (
                          <p className="mt-1 font-semibold text-foreground">{d.answer}</p>
                        ) : null}
                        {d.userAnswer ? (
                          <p className="mt-0.5 text-foreground">내가 고른 답: {d.userAnswer}</p>
                        ) : null}
                        {d.answerImage ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <img
                              src={MEDIA[d.answerImage]}
                              alt={`정답 그림: ${MEDIA_ALT[d.answerImage]}`}
                              loading="lazy"
                              width={768}
                              height={576}
                              className="h-24 w-full rounded-lg object-cover"
                            />
                            {d.userImage ? (
                              <img
                                src={MEDIA[d.userImage]}
                                alt={`내가 고른 그림: ${MEDIA_ALT[d.userImage]}`}
                                loading="lazy"
                                width={768}
                                height={576}
                                className="h-24 w-full rounded-lg object-cover"
                              />
                            ) : null}
                          </div>
                        ) : null}
                        {d.audio ? <RecordingPlayer label="내가 말한 답변" /> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          </li>
        ))}
      </ul>

      <Link to="/home" className="mt-7 block">
        <Btn full>홈으로 돌아가기</Btn>
      </Link>
    </Screen>
  );
}
