import { useTranslation } from 'react-i18next'
import { CloudOff } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

// The offline mutation queue (see useAppStore.queuedFetch) already retries
// silently on 'online' and the focus/interval poll — this just makes it
// visible that something hasn't reached the server yet, instead of the
// queue being an invisible implementation detail.
export default function OfflineIndicator() {
  const { t } = useTranslation()
  const pendingCount = useAppStore((s) => s.pendingMutations.length)

  if (pendingCount === 0) return null

  return (
    <span
      title={t('sync.pending', { count: pendingCount })}
      className="flex shrink-0 items-center gap-1 rounded-full bg-priority-medium/20 px-2 py-1 text-xs text-priority-medium"
    >
      <CloudOff size={12} />
      {pendingCount}
    </span>
  )
}
