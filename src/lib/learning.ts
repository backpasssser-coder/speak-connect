import type { MediaKey } from "@/lib/media";

export const INTEREST_TAGS = [
  "건강관리",
  "등산",
  "골프",
  "여행",
  "트로트",
  "요리",
  "텃밭가꾸기",
  "낚시",
  "독서",
  "바둑",
  "사진",
  "전시관람",
  "국내여행",
  "반려동물",
  "봉사활동",
] as const;

export const SURVEY_ITEMS = [
  "일상에서 하고 싶은 말을 어렵지 않게 표현하시나요?",
  "상대방의 말을 끝까지 이해하는 편이신가요?",
  "물건이나 사람의 이름이 잘 떠오르시나요?",
  "들은 문장을 그대로 따라 말하기가 편하신가요?",
  "대화를 이어가는 데 부담이 적으신가요?",
] as const;

export const SURVEY_SCALE = [
  { value: 1, label: "전혀 아니에요" },
  { value: 2, label: "조금 어려워요" },
  { value: 3, label: "보통이에요" },
  { value: 4, label: "대체로 편해요" },
  { value: 5, label: "아주 편해요" },
];

export type ThemeId = "cafe" | "hospital";
export type SessionId = ThemeId | "daily";

export const THEMES: {
  id: ThemeId;
  title: string;
  subtitle: string;
  minutes: number;
}[] = [
  { id: "cafe", title: "카페에서 주문하기", subtitle: "음료 고르고 주문해 보기", minutes: 8 },
  { id: "hospital", title: "병원에서 진료받기", subtitle: "접수하고 증상 말하기", minutes: 8 },
];

export const DAILY = {
  id: "daily" as const,
  title: "오늘의 학습",
  subtitle: "여러 상황을 섞어 12문항",
  minutes: 8,
};

export type StepKind = "listen" | "naming" | "repeat" | "spontaneous" | "chat";

export const STEP_LABEL: Record<StepKind, string> = {
  listen: "알아듣기",
  naming: "이름대기",
  repeat: "따라말하기",
  spontaneous: "자발화",
  chat: "AI 대화",
};

export type ListenOption = { label: string; image?: MediaKey };

export type SessionStep =
  | {
      kind: "listen";
      /** text: 텍스트 2개 중 고르기 / image: 그림 2개 중 고르기 */
      mode: "text" | "image";
      title: string;
      prompt: string;
      audioText: string;
      options: [ListenOption, ListenOption];
      answer: 0 | 1;
    }
  | {
      kind: "naming";
      title: string;
      prompt: string;
      hint: string;
      answer: string;
      image: MediaKey;
    }
  | { kind: "repeat"; title: string; sentence: string }
  | { kind: "spontaneous"; title: string; prompt: string; image: MediaKey }
  | { kind: "chat"; title: string; turns: string[]; minTurns: number; maxTurns: number };

/** AI 대화는 4문항으로 계산합니다. */
export function stepWeight(step: SessionStep) {
  return step.kind === "chat" ? 4 : 1;
}

export function totalItems(steps: SessionStep[]) {
  return steps.reduce((n, s) => n + stepWeight(s), 0);
}

const cafeChat: SessionStep = {
  kind: "chat",
  title: "카페 이야기 나누기",
  minTurns: 4,
  maxTurns: 8,
  turns: [
    "오늘은 어떤 음료를 주문하셨어요?",
    "그 음료는 어떤 맛인가요?",
    "카페에서는 주로 무엇을 하며 시간을 보내세요?",
    "오늘 카페에서 기분은 어떠셨어요?",
    "다음에 또 마셔보고 싶은 음료가 있으세요?",
    "함께 가고 싶은 분이 있으신가요?",
    "카페에서 앉기 좋은 자리는 어디였나요?",
    "오늘 이야기 나눠 주셔서 고맙습니다. 마무리해도 될까요?",
  ],
};

