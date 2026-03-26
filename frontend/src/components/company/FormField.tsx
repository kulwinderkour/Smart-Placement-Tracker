import type { FormField } from '../../config/companyFormSchema'
import Input from './form/Input'
import Select from './form/Select'
import Textarea from './form/Textarea'

interface FormFieldProps {
  field: FormField
  value: string
  onChange: (key: string, value: string) => void
}

export default function FormFieldComponent({ field, value, onChange }: FormFieldProps) {
  const handleChange = (nextValue: string) => onChange(field.key, nextValue)
  const inputType =
    field.type === 'number'
      ? 'number'
      : field.type === 'email' || field.type === 'tel' || field.type === 'url'
      ? field.type
      : 'text'

  return (
    <>
      {field.type === 'textarea' ? (
        <Textarea
          id={`field-${field.key}`}
          value={value}
          placeholder={field.placeholder}
          onChange={handleChange}
        />
      ) : field.type === 'select' ? (
        <Select
          id={`field-${field.key}`}
          value={value}
          placeholder={field.placeholder}
          options={field.options ?? []}
          onChange={handleChange}
        />
      ) : (
        <Input
          id={`field-${field.key}`}
          type={inputType}
          value={value}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={handleChange}
        />
      )}
    </>
  )
}
