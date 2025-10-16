# ساختار Atomic Design برای پروژه

این پروژه به ساختار Atomic Design بازطراحی شده است تا نگه‌داری و توسعه را ساده‌تر کند.

## ساختار پوشه‌ها

- `src/components/atoms`: اجزای پایه و ساده (مثل `Button`, `Modal`, `ErrorBoundary`).
- `src/components/molecules`: ترکیباتی از چند اتم (مثل `Dropdown`, `DateInput`, `LevelDropdown`, `PersianCalendar`).
- `src/components/organisms`: بخش‌های بزرگ‌تر صفحه شامل چند مولکول و اتم.
- `src/components/index.ts`: Barrel برای وارد کردن مونتاژ شده‌ی همه اجزا.

## نحوه استفاده

به جای وارد کردن اجزا از مسیرهای پراکنده، از Barrel استفاده کنید:

```ts
import { Button, Modal, Dropdown, DateInput } from './components';
```

همچنین در `App.tsx`، کامپوننت‌های Inline (مانند `Dropdown`, `DateInput`, `LevelDropdown`) حذف و به نسخه‌های مولکولی منتقل شده‌اند.

## استراتژی توسعه

- اجزا را تا حد ممکن کوچک و قابل استفاده مجدد نگه دارید.
- هر مولکول باید مسئولیت مشخصی داشته باشد و از اتم‌ها تشکیل شود.
- ارگانیسم‌ها بر اساس بخش‌های صفحه ساخته می‌شوند و از مولکول‌ها و اتم‌ها استفاده می‌کنند.

## گام‌های بعدی

- ایجاد ارگانیسم‌ها برای بخش‌های «مدیریت اعضا»، «حضور»، «مالی»، «گزارش».
- انتقال سایر کامپوننت‌های Inline در `App.tsx` به فایل‌های مستقل داخل `atoms/molecules/organisms`.
