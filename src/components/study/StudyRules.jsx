import { Fragment } from 'react'

// Static German-grammar cheat sheet (from the user's tutoring session) —
// kept in Russian regardless of app language, same reasoning as AI answer
// explanations elsewhere in this module: the content itself IS "German
// grammar explained in Russian," so translating the explanatory text into
// en/de would serve no one. Only the surrounding nav chrome goes through i18n.

function Section({ title, children }) {
  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-medium text-slate-200">{title}</h3>
      <div className="space-y-2 text-sm text-slate-400">{children}</div>
    </div>
  )
}

function Bullets({ items }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="shrink-0 text-slate-600">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

const ARTICLE_TABLE = [
  { case: 'Nom', note: '(кто?)', der: 'der / ein', das: 'das / ein', die: 'die / eine', plural: 'die / –' },
  { case: 'Akk', note: '(кого? куда?)', der: 'den / einen', das: 'das / ein', die: 'die / eine', plural: 'die / –', warn: 'der' },
  { case: 'Dat', note: '(кому? где?)', der: 'dem / einem', das: 'dem / einem', die: 'der / einer', plural: 'den + ‑n', warn: 'die' }
]

function ArticleTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1 pr-2 text-left font-normal"></th>
            <th className="px-2 py-1 text-left font-normal">der (м.)</th>
            <th className="px-2 py-1 text-left font-normal">das (ср.)</th>
            <th className="px-2 py-1 text-left font-normal">die (ж.)</th>
            <th className="py-1 pl-2 text-left font-normal">die (мн.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {ARTICLE_TABLE.map((row) => (
            <tr key={row.case}>
              <td className="py-1.5 pr-2 text-slate-500">
                {row.case} <span className="text-slate-600">{row.note}</span>
              </td>
              <td className={`px-2 py-1.5 ${row.warn === 'der' ? 'text-priority-medium' : 'text-slate-100'}`}>
                {row.der}
              </td>
              <td className="px-2 py-1.5 text-slate-100">{row.das}</td>
              <td className={`px-2 py-1.5 ${row.warn === 'die' ? 'text-priority-medium' : 'text-slate-100'}`}>
                {row.die}
              </td>
              <td className="py-1.5 pl-2 text-slate-100">{row.plural}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const VERB_PREP_PAIRS = [
  ['warten auf + Akk', 'sich interessieren für'],
  ['sich freuen auf (будущее)', 'sich freuen über (уже есть)'],
  ['denken an + Akk', 'sprechen über / mit'],
  ['Angst haben vor + Dat', 'sich kümmern um'],
  ['teilnehmen an + Dat', 'sich bewerben um (место) / bei (фирма)']
]

export default function StudyRules() {
  return (
    <div className="space-y-4 rounded-3xl border border-white/[0.06] bg-app-card p-4">
      <p className="text-xs text-slate-500">
        Шпаргалка по темам, где чаще всего ошибки — от самого важного к менее важному.
      </p>

      <Section title="1. Артикли по падежам (основа всего)">
        <ArticleTable />
        <p>
          <span className="text-priority-medium">Akk</span>: меняется только мужской род: der → den.{' '}
          <span className="text-priority-medium">Dat</span>: женский род die → der. Частая ошибка: mit der Kollegin,
          von der Ärztin.
        </p>
      </Section>

      <Section title="2. Предлоги">
        <p>
          Всегда <span className="text-slate-200">Akkusativ</span>: durch, für, gegen, ohne, um. Запоминалка «ДФГОУ». →
          für meinen Sohn, ohne einen Gutschein
        </p>
        <p>
          Всегда <span className="text-slate-200">Dativ</span>: aus, bei, mit, nach, seit, von, zu (+ gegenüber). → mit
          dem Bus, bei meiner Schwester, nach dem Kurs
        </p>
        <p className="text-slate-200">
          Wechselpräpositionen (an, auf, hinter, in, neben, über, unter, vor, zwischen):
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 pr-2 text-left font-normal">Вопрос</th>
                <th className="px-2 py-1 text-left font-normal">Падеж</th>
                <th className="py-1 pl-2 text-left font-normal">Глаголы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              <tr>
                <td className="py-1.5 pr-2">Wohin? (движение)</td>
                <td className="px-2 py-1.5 text-slate-100">Akk</td>
                <td className="py-1.5 pl-2 text-slate-100">stellen, legen, hängen, setzen, gehen</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2">Wo? (место, покой)</td>
                <td className="px-2 py-1.5 text-slate-100">Dat</td>
                <td className="py-1.5 pl-2 text-slate-100">stehen, liegen, hängen, sitzen, sein</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          → Ich lege das Buch auf den Tisch. (куда?) / Das Buch liegt auf dem Tisch. (где?) — сначала смотри на глагол:
          stellen/legen → den, stehen/liegen → dem.
        </p>
        <p>
          <span className="text-slate-200">Genitiv (B2+)</span>: während, wegen, trotz, statt → des (м./ср., +‑s/‑es) /
          der (ж.). → während des Kurses, trotz seiner Krankheit
        </p>
      </Section>

      <Section title="3. Глаголы с предлогами (учить как одно слово)">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {VERB_PREP_PAIRS.map(([a, b], i) => (
            <Fragment key={i}>
              <span>{a}</span>
              <span>{b}</span>
            </Fragment>
          ))}
        </div>
        <p>
          Вопрос о предмете: wo(r) + предлог: auf → Worauf, für → Wofür, an → Woran, über → Worüber. → Worauf wartest
          du? — Auf den Bus.
        </p>
      </Section>

      <Section title="4. Придаточные предложения (Nebensatz)">
        <p>
          После dass, weil, ob, wenn, als, obwohl, sobald, wann/wo/was спрягаемый глагол стоит в самом конце.
        </p>
        <Bullets
          items={[
            '…dass der Termin am Freitag stattfindet. (отделяемая приставка пишется слитно)',
            '…dass er die Prüfung bestanden hat. (в Perfekt в конец идёт hat)',
            '…dass ich den Test bestehe. (форма спрягается, а не bestehen)'
          ]}
        />
        <p className="text-slate-200">Похожие слова:</p>
        <Bullets
          items={[
            'ob — «ли»: Ich weiß nicht, ob er kommt.',
            'wann — «когда?» (вопрос): Sagen Sie mir, wann der Kurs beginnt.',
            'wenn — «если» или «когда» (повторяется, сейчас, в будущем).',
            'als — «когда» один раз в прошлом: Als ich klein war, …'
          ]}
        />
        <p>
          weil или denn: у weil глагол в конце, у denn обычный порядок слов. → …, weil mein Rücken weh tut. / …, denn
          mein Rücken tut weh.
        </p>
        <p>Пара je … desto: Je mehr ich übe, desto besser spreche ich.</p>
      </Section>

      <Section title="5. Окончания прилагательных (коротко)">
        <Bullets
          items={[
            'После der/die/das: в Nom ед. ч. ‑e, почти везде остальное ‑en.',
            'После ein/kein/mein окончание само показывает род: ein guter Job, ein gutes Buch.',
            'Akk мужского рода всегда ‑en: einen wichtigen Termin, einen sicheren Job.'
          ]}
        />
      </Section>

      <Section title="6. Relativsatz (который)">
        <p>
          Относительное местоимение = артикль (кроме Dat мн. ч. denen). Падеж задаёт глагол внутри придаточного,
          предлог ставится перед местоимением:
        </p>
        <Bullets
          items={[
            'der Kurs, für den ich mich interessiere (sich interessieren für + Akk)',
            'die Firma, in der ich arbeite (где? → Dat)',
            'die Kollegin, mit der ich spreche (mit + Dat)'
          ]}
        />
      </Section>

      <Section title="7. Perfekt: sein или haben">
        <p>
          С sein: движение (gehen, fahren, umziehen), изменение состояния, а также bleiben и sein. → Ich bin im Büro
          geblieben. Остальные глаголы — с haben.
        </p>
      </Section>

      <Section title="8. Passiv">
        <p>werden + Partizip II: Der Server wird neu gestartet.</p>
        <p>С модальным глаголом (B2): Das Formular muss abgegeben werden.</p>
      </Section>

      <p className="border-t border-white/[0.06] pt-3 text-xs text-slate-600">
        Как повторять: каждый день перед набором по 5 минут читай пункты 1–2 и 4 — там больше всего ошибок.
      </p>
    </div>
  )
}
