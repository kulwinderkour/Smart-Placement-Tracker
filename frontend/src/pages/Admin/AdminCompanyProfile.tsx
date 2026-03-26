import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Save,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  CheckCircle,
  Users,
  Calendar,
} from "lucide-react";
import { companyApi } from "../../api/company";
import { useCompanyProfileStore } from "../../store/companyProfileStore";
import AdminLayout from "../../components/admin/AdminLayout";

/* ── Shared Tailwind classes for inputs ── */
const INPUT = `w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all theme-input`;
const LABEL = "block text-sm font-medium mb-1.5";

/* ── Section heading — declared outside component to avoid re-creation ── */
function SectionHead({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <h2
      className="text-lg font-bold mb-5 flex items-center gap-2"
      style={{ color: "var(--color-text)" }}
    >
      <Icon size={17} style={{ color: "var(--color-accent)" }} />
      {title}
    </h2>
  );
}

/* ── Shared inline style for inputs (CSS-variable-aware) ── */
const inputStyle: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
};

export default function AdminCompanyProfile() {
  const { profile, setProfile } = useCompanyProfileStore();

  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    hr_contact_number: "",
    website: "",
    location: "",
    address: "",
    description: "",
    industry_type: "",
    company_size: "",
    logo_url: "",
    linkedin_url: "",
    founded_year: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name ?? "",
        company_email: profile.company_email ?? "",
        hr_contact_number: profile.hr_contact_number ?? "",
        website: profile.website ?? "",
        location: profile.location ?? "",
        address: profile.address ?? "",
        description: profile.description ?? "",
        industry_type: profile.industry_type ?? "",
        company_size: profile.company_size ?? "",
        logo_url: profile.logo_url ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        founded_year: profile.founded_year ? String(profile.founded_year) : "",
      });
    }
  }, [profile]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        founded_year: form.founded_year ? Number(form.founded_year) : undefined,
        submit: false,
      };
      return profile
        ? companyApi.updateProfile(payload)
        : companyApi.createProfile({
            ...payload,
            company_name: form.company_name,
            submit: false,
          });
    },
    onSuccess: (res) => {
      setProfile(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  /* Focus / blur border handlers */
  const focusStyle = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-accent)";
    (e.target as HTMLElement).style.boxShadow =
      "0 0 0 2px var(--color-accent-bg)";
  };
  const blurStyle = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-border)";
    (e.target as HTMLElement).style.boxShadow = "";
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto page-enter">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Company Profile
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Manage your company information
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "#7c3aed", color: "#ffffff" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#6d28d9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#7c3aed";
            }}
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {mutation.isPending ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* ── Error banner ── */}
        {mutation.isError && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.28)",
              color: "var(--color-danger)",
            }}
          >
            Failed to save. Please try again.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* ════════════════════════════════
              Form column
          ════════════════════════════════ */}
          <div className="space-y-5">
            {/* ── Basic Info ── */}
            <div className="glass-card p-6">
              <SectionHead icon={Building2} title="Basic Information" />
              <div className="grid grid-cols-2 gap-4">
                {/* Company Name */}
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Company Name *
                  </span>
                  <input
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    placeholder="e.g. Microsoft"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>

                {/* Industry */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Industry
                  </span>
                  <input
                    value={form.industry_type}
                    onChange={(e) => set("industry_type", e.target.value)}
                    placeholder="e.g. Technology"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>

                {/* Company Size */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Company Size
                  </span>
                  <input
                    value={form.company_size}
                    onChange={(e) => set("company_size", e.target.value)}
                    placeholder="e.g. 10000+"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>

                {/* Founded Year */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Founded Year
                  </span>
                  <input
                    type="number"
                    value={form.founded_year}
                    onChange={(e) => set("founded_year", e.target.value)}
                    placeholder="e.g. 1975"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>

                {/* Location */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Location
                  </span>
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <input
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="e.g. Redmond, WA"
                      className={INPUT + " pl-8"}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </label>

                {/* Address */}
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Address
                  </span>
                  <input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Full address"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>

                {/* About */}
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    About
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={4}
                    placeholder="Tell students about your company…"
                    className={INPUT}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>
              </div>
            </div>

            {/* ── Contact Details ── */}
            <div className="glass-card p-6">
              <SectionHead icon={Mail} title="Contact Details" />
              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Email
                  </span>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <input
                      value={form.company_email}
                      onChange={(e) => set("company_email", e.target.value)}
                      type="email"
                      placeholder="hr@company.com"
                      className={INPUT + " pl-8"}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </label>

                {/* Phone */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Phone
                  </span>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <input
                      value={form.hr_contact_number}
                      onChange={(e) => set("hr_contact_number", e.target.value)}
                      placeholder="+1 425 882-8080"
                      className={INPUT + " pl-8"}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* ── Online Presence ── */}
            <div className="glass-card p-6">
              <SectionHead icon={Globe} title="Online Presence" />
              <div className="grid grid-cols-2 gap-4">
                {/* Website */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Website
                  </span>
                  <div className="relative">
                    <Globe
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <input
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                      type="url"
                      placeholder="https://yourcompany.com"
                      className={INPUT + " pl-8"}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </label>

                {/* LinkedIn */}
                <label className="flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    LinkedIn
                  </span>
                  <div className="relative">
                    <Linkedin
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <input
                      value={form.linkedin_url}
                      onChange={(e) => set("linkedin_url", e.target.value)}
                      placeholder="linkedin.com/company/..."
                      className={INPUT + " pl-8"}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </label>

                {/* Logo URL */}
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span
                    className={LABEL}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Logo URL
                  </span>
                  <input
                    value={form.logo_url}
                    onChange={(e) => set("logo_url", e.target.value)}
                    placeholder="https://cdn.example.com/logo.png"
                    className={INPUT}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </label>
              </div>
            </div>

            {/* ── Save button (bottom, matches reference) ── */}
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {mutation.isPending
                ? "Saving…"
                : saved
                  ? "Saved!"
                  : "Save Changes"}
            </button>
          </div>

          {/* ════════════════════════════════
              Live Preview column
          ════════════════════════════════ */}
          <div>
            <div className="sticky top-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                Preview
              </p>

              <div className="glass-card p-5">
                {/* Logo + name row */}
                <div className="flex items-center gap-3 mb-4">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Logo"
                      className="w-14 h-14 rounded-xl object-contain"
                      style={{ border: "1px solid var(--color-border)" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-accent-bg)" }}
                    >
                      <Building2
                        size={24}
                        style={{ color: "var(--color-accent)" }}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3
                      className="font-bold text-base leading-tight truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {form.company_name || "Company Name"}
                    </h3>
                    {form.industry_type && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {form.industry_type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {form.description && (
                  <p
                    className="text-xs leading-relaxed line-clamp-3 mb-4"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {form.description}
                  </p>
                )}

                {/* Meta list */}
                <div
                  className="space-y-2 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {form.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="shrink-0" />
                      {form.location}
                    </div>
                  )}
                  {form.company_size && (
                    <div className="flex items-center gap-2">
                      <Users size={12} className="shrink-0" />
                      {form.company_size} employees
                    </div>
                  )}
                  {form.founded_year && (
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="shrink-0" />
                      Founded {form.founded_year}
                    </div>
                  )}
                  {form.company_email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{form.company_email}</span>
                    </div>
                  )}
                  {form.hr_contact_number && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="shrink-0" />
                      {form.hr_contact_number}
                    </div>
                  )}
                  {form.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="shrink-0" />
                      <a
                        href={form.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {form.website}
                      </a>
                    </div>
                  )}
                  {form.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin size={12} className="shrink-0" />
                      <a
                        href={
                          form.linkedin_url.startsWith("http")
                            ? form.linkedin_url
                            : `https://${form.linkedin_url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-accent)" }}
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>

                {/* Empty state */}
                {!form.company_name && !form.description && (
                  <p
                    className="text-xs text-center py-4"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Fill in the form to see a live preview
                  </p>
                )}
              </div>

              {/* Saved confirmation */}
              {saved && (
                <div
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold"
                  style={{ color: "#16a34a" }}
                >
                  <CheckCircle size={12} /> Changes saved successfully
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
