import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { AudienceFilters } from "@/pages/communications/api";

interface AudienceFilterBuilderProps {
  value: AudienceFilters;
  onChange: (value: AudienceFilters) => void;
}

const BOOLEAN_FILTERS: { key: keyof AudienceFilters; label: string }[] = [
  { key: "isEmailVerified", label: "Email verified" },
  { key: "isAmbassador", label: "Ambassador" },
  { key: "isOrganizer", label: "Organizer" },
  { key: "isContributor", label: "Contributor" },
  { key: "isCollectionCreator", label: "Created at least one collection" },
  { key: "isReferred", label: "Referred by an ambassador" },
];

function toDateRange(after?: string, before?: string): DateRange | undefined {
  if (!after && !before) return undefined;
  return { from: after ? new Date(after) : undefined, to: before ? new Date(before) : undefined };
}

// Every dimension here is backed by a real column/derivation in
// email_recipient_directory (see kolekto-be-old/database/email_recipient_directory.sql).
// country/state/city are deliberately NOT offered — those columns don't
// exist anywhere in the live schema, so a filter for them couldn't return
// meaningful results.
export function AudienceFilterBuilder({ value, onChange }: AudienceFilterBuilderProps) {
  const registeredRange = useMemo(() => toDateRange(value.registeredAfter, value.registeredBefore), [value.registeredAfter, value.registeredBefore]);
  const lastLoginRange = useMemo(() => toDateRange(value.lastLoginAfter, value.lastLoginBefore), [value.lastLoginAfter, value.lastLoginBefore]);

  function set<K extends keyof AudienceFilters>(key: K, val: AudienceFilters[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        All conditions below are combined with AND. Country/state filtering isn't available — the platform doesn't currently collect that data.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {BOOLEAN_FILTERS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!value[f.key]}
              onCheckedChange={(checked) => set(f.key, (checked === true ? true : undefined) as never)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Registered</Label>
          <DatePickerWithRange
            date={registeredRange}
            setDate={(range) =>
              onChange({
                ...value,
                registeredAfter: range?.from ? range.from.toISOString() : undefined,
                registeredBefore: range?.to ? range.to.toISOString() : undefined,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Last login</Label>
          <DatePickerWithRange
            date={lastLoginRange}
            setDate={(range) =>
              onChange({
                ...value,
                lastLoginAfter: range?.from ? range.from.toISOString() : undefined,
                lastLoginBefore: range?.to ? range.to.toISOString() : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Minimum number of collections created</Label>
          <Input
            type="number"
            min={0}
            value={value.collectionsCountMin ?? ""}
            onChange={(e) => set("collectionsCountMin", e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="e.g. 1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Referral code</Label>
          <Input
            value={value.referralCode ?? ""}
            onChange={(e) => set("referralCode", e.target.value || undefined)}
            placeholder="Exact referral code"
          />
        </div>
      </div>
    </div>
  );
}
