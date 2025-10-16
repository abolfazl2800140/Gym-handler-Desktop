import { useEffect, useRef, useState } from "react";
import { detectIntent, answerForIntent } from "../../chat/intent";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const api = window.api;
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const memory = (await api?.chat?.listMemory?.()) || [];
      const { intent, memoryMatch } = detectIntent(text, memory);
      // Gather context
      const members = (await api?.members?.list?.()) || [];
      const attendanceAll = (await api?.attendance?.listAll?.()) || [];
      const payments = (await api?.finance?.listInvoices?.()) || []; // invoices contains amount & createdAt
      let reply = "";
      if (memoryMatch?.answer) {
        reply = memoryMatch.answer || "";
      } else if (intent) {
        reply = answerForIntent(intent, { members, attendanceAll, payments });
      } else {
        // Fallback to internal LLM if available
        try {
          const conversation = [
            ...messages.map((m) => ({
              role:
                m.role === "user" ? ("user" as const) : ("assistant" as const),
              content: m.text,
            })),
            { role: "user" as const, content: text },
          ];
          const sys = `شما دستیار هوشمند برای مدیریت باشگاه هستید. با لحن کوتاه و دقیق پاسخ بده.
سؤالات مربوط به اعضا، حضور و غیاب و پرداخت‌ها را با توجه به داده‌های زیر پاسخ بده. اگر پاسخ قطعی نیست، بهترین حدس را ارائه بده و شفاف بگو که مطمئن نیستی.
- اعضا: ${members.length} نفر.
- تعداد رکوردهای حضور و غیاب: ${attendanceAll.length}.
- تعداد فاکتورها: ${payments.length}.
اگر سؤال درباره آمار یا درآمد است، از این داده‌ها استفاده کن.`;
          const lmRes = await api?.chat?.complete?.({
            messages: [
              { role: "system" as const, content: sys },
              ...conversation,
            ],
            maxTokens: 256,
            temperature: 0.2,
          });
          if (lmRes?.ok && lmRes?.text) {
            reply = lmRes.text;
          } else {
            reply = "پرسش شما مشخص نیست. می‌توانید الگوی پاسخ را اضافه کنید.";
          }
        } catch {
          reply = "پرسش شما مشخص نیست. می‌توانید الگوی پاسخ را اضافه کنید.";
        }
      }
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      await api?.chat?.addLog?.({
        user: "manager",
        message: text,
        reply,
        memoryId: memoryMatch?.id || null,
      });
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "خطایی رخ داد." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        aria-label="Chat"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg w-12 h-12 flex items-center justify-center"
      >
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4 0H7a2 2 0 01-2-2V8a2 2 0 012-2h6a2 2 0 012 2v10z"
          />
        </svg>
      </button>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-w-[88vw] rounded-lg border border-white/10 bg-white/90 dark:bg-gray-900/90 shadow-xl backdrop-blur">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-medium">دستیار هوشمند</div>
            <button
              className="text-sm opacity-70 hover:opacity-100"
              onClick={() => setOpen(false)}
            >
              بستن
            </button>
          </div>
          <div
            ref={listRef}
            className="p-3 max-h-64 overflow-auto space-y-2 text-sm"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "inline-block px-2 py-1 rounded-lg bg-emerald-500 text-white"
                      : "inline-block px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-600 dark:text-gray-400">
                پرسش‌هایی مانند «چه کسی امروز غایب است؟» را امتحان کنید.
              </div>
            )}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 text-sm disabled:opacity-50"
            >
              ارسال
            </button>
          </div>
        </div>
      )}
    </>
  );
}
