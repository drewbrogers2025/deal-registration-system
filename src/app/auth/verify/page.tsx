'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyEmail = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!token_hash || type !== 'email') {
        setVerificationStatus('pending')
        setMessage('Please check your email for the verification link.')
        return
      }

      try {
        const supabase = createClientComponentClient()
        
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        })

        if (error) {
          console.error('Verification error:', error)
          setVerificationStatus('error')
          setMessage(error.message || 'Failed to verify email. The link may be expired or invalid.')
          return
        }

        if (data.user) {
          setVerificationStatus('success')
          setMessage('Email verified successfully! Your account is now pending approval.')
          
          // Redirect to login after a delay
          setTimeout(() => {
            router.push('/auth/login?message=Email verified. Please wait for account approval.')
          }, 3000)
        } else {
          setVerificationStatus('error')
          setMessage('Verification failed. Please try again.')
        }
      } catch (_err) {
        console.error('Unexpected error:', err)
        setVerificationStatus('error')
        setMessage('An unexpected error occurred during verification.')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  const resendVerification = async () => {
    // This would need to be implemented with a form to collect email
    // For now, redirect to registration
    router.push('/auth/register')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Email Verification
          </h2>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {verificationStatus === 'loading' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying Email
                </>
              )}
              {verificationStatus === 'success' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Email Verified
                </>
              )}
              {verificationStatus === 'error' && (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Verification Failed
                </>
              )}
              {verificationStatus === 'pending' && (
                <>
                  <Mail className="h-5 w-5 text-blue-600" />
                  Check Your Email
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationStatus === 'loading' && (
              <div className="text-center">
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Your account is now pending approval. You will receive an email notification once approved.
                  </p>
                  <Button asChild>
                    <Link href="/auth/login">
                      Continue to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
                <div className="text-center space-y-2">
                  <Button onClick={resendVerification} variant="outline" className="w-full">
                    Try Registration Again
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/auth/login">
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {verificationStatus === 'pending' && (
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    We've sent a verification link to your email address. Please click the link to verify your account.
                  </p>
                  <div className="space-y-2">
                    <Button onClick={resendVerification} variant="outline" className="w-full">
                      Didn't receive email? Try again
                    </Button>
                    <Button asChild variant="ghost" className="w-full">
                      <Link href="/auth/login">
                        Back to Sign In
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
