"use client";

import { useState, useEffect } from 'react';
import { Trophy, Star, Crown, Zap, Calculator, Medal, Loader2, Award } from 'lucide-react';

export default function HallOfFamePage() {
  const [leaders, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(res => res.json())
      .then(data => {
        if (data.success) setLeaderboard(data.data);
        setLoading(false);
      });
  }, []);

  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Crown': return <Crown className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Calculator': return <Calculator className={className} />;
      default: return <Star className={className} />;
    }
  };

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" /></div>;

  const top3 = leaders.slice(0, 3);
  const runnersUp = leaders.slice(3);

  return (
    <div className="space-y-12 pb-32 max-w-5xl mx-auto">
      <div className="text-center space-y-4 pt-8">
        <Trophy className="w-20 h-20 text-[#FFD700] mx-auto drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
        <h1 className="text-5xl font-black text-[#0A192F] uppercase tracking-tight">Hall of Fame</h1>
        <p className="text-lg text-slate-500 font-medium">Celebrating Academic Excellence at Ditmur Academy</p>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center text-slate-400 p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          No students graded yet to appear on the leaderboard.
        </div>
      ) : (
        <>
          {/* TOP 3 PODIUM */}
          <div className="flex flex-col md:flex-row justify-center items-end gap-6 md:gap-4 lg:gap-8 mt-16 px-4">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="w-full md:w-64 flex flex-col items-center order-2 md:order-1">
                <div className="w-20 h-20 bg-slate-200 rounded-full border-4 border-slate-300 mb-4 overflow-hidden relative shadow-lg">
                  {top3[1].imageUrl ? <img src={top3[1].imageUrl} className="w-full h-full object-cover" /> : <UserPlaceholder/>}
                  <div className="absolute -bottom-2 -right-2 bg-slate-300 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm">2</div>
                </div>
                <div className="bg-gradient-to-t from-slate-200 to-slate-50 w-full rounded-t-2xl p-6 text-center shadow-lg border border-slate-200 relative pt-8 md:h-48">
                  <Medal className="w-8 h-8 text-slate-400 absolute -top-4 left-1/2 -translate-x-1/2" />
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{top3[1].firstName} {top3[1].lastName}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-3">{top3[1].className}</p>
                  <div className="inline-block bg-white px-3 py-1 rounded-full shadow-sm">
                    <span className="font-black text-slate-700">{top3[1].averageGrade}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="w-full md:w-72 flex flex-col items-center order-1 md:order-2 z-10">
                <div className="w-28 h-28 bg-[#FFD700]/20 rounded-full border-4 border-[#FFD700] mb-4 overflow-hidden relative shadow-[0_0_30px_rgba(255,215,0,0.4)]">
                  {top3[0].imageUrl ? <img src={top3[0].imageUrl} className="w-full h-full object-cover" /> : <UserPlaceholder/>}
                  <div className="absolute -bottom-2 -right-2 bg-[#FFD700] text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-white shadow-sm">1</div>
                </div>
                <div className="bg-gradient-to-t from-yellow-100 to-[#FFD700]/10 w-full rounded-t-3xl p-8 text-center shadow-xl border border-yellow-200 relative pt-10 md:h-56 transform md:-translate-y-4">
                  <Crown className="w-10 h-10 text-[#FFD700] absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-md" />
                  <h3 className="font-black text-[#0A192F] text-xl leading-tight mb-1">{top3[0].firstName} {top3[0].lastName}</h3>
                  <p className="text-[#0033A0] text-sm font-bold mb-4">{top3[0].className}</p>
                  <div className="inline-block bg-white px-4 py-2 rounded-full shadow-md border border-yellow-100">
                    <span className="font-black text-yellow-600 text-lg">{top3[0].averageGrade}%</span>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {top3[0].badges.map((b: any) => (
                      <span key={b.name} className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${b.color}`}>
                        {getIcon(b.icon, "w-3 h-3")} {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="w-full md:w-64 flex flex-col items-center order-3 md:order-3">
                <div className="w-20 h-20 bg-orange-100 rounded-full border-4 border-orange-300 mb-4 overflow-hidden relative shadow-lg">
                  {top3[2].imageUrl ? <img src={top3[2].imageUrl} className="w-full h-full object-cover" /> : <UserPlaceholder/>}
                  <div className="absolute -bottom-2 -right-2 bg-orange-300 text-orange-900 w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm">3</div>
                </div>
                <div className="bg-gradient-to-t from-orange-100 to-orange-50 w-full rounded-t-2xl p-6 text-center shadow-lg border border-orange-200 relative pt-8 md:h-44">
                  <Medal className="w-8 h-8 text-orange-400 absolute -top-4 left-1/2 -translate-x-1/2" />
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{top3[2].firstName} {top3[2].lastName}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-3">{top3[2].className}</p>
                  <div className="inline-block bg-white px-3 py-1 rounded-full shadow-sm border border-orange-100">
                    <span className="font-black text-orange-700">{top3[2].averageGrade}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RUNNERS UP LIST */}
          {runnersUp.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Award className="w-5 h-5"/> Honorable Mentions</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {runnersUp.map((stu, index) => (
                  <div key={stu.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-slate-400 w-6 text-center">{index + 4}</span>
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                        {stu.imageUrl ? <img src={stu.imageUrl} className="w-full h-full object-cover"/> : <UserPlaceholder/>}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{stu.firstName} {stu.lastName}</h4>
                        <p className="text-xs text-slate-500 font-medium">{stu.className}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex gap-2">
                        {stu.badges.map((b: any) => (
                          <span key={b.name} className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${b.color}`}>
                            {getIcon(b.icon, "w-3 h-3")} {b.name}
                          </span>
                        ))}
                      </div>
                      <div className="font-black text-[#0033A0] bg-blue-50 px-3 py-1 rounded-lg">
                        {stu.averageGrade}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserPlaceholder() {
  return <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-black">?</div>;
}
