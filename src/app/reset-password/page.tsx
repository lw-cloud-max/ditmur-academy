import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Choose a New Password | Ditmur Academy',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
