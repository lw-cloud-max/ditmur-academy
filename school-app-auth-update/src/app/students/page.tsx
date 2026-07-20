import { Search, Plus, Filter, MoreVertical } from 'lucide-react';

const students = [
  { id: 'STU-2023-001', name: 'Alice Johnson', grade: 'Grade 10', status: 'Active', gpa: '3.8' },
  { id: 'STU-2023-002', name: 'Bob Smith', grade: 'Grade 9', status: 'Active', gpa: '3.2' },
  { id: 'STU-2023-003', name: 'Charlie Brown', grade: 'Grade 11', status: 'Active', gpa: '3.5' },
  { id: 'STU-2023-004', name: 'Diana Prince', grade: 'Grade 12', status: 'Active', gpa: '4.0' },
  { id: 'STU-2023-005', name: 'Evan Wright', grade: 'Grade 10', status: 'Inactive', gpa: '2.9' },
];

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500">Manage student records and information.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Student</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search students by name or ID..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class/Grade</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">GPA</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.grade}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.gpa}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <button className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
