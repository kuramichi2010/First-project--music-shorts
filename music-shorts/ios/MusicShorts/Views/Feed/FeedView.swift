import SwiftUI

struct FeedView: View {
    @StateObject private var vm = FeedViewModel()
    @State private var currentIndex = 0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if vm.isLoading && vm.tracks.isEmpty {
                loadingView
            } else if let error = vm.error, vm.tracks.isEmpty {
                errorView(message: error)
            } else {
                feedContent
            }
        }
        .task { await vm.onAppear() }
    }

    // MARK: - Feed

    private var feedContent: some View {
        TabView(selection: $currentIndex) {
            ForEach(Array(vm.tracks.enumerated()), id: \.element.id) { index, track in
                TrackCardView(
                    track: track,
                    isActive: currentIndex == index,
                    isLiked: vm.isLiked(track.videoId),
                    onLike: { vm.toggleLike(trackId: track.videoId) }
                )
                .tag(index)
                .ignoresSafeArea()
                .task(id: index) {
                    await vm.loadMoreIfNeeded(currentIndex: index)
                }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .ignoresSafeArea()
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.4)
            Text("読み込み中...")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))
        }
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.white.opacity(0.5))
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button("再試行") {
                Task { await vm.loadFeed() }
            }
            .buttonStyle(.borderedProminent)
            .tint(.white.opacity(0.2))
        }
    }
}
