import StatsOverview from '../StatsOverview'
import ActivityHeatmap from '../ActivityHeatmap'
import BackupReminderBanner from '../BackupReminderBanner'

// "How am I doing" — pulled out of the main flow so it doesn't push actual
// tasks below the fold; the weekly/monthly AI review still pops up on its
// own schedule regardless of which page is open.
export default function StatsPage() {
  return (
    <div className="space-y-5">
      <StatsOverview />
      <ActivityHeatmap />
      <BackupReminderBanner />
    </div>
  )
}
