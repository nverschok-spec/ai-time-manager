import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { readableForegroundChannels } from '../lib/color'
import SwipeableRow from './SwipeableRow'
import UndoSnackbar from './UndoSnackbar'

export default function ShoppingList() {
  const { t } = useTranslation()
  const items = useAppStore((s) => s.shoppingItems)
  const people = useAppStore((s) => s.people)
  const addShoppingItem = useAppStore((s) => s.addShoppingItem)
  const toggleShoppingItem = useAppStore((s) => s.toggleShoppingItem)
  const toggleShoppingClaim = useAppStore((s) => s.toggleShoppingClaim)
  const removeShoppingItem = useAppStore((s) => s.removeShoppingItem)
  const restoreShoppingItem = useAppStore((s) => s.restoreShoppingItem)
  const clearCompletedShopping = useAppStore((s) => s.clearCompletedShopping)
  const [text, setText] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    addShoppingItem(text)
    setText('')
  }

  function handleRemove(item) {
    removeShoppingItem(item.id)
    setPendingDelete(item)
  }

  function handleUndoRemove() {
    if (pendingDelete) restoreShoppingItem(pendingDelete)
    setPendingDelete(null)
  }

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('shopping.placeholder')}
          className="min-w-0 flex-1 rounded-full bg-app-card px-4 py-2 text-sm text-slate-100 placeholder:text-muted outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <button
          type="submit"
          aria-label={t('shopping.add')}
          className="rounded-full bg-brand-cta p-2.5 text-brand-ctaForeground hover:brightness-110 transition-all"
        >
          <Plus size={18} />
        </button>
      </form>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('shopping.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <SwipeableRow onSwipeLeft={() => handleRemove(item)} onSwipeRight={() => toggleShoppingItem(item.id)}>
                <div className="flex items-center gap-3 rounded-xl bg-app-card px-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleShoppingItem(item.id)}
                    className="h-4 w-4 accent-brand-cta"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${item.done ? 'line-through text-slate-500' : 'text-slate-100'}`}
                  >
                    {item.text}
                  </span>
                  {(() => {
                    const claimant = item.claimedBy ? people.find((p) => p.id === item.claimedBy) : null
                    return (
                      <button
                        type="button"
                        onClick={() => toggleShoppingClaim(item.id)}
                        title={claimant ? claimant.name : t('shopping.claim')}
                        aria-label={claimant ? claimant.name : t('shopping.claim')}
                        className="shrink-0 p-1"
                      >
                        {claimant ? (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: claimant.color,
                              color: `rgb(${readableForegroundChannels(claimant.color)})`
                            }}
                          >
                            {claimant.name.slice(0, 1).toUpperCase()}
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-400">
                            <User size={11} />
                          </span>
                        )}
                      </button>
                    )
                  })()}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    aria-label={t('task_row.delete')}
                    className="p-1 text-slate-500 hover:text-priority-high transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </SwipeableRow>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <button
          type="button"
          onClick={clearCompletedShopping}
          className="w-full rounded-md bg-app-cardMuted py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
        >
          {t('shopping.clear_completed', { count: doneCount })}
        </button>
      )}

      {pendingDelete && (
        <UndoSnackbar
          key={pendingDelete.id}
          label={pendingDelete.text}
          onUndo={handleUndoRemove}
          onDismiss={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
