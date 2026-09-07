import coffee from "@/assets/m/coffee.jpg";
import coffeecup from "@/assets/m/coffeecup.jpg";
import icedjuice from "@/assets/m/icedjuice.jpg";
import hospital from "@/assets/m/hospital.jpg";
import thermometer from "@/assets/m/thermometer.jpg";
import umbrella from "@/assets/m/umbrella.jpg";
import apple from "@/assets/m/apple.jpg";
import pear from "@/assets/m/pear.jpg";
import cafeOrder from "@/assets/m/cafe_order.jpg";
import cafeReceive from "@/assets/m/cafe_receive.jpg";
import hospitalReception from "@/assets/m/hospital_reception.jpg";
import hospitalExam from "@/assets/m/hospital_exam.jpg";
import soreThroat from "@/assets/m/sore_throat.jpg";
import hurtLeg from "@/assets/m/hurt_leg.jpg";
import morning from "@/assets/m/morning.jpg";
import market from "@/assets/m/market.jpg";

export const MEDIA = {
  coffee,
  coffeecup,
  icedjuice,
  hospital,
  thermometer,
  umbrella,
  apple,
  pear,
  cafe_order: cafeOrder,
  cafe_receive: cafeReceive,
  hospital_reception: hospitalReception,
  hospital_exam: hospitalExam,
  sore_throat: soreThroat,
  hurt_leg: hurtLeg,
  morning,
  market,
} as const;

export type MediaKey = keyof typeof MEDIA;

export const MEDIA_ALT: Record<MediaKey, string> = {
  coffee: "머그잔에 담긴 따뜻한 커피",
  coffeecup: "받침 위에 놓인 커피잔",
  icedjuice: "얼음이 든 차가운 주스 한 잔",
  hospital: "붉은 십자 표시가 있는 병원 건물",
  thermometer: "체온을 재는 디지털 체온계",
  umbrella: "펼쳐진 우산",
  apple: "빨간 사과 두 개",
  pear: "노란 배 세 개",
  cafe_order: "카페 계산대에서 주문하는 장면",
  cafe_receive: "카페에서 음료를 받는 장면",
  hospital_reception: "병원 접수 창구에서 접수하는 장면",
  hospital_exam: "진료실에서 의사와 이야기하는 장면",
  sore_throat: "목이 아파 목을 감싸 쥔 모습",
  hurt_leg: "다리를 다쳐 붕대를 감은 모습",
  morning: "아침 식사를 하는 장면",
  market: "시장에서 장을 보는 장면",
};