const hospitalChat: SessionStep = {
  kind: "chat",
  title: "진료 이야기 나누기",
  minTurns: 4,
  maxTurns: 8,
  turns: [
    "오늘은 어디가 불편해서 오셨어요?",
    "언제부터 그러셨는지 말씀해 주시겠어요?",
    "지금 드시고 계신 약이 있으실까요?",
    "요즘 잠은 잘 주무세요?",
    "식사는 어떻게 하고 계세요?",
    "병원에 오실 때는 어떻게 오셨어요?",
    "다음 진료는 언제로 하면 좋을까요?",
    "오늘 이야기 나눠 주셔서 고맙습니다. 마무리해도 될까요?",
  ],
};

const cafe: SessionStep[] = [
  {
    kind: "naming",
    title: "음료 이름 찾기",
    prompt: "사진 속 음료의 이름을 말씀해 주세요.",
    hint: "원두를 내려 만든 따뜻한 음료예요",
    answer: "커피",
    image: "coffee",
  },
  {
    kind: "listen",
    mode: "text",
    title: "음료 특징 이해",
    prompt: "들려드린 문장에 맞는 답을 골라 주세요.",
    audioText: "이 음료는 우유를 넣어 부드러워요.",
    options: [{ label: "우유를 넣어 부드러워요" }, { label: "얼음만 넣은 음료예요" }],
    answer: 0,
  },
  {
    kind: "listen",
    mode: "image",
    title: "주문할 음료 찾기",
    prompt: "들려드린 문장에 맞는 그림을 골라 주세요.",
    audioText: "따뜻한 커피 한 잔 주세요.",
    options: [
      { label: "차가운 주스", image: "icedjuice" },
      { label: "따뜻한 커피", image: "coffee" },
    ],
    answer: 1,
  },
  { kind: "repeat", title: "주문 표현 따라하기", sentence: "따뜻한 커피 한 잔 주세요." },
  {
    kind: "spontaneous",
    title: "직접 주문하기",
    prompt: "카페에서 음료를 주문해 보세요.",
    image: "cafe_order",
  },
  { kind: "repeat", title: "주문 확인에 응답하기", sentence: "네, 여기서 마시고 갈게요." },
  {
    kind: "naming",
    title: "카페에서 사용하는 물건 찾기",
    prompt: "사진 속 물건의 이름을 말씀해 주세요.",
    hint: "받침 위에 놓인 잔이에요",
    answer: "커피잔",
    image: "coffeecup",
  },
  {
    kind: "spontaneous",
    title: "음료 받는 상황 설명하기",
    prompt: "음료를 받는 장면을 설명해 주세요.",
    image: "cafe_receive",
  },
  cafeChat,
];

const hospital: SessionStep[] = [
  {
    kind: "naming",
    title: "진료 장소 이름 찾기",
    prompt: "사진 속 장소의 이름을 말씀해 주세요.",
    hint: "진료를 받는 곳이에요",
    answer: "병원",
    image: "hospital",
  },
  {
    kind: "listen",
    mode: "text",
    title: "접수 안내 이해",
    prompt: "들려드린 문장에 맞는 답을 골라 주세요.",
    audioText: "이름과 생년월일을 말씀해 주세요.",
    options: [{ label: "이름과 생년월일을 물어봤어요" }, { label: "진료비를 물어봤어요" }],
    answer: 0,
  },
  {
    kind: "listen",
    mode: "image",
    title: "내 증상 고르기",
    prompt: "들려드린 문장에 맞는 그림을 골라 주세요.",
    audioText: "어제부터 목이 아팠어요.",
    options: [
      { label: "다리를 다쳤어요", image: "hurt_leg" },
      { label: "목이 아파요", image: "sore_throat" },
    ],
    answer: 1,
  },
  { kind: "repeat", title: "접수 표현 따라하기", sentence: "진료 접수 부탁드립니다." },
  {
    kind: "spontaneous",
    title: "직접 접수하기",
    prompt: "접수 창구에서 접수해 보세요.",
    image: "hospital_reception",
  },
  { kind: "repeat", title: "진료 확인에 응답하기", sentence: "네, 이쪽에서 기다리겠습니다." },
  {
    kind: "naming",
    title: "병원에서 사용하는 물건 찾기",
    prompt: "사진 속 물건의 이름을 말씀해 주세요.",
    hint: "몸의 열을 재는 물건이에요",
    answer: "체온계",
    image: "thermometer",
  },
  {
    kind: "spontaneous",
    title: "진료받는 상황 설명하기",
    prompt: "진료실에서의 장면을 설명해 주세요.",
    image: "hospital_exam",
  },
  hospitalChat,
];

