import SwiftUI

struct ActionButtonsView: View {
    let track: Track
    let isLiked: Bool
    let onLike: () -> Void
    let onShare: () -> Void

    var body: some View {
        VStack(spacing: 28) {
            // いいね
            ActionButton(
                systemImage: isLiked ? "heart.fill" : "heart",
                label: isLiked ? "Liked" : "Like",
                tint: isLiked ? Color(red: 1, green: 0.27, blue: 0.46) : .white
            ) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    onLike()
                }
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }

            // シェア
            ActionButton(
                systemImage: "square.and.arrow.up",
                label: "Share",
                tint: .white
            ) {
                onShare()
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }

            // YouTube で開く
            if let url = URL(string: "https://www.youtube.com/watch?v=\(track.videoId)") {
                ActionButton(
                    systemImage: "play.rectangle.fill",
                    label: "YouTube",
                    tint: .white
                ) {
                    UIApplication.shared.open(url)
                }
            }
        }
    }
}

private struct ActionButton: View {
    let systemImage: String
    let label: String
    let tint: Color
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(tint)
                    .scaleEffect(isPressed ? 0.85 : 1.0)
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in withAnimation(.easeIn(duration: 0.1)) { isPressed = true } }
                .onEnded { _ in withAnimation(.spring(response: 0.3)) { isPressed = false } }
        )
    }
}
