import { Building2, Globe, Mail, Phone, MapPin, Users, FileText, Landmark, BadgeInfo } from 'lucide-react'
import type { CompanyProfilePayload } from '../../types'
import { INDUSTRY_OPTIONS, COMPANY_SIZE_OPTIONS } from '../../config/companyFormSchema'

interface CompanyPreviewPanelProps {
  draft: Partial<CompanyProfilePayload>
}

function labelFor(options: { label: string; value: string }[], value?: string): string {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

export default function CompanyPreviewPanel({ draft }: CompanyPreviewPanelProps) {
  const hasAny = Object.values(draft).some((v) => v)
  const completionItems = [
    draft.company_name,
    draft.website,
    draft.company_email,
    draft.hr_contact_number,
    draft.address,
    draft.location,
    draft.description,
    draft.industry_type,
    draft.company_size,
    draft.founded_year,
    draft.logo_url,
  ]
  const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100)

  return (
    <div className="sticky top-8 flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/3 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/35">Live Company Preview</p>
          <p className="mt-1 text-xs text-white/45">Students will see this profile style before jobs go live.</p>
        </div>
        <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-200">
          {completion}% complete
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,20,48,0.98),rgba(11,10,26,0.98))] shadow-[0_24px_90px_rgba(5,4,18,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />

        <div className="relative border-b border-white/8 px-5 py-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/35">Company Public Card</p>
              <h3 className="mt-2 font-['Sora'] text-lg font-semibold text-white">Recruiter-facing brand preview</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/55">
              Ready for student discovery
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/8">
            {draft.logo_url ? (
              <img src={draft.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-white/20" />
            )}
          </div>
            <div className="min-w-0">
              <h3 className="truncate font-['Sora'] text-xl font-semibold text-white">
                {draft.company_name || <span className="font-normal italic text-white/25">Company Name</span>}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">
                  {labelFor(INDUSTRY_OPTIONS, draft.industry_type)}
                </span>
                {draft.company_size && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/65">
                    {labelFor(COMPANY_SIZE_OPTIONS, draft.company_size)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative space-y-5 p-5">
          {!hasAny && (
            <p className="py-4 text-center text-xs italic text-white/25">
              Fill in the form to see your preview here…
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {draft.website && <InfoRow icon={<Globe className="h-3.5 w-3.5" />} text={draft.website} />}
            {draft.company_email && <InfoRow icon={<Mail className="h-3.5 w-3.5" />} text={draft.company_email} />}
            {draft.hr_contact_number && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} text={draft.hr_contact_number} />}
            {draft.location && <InfoRow icon={<Landmark className="h-3.5 w-3.5" />} text={draft.location} />}
            {draft.linkedin_url && <InfoRow icon={<BadgeInfo className="h-3.5 w-3.5" />} text={draft.linkedin_url} />}
            {draft.founded_year && <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} text={`Founded ${draft.founded_year}`} />}
            {draft.company_size && (
              <InfoRow icon={<Users className="h-3.5 w-3.5" />} text={labelFor(COMPANY_SIZE_OPTIONS, draft.company_size)} />
            )}
          </div>

          {draft.address && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Head Office</p>
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} text={draft.address} multiline />
            </div>
          )}

          {draft.description && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Company Story</p>
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
                <p className="line-clamp-6 text-xs leading-relaxed text-white/60">{draft.description}</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-violet-400/12 bg-violet-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/80">What happens next</p>
            <p className="mt-2 text-xs leading-relaxed text-white/55">
              Once onboarding is submitted, your admin dashboard becomes active and you can create branded job postings visible to students.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  text,
  multiline = false,
}: {
  icon: React.ReactNode
  text: string
  multiline?: boolean
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/3 px-3 py-3 text-xs text-white/55">
      <span className="mt-0.5 shrink-0 text-violet-200/70">{icon}</span>
      <span className={multiline ? 'leading-relaxed' : 'truncate'}>{text}</span>
    </div>
  )
}
