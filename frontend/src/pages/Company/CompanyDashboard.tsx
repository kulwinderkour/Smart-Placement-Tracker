import { motion } from 'framer-motion'
import { Building2, Globe, Mail, Phone, MapPin, Landmark, BadgeInfo } from 'lucide-react'
import { useCompanyProfileStore } from '../../store/companyProfileStore'
import { useAuthStore } from '../../store/authStore'

export default function CompanyDashboard() {
  const { profile } = useCompanyProfileStore()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-[#070b18] text-white font-['DM_Sans',sans-serif] relative overflow-hidden pb-24">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-700/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 pt-10 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-3">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Logo"
                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-indigo-300" />
              </div>
            )}
            <div>
              <h1 className="font-['Sora'] text-3xl font-extrabold tracking-tight">
                {profile?.company_name ?? 'Company Dashboard'}
              </h1>
              <p className="text-white/40 text-sm mt-1">
                Welcome back, <span className="text-indigo-400 font-semibold">{user?.email}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Profile summary card */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/[0.04] border border-white/10 rounded-[24px] backdrop-blur-xl p-8 mb-6 relative"
          >
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent rounded-t-[24px]" />
            <h2 className="font-['Sora'] font-bold text-sm text-white mb-4 uppercase tracking-widest text-white/50">Company Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.website && (
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Website" value={profile.website} />
              )}
              {profile.company_email && (
                <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={profile.company_email} />
              )}
              {profile.hr_contact_number && (
                <InfoItem icon={<Phone className="w-4 h-4" />} label="HR Contact" value={profile.hr_contact_number} />
              )}
              {profile.address && (
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Address" value={profile.address} />
              )}
              {profile.location && (
                <InfoItem icon={<Landmark className="w-4 h-4" />} label="Location" value={profile.location} />
              )}
              {profile.linkedin_url && (
                <InfoItem icon={<BadgeInfo className="w-4 h-4" />} label="LinkedIn" value={profile.linkedin_url} />
              )}
              {profile.founded_year && (
                <InfoItem icon={<Building2 className="w-4 h-4" />} label="Founded" value={String(profile.founded_year)} />
              )}
            </div>
            {profile.description && (
              <div className="mt-5 pt-5 border-t border-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">About</p>
                <p className="text-sm text-white/60 leading-relaxed">{profile.description}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Placeholder for upcoming features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/[0.03] border border-white/8 rounded-[24px] p-10 flex flex-col items-center justify-center text-center min-h-[240px]"
        >
          <Building2 className="w-12 h-12 text-white/10 mb-4" />
          <h3 className="font-['Sora'] font-bold text-xl text-white mb-2">Job Posting & Analytics</h3>
          <p className="text-sm text-white/35 max-w-xs">
            Post jobs, track applications, and view candidate analytics — coming in V2.
          </p>
        </motion.div>

      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-indigo-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-sm text-white/70 mt-0.5 break-all">{value}</p>
      </div>
    </div>
  )
}
