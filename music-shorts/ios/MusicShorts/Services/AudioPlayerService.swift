import AVFoundation
import Combine

@MainActor
final class AudioPlayerService: ObservableObject {
    static let shared = AudioPlayerService()

    @Published var isPlaying = false
    @Published var progress: Double = 0        // 0.0 〜 1.0 (ハイライト内の進捗)
    @Published var currentTrackId: String?

    private var player: AVPlayer?
    private var progressTimer: AnyCancellable?
    private var boundaryObserver: Any?
    private var currentHighlight: Highlight?

    private init() {
        configureAudioSession()
    }

    // MARK: - Public

    func play(track: Track) async {
        // 同じトラックならトグル
        if currentTrackId == track.videoId {
            togglePlayPause()
            return
        }

        stop()

        var streamURLString = track.streamURL
        // stream URL が期限切れなら再取得
        if track.isStreamExpired {
            if let refreshed = try? await APIClient.shared.refreshStream(videoId: track.videoId) {
                streamURLString = refreshed.streamURL
            }
        }

        guard let url = URL(string: streamURLString) else { return }

        let item = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: item)
        currentHighlight = track.highlight
        currentTrackId = track.videoId

        // ハイライト開始位置へシーク
        let startCMTime = CMTime(seconds: Double(track.highlight.startTime), preferredTimescale: 600)
        await player?.seek(to: startCMTime)

        player?.play()
        isPlaying = true

        startProgressTracking(highlight: track.highlight)
        setupLoopBoundary(highlight: track.highlight)
    }

    func togglePlayPause() {
        guard let player else { return }
        if isPlaying {
            player.pause()
            isPlaying = false
        } else {
            player.play()
            isPlaying = true
        }
    }

    func stop() {
        progressTimer?.cancel()
        if let obs = boundaryObserver {
            player?.removeTimeObserver(obs)
            boundaryObserver = nil
        }
        player?.pause()
        player = nil
        currentTrackId = nil
        currentHighlight = nil
        isPlaying = false
        progress = 0
    }

    // MARK: - Private

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AudioSession error: \(error)")
        }
    }

    private func startProgressTracking(highlight: Highlight) {
        let endSec = Double(highlight.startTime + highlight.duration)
        let startSec = Double(highlight.startTime)
        let duration = Double(highlight.duration)

        progressTimer = Timer.publish(every: 0.05, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self, let currentTime = self.player?.currentTime().seconds else { return }
                let elapsed = currentTime - startSec
                self.progress = max(0, min(1, elapsed / duration))

                // 末尾を超えたらループ
                if currentTime >= endSec {
                    let start = CMTime(seconds: startSec, preferredTimescale: 600)
                    self.player?.seek(to: start)
                }
            }
    }

    private func setupLoopBoundary(highlight: Highlight) {
        guard let player else { return }
        let endSec = Double(highlight.startTime + highlight.duration)
        let boundary = CMTime(seconds: endSec, preferredTimescale: 600)

        boundaryObserver = player.addBoundaryTimeObserver(
            forTimes: [NSValue(time: boundary)],
            queue: .main
        ) { [weak self, weak player] in
            guard let self, let player else { return }
            let start = CMTime(seconds: Double(highlight.startTime), preferredTimescale: 600)
            player.seek(to: start) { _ in
                player.play()
                self.progress = 0
            }
        }
    }
}
