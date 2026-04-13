import SwiftUI

/// 再生中にアニメーションするイコライザー風波形
struct WaveformView: View {
    let isPlaying: Bool
    let progress: Double          // 0.0 〜 1.0
    var barCount: Int = 40
    var color: Color = .white

    @State private var amplitudes: [CGFloat] = []
    @State private var animationTimer: Timer?

    var body: some View {
        GeometryReader { geo in
            HStack(alignment: .center, spacing: geo.size.width / CGFloat(barCount) * 0.3) {
                ForEach(0..<barCount, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(barColor(index: i))
                        .frame(width: barWidth(geo), height: barHeight(index: i, geo: geo))
                        .animation(
                            isPlaying
                                ? .easeInOut(duration: Double.random(in: 0.3...0.6)).repeatForever(autoreverses: true)
                                : .default,
                            value: amplitudes.indices.contains(i) ? amplitudes[i] : 0
                        )
                }
            }
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .onAppear {
            setupAmplitudes()
            if isPlaying { startAnimation() }
        }
        .onChange(of: isPlaying) { _, playing in
            playing ? startAnimation() : stopAnimation()
        }
    }

    // MARK: - Private

    private func barWidth(_ geo: GeometryProxy) -> CGFloat {
        let spacing = geo.size.width / CGFloat(barCount) * 0.3
        return (geo.size.width - spacing * CGFloat(barCount - 1)) / CGFloat(barCount)
    }

    private func barHeight(index: Int, geo: GeometryProxy) -> CGFloat {
        let amp = amplitudes.indices.contains(index) ? amplitudes[index] : 0.2
        return max(4, geo.size.height * amp)
    }

    private func barColor(index: Int) -> Color {
        let fraction = Double(index) / Double(barCount)
        if fraction < progress {
            return color
        } else {
            return color.opacity(0.3)
        }
    }

    private func setupAmplitudes() {
        amplitudes = (0..<barCount).map { _ in CGFloat.random(in: 0.15...0.9) }
    }

    private func startAnimation() {
        animationTimer = Timer.scheduledTimer(withTimeInterval: 0.18, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.18)) {
                for i in amplitudes.indices {
                    amplitudes[i] = CGFloat.random(in: 0.15...0.95)
                }
            }
        }
    }

    private func stopAnimation() {
        animationTimer?.invalidate()
        animationTimer = nil
        withAnimation(.easeOut(duration: 0.3)) {
            for i in amplitudes.indices {
                amplitudes[i] = 0.15
            }
        }
    }
}
