import { MonitorPlay, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function EntranceExamPage() {
  const exams = [
    { title: '2024 Grade 7 Entrance Exam', date: 'Oct 15, 2024', time: '09:00 AM', duration: '120 mins', registered: 145, status: 'Upcoming' },
    { title: '2024 Grade 10 Entrance Exam', date: 'Oct 16, 2024', time: '10:00 AM', duration: '150 mins', registered: 89, status: 'Upcoming' },
    { title: '2023 Late Admissions Test', date: 'Aug 05, 2023', time: '09:00 AM', duration: '90 mins', registered: 34, status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entrance Exam (CBT)</h1>
          <p className="text-slate-500">Manage computer-based entrance examinations for new admissions.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
          + Create New Exam
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                exam.status === 'Upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {exam.status}
              </span>
            </div>
            
            <h3 className="font-bold text-slate-900 mb-2">{exam.title}</h3>
            
            <div className="space-y-2 mt-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{exam.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{exam.time} ({exam.duration})</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span>{exam.registered} Candidates Registered</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-lg text-sm font-medium transition-colors">
                Edit Details
              </button>
              <button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Manage Questions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
