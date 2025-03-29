import { redirect } from 'next/navigation'

export default function AuthCallbackPage() {
  // This page is just a fallback - the route handler should handle all callbacks
  // Redirect to home page if user somehow lands on this page directly
  redirect('/')
  
  return null
}