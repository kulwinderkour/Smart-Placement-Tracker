import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { Student } from '../../types'

export default function ManageStudents() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => adminApi.listStudents(1, 100)
  })

  // get the inner data
  const students = data?.data?.data || []

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>Manage Students</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>View all registered students on the platform.</p>
        </div>
        <div style={{ background: '#f3f4f6', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
          Total: {students.length}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Education</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Grad Year</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>ATS Score</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Loading students...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No students found.</td>
              </tr>
            ) : (
              students.map((student: Student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{student.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{student.phone || 'No phone'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#374151', fontSize: '14px' }}>{student.college || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{student.branch}</div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#374151', fontSize: '14px' }}>
                    {student.graduation_year || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {student.ats_score ? (
                      <span style={{ 
                        background: student.ats_score > 75 ? '#dcfce7' : student.ats_score > 50 ? '#fef9c3' : '#fee2e2',
                        color: student.ats_score > 75 ? '#166534' : student.ats_score > 50 ? '#854d0e' : '#991b1b',
                        padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 
                      }}>
                        {student.ats_score}%
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>Unscored</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280', fontSize: '13px' }}>
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
