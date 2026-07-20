"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, User, Camera, Mail, Phone, Calendar, School, CreditCard, GraduationCap, Building, Users } from 'lucide-react';
import Link from 'next/link';

export default function StudentProfilePage() {
  const params = useParams();
  
  // The ID from URL will have '%2F' instead of '/' (e.g. DIT%2FSTU%2F001)
  const decodedId = decodeURIComponent(params.id as string);

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchStudent = async () => {
    try {
      // In a real app we'd have a specific GET /api/students/[id] route.
      // For now we just fetch all and filter to save time building new endpoints.
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find((s: any) => s.id === decodedId);
        setStudent(found);
      }
    } catch (err) {
      console.error("Failed to fetch student");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [decodedId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', decodedId);

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local state instantly so UI updates without full refresh
        setStudent({ ...student, imageUrl: data.imageUrl });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return <div className="p-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#0033A0]" /></div>;
  }

  if (!student) {
    return (
      <div className="p-24 text-center">
        <h2 className="text-xl font-bold text-slate-900">Student Not Found</h2>
        <Link href="/students" className="text-[#0033A0] hover:underline mt-2 inline-block">Return to Directory</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32">
      <Link href="/students" className="text-sm font-bold text-[#0033A0] hover:text-blue-800 flex items-center gap-1 mb-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </Link>

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cover Photo Area */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              student.status === 'ACTIVE' ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-400 text-white'
            }`}>
              {student.status}
            </span>
          </div>
        </div>
        
        <div className="px-8 pb-8 pt-0 flex flex-col md:flex-row gap-6 items-center md:items-start relative">
          
          {/* Profile Picture Upload System */}
          <div className="-mt-16 relative group shrink-0">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden relative flex items-center justify-center">
              {student.imageUrl ? (
                <img src={student.imageUrl} alt={student.firstName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-300" />
              )}
              
              {/* Upload Overlay */}
              <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-100 cursor-pointer transition-opacity">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">Upload</span>
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left pt-2 md:pt-4">
            <h1 className="text-3xl font-bold text-slate-900">{student.firstName} {student.lastName}</h1>
            <p className="text-[#0033A0] font-bold tracking-wide mt-1">{student.id}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm font-medium text-slate-600">
              <div className="flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400" /> {student.class?.name || 'Unassigned Class'}</div>
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Born: {new Date(student.dob).toLocaleDateString()}</div>
              <div className="flex items-center gap-1.5 capitalize"><User className="w-4 h-4 text-slate-400" /> {student.gender}</div>
            </div>
          </div>
        </div>
      </div>

      {/* INFO GRIDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Academic Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-[#0033A0]" /> Academic Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Class</p>
              <p className="font-medium text-slate-900">{student.class?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrollment Date</p>
              <p className="font-medium text-slate-900">{new Date(student.enrollmentDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous School</p>
              <p className="font-medium text-slate-900">{student.previousSchool || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Parent Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-5 h-5 text-emerald-600" /> Parent / Guardian
          </h2>
          {student.parent ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                <p className="font-medium text-slate-900">{student.parent.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</p>
                <p className="font-medium text-slate-900">{student.parent.phone}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</p>
                <p className="font-medium text-slate-900">{student.parent.email || 'No email provided'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No parent linked to this profile.</p>
          )}
        </div>

      </div>
    </div>
  );
}
