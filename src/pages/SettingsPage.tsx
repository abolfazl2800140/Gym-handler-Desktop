import { useState } from "react";
import { notifyError, notifySuccess } from "../utils/notify";

export default function SettingsPage() {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleBackup() {
    setBusy("backup");
    try {
      if (!window.api?.maintenance?.backup) {
        notifyError("این قابلیت فقط در نسخه دسکتاپ فعال است");
        return;
      }
      const res = await window.api.maintenance.backup();
      if (res?.canceled) return;
      if (res?.ok === false) { notifyError(res?.error || "بکاپ ناموفق بود"); return; }
      notifySuccess("فایل پشتیبان با موفقیت ذخیره شد");
    } catch (e: any) {
      notifyError(e?.message || "بکاپ ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setBusy("restore");
    try {
      if (!window.api?.maintenance?.restore) {
        notifyError("این قابلیت فقط در نسخه دسکتاپ فعال است");
        return;
      }
      const res = await window.api.maintenance.restore();
      if (res?.canceled) return;
      if (res?.ok === false) { notifyError(res?.error || "بازیابی ناموفق بود"); return; }
      notifySuccess("بازیابی داده‌ها انجام شد؛ برنامه را ریفرش کنید");
    } catch (e: any) {
      notifyError(e?.message || "بازیابی ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function exportInvoicesCsv() {
    setBusy("export");
    try {
      if (!window.api?.finance?.exportInvoicesCsv) {
        notifyError("این قابلیت فقط در نسخه دسکتاپ فعال است");
        return;
      }
      const res = await window.api.finance.exportInvoicesCsv();
      if (res?.canceled) return;
      if (res?.ok === false) { notifyError(res?.error || "خروجی CSV ناموفق بود"); return; }
      notifySuccess("خروجی CSV با موفقیت ذخیره شد");
    } catch (e: any) {
      notifyError(e?.message || "خروجی CSV ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function exportInvoicesPdf() {
    setBusy("exportPdf");
    try {
      if (!window.api?.finance?.exportInvoicesPdf) {
        notifyError("این قابلیت فقط در نسخه دسکتاپ فعال است");
        return;
      }
      const res = await window.api.finance.exportInvoicesPdf();
      if (res?.canceled) return;
      if (res?.ok === false) { notifyError(res?.error || "خروجی PDF ناموفق بود"); return; }
      notifySuccess("فایل PDF با موفقیت ذخیره شد");
    } catch (e: any) {
      notifyError(e?.message || "خروجی PDF ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function exportInvoicesExcel() {
    setBusy("exportExcel");
    try {
      if (!window.api?.finance?.exportInvoicesExcel) {
        notifyError("این قابلیت فقط در نسخه دسکتاپ فعال است");
        return;
      }
      const res = await window.api.finance.exportInvoicesExcel();
      if (res?.canceled) return;
      if (res?.ok === false) { notifyError(res?.error || "خروجی Excel ناموفق بود"); return; }
      notifySuccess("فایل Excel با موفقیت ذخیره شد");
    } catch (e: any) {
      notifyError(e?.message || "خروجی Excel ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      {!window.api && (
        <div className="card p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M6.938 4h10.124c1.54 0 2.502 1.667 1.732 2.5L13.732 20c-.77.833-1.964.833-2.732 0L5.206 6.5C4.436 5.667 5.398 4 6.938 4z" />
            </svg>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              برای استفاده از تنظیمات پیشرفته، برنامه دسکتاپ را اجرا کنید: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded text-xs">npm run dev:electron</code>
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0l.26.988a1.5 1.5 0 001.104 1.07l1.003.257c1.133.29 1.454 1.733.564 2.555l-.737.7a1.5 1.5 0 000 2.186l.737.7c.89.822.569 2.265-.564 2.555l-1.003.257a1.5 1.5 0 00-1.104 1.07l-.26.988c-.3 1.14-1.603 1.14-1.902 0l-.26-.988a1.5 1.5 0 00-1.104-1.07l-1.003-.257c-1.133-.29-1.454-1.733-.564-2.555l.737-.7a1.5 1.5 0 000-2.186l-.737-.7c-.89-.822-.569-2.265.564-2.555l1.003-.257a1.5 1.5 0 001.104-1.07l.26-.988z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">تنظیمات برنامه</h2>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="text-heading-3">پشتیبان‌گیری و بازیابی</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            disabled={busy === "backup"}
            className="btn-primary"
          >
            ذخیره بکاپ
          </button>
          <button
            onClick={handleRestore}
            disabled={busy === "restore"}
            className="btn-secondary"
          >
            بازیابی از فایل
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">فایل بکاپ شامل تمام اعضا، حضور و غیاب، پرداخت‌ها و فاکتورهاست.</p>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="text-heading-3">خروجی گزارشات</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportInvoicesCsv}
            disabled={busy === "export"}
            className="btn-secondary"
          >
            خروجی CSV فاکتورها
          </button>
          <button
            onClick={exportInvoicesPdf}
            disabled={busy === "exportPdf"}
            className="btn-secondary"
          >
            خروجی PDF فاکتورها
          </button>
          <button
            onClick={exportInvoicesExcel}
            disabled={busy === "exportExcel"}
            className="btn-secondary"
            aria-label="خروجی Excel فاکتورها"
          >
            خروجی Excel فاکتورها
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">خروجی‌ها شامل CSV، PDF و Excel برای گزارش فاکتورها هستند.</p>
      </div>
    </section>
  );
}