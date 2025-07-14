'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, Shield, Database, Bell } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'users', label: 'Users & Permissions', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Application Name</label>
            <Input defaultValue="Deal Registration System" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <Input defaultValue="Your Company" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Support Email</label>
            <Input defaultValue="support@company.com" type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Territory</label>
            <Input defaultValue="Global" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deal Registration Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-assign deals</h4>
              <p className="text-sm text-gray-600">Automatically assign deals based on territory rules</p>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Conflict detection</h4>
              <p className="text-sm text-gray-600">Enable automatic conflict detection for overlapping deals</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Approval workflow</h4>
              <p className="text-sm text-gray-600">Require manager approval for high-value deals</p>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderUsersSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">System Admin</h4>
                <p className="text-sm text-gray-600">admin@company.com</p>
              </div>
              <Badge>Admin</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Deal Manager</h4>
                <p className="text-sm text-gray-600">manager@company.com</p>
              </div>
              <Badge variant="secondary">Manager</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Deal Staff</h4>
                <p className="text-sm text-gray-600">staff@company.com</p>
              </div>
              <Badge variant="outline">Staff</Badge>
            </div>
          </div>
          <Button className="w-full mt-4">Add New User</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Admin</h4>
              <p className="text-sm text-gray-600">Full system access, user management, settings configuration</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Manager</h4>
              <p className="text-sm text-gray-600">Deal assignment, conflict resolution, reporting</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Staff</h4>
              <p className="text-sm text-gray-600">View deals, basic conflict management</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Require 2FA for all users</p>
            </div>
            <Badge variant="warning">Disabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Session Timeout</h4>
              <p className="text-sm text-gray-600">Auto-logout after inactivity</p>
            </div>
            <span className="text-sm">8 hours</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Password Policy</h4>
              <p className="text-sm text-gray-600">Minimum password requirements</p>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Protection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Row Level Security</h4>
              <p className="text-sm text-gray-600">Database-level access control</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Audit Logging</h4>
              <p className="text-sm text-gray-600">Track all system changes</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Data Encryption</h4>
              <p className="text-sm text-gray-600">Encrypt sensitive data at rest</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderDatabaseSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Connection Status</span>
            <Badge variant="success">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Database Version</span>
            <span className="text-sm">PostgreSQL 15.3</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Tables</span>
            <span className="text-sm">9</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Backup</span>
            <span className="text-sm">2 hours ago</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">Run Database Cleanup</Button>
          <Button variant="outline" className="w-full">Rebuild Indexes</Button>
          <Button variant="outline" className="w-full">Export Data</Button>
          <Button variant="destructive" className="w-full">Reset Sample Data</Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">New Deal Submissions</h4>
              <p className="text-sm text-gray-600">Notify when new deals are registered</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Conflict Alerts</h4>
              <p className="text-sm text-gray-600">Notify when conflicts are detected</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Assignment Updates</h4>
              <p className="text-sm text-gray-600">Notify when deals are assigned</p>
            </div>
            <Badge variant="warning">Disabled</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Database Errors</h4>
              <p className="text-sm text-gray-600">Critical system notifications</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Performance Warnings</h4>
              <p className="text-sm text-gray-600">System performance alerts</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings()
      case 'users': return renderUsersSettings()
      case 'security': return renderSecuritySettings()
      case 'database': return renderDatabaseSettings()
      case 'notifications': return renderNotificationsSettings()
      default: return renderGeneralSettings()
    }
  }

  return (
    <MainLayout title="Settings" subtitle="Configure system preferences and options">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </MainLayout>
  )
}
