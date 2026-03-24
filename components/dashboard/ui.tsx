import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardPageIntro({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-1 font-geist text-xs uppercase tracking-widest text-neutral-500">
          {eyebrow}
        </p>
        <h1 className="font-geist text-3xl font-medium tracking-tighter sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 font-geist text-neutral-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}

export function DashboardPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200", className)}>
      {children}
    </div>
  );
}

export function DashboardPanelHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 className="font-geist text-lg font-medium tracking-tighter">{title}</h2>
        {description ? <p className="font-geist text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DashboardStatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <DashboardPanel>
      <p className="font-geist text-xs uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-2 font-geist text-3xl font-medium tracking-tighter">{value}</p>
      {sub ? <p className="mt-1 font-geist text-sm text-neutral-500">{sub}</p> : null}
    </DashboardPanel>
  );
}

export function DashboardAlert({
  tone,
  children,
  className
}: {
  tone: "error" | "success" | "dark" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "error"
      ? "bg-red-50 text-red-700 ring-red-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
      : tone === "success"
        ? "bg-green-50 text-green-700 ring-green-200"
        : "bg-neutral-900 text-white/70 ring-neutral-200";

  return (
    <div className={cx("rounded-xl px-4 py-3 text-sm ring-1", toneClass, className)}>
      {children}
    </div>
  );
}

export function PrimaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }
) {
  const { className, children, type = "button", ...rest } = props;

  return (
    <button
      type={type}
      className={cx(
        "cursor-pointer overflow-hidden whitespace-nowrap rounded-full border-0 bg-gradient-to-b from-neutral-700 to-neutral-900 px-6 py-3 text-center font-geist text-sm leading-none text-white shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] transition-all duration-150 hover:opacity-85 disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }
) {
  const { className, children, type = "button", ...rest } = props;

  return (
    <button
      type={type}
      className={cx(
        "rounded-full border border-neutral-200 bg-white px-6 py-3 font-geist text-sm font-medium text-neutral-900 transition hover:bg-neutral-100",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DashboardBadge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber";
  className?: string;
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : tone === "green"
        ? "bg-green-50 text-green-700 ring-green-200"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-neutral-100 text-neutral-600 ring-neutral-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-geist text-xs ring-1",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

export function DashboardLoadingHeader({
  showSubline = true
}: {
  showSubline?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
      {showSubline ? <div className="h-4 w-96 animate-pulse rounded-lg bg-neutral-100" /> : null}
    </div>
  );
}

export function DashboardLoadingGrid({
  count,
  className,
  itemClassName
}: {
  count: number;
  className: string;
  itemClassName: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={itemClassName} />
      ))}
    </div>
  );
}

export function DashboardMetric({
  label,
  value,
  className
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-geist text-xs uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 font-geist font-medium">{value}</p>
    </div>
  );
}

export function DashboardPillButton({
  active,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={cx(
        "rounded-full px-3 py-1.5 font-geist text-xs transition",
        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
        className
      )}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}

export function DashboardField({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-geist text-sm text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export function DashboardInput(props: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 font-geist text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300",
        props.className
      )}
    />
  );
}

export function DashboardSelect(props: SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 font-geist text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300",
        props.className
      )}
    />
  );
}

export function DashboardTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }
) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-28 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 font-geist text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300",
        props.className
      )}
    />
  );
}
