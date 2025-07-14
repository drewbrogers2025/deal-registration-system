'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestSimpleSignupPage() {
  const [email, setEmail] = useState('simple.test@gmail.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const handleSimpleSignup = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('🧪 Starting simple signup test...')
      
      const supabase = createClientComponentClient()
      console.log('✅ Supabase client created')
      
      console.log('📧 Calling supabase.auth.signUp with:', { email, password: '***' })
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      })
      
      console.log('📧 Signup response:', { data, error })
      
      if (error) {
        console.error('❌ Signup error:', error)
        setResult(`ERROR: ${error.message}`)
      } else {
        console.log('✅ Signup success!')
        console.log('👤 User:', data.user)
        console.log('🔐 Session:', data.session)
        
        setResult(`SUCCESS: User created with ID ${data.user?.id}
Email: ${data.user?.email}
Created: ${data.user?.created_at}
Confirmed: ${data.user?.email_confirmed_at || 'Not confirmed'}
Session: ${data.session ? 'Yes' : 'No'}`)
      }
      
    } catch (exception) {
      console.error('💥 Exception during signup:', exception)
      setResult(`EXCEPTION: ${exception.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkDatabase = async () => {
    setResult('Checking database... (check console for results)')
    
    try {
      const supabase = createClientComponentClient()
      
      // Try to get current user
      const { data: currentUser, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', { currentUser, userError })
      
      // Try to query auth.users (this will fail due to RLS, but we can see the error)
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('*')
        .limit(5)
      
      console.log('Auth users query:', { users, usersError })
      
    } catch (exception) {
      console.error('Database check exception:', exception)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Simple Supabase Signup Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
            />
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleSimpleSignup} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating User...' : 'Test Simple Signup'}
            </Button>
            
            <Button 
              onClick={checkDatabase} 
              variant="outline"
              className="w-full"
            >
              Check Database
            </Button>
          </div>
          
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm whitespace-pre-wrap">
              {result}
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Check browser console for detailed logs
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