/** 오늘의 학습: 테마와 달리 이야기가 이어지지 않고 유형별 문항이 섞여 나옵니다. */
const daily: SessionStep[] = [
  {
    kind: "listen",
    mode: "text",
    title: "알아듣기",
    prompt: "들려드린 문장에 맞는 답을 골라 주세요.",
    audioText: "오늘은 비가 와서 우산을 챙겼어요.",
    options: [{ label: "우산을 챙겼어요" }, { label: "모자를 챙겼어요" }],
    answer: 0,
  },
  {
    kind: "naming",
    title: "이름대기",
    prompt: "사진 속 물건의 이름을 말씀해 주세요.",
    hint: "비 올 때 쓰는 물건이에요",
    answer: "우산",
    image: "umbrella",
  },
  { kind: "repeat", title: "따라말하기", sentence: "오늘 날씨가 참 좋습니다." },
  {
    kind: "spontaneous",
    title: "자발화",
    prompt: "오늘 아침에 하신 일을 말씀해 주세요.",
    image: "morning",
  },
  {
    kind: "listen",
    mode: "image",
    title: "알아듣기",
    prompt: "들려드린 문장에 맞는 그림을 골라 주세요.",
    audioText: "시장에서 사과를 두 개 샀어요.",
    options: [
      { label: "배 세 개", image: "pear" },
      { label: "사과 두 개", image: "apple" },
    ],
    answer: 1,
  },
  {
    kind: "naming",
    title: "이름대기",
    prompt: "사진 속 물건의 이름을 말씀해 주세요.",
    hint: "빨갛고 아삭한 과일이에요",
    answer: "사과",
    image: "apple",
  },
  { kind: "repeat", title: "따라말하기", sentence: "가까운 곳에 잠시 다녀왔습니다." },
  {
    kind: "spontaneous",
    title: "자발화",
    prompt: "사진 속 장면을 설명해 주세요.",
    image: "market",
  },
  {
    kind: "chat",
    title: "AI 대화",
    minTurns: 4,
    maxTurns: 8,
    turns: [
      "오늘 하루는 어떻게 보내셨어요?",
      "그중에서 가장 기억에 남는 일은 무엇이었나요?",
      "함께한 분이 있으셨어요?",
      "내일은 어떤 하루를 보내고 싶으세요?",
      "요즘 자주 하시는 일이 있으세요?",
      "그 일은 어떤 점이 좋으세요?",
      "다음에 해보고 싶은 일이 있으신가요?",
      "오늘 이야기 나눠 주셔서 고맙습니다. 마무리해도 될까요?",
    ],
  },
];

export const SESSIONS: Record<SessionId, SessionStep[]> = { cafe, hospital, daily };

export const SESSION_TITLE: Record<SessionId, string> = {
  cafe: "카페에서 주문하기",
  hospital: "병원에서 진료받기",
  daily: "오늘의 학습",
};

export type Scores = {
  spontaneous: number; // 20점
  comprehension: number; // 10점
  repetition: number; // 10점
  naming: number; // 10점
};

export function calcAQ(s: Scores) {
  return Math.round(
    (s.spontaneous + s.comprehension / 20 + s.repetition / 10 + s.naming / 10) * 2 * 10,
  ) / 10;
}
