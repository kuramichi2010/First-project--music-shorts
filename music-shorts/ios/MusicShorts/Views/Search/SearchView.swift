import SwiftUI

struct SearchView: View {
    @StateObject private var vm = SearchViewModel()
    @State private var selectedTrack: Track?
    @State private var selectedIndex = 0

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    searchBar
                    content
                }
            }
            .navigationBarHidden(true)
        }
        .sheet(item: $selectedTrack) { track in
            if let idx = vm.tracks.firstIndex(where: { $0.id == track.id }) {
                SearchResultFeedView(tracks: vm.tracks, startIndex: idx)
            }
        }
    }

    // MARK: - Search bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.5))
                .font(.system(size: 16))

            TextField("アーティスト、曲名で検索", text: $vm.query)
                .foregroundStyle(.white)
                .tint(.white)
                .font(.system(size: 16))
                .autocorrectionDisabled()
                .submitLabel(.search)

            if !vm.query.isEmpty {
                Button {
                    vm.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 16)
        .padding(.top, 60)
        .padding(.bottom, 12)
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if vm.isLoading {
            Spacer()
            ProgressView().tint(.white)
            Spacer()
        } else if vm.tracks.isEmpty && !vm.query.isEmpty {
            Spacer()
            Text("見つかりませんでした")
                .foregroundStyle(.white.opacity(0.4))
                .font(.system(size: 15))
            Spacer()
        } else if vm.query.isEmpty {
            emptyPrompt
        } else {
            trackList
        }
    }

    private var emptyPrompt: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "music.note.list")
                .font(.system(size: 52))
                .foregroundStyle(.white.opacity(0.15))
            Text("曲やアーティストを検索しよう")
                .font(.system(size: 15))
                .foregroundStyle(.white.opacity(0.3))
            Spacer()
        }
    }

    private var trackList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(vm.tracks.enumerated()), id: \.element.id) { index, track in
                    SearchTrackRow(track: track)
                        .onTapGesture {
                            selectedTrack = track
                        }
                        .task(id: index) {
                            await vm.loadMoreIfNeeded(currentIndex: index)
                        }
                    Divider()
                        .overlay(.white.opacity(0.08))
                        .padding(.leading, 76)
                }
            }
        }
    }
}

// MARK: - Search result row

private struct SearchTrackRow: View {
    let track: Track

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: track.thumbnailURL)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 52, height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.55))
                    .lineLimit(1)
            }

            Spacer()

            Image(systemName: "play.fill")
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.3))
                .padding(.trailing, 4)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}

// MARK: - Search result feed (フルスクリーン再生)

private struct SearchResultFeedView: View {
    let tracks: [Track]
    let startIndex: Int
    @State private var currentIndex: Int
    @Environment(\.dismiss) private var dismiss

    init(tracks: [Track], startIndex: Int) {
        self.tracks = tracks
        self.startIndex = startIndex
        _currentIndex = State(initialValue: startIndex)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            TabView(selection: $currentIndex) {
                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                    TrackCardView(
                        track: track,
                        isActive: currentIndex == index,
                        isLiked: false,
                        onLike: {}
                    )
                    .tag(index)
                    .ignoresSafeArea()
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.white.opacity(0.8))
                    .padding(.top, 56)
                    .padding(.leading, 20)
            }
        }
        .background(Color.black)
    }
}
