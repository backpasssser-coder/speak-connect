import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, DuckSays, PageTitle, Screen } from "@/components/app/ui";
import { INTEREST_TAGS } from "@/lib/learning";
import { getCurrentFirebaseUid } from "@/lib/auth";
import { saveUserProfile } from "@/lib/firestore";
import { Camera, Check } from "lucide-react";
import duck from "@/assets/duck.png";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "회원가입 — 덕분이" },
      { name: "description", content: "이름, 성별, 나이, 취미와 관심사를 알려주시면 맞춤 학습을 준비해 드려요." },
      { property: "og:title", content: "회원가입 — 덕분이" },
      { property: "og:description", content: "관심사에 맞춘 생활 기반 말하기 연습을 준비해 드려요." },
    ],
  }),
  component: SignupPage,
});

const field =
  "w-full min-h-[52px] rounded-2xl border-2 border-border bg-card px-4 text-[17px] text-foreground placeholder:text-muted-foreground";

function SignupPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const toggle = (t: string) =>
    setTags((p) => {
      if (p.includes(t)) return p.filter((x) => x !== t);
      if (p.length >= 5) return p;
      return [...p, t];
    });


  return (
    <Screen>
      <PageTitle title="반가워요, 몇 가지만 알려주세요" desc="연습 내용을 편하게 맞춰 드릴게요." />
      <DuckSays>천천히 하셔도 괜찮아요. 나중에 설정에서 바꾸실 수 있어요.</DuckSays>

      <form
        className="mt-6 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            const uid = await getCurrentFirebaseUid();
            if (uid) {
              await saveUserProfile(uid, {
                name,
                gender: String(form.get("gender") ?? ""),
                birthDate: String(form.get("birth") ?? ""),
                hobby: String(form.get("hobby") ?? ""),
                interestTags: tags,
              });
            }
          } catch (err) {
            console.error(err);
            toast.error("프로필 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          }
          navigate({ to: "/survey" });
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <label
            htmlFor="photo"
            className="relative grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-border bg-card"
          >
            <img
              src={photo ?? duck}
              alt="프로필 사진 미리보기"
              className="size-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/60 py-1.5 text-[12px] font-medium text-primary-foreground">
              <Camera size={14} aria-hidden />
              사진
            </span>
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto(URL.createObjectURL(file));
            }}
          />
          <p className="text-[14px] text-muted-foreground">프로필 사진을 골라주세요. (선택)</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="block text-[15px] font-semibold">
            이름/닉네임
          </label>
          <input
            id="name"
            className={field}
            placeholder="예) 김덕분"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-2">

          <legend className="mb-2 text-[15px] font-semibold">성별</legend>
          <div className="flex gap-3">
            {["여성", "남성", "선택 안 함"].map((g) => (
              <label
                key={g}
                className="flex flex-1 min-h-[52px] cursor-pointer items-center justify-center rounded-2xl border-2 border-border bg-card text-[15px] font-medium has-[:checked]:border-primary has-[:checked]:bg-secondary"
              >
                <input type="radio" name="gender" value={g} className="sr-only" />
                {g}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="birth" className="block text-[15px] font-semibold">
            생년월일
          </label>
          <input id="birth" name="birth" type="date" className={field} required />
        </div>

        <div className="space-y-2">

          <label htmlFor="hobby" className="block text-[15px] font-semibold">
            취미
          </label>
          <input id="hobby" name="hobby" className={field} placeholder="예) 산책, 텃밭 가꾸기" />
        </div>

        <Card className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold">관심사 태그</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              5개를 골라주세요. ({tags.length}/5)
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((t) => {
              const on = tags.includes(t);
              const full = tags.length >= 5 && !on;
              return (
                <li key={t}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={full}
                    onClick={() => toggle(t)}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4 text-[15px] transition-colors ${
                      on
                        ? "border-primary bg-[image:var(--gradient-brand)] font-semibold text-primary-foreground"
                        : full
                          ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                          : "border-border bg-card text-foreground"
                    }`}
                  >
                    {on ? <Check size={16} strokeWidth={2.5} aria-hidden /> : null}
                    {t}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Btn full type="submit" disabled={tags.length !== 5}>
          다음으로
        </Btn>

      </form>
    </Screen>
  );
}
