import { MoveCategory } from '../types';
import { CATEGORY_THRESHOLDS } from '../analysis/categories';

interface CategoryBarProps {
  categoryCounts: Record<MoveCategory, number>;
}

/**
 * Horizontal stacked bar showing the breakdown of move categories.
 * Each segment is color-coded and sized proportionally.
 */
export default function CategoryBar({ categoryCounts }: CategoryBarProps) {
  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  // Only show non-zero categories
  const segments = CATEGORY_THRESHOLDS.filter(
    (t) => categoryCounts[t.category] > 0
  );

  return (
    <div className="w-full">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-panel-surface">
        {segments.map((t) => {
          const count = categoryCounts[t.category];
          const widthPercent = (count / total) * 100;
          return (
            <div
              key={t.category}
              className="h-full transition-all duration-500"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: t.color,
                minWidth: count > 0 ? '4px' : '0',
              }}
              title={`${t.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((t) => (
          <div key={t.category} className="flex items-center gap-1 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-panel-text-dim">
              {t.label}
            </span>
            <span className="text-white font-medium">
              {categoryCounts[t.category]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
