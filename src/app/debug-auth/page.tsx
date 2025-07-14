'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DebugAuthPage() {
  const [email, setEmail] = useState('debug.test@gmail.com')
  const [password, setPassword] = useState('testpass123')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const supabase = createClientComponentClient()

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testBasicSignup = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🧪 Starting basic signup test...')
      addResult(`📧 Email: ${email}`)
      addResult(`🔑 Password: ${password}`)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      addResult('📧 Signup response received')
      addResult(`✅ Error: ${error ? error.message : 'null'}`)
      addResult(`👤 User ID: ${data.user?.id || 'null'}`)
      addResult(`🔐 Session: ${data.session ? 'exists' : 'null'}`)
      addResult(`📧 Email confirmed: ${data.user?.email_confirmed_at || 'null'}`)
      addResult(`📧 Confirmation sent: ${data.user?.confirmation_sent_at || 'null'}`)

      if (data.user) {
        addResult('⏳ Waiting 2 seconds...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        addResult('🔍 Checking current user...')
        const { data: currentUser, error: currentError } = await supabase.auth.getUser()
        addResult(`🔍 Current user: ${currentUser.user?.id || 'null'}`)
        addResult(`🔍 Current error: ${currentError?.message || 'null'}`)

        addResult('🔐 Attempting immediate signin...')
        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        addResult(`🔐 Signin error: ${signinError?.message || 'null'}`)
        addResult(`🔐 Signin user: ${signinData.user?.id || 'null'}`)
        addResult(`🔐 Signin session: ${signinData.session ? 'exists' : 'null'}`)

        if (signinError?.message === 'Email not confirmed') {
          addResult('📧 Email confirmation required - this is the core issue!')
          addResult('💡 Solution: Need to bypass email confirmation or auto-confirm users')
        }
      }

    } catch (err: unknown) {
      addResult(`💥 Exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testSignin = async () => {
    setLoading(true)
    
    try {
      addResult('🔐 Testing signin...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      addResult(`🔐 Signin error: ${error ? error.message : 'null'}`)
      addResult(`🔐 Signin user: ${data.user?.id || 'null'}`)
      addResult(`🔐 Signin session: ${data.session ? 'exists' : 'null'}`)

    } catch (err: unknown) {
      addResult(`💥 Signin exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Debug Auth Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label>Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label>Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={testBasicSignup} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Basic Signup'}
            </Button>

            <Button 
              onClick={testSignin} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Signin'}
            </Button>

            <Button 
              onClick={() => setResults([])} 
              variant="ghost"
              className="w-full"
            >
              Clear Results
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">No results yet</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
