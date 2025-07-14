'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Mail, MapPin, Building, Calendar, Edit } from 'lucide-react'

export default function ProfilePage() {
  // Mock user data - in real app, this would come from authentication context
  const user = {
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'Staff',
    department: 'Sales Operations',
    location: 'London, UK',
    joinDate: '2023-01-15',
    avatar: null
  }

  return (
    <MainLayout title="Profile" subtitle="Manage your account settings">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{user.name}</CardTitle>
                  <div className="flex items-center space-x-4 text-gray-500 mt-1">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {user.email}
                    </div>
                    <Badge variant="secondary">{user.role}</Badge>
                  </div>
                </div>
              </div>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input value={user.name} readOnly className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input value={user.email} readOnly className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Input value={user.department} readOnly className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">Department</div>
                  <div className="text-gray-600">{user.department}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">Location</div>
                  <div className="text-gray-600">{user.location}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">Join Date</div>
                  <div className="text-gray-600">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive email updates about deals and conflicts</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Security Settings</h4>
                  <p className="text-sm text-gray-600">Manage password and two-factor authentication</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Privacy Settings</h4>
                  <p className="text-sm text-gray-600">Control your data and privacy preferences</p>
                </div>
                <Button variant="outline" size="sm">Review</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
