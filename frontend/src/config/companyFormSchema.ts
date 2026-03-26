/**
 * Dynamic form schema for the Company Profile Setup wizard.
 * All form structure is driven from this config — no hardcoded fields in the UI.
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'textarea'
  | 'select'
  | 'file'

export interface FieldOption {
  label: string
  value: string
}

export interface FormField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
  hint?: string
  min?: number
  max?: number
  step?: number
}

export interface FormStep {
  id: string
  label: string
  description: string
  icon: string        // lucide icon name — resolved at render time
  fields: FormField[]
}

export const INDUSTRY_OPTIONS: FieldOption[] = [
  { label: 'Information Technology', value: 'information_technology' },
  { label: 'Software / SaaS', value: 'software_saas' },
  { label: 'E-Commerce', value: 'ecommerce' },
  { label: 'Finance / FinTech', value: 'fintech' },
  { label: 'Healthcare / MedTech', value: 'healthtech' },
  { label: 'EdTech', value: 'edtech' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'FMCG / Retail', value: 'fmcg_retail' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Media & Entertainment', value: 'media_entertainment' },
  { label: 'Government / PSU', value: 'government' },
  { label: 'Other', value: 'other' },
]

export const COMPANY_SIZE_OPTIONS: FieldOption[] = [
  { label: '1 – 10 employees', value: '1-10' },
  { label: '11 – 50 employees', value: '11-50' },
  { label: '51 – 200 employees', value: '51-200' },
  { label: '201 – 500 employees', value: '201-500' },
  { label: '501 – 1000 employees', value: '501-1000' },
  { label: '1001 – 5000 employees', value: '1001-5000' },
  { label: '5000+ employees', value: '5000+' },
]

export const COMPANY_FORM_STEPS: FormStep[] = [
  {
    id: 'basic',
    label: 'Company Identity',
    description: 'Introduce your organization to students',
    icon: 'Building2',
    fields: [
      {
        key: 'company_name',
        label: 'Company Name',
        type: 'text',
        placeholder: 'e.g. Acme Technologies Pvt. Ltd.',
        required: true,
      },
      {
        key: 'website',
        label: 'Company Website',
        type: 'url',
        placeholder: 'https://www.yourcompany.com',
        required: true,
      },
      {
        key: 'industry_type',
        label: 'Industry',
        type: 'select',
        placeholder: 'Select industry',
        options: INDUSTRY_OPTIONS,
        required: true,
      },
      {
        key: 'company_size',
        label: 'Company Size',
        type: 'select',
        placeholder: 'Select team size',
        options: COMPANY_SIZE_OPTIONS,
        required: true,
      },
      {
        key: 'founded_year',
        label: 'Founded Year',
        type: 'number',
        placeholder: 'e.g. 2010',
        min: 1800,
        max: new Date().getFullYear(),
        required: true,
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact & Location',
    description: 'Help candidates and campuses reach you',
    icon: 'Phone',
    fields: [
      {
        key: 'company_email',
        label: 'Company Email',
        type: 'email',
        placeholder: 'hr@yourcompany.com',
        required: true,
      },
      {
        key: 'hr_contact_number',
        label: 'HR Contact Number',
        type: 'tel',
        placeholder: '+91 98765 43210',
        required: true,
      },
      {
        key: 'address',
        label: 'Company Address',
        type: 'textarea',
        placeholder: 'Building, Street, City, State, PIN',
        hint: 'Include city and state for better visibility to students.',
        required: true,
      },
      {
        key: 'location',
        label: 'Location / City',
        type: 'text',
        placeholder: 'e.g. Bengaluru, Karnataka',
        required: true,
      },
      {
        key: 'linkedin_url',
        label: 'LinkedIn URL',
        type: 'url',
        placeholder: 'https://linkedin.com/company/your-company',
      },
    ],
  },
  {
    id: 'details',
    label: 'Company Story',
    description: 'Show what your company stands for',
    icon: 'FileText',
    fields: [
      {
        key: 'description',
        label: 'Company Description',
        type: 'textarea',
        placeholder:
          'Tell students about your mission, products, work culture, and what makes you unique…',
        hint: 'A compelling description attracts better candidates.',
        required: true,
      },
    ],
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Complete your public-facing company identity',
    icon: 'ImagePlus',
    fields: [
      {
        key: 'logo_url',
        label: 'Company Logo Upload',
        type: 'file',
        hint: 'PNG, JPG or SVG. Max 2 MB. Square or landscape works best.',
      },
    ],
  },
]
