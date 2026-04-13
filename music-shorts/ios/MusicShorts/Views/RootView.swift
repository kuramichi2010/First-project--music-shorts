import SwiftUI

struct RootView: View {
    @State private var selectedTab: Tab = .feed

    enum Tab {
        case feed, search
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case .feed:   FeedView()
                case .search: SearchView()
                }
            }
            .ignoresSafeArea()

            bottomBar
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
    }

    // MARK: - Bottom Tab Bar

    private var bottomBar: some View {
        HStack(spacing: 0) {
            TabBarButton(
                icon: "house.fill",
                label: "For You",
                isSelected: selectedTab == .feed
            ) { selectedTab = .feed }

            TabBarButton(
                icon: "magnifyingglass",
                label: "Search",
                isSelected: selectedTab == .search
            ) { selectedTab = .search }
        }
        .padding(.horizontal, 40)
        .padding(.top, 12)
        .padding(.bottom, 28)
        .background(
            LinearGradient(
                colors: [.black.opacity(0), .black.opacity(0.92)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}

private struct TabBarButton: View {
    let icon: String
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: isSelected ? .bold : .regular))
                Text(label)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(isSelected ? .white : .white.opacity(0.4))
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: isSelected)
    }
}
