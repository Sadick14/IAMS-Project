export function formatDateToDDMMYYYY(isoDate?: string | null): string {
  if (!isoDate) return "—";
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

export function formatDateToISO(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}
