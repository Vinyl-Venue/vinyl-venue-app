// Shown in place of the shelf when there are no albums yet.
function ShelfEmptyState({ isOwnProfile, onAddOne, onScan, onImport }) {
  return (
    <div className="border border-dashed border-border-strong min-h-52 flex flex-col items-center justify-center gap-2.5 p-6 text-center font-sans">
      <div className="font-serif italic text-[22px]">{isOwnProfile ? 'Your shelf is empty' : 'This shelf is empty'}</div>
      <div className="text-sm text-text-muted max-w-md">
        {isOwnProfile
          ? 'Add your first album, scan a crate, or import a CSV. Rarity ranks appear once you have albums.'
          : "They haven't added any albums yet."}
      </div>
      {isOwnProfile && (
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={onAddOne} className="min-h-11 px-4 bg-accent text-bg border-0 text-sm font-semibold cursor-pointer">+ Add album</button>
          <button onClick={onScan} className="min-h-11 px-4 bg-surface text-text border border-border-strong text-sm cursor-pointer">Scan a crate</button>
          <button onClick={onImport} className="min-h-11 px-4 bg-surface text-text border border-border-strong text-sm cursor-pointer">Import from CSV</button>
        </div>
      )}
    </div>
  )
}

export default ShelfEmptyState
