interface AccuracyGaugeProps {
  accuracy: number;
}

/**
 * Circular SVG gauge displaying overall accuracy percentage.
 * Green for high accuracy, red for low accuracy.
 */
export default function AccuracyGauge({ accuracy }: AccuracyGaugeProps) {
  const radius = 70;
  const strokeWidth = 10;
  const center = 85;
  const circumference = 2 * Math.PI * radius;

  // Clamp accuracy to 0-100
  const clamped = Math.max(0, Math.min(100, accuracy));

  // Calculate the arc offset (starts from top, goes clockwise)
  const progressOffset = circumference * (1 - clamped / 100);

  // Color based on accuracy level
  const getColor = (acc: number): string => {
    if (acc >= 90) return '#629924'; // Best - green
    if (acc >= 75) return '#67b8a0'; // Good - teal
    if (acc >= 60) return '#f4c542'; // Inaccuracy - yellow
    if (acc >= 40) return '#e8863a'; // Mistake - orange
    return '#d32f2f'; // Blunder - red
  };

  const color = getColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg width={center * 2} height={center * 2} viewBox={`0 0 ${center * 2} ${center * 2}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#302e2b"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-1000 ease-out"
        />

        {/* Accuracy text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-3xl font-bold"
          fill="white"
          fontSize="32"
          fontWeight="bold"
        >
          {clamped.toFixed(1)}
        </text>

        {/* Label */}
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#8b8988"
          fontSize="12"
        >
          Accuracy
        </text>
      </svg>
    </div>
  );
}
