import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { applicationsApi } from '../../api/applications'
import type { Application } from '../../types'

const COLUMNS = [
  { id: 'applied',          label: 'Applied',          color: 'blue'   },
  { id: 'online_test',      label: 'Online Test',       color: 'yellow' },
  { id: 'technical_round',  label: 'Technical Round',   color: 'purple' },
  { id: 'hr_round',         label: 'HR Round',          color: 'purple' },
  { id: 'offer',            label: 'Offer 🎉',          color: 'green'  },
  { id: 'rejected',         label: 'Rejected',          color: 'red'    },
] as const

export default function Tracker() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      applicationsApi.update(id, { status: status as Application['status'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-applications'] }),
  })

  const applications: Application[] = data?.data || []

  const getColumnApps = (status: string) =>
    applications.filter(app => app.status === status)

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    updateMutation.mutate({ id: draggableId, status: destination.droppableId })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  )

  return (
    <>
      <div className="max-w-full px-4 py-8">
        <div className="mb-8" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Tracker</h1>
            <p className="text-gray-600 mt-1">Track your job application progress</p>
            <p className="text-gray-500 mt-1">Drag cards to update your application status</p>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {getColumnApps(col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {getColumnApps(col.id).map((app, index) => (
                      <Draggable key={app.id} draggableId={app.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 mb-2 rounded-lg shadow-sm border transition-all cursor-move ${
                              snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-gray-900 flex-1">{app.job?.role_title || 'Unknown Role'}</h4>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                app.priority === 'high' ? 'bg-red-100 text-red-700' :
                                app.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {app.priority}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{app.job?.company_name || ''}</p>
                            <p className="text-xs text-gray-500 mb-2">{app.job?.location || ''}</p>
                            {app.next_step_date && (
                              <p className="text-xs text-gray-400">
                                Applied: {new Date(app.next_step_date).toLocaleDateString()}
                              </p>
                            )}
                            {app.offer_ctc && (
                              <p className="text-green-600 text-xs mt-1 font-medium">
                                ₹{app.offer_ctc.toLocaleString()}/mo
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  )
}
