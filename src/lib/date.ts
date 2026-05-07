export function formatDateLabel(value?: string) {
  if (!value) {
    return "날짜 없음";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}
