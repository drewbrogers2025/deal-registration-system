'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestAuthPage() {
  const [email, setEmail] = useState('test.user@gmail.com')
  const [password, setPassword] = useState('testpass123')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const supabase = createClientComponentClient()

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: 'Test User',
            user_type: 'vendor_user',
          }
        }
      })

      if (error) {
        setError(`Signup error: ${error.message}`)
      } else {
        setMessage(`Signup successful! User ID: ${data.user?.id}`)
        
        // Create user profile
        if (data.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              name: 'Test User',
              user_type: 'vendor_user',
              approval_status: 'approved', // Auto-approve for testing
              phone: '+1-555-TEST',
              company_position: 'Test Manager',
              approved_at: new Date().toISOString(),
            })

          if (profileError) {
            console.error('Profile creation error details:', profileError)
            setError(`Profile creation error: ${profileError.message || profileError.details || JSON.stringify(profileError, null, 2)}`)
          } else {
            // Create staff user profile
            const { error: staffError } = await supabase
              .from('staff_users')
              .insert({
                id: data.user.id,
                email: email,
                name: 'Test User',
                role: 'manager',
                department: 'Testing',
                permissions: {},
              })

            if (staffError) {
              console.error('Staff profile error details:', staffError)
              setError(`Staff profile error: ${staffError.message || JSON.stringify(staffError)}`)
            } else {
              setMessage('Complete user profile created successfully!')
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(`Login error: ${error.message}`)
      } else {
        setMessage(`Login successful! User: ${data.user?.email}`)
      }
    } catch (err: unknown) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        }
      })

      if (error) {
        setError(`Magic link error: ${error.message}`)
      } else {
        setMessage('Magic link sent! Check your email.')
      }
    } catch (err: unknown) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setError(`Signout error: ${error.message}`)
      } else {
        setMessage('Signed out successfully!')
      }
    } catch (err: unknown) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleSignUp} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Sign Up'}
            </Button>

            <Button
              onClick={handleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Button
              onClick={handleMagicLink}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>

            <Button
              onClick={handleSignOut}
              disabled={loading}
              variant="ghost"
              className="w-full"
            >
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>This is a test page to debug authentication issues.</p>
            <p>Default credentials: testuser@example.com / testpass123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
