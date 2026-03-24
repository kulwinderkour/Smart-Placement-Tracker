import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { Job } from '../../types'

export default function ManageJobs() {
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminApi.listJobs(1, 100)
  })

  // get the inner data
  const jobs = data?.data?.data || []

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string, is_active: boolean }) => 
      adminApi.updateJobStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] })
    }
  })

  const handleToggle = (jobId: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id: jobId, is_active: !currentStatus })
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>Manage Jobs</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>Review and manage available job listings.</p>
        </div>
        <div style={{ background: '#f3f4f6', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
          Total: {jobs.length}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Role & Company</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Location</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Created</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, textAlign: 'right' }}>Status / Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Loading jobs...</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No jobs found.</td>
              </tr>
            ) : (
              jobs.map((job: Job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{job.role_title}</div>
                    <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>{job.company_name}</div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#374151', fontSize: '14px' }}>
                    {job.location || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      background: '#f3f4f6', color: '#4b5563', 
                      padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 
                    }}>
                      {job.job_type ? job.job_type.replace('_', ' ') : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280', fontSize: '13px' }}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleToggle(job.id, job.is_active)}
                      disabled={toggleMutation.isPending}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: toggleMutation.isPending ? 'not-allowed' : 'pointer',
                        border: 'none',
                        background: job.is_active ? '#fee2e2' : '#dcfce7',
                        color: job.is_active ? '#dc2626' : '#166534',
                        transition: 'opacity 0.2s',
                        opacity: toggleMutation.isPending ? 0.6 : 1
                      }}
                    >
                      {job.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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
