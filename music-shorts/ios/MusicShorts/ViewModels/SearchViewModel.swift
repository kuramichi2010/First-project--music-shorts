import SwiftUI
import Combine

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published var tracks: [Track] = []
    @Published var isLoading = false
    @Published var error: String?

    private var nextPageToken: String?
    private var searchTask: Task<Void, Never>?

    init() {
        // query 変更を 400ms デバウンス
        $query
            .debounce(for: .milliseconds(400), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] q in
                guard let self else { return }
                if q.trimmingCharacters(in: .whitespaces).isEmpty {
                    self.tracks = []
                    return
                }
                self.searchTask?.cancel()
                self.searchTask = Task { await self.search(q) }
            }
            .store(in: &cancellables)
    }

    private var cancellables = Set<AnyCancellable>()

    func search(_ q: String) async {
        isLoading = true
        error = nil
        tracks = []
        do {
            let response = try await APIClient.shared.searchTracks(query: q)
            tracks = response.tracks
            nextPageToken = response.nextPageToken
        } catch {
            if !Task.isCancelled {
                self.error = error.localizedDescription
            }
        }
        isLoading = false
    }

    func loadMoreIfNeeded(currentIndex: Int) async {
        guard
            currentIndex >= tracks.count - 3,
            let token = nextPageToken,
            !query.isEmpty
        else { return }

        do {
            let response = try await APIClient.shared.searchTracks(query: query, pageToken: token)
            tracks.append(contentsOf: response.tracks)
            nextPageToken = response.nextPageToken
        } catch {}
    }
}
