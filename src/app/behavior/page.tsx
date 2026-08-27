"use client";

import { useState, useEffect } from 'react';
import { Award, Star, AlertTriangle, Plus, Loader2, Search, Filter, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface BehaviorRecord {
  id: string;
  type: string;
  points: number;
  category: string;
  title: string;
  description: string | null;
  term: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    class?: { name: string };
  };
}

interface BehaviorSummary {
  totalMerit: number;
  totalDemerit: number;
  netPoints: number;
}

export default function BehaviorPage() {
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [summary, setSummary] = useState<BehaviorSummary>({ totalMerit: 0, totalDemerit: 0, netPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Award points form state
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [behaviorType, setBehaviorType] = useState('MERIT');
  const [points, setPoints] = useState(5);
  const [category, setCategory] = useState('ACADEMIC');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState('Term 1 - 2024');
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStudents();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/behavior');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching behavior records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !title || awarding) return;

    setAwarding(true);
    try {
      const res = await fetch('/api/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          type: behaviorType,
          points,
          category,
          title,
          description,
          term
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAwardForm(false);
        setSelectedStudent('');
        setTitle('');
        setDescription('');
        fetchRecords();
        alert(`${behaviorType === 'MERIT' ? 'Merit' : 'Demerit'} points awarded successfully!`);
      } else {
        alert(`Failed to award points: ${data.error}`);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      alert('Failed to award points');
    } finally {
      setAwarding(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'ALL' || record.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || record.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-[#0033A0]" />
            Behavioral Merit/Demerit System
          </h1>
          <p className="text-slate-500 mt-1">Award points for good behavior and track student conduct</p>
        </div>
        <button
          onClick={() => setShowAwardForm(true)}
          className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Award Points
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Merit Points</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">+{summary.totalMerit}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Demerit Points</span>
          </div>
          <p className="text-3xl font-black text-red-600">-{summary.totalDemerit}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Net Points</span>
          </div>
          <p className={`text-3xl font-black ${summary.netPoints >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {summary.netPoints >= 0 ? '+' : ''}{summary.netPoints}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or title..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Types</option>
              <option value="MERIT">Merit Only</option>
              <option value="DEMERIT">Demerit Only</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Categories</option>
              <option value="ACADEMIC">Academic</option>
              <option value="DISCIPLINE">Discipline</option>
              <option value="LEADERSHIP">Leadership</option>
              <option value="COMMUNITY">Community</option>
              <option value="SPORTS">Sports</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium">No behavior records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map(record => (
              <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      record.type === 'MERIT' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {record.type === 'MERIT' ? (
                        <Star className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{record.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          record.type === 'MERIT' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {record.type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {record.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        {record.student.firstName} {record.student.lastName}
                        {record.student.class?.name && ` (${record.student.class.name})`}
                      </p>
                      {record.description && (
                        <p className="text-sm text-slate-500">{record.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{record.term}</p>
                    </div>
                  </div>
                  <div className={`text-2xl font-black ${
                    record.type === 'MERIT' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {record.type === 'MERIT' ? '+' : ''}{record.points}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award Points Modal */}
      {showAwardForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Award Behavior Points</h3>
              <p className="text-xs text-slate-500 mt-1">Award merit or demerit points to a student</p>
            </div>
            
            <form onSubmit={handleAwardPoints} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student *</label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    value={behaviorType}
                    onChange={(e) => setBehaviorType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  >
                    <option value="MERIT">Merit (+)</option>
                    <option value="DEMERIT">Demerit (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Points *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="COMMUNITY">Community</option>
                  <option value="SPORTS">Sports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Perfect Attendance, Helping a Classmate"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Term *</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="Term 1 - 2024">Term 1 - 2024</option>
                  <option value="Term 2 - 2024">Term 2 - 2024</option>
                  <option value="Term 3 - 2024">Term 3 - 2024</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAwardForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudent || !title || awarding}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {awarding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Award className="w-5 h-5" />
                      Award Points
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
