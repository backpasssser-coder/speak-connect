import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Loading, Screen } from "@/components/app/ui";
import { signInWithGoogle } from "@/lib/auth";
import duck from "@/assets/duck.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "덕분이 — 매일 조금씩, 다시 말하는 연습" },
      {
        name: "description",
        content:
          "실어증 재활을 위한 생활 기반 발화 훈련 앱. 알아듣기·이름대기·따라말하기·자발화와 AI 대화로 매일 8분 연습해요.",
      },
      { property: "og:title", content: "덕분이 — 매일 조금씩, 다시 말하는 연습" },
      {
        property: "og:description",
        content: "생활 속 상황으로 연습하는 발화 재활 훈련, 덕분이와 함께해요.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const signIn = async () => {
    setLoading(true);
    setErrorDetail(null);
    try {
      const { isNewUser } = await signInWithGoogle();
      navigate({ to: isNewUser ? "/signup" : "/home" });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Google 로그인에 실패했어요.", { duration: 15000 });
      setErrorDetail(message);
      setLoading(false);
    }
  };

  return (
    <Screen className="flex flex-col justify-between pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src={duck}
          alt="덕분이 캐릭터"
          width={200}
          height={200}
          style={{ width: 200, height: 200 }}
          className="object-contain"
        />
        <h1 className="mt-4 text-[30px] font-bold tracking-tight text-foreground">덕분이</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
          오늘도 한 마디씩 편안하게.
          <br />
          매일 8분, 생활 속 말하기 연습을 함께해요.
        </p>
      </div>

      {loading ? (
        <Loading message="로그인하고 있어요" />
      ) : (
        <div className="space-y-3">
          <Btn full variant="outline" onClick={signIn} className="gap-3">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full bg-secondary text-[13px] font-bold text-accent"
            >
              G
            </span>
            Google 계정으로 시작하기
          </Btn>
          <p className="px-2 text-center text-[13px] leading-relaxed text-muted-foreground">
            로그인하시면 서비스 이용약관과 개인정보 처리방침에 동의하시게 됩니다.
          </p>
        </div>
      )}

      {errorDetail ? (
        <Card className="mt-3 border-destructive/40 bg-destructive/5 text-left">
          <p className="text-[13px] font-semibold text-destructive">로그인 실패 상세 (개발용)</p>
          <p className="mt-1 break-all text-[12px] text-muted-foreground">{errorDetail}</p>
        </Card>
      ) : null}
    </Screen>
  );
}
