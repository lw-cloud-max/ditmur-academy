import { auth } from "@/auth";
import AdminDashboard from "../dashboards/AdminDashboard";
import StudentDashboard from "../dashboards/StudentDashboard";
import ParentDashboard from "../dashboards/ParentDashboard";
import { canViewSchoolFinance } from "@/lib/permissions";

export default async function Dashboard() {
  const session = await auth();
  const role = session?.user?.role || 'STAFF';
  const userId = session?.user?.id || '';

  if (role === 'STUDENT') {
    return <StudentDashboard studentId={userId} />;
  }

  if (role === 'PARENT') {
    return <ParentDashboard parentId={userId} />;
  }

  // Default to Admin/Staff
  return <AdminDashboard canViewFinance={canViewSchoolFinance(session)} />;
}
