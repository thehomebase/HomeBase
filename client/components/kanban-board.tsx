import React from 'react';
import TaskCard from './TaskCard';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
}

interface Column {
  name: string;
  tasks: Task[];
}


const KanbanBoard: React.FC<{ statusColumns: Column[] }> = ({ statusColumns }) => {
  return (
    <div className="overflow-x-auto">
        <div className="md:flex gap-4 grid grid-cols-1 min-w-min pb-4">
          {statusColumns.map((column) => (
            <div key={column.name} className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold mb-2">{column.name}</h2>
              <div className="space-y-2">
                {column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
};

export default KanbanBoard;