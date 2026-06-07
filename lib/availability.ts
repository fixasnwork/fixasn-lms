export type AvailableEntity = {
  startDate: Date | string | null;
  endDate: Date | string | null;
};

export type PackageLike = AvailableEntity;
export type TryoutLike = AvailableEntity;

export type EntityStatus = "active" | "scheduled" | "expired" | "inactive";

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValidDate(d) ? d : null;
}

/**
 * Returns the scheduling status of an entity based on its startDate/endDate.
 *
 * | startDate | endDate   | Status    |
 * |-----------|-----------|-----------|
 * | null      | null      | Inactive  |
 * | set, >now | any       | Scheduled |
 * | set, ≤now | null      | Active    |
 * | set, ≤now | set, >now | Active    |
 * | set, ≤now | set, ≤now | Expired   |
 * | null      | set, >now | Scheduled |
 * | null      | set, ≤now | Expired   |
 */
export function getEntityStatus(entity: AvailableEntity, now: Date = new Date()): EntityStatus {
  const start = toDate(entity.startDate);
  const end = toDate(entity.endDate);

  const startValid = start !== null;
  const endValid = end !== null;

  // Both null → inactive
  if (!startValid && !endValid) return "inactive";

  // startDate set and > now → scheduled (regardless of endDate)
  if (startValid && start.getTime() > now.getTime()) return "scheduled";

  // startDate null, endDate set and > now → scheduled
  if (!startValid && endValid && end.getTime() > now.getTime()) return "scheduled";

  // From here: startDate is set and ≤ now, or startDate is null and endDate ≤ now

  // endDate set and ≤ now → expired
  if (endValid && end.getTime() <= now.getTime()) return "expired";

  // startDate ≤ now, endDate null or > now → active
  return "active";
}

/**
 * Returns `true` if an entity is currently **Active** (visible/open):
 *   - `startDate` is set and ≤ `now`
 *   - `endDate` is null (open indefinitely) OR `endDate` > `now`
 *
 * Purely date-driven. No isActive parameter.
 */
export function isAvailable(entity: AvailableEntity, now: Date = new Date()): boolean {
  return getEntityStatus(entity, now) === "active";
}

/** @deprecated Use `isAvailable` — semantics are now identical. */
export const isPackageAvailable = isAvailable;
