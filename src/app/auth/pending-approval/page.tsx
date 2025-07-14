'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, XCircle, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function PendingApprovalPage() {
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const { authUser, signOut, refreshUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check if user is already approved
    if (authUser?.approval_status === 'approved') {
      router.push('/')
    } else if (authUser?.approval_status === 'rejected') {
      router.push('/auth/login?error=account_rejected')
    }
  }, [authUser, router])

  const checkApprovalStatus = async () => {
    setChecking(true)
    try {
      await refreshUser()
      setLastChecked(new Date())
    } catch (error) {
      console.error('Error checking approval status:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (!authUser) {
    return null // Loading or redirecting
  }

  const getStatusIcon = () => {
    switch (authUser.approval_status) {
      case 'approved':
        return <CheckCircle className="h-12 w-12 text-green-600" />
      case 'rejected':
        return <XCircle className="h-12 w-12 text-red-600" />
      default:
        return <Clock className="h-12 w-12 text-yellow-600" />
    }
  }

  const getStatusMessage = () => {
    switch (authUser.approval_status) {
      case 'approved':
        return 'Your account has been approved! Redirecting...'
      case 'rejected':
        return 'Your account application has been rejected. Please contact support for more information.'
      default:
        return 'Your account is pending approval from an administrator.'
    }
  }

  const getUserTypeLabel = () => {
    switch (authUser.user_type) {
      case 'site_admin':
        return 'Site Administrator'
      case 'vendor_user':
        return 'Vendor User'
      case 'reseller':
        return 'Reseller Partner'
      default:
        return 'User'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Deal Registration System
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Account Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{authUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">{authUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Type:</span>
                    <span className="font-medium">{getUserTypeLabel()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium capitalize ${
                      authUser.approval_status === 'approved' ? 'text-green-600' :
                      authUser.approval_status === 'rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {authUser.approval_status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600">
                  <p>
                    An administrator will review your account and notify you via email once approved.
                    This process typically takes 1-2 business days.
                  </p>
                  {lastChecked && (
                    <p className="mt-2 text-xs text-gray-500">
                      Last checked: {lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={checkApprovalStatus}
                    disabled={checking}
                    variant="outline"
                    className="w-full"
                  >
                    {checking ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Checking Status...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Status
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@company.com" className="text-blue-600 hover:text-blue-500">
              support@company.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
