import { useEffect, useMemo, useState } from "react";
import type { ReportsFilters } from "../molecules/FilterBar";

export default function PaymentsTableSection({ filters }: { filters?: ReportsFilters }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Array<any>>([]);
  const [members, setMembers] = useState<Array<any>>([]);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "amount" | "member">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function refresh() {
    const financeApi = (window as any).api?.finance;
    const membersApi = (window as any).api?.members;
    if (!financeApi) return;
    setLoading(true);
    try {
      const all = await financeApi.listPayments();
      // Build member name map from real members
      const ms = (await membersApi?.list?.()) || [];
      setMembers(ms);
      const nameMap = new Map<string, string>(ms.map((m: any) => [m.id, m.name]));
      // Only include valid payments: amount>0, memberId valid, createdAt valid
      const valid = (all || []).filter((p: any) => {
        const hasMember = typeof p.memberId === 'string' && p.memberId.length > 0;
        const amt = Number(p.amount);
        const hasAmount = !!amt && isFinite(amt) && amt > 0;
        const hasTime = typeof p.createdAt === 'number' && p.createdAt > 0;
        const memberExists = nameMap.has(p.memberId);
        return hasMember && hasAmount && hasTime && memberExists;
      });
      const withNames = valid.map((p: any) => ({
        ...p,
        memberName: nameMap.get(p.memberId)
      }));
      setPayments(withNames.sort((a: any, b: any) => b.createdAt - a.createdAt));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const unsub = (window as any).api?.events?.subscribeDataChanged?.((payload: any) => {
      if (payload?.scope === 'finance' || payload?.scope === 'cleanup') {
        refresh();
      }
    });
    const interval = setInterval(refresh, 20000);
    return () => { unsub?.(); clearInterval(interval); };
  }, []);

  const rows = useMemo(() => {
    let rs = payments.map((p: any) => {
      const m = members.find((mm) => mm.id === p.memberId);
      return {
        id: p.id,
        memberId: p.memberId,
        memberName: p.memberName ?? m?.name ?? p.memberId ?? "-",
        memberStatus: m?.status ?? "",
        memberLevel: m?.level ?? "",
        amount: Number(p.amount) || 0,
        createdAt: p.createdAt,
        note: p.note || "",
      };
    });

    // apply filters
    if (filters?.membershipStatus) rs = rs.filter((r) => (r.memberStatus || "") === filters.membershipStatus);
    if (filters?.level) rs = rs.filter((r) => (r.memberLevel || "") === filters.level);

    // search
    const qLower = q.trim().toLowerCase();
    if (qLower) {
      rs = rs.filter((r) =>
        r.memberName.toLowerCase().includes(qLower) ||
        String(r.amount).includes(qLower) ||
        (r.note || "").toLowerCase().includes(qLower)
      );
    }

    // sort
    rs.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "createdAt") return dir * ((a.createdAt || 0) - (b.createdAt || 0));
      if (sortBy === "amount") return dir * ((a.amount || 0) - (b.amount || 0));
      return dir * a.memberName.localeCompare(b.memberName, "fa");
    });
    return rs;
  }, [payments, members, filters, q, sortBy, sortDir]);

  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const header = ["عضو", "مبلغ", "تاریخ", "یادداشت"];
    const lines = rows.map((r) => [
      r.memberName,
      r.amount,
      new Date(r.createdAt).toLocaleString("fa-IR"),
      r.note?.replace?.(/\n/g, " ") || "",
    ]);
    const content = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_filtered.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-heading-3">جدول پرداخت‌ها</h3>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جستجو..." className="input w-40" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input">
            <option value="createdAt">تاریخ</option>
            <option value="amount">مبلغ</option>
            <option value="member">عضو</option>
          </select>
          <button className="btn-secondary" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>{sortDir === "asc" ? "صعودی" : "نزولی"}</button>
          <button className="btn-secondary" onClick={exportCsv} title="خروجی CSV فیلترشده">CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th className="p-2 text-right">عضو</th>
              <th className="p-2 text-right">مبلغ</th>
              <th className="p-2 text-right">تاریخ</th>
              <th className="p-2 text-right">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="p-2">{r.memberName}</td>
                <td className="p-2">{(r.amount?.toLocaleString?.("fa-IR") ?? r.amount) || 0}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString("fa-IR")}</td>
                <td className="p-2">
                  <span className="badge text-emerald-700 dark:text-emerald-300">ثبت‌شده</span>
                </td>
              </tr>
            ))}
            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-center text-white/60">پرداختی ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3 text-sm">
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</button>
        <span>
          {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} از {total}
        </span>
        <button className="btn-secondary" onClick={() => setPage((p) => p + 1)}>بعدی</button>
      </div>
    </div>
  );
}