/**
 * Utilities to enforce uppercase storage of patient free-text fields.
 */

// Fields that should NOT be uppercased (identifiers, structured values).
const SKIP_KEYS = new Set([
  "id",
  "email",
  "cpf",
  "phone",
  "mobile_phone",
  "landline_phone",
  "birth_date",
  "scheduled_date",
  "created_at",
  "updated_at",
  "current_stage",
  "reception_status",
  "dentist_status",
  "cap_status",
  "urgency",
  "urgency_level",
  "gender",
  "assigned_clinic_id",
  "assigned_class_id",
  "assigned_specialty_id",
  "kommo_lead_id",
]);

export const upper = (v: unknown): string =>
  typeof v === "string" ? v.toUpperCase() : (v as string);

/**
 * Returns a copy of a patient payload with all eligible string fields uppercased.
 * Arrays/objects/ids and structured fields are left untouched.
 */
export function uppercasePatientPayload<T extends Record<string, any>>(payload: T): T {
  const out: Record<string, any> = { ...payload };
  for (const key of Object.keys(out)) {
    if (SKIP_KEYS.has(key)) continue;
    if (typeof out[key] === "string") {
      out[key] = out[key].toUpperCase();
    }
  }
  return out as T;
}
