import { AuthForm } from '@/components/auth/AuthForm'

export const metadata = {
  title: 'Sign In - TabTriage',
  description: 'Sign in to your TabTriage account',
}

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            TabTriage
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Organize your browser tabs efficiently
          </p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  )
}