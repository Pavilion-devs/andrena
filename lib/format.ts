function numberFormatter(options: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options);
}

export function currency(value: number | null) {
  if (value == null) {
    return "N/A";
  }

  return numberFormatter({
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function compactNumber(value: number) {
  return numberFormatter({
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function fixed(value: number) {
  return numberFormatter({
    maximumFractionDigits: 1
  }).format(value);
}

export function formatDate(value: string | null, emptyLabel = "Never") {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
