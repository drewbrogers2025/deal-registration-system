'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ReportDashboard } from '@/components/reports/report-dashboard'

export default function ReportsPage() {
  return (
    <MainLayout
      title="Reports & Analytics"
      subtitle="Comprehensive insights and data visualization for your deal registration system"
    >
      <ReportDashboard />
    </MainLayout>
  )
}
