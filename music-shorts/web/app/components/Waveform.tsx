"use client";

interface WaveformProps {
  isPlaying: boolean;
  progress: number; // 0~1
}

const BAR_COUNT = 36;

export default function Waveform({ isPlaying, progress }: WaveformProps) {
  return (
    <div className="flex items-center gap-[2px] w-full h-8">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const isPast = i / BAR_COUNT < progress;
        return (
          <div
            key={i}
            className="eq-bar flex-1 rounded-full transition-colors duration-150"
            style={{
              backgroundColor: isPast ? "#fff" : "rgba(255,255,255,0.3)",
              animationDuration: `${0.4 + (i % 7) * 0.08}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationPlayState: isPlaying ? "running" : "paused",
              height: isPlaying ? undefined : "15%",
              minHeight: 3,
            }}
          />
        );
      })}
    </div>
  );
}
