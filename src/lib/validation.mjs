export class InputError extends Error {}
export function text(form, name, max = 500, required = false) {
  const value = String(form.get(name) ?? "").trim();
  if ((required && !value) || value.length > max) throw new InputError("Check " + name.replaceAll("_", " ") + "; it is required or too long.");
  return value;
}
export function integer(form, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const raw = text(form, name, 30, true);
  const value = Number(raw);
  if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) throw new InputError("Enter a valid " + name.replaceAll("_", " ") + ".");
  return value;
}
export function emailAddress(value, required = true) {
  if ((!value && required) || (value && (value.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)))) throw new InputError("Enter a valid email address.");
  return value || null;
}
export function kickoffTime(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) throw new InputError("Kickoff must include a time zone, for example 2026-09-13T14:25-06:00.");
  return new Date(value).toISOString();
}
