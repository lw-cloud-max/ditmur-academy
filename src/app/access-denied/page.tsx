export default function AccessDenied() {
  return <div className="max-w-lg mx-auto rounded-xl bg-white border p-6 text-slate-700">
    <h1 className="text-xl font-bold mb-3">Access unavailable</h1>
    <p>You do not have permission to open this area, or your login session is no longer valid. School-wide Configuration is reserved for the super admin. If your account was changed or deactivated, sign out using the button above and contact the super admin.</p>
  </div>;
}
