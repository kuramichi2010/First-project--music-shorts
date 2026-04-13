import SwiftUI

@MainActor
final class FeedViewModel: ObservableObject {
    @Published var tracks: [Track] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var likedTrackIds: Set<String> = []

    private var nextPageToken: String?
    private var isFetchingMore = false

    // MARK: - Lifecycle

    func onAppear() async {
        guard tracks.isEmpty else { return }
        await loadFeed()
    }

    // MARK: - Feed loading

    func loadFeed() async {
        isLoading = true
        error = nil
        do {
            let response = try await APIClient.shared.fetchFeed()
            tracks = response.tracks
            nextPageToken = response.nextPageToken
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadMoreIfNeeded(currentIndex: Int) async {
        guard
            !isFetchingMore,
            currentIndex >= tracks.count - 3,
            let token = nextPageToken
        else { return }

        isFetchingMore = true
        do {
            let response = try await APIClient.shared.fetchFeed(pageToken: token)
            tracks.append(contentsOf: response.tracks)
            nextPageToken = response.nextPageToken
        } catch {
            self.error = error.localizedDescription
        }
        isFetchingMore = false
    }

    // MARK: - Like

    func toggleLike(trackId: String) {
        if likedTrackIds.contains(trackId) {
            likedTrackIds.remove(trackId)
        } else {
            likedTrackIds.insert(trackId)
        }
    }

    func isLiked(_ trackId: String) -> Bool {
        likedTrackIds.contains(trackId)
    }
}
