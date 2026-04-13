import SwiftUI

struct TrackCardView: View {
    let track: Track
    let isActive: Bool
    let isLiked: Bool
    let onLike: () -> Void

    @ObservedObject private var player = AudioPlayerService.shared
    @State private var rotation: Double = 0
    @State private var rotationTimer: Timer?

    private var isCurrentlyPlaying: Bool {
        player.currentTrackId == track.videoId && player.isPlaying
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // 背景: サムネイルをぼかして全画面に敷く
                backgroundView(geo: geo)

                // メインコンテンツ
                HStack(alignment: .bottom, spacing: 0) {
                    leftContent(geo: geo)
                    Spacer()
                    rightContent
                        .padding(.trailing, 16)
                        .padding(.bottom, 100)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                Task { await player.play(track: track) }
            }
        }
        .onAppear {
            if isActive {
                Task { await player.play(track: track) }
            }
        }
        .onDisappear {
            if player.currentTrackId == track.videoId {
                player.stop()
            }
            stopRotation()
        }
        .onChange(of: isActive) { _, active in
            if active {
                Task { await player.play(track: track) }
            } else if player.currentTrackId == track.videoId {
                player.stop()
            }
        }
        .onChange(of: isCurrentlyPlaying) { _, playing in
            playing ? startRotation() : stopRotation()
        }
    }

    // MARK: - Subviews

    @ViewBuilder
    private func backgroundView(geo: GeometryProxy) -> some View {
        ZStack {
            Color.black

            AsyncImage(url: URL(string: track.thumbnailURL)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geo.size.width, height: geo.size.height)
                    .blur(radius: 40)
                    .opacity(0.5)
                    .clipped()
            } placeholder: {
                Color.black
            }

            // 下部グラデーション
            LinearGradient(
                colors: [.clear, .black.opacity(0.85)],
                startPoint: .center,
                endPoint: .bottom
            )
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func leftContent(geo: GeometryProxy) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer()

            // アルバムアート (回転アニメ)
            albumArt
                .padding(.leading, 20)
                .padding(.bottom, 24)

            // 曲情報
            VStack(alignment: .leading, spacing: 4) {
                Text(track.artist)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(1)

                Text(track.title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)

                Text("ハイライト \(formatTime(track.highlight.startTime)) 〜 \(formatTime(track.highlight.startTime + track.highlight.duration))")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.top, 2)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            // 波形
            waveformSection
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
        }
        .frame(maxWidth: geo.size.width * 0.78, alignment: .leading)
    }

    @ViewBuilder
    private var albumArt: some View {
        ZStack {
            // ディスク外周
            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 100, height: 100)

            AsyncImage(url: URL(string: track.thumbnailURL)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 82, height: 82)
            .clipShape(Circle())
            .rotationEffect(.degrees(rotation))

            // 中心穴
            Circle()
                .fill(Color.black)
                .frame(width: 14, height: 14)

            // 再生 / 一時停止オーバーレイ
            if !isCurrentlyPlaying {
                Circle()
                    .fill(.black.opacity(0.45))
                    .frame(width: 82, height: 82)
                Image(systemName: "play.fill")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .shadow(color: .black.opacity(0.4), radius: 12, x: 0, y: 6)
    }

    @ViewBuilder
    private var waveformSection: some View {
        VStack(spacing: 8) {
            WaveformView(
                isPlaying: isCurrentlyPlaying,
                progress: player.currentTrackId == track.videoId ? player.progress : 0,
                color: .white
            )
            .frame(height: 36)

            // プログレスバー
            GeometryReader { bar in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(.white.opacity(0.2))
                        .frame(height: 2)
                    Capsule()
                        .fill(.white)
                        .frame(
                            width: bar.size.width * (player.currentTrackId == track.videoId ? player.progress : 0),
                            height: 2
                        )
                }
            }
            .frame(height: 2)
        }
    }

    private var rightContent: some View {
        ActionButtonsView(
            track: track,
            isLiked: isLiked,
            onLike: onLike,
            onShare: {
                let items: [Any] = [
                    "\(track.title) - \(track.artist)",
                    URL(string: "https://www.youtube.com/watch?v=\(track.videoId)")!
                ]
                let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let root = windowScene.windows.first?.rootViewController {
                    root.present(vc, animated: true)
                }
            }
        )
    }

    // MARK: - Rotation animation

    private func startRotation() {
        rotationTimer?.invalidate()
        rotationTimer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { _ in
            withAnimation(.linear(duration: 0.016)) {
                rotation += 0.4
                if rotation >= 360 { rotation -= 360 }
            }
        }
    }

    private func stopRotation() {
        rotationTimer?.invalidate()
        rotationTimer = nil
    }

    private func formatTime(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}
