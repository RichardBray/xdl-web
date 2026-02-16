interface Segment {
  start: number;
  end: number;
  text: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TranscriptDisplayProps {
  segments: Segment[];
}

export function TranscriptDisplay({ segments }: TranscriptDisplayProps) {
  return (
    <div className="transcript-display">
      {segments.map((seg, i) => (
        <div key={i} className="transcript-segment">
          <span className="transcript-timestamp">
            {formatTime(seg.start)} {'-->'} {formatTime(seg.end)}
          </span>
          <p className="transcript-text">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}
