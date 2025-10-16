import { toast } from "../components/atoms/Toaster";

function formatError(err: unknown): string {
  if (err == null) return "خطای ناشناخته رخ داد";
  if (err instanceof Error) return err.message || "خطا";
  if (typeof err === "string") return err;
  try {
    const s = JSON.stringify(err);
    if (s && s.length <= 200) return s;
  } catch {}
  return String(err);
}

export function notifySuccess(message: string) {
  try {
    toast("success", message);
  } catch {
    console.log(message);
  }
}

export function notifyInfo(message: string) {
  try {
    toast("info", message);
  } catch {
    console.log(message);
  }
}

export async function notifyError(message: unknown) {
  const msg = formatError(message);
  try {
    toast("error", msg);
  } catch {
    console.error(msg);
  }
  try {
    await window.api?.telemetry?.capture?.({ level: "error", message: msg });
  } catch {}
}
