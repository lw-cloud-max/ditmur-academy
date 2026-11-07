import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  return <LoginForm hasOAuthError={Boolean(params.error)} />;
}
