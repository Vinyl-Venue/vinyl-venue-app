// Mobile-only tab bar. Sits under the compact header on narrow screens;
// entirely absent (via lg:hidden on its wrapper) at lg+, where the
// two-column layout renders everything at once instead.
function MobileTabBar({ activeTab, onChange, showActivity }) {
  const tabs = [
    { key: 'shelf', label: 'Shelf' },
    { key: 'about', label: 'About' },
    ...(showActivity ? [{ key: 'activity', label: 'Activity' }] : [])
  ]

  return (
    <div className="lg:hidden flex border-b border-border font-sans sticky top-0 bg-bg z-10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 text-[11px] uppercase tracking-wider py-3 border-b-2 bg-transparent cursor-pointer transition-colors ${
            activeTab === tab.key ? 'border-accent text-text' : 'border-transparent text-text-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default MobileTabBar
