import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
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
    <div className="max-w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Application Tracker</h1>
        <p className="text-gray-500 mt-1">Drag cards to update your application status</p>
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
                            className={`bg-white rounded-lg border p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200 shadow-sm'
                            }`}
                          >
                            <p className="font-medium text-gray-900 text-sm">
                              {app.job?.role_title || 'Unknown Role'}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {app.job?.company_name || ''}
                            </p>
                            {app.next_step_date && (
                              <p className="text-blue-500 text-xs mt-2">
                                📅 {new Date(app.next_step_date).toLocaleDateString()}
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
    </div>
  )
}
