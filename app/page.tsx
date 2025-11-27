import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import Navigation from '@/components/Navigation'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SignedOut>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Agency Contact <span className="text-blue-600">Dashboard</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Access comprehensive agency and contact information. Sign in to get started.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/sign-in" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
                Sign In
              </Link>
              <Link href="/sign-up" className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm">
                Sign Up
              </Link>
            </div>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Welcome Back!</h1>
            <p className="mt-3 text-lg text-gray-600">Ready to explore agencies and contacts?</p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/dashboard" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  )
}
