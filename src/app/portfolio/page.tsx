"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FolderOpen, Plus, Search, Filter, FileText, Image, Video, Music, 
  Archive, Star, Trash2, Eye, Download, Loader2, X, Upload
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  term: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    class?: { name: string };
  };
}

export default function PortfolioPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const userId = session?.user?.id || '';
  const isStudent = userRole === 'STUDENT';

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Add portfolio modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ACADEMIC');
  const [fileUrl, setFileUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [term, setTerm] = useState('Term 1 - 2024');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchPortfolios();
    if (!isStudent) {
      fetchStudents();
    }
  }, []);

  const fetchPortfolios = async () => {
    try {
      const url = isStudent ? `/api/portfolio?studentId=${userId}` : '/api/portfolio';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPortfolios(data.data);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
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

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !title || adding) return;

    setAdding(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          title,
          description,
          category,
          fileUrl: fileUrl || null,
          imageUrl: imageUrl || null,
          isPublic,
          term
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setSelectedStudent('');
        setTitle('');
        setDescription('');
        setFileUrl('');
        setImageUrl('');
        fetchPortfolios();
        alert('Portfolio item added successfully!');
      } else {
        alert(`Failed to add portfolio: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding portfolio:', error);
      alert('Failed to add portfolio');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPortfolios();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ACADEMIC': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'ARTS': return <Image className="w-5 h-5 text-purple-600" />;
      case 'SPORTS': return <Star className="w-5 h-5 text-orange-600" />;
      case 'LEADERSHIP': return <Star className="w-5 h-5 text-yellow-600" />;
      case 'COMMUNITY': return <Star className="w-5 h-5 text-green-600" />;
      case 'PROJECT': return <Archive className="w-5 h-5 text-slate-600" />;
      default: return <FolderOpen className="w-5 h-5 text-slate-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ACADEMIC': return 'bg-blue-100 text-blue-700';
      case 'ARTS': return 'bg-purple-100 text-purple-700';
      case 'SPORTS': return 'bg-orange-100 text-orange-700';
      case 'LEADERSHIP': return 'bg-yellow-100 text-yellow-700';
      case 'COMMUNITY': return 'bg-green-100 text-green-700';
      case 'PROJECT': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredPortfolios = portfolios.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-[#0033A0]" />
            Student Digital Portfolio
          </h1>
          <p className="text-slate-500 mt-1">
            {isStudent ? 'Showcase your best work and achievements' : 'View and manage student portfolios'}
          </p>
        </div>
        {!isStudent && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Portfolio Item
          </button>
        )}
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
              placeholder="Search portfolios..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Categories</option>
              <option value="ACADEMIC">Academic</option>
              <option value="ARTS">Arts & Creative</option>
              <option value="SPORTS">Sports</option>
              <option value="LEADERSHIP">Leadership</option>
              <option value="COMMUNITY">Community Service</option>
              <option value="PROJECT">Projects</option>
            </select>
          </div>
        </div>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No portfolio items found</p>
          <p className="text-sm text-slate-500 mt-1">
            {isStudent ? 'Start adding your achievements and projects!' : 'No portfolios have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Image/Preview */}
              {item.imageUrl ? (
                <div className="h-48 bg-slate-100 overflow-hidden">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  {getCategoryIcon(item.category)}
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{item.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>

                {!isStudent && (
                  <p className="text-sm text-[#0033A0] font-medium mb-2">
                    {item.student.firstName} {item.student.lastName}
                    {item.student.class?.name && ` (${item.student.class.name})`}
                  </p>
                )}

                {item.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.term}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      View File
                    </a>
                  )}
                  {!isStudent && (
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Portfolio Item</h3>
                <p className="text-xs text-slate-500 mt-1">Showcase student achievements and projects</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddPortfolio} className="p-6 space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Science Fair Project, Art Competition Entry"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="ARTS">Arts & Creative</option>
                  <option value="SPORTS">Sports</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="COMMUNITY">Community Service</option>
                  <option value="PROJECT">Projects</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe this achievement or project..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File URL (Optional)</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 text-[#0033A0] rounded focus:ring-[#0033A0]"
                    />
                    <span className="text-sm font-medium text-slate-700">Public</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudent || !title || adding}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Add to Portfolio
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
