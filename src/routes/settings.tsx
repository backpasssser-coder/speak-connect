import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, PageTitle, Screen } from "@/components/app/ui";
import { BottomNav } from "@/components/app/BottomNav";
import { ChevronRight } from "lucide-react";
import { signOut } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "설정 — 덕분이" },
      { name: "description", content: "알림, 연습 시간, 글자 크기와 계정 정보를 편하게 조정하세요." },
      { property: "og:title", content: "설정 — 덕분이" },
      { property: "og:description", content: "알림과 접근성 설정을 내 속도에 맞춰 바꿀 수 있어요." },
    ],
  }),
  component: SettingsPage,
});

function Toggle({ label, desc, defaultOn = true }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex-1">
        <p className="text-[16px] font-semibold">{label}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn(!on)}
        className={`h-8 w-14 shrink-0 rounded-full p-1 transition-colors ${on ? "bg-[image:var(--gradient-brand)]" : "bg-secondary"}`}
      >
        <span
          className={`block size-6 rounded-full bg-card shadow transition-transform ${on ? "translate-x-6" : ""}`}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const session = getSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("로그아웃에 실패했어요. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <Screen>
        <PageTitle title="설정" />

        <Card className="mb-4 flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-[20px] font-bold text-accent">
            덕
          </span>
          <div className="flex-1">
            <p className="text-[17px] font-bold">{session?.user.nickname ?? "게스트"} 님</p>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              {session ? `Google 계정으로 연결됨 (${session.user.email})` : "로그인이 필요해요"}
            </p>
          </div>
          <ChevronRight size={22} strokeWidth={2.2} aria-hidden className="text-muted-foreground" />
        </Card>

        <h2 className="mb-2 mt-6 text-[15px] font-bold text-muted-foreground">알림</h2>
        <Card className="divide-y divide-border py-1">
          <Toggle label="일반 알림" desc="오늘의 덕담, 주간 요약을 보내드려요." />
          <Toggle label="연습 알림" desc="정하신 시간에 부담 없이 알려드려요." />
          <div className="flex items-center justify-between py-3">
            <p className="text-[16px] font-semibold">연습 시간</p>
            <p className="text-[16px] text-accent">오전 10:00</p>
          </div>
        </Card>

        <h2 className="mb-2 mt-6 text-[15px] font-bold text-muted-foreground">접근성</h2>
        <Card className="divide-y divide-border py-1">
          <Toggle label="큰 글자" desc="본문 글자를 더 크게 보여드려요." defaultOn={false} />
          <Toggle label="음성 안내" desc="문항을 소리로 읽어드려요." />
          <Toggle label="느린 속도로 듣기" desc="듣기 문항을 천천히 들려드려요." defaultOn={false} />
        </Card>

        <h2 className="mb-2 mt-6 text-[15px] font-bold text-muted-foreground">계정</h2>
        <Card className="divide-y divide-border py-1">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-between py-3 text-left text-[16px] font-semibold"
          >
            로그아웃 <ChevronRight size={20} strokeWidth={2.2} aria-hidden />
          </button>
          <button className="flex w-full items-center justify-between py-3 text-left text-[16px] font-semibold text-destructive">
            회원 탈퇴 <ChevronRight size={20} strokeWidth={2.2} aria-hidden />
          </button>
        </Card>
      </Screen>
      <BottomNav />
    </>
  );
}
