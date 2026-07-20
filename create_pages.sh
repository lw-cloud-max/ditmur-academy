#!/bin/bash
PAGES=(
  "admissions|Admissions"
  "entrance-exam|Entrance Exam (CBT)"
  "students|Students"
  "parents|Parents"
  "staff|Staff"
  "classes|Classes"
  "timetable|Timetable"
  "attendance|Attendance"
  "broadsheet|Broadsheet"
  "assessment-format|Assessment Format"
  "cbt|CBT"
  "lesson-plan|Lesson Plan"
  "messaging|Messaging"
  "payments|Payments"
  "configuration|Configuration"
  "help|Help"
)

for item in "${PAGES[@]}"; do
  path="${item%%|*}"
  title="${item##*|}"
  
  mkdir -p "src/app/$path"
  cat << PAGE_EOF > "src/app/$path/page.tsx"
export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">$title</h1>
        <p className="text-slate-500">Manage your $title here.</p>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <h2 className="text-lg font-medium text-slate-700">Module Under Construction</h2>
        <p className="text-sm text-slate-500 mt-2">The $title module is being built. Check back soon!</p>
      </div>
    </div>
  );
}
PAGE_EOF
done
