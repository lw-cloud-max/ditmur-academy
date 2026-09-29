export default function AccessDenied() {
  return <div className="max-w-lg mx-auto rounded-xl bg-white border p-6 text-slate-700">
    <h1 className="text-xl font-bold mb-3">Access unavailable</h1>
    <p>Your login session expired, your role changed, or your account was deactivated. Sign out using the button above, then sign in again. If your old password was a shared default, ask the super admin for a unique temporary password.</p>
  </div>;
}
