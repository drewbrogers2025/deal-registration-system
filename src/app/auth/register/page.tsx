'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRegistrationForm } from '@/components/auth/user-registration-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Shield, Users, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const [selectedUserType, setSelectedUserType] = useState<'site_admin' | 'vendor_user' | 'reseller' | null>(null)

  if (selectedUserType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setSelectedUserType(null)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to User Type Selection
            </Button>
            <h2 className="text-3xl font-bold text-gray-900">
              Create Your Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join the Deal Registration System
            </p>
          </div>

          <UserRegistrationForm userType={selectedUserType} />

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Join Deal Registration System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose your account type to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reseller Registration */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedUserType('reseller')}>
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>Reseller Partner</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Register as a reseller partner to submit and manage deal registrations for your territory.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mb-6">
                <li>• Submit deal registrations</li>
                <li>• Track deal status</li>
                <li>• Manage your profile</li>
                <li>• Territory-based access</li>
              </ul>
              <Button className="w-full">
                Register as Reseller
              </Button>
            </CardContent>
          </Card>

          {/* Vendor User Registration */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedUserType('vendor_user')}>
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Vendor User</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Join as a vendor user to manage deals, resellers, and system operations.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mb-6">
                <li>• Manage all deals</li>
                <li>• Approve/reject registrations</li>
                <li>• Manage resellers</li>
                <li>• Resolve conflicts</li>
              </ul>
              <Button className="w-full" variant="outline">
                Register as Vendor User
              </Button>
            </CardContent>
          </Card>

          {/* Site Admin Registration */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedUserType('site_admin')}>
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <CardTitle>Site Administrator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Full system access for administrators to manage users, settings, and system configuration.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mb-6">
                <li>• Full system access</li>
                <li>• User management</li>
                <li>• System settings</li>
                <li>• Security configuration</li>
              </ul>
              <Button className="w-full" variant="secondary">
                Register as Admin
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Note: All new accounts require approval before access is granted.
            You will receive an email notification once your account is approved.
          </p>
        </div>
      </div>
    </div>
  )
}
