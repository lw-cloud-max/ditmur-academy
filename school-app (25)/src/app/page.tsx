import { auth } from "@/auth";
import AdminDashboard from "./dashboards/AdminDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import ParentDashboard from "./dashboards/ParentDashboard";

export default async function Home() {
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
  return <AdminDashboard />;
}
