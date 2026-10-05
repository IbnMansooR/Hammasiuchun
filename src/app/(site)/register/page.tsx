import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { registerAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import { telegramEnabled, telegramBot } from "@/lib/telegramAuth";
import TelegramLogin from "@/components/TelegramLogin";
import { IconBell, IconHeart, IconImage } from "@/components/Icons";

export const metadata = { title: "Roʻyxatdan oʻtish" };

const ERRORS: Record<string, string> = {
  email: "Email manzilini toʻgʻri kiriting.",
  password: "Parol kamida 8 belgidan iborat boʻlishi kerak.",
  exists: "Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning.",
  locked: "Juda koʻp urinish. Iltimos, birozdan soʻng qayta urinib koʻring.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;
  const bot = telegramEnabled ? telegramBot : null;

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>Roʻyxatdan oʻtish</h1>
        <p className="sub">Bir daqiqa. Hisob bilan:</p>
        <ul className="perks">
          <li><IconHeart aria-hidden="true" /><span>Sevimlilaringiz telefonda ham, kompyuterda ham turadi</span></li>
          <li><IconBell aria-hidden="true" /><span>Yangi shriftlar chiqqanda qoʻngʻiroqchada xabar</span></li>
          <li><IconImage aria-hidden="true" /><span>“Dizaynerlar” boʻlimiga oʻz ishingizni yuborish</span></li>
        </ul>
        {error && (
          <div className="alert alert-error" role="alert">
            {ERRORS[error] ?? "Xatolik yuz berdi."}
          </div>
        )}
        {(googleEnabled || bot) && (
          <>
            <div className="oneclick">
              {googleEnabled && <a href="/api/auth/google" className="btn btn-lg btn-block">Google orqali davom etish</a>}
              {bot && <TelegramLogin bot={bot} />}
            </div>
            <div className="divider">yoki email bilan</div>
          </>
        )}
        <form action={registerAction}>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" name="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Parol</label>
            <input id="reg-password" type="password" name="password" autoComplete="new-password" required minLength={8} />
          </div>
          <SubmitButton pendingLabel="Yuborilmoqda…" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>Roʻyxatdan oʻtish</SubmitButton>
        </form>
        <p className="auth-foot">
          Hisobingiz bormi? <Link href="/login">Kirish</Link>
          {smsEnabled && (
            <>
              <br />
              Telefon raqami orqali ham <Link href="/login">shu yerdan</Link> kirishingiz mumkin.
            </>
          )}
        </p>
        <p className="auth-fine">Shriftlarni yuklab olish hisobsiz ham bepul.</p>
      </div>
    </div>
  );
}
