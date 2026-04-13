import Foundation

struct Track: Identifiable, Codable, Equatable {
    let videoId: String
    let title: String
    let artist: String
    let thumbnailURL: String
    let duration: Int
    let highlight: Highlight
    var streamURL: String
    var streamExpiresAt: String

    var id: String { videoId }

    enum CodingKeys: String, CodingKey {
        case videoId = "video_id"
        case title, artist
        case thumbnailURL = "thumbnail_url"
        case duration, highlight
        case streamURL = "stream_url"
        case streamExpiresAt = "stream_expires_at"
    }

    var isStreamExpired: Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: streamExpiresAt) else { return true }
        return date < Date()
    }
}

struct Highlight: Codable, Equatable {
    let startTime: Int
    let duration: Int
    let method: String

    enum CodingKeys: String, CodingKey {
        case startTime = "start_time"
        case duration, method
    }
}

struct FeedResponse: Codable {
    let tracks: [Track]
    let nextPageToken: String?

    enum CodingKeys: String, CodingKey {
        case tracks
        case nextPageToken = "next_page_token"
    }
}

struct StreamResponse: Codable {
    let videoId: String
    let streamURL: String
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case videoId = "video_id"
        case streamURL = "stream_url"
        case expiresAt = "expires_at"
    }
}
