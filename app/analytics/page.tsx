import AnalyticsDashboard from '@/app/components/AnalyticsDashboard'
import AppNav from '@/app/components/AppNav'

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <AppNav />
      <AnalyticsDashboard />
    </div>
  )
}
