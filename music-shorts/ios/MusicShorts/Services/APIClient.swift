import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case decodingFailed(Error)
    case serverError(Int)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .decodingFailed(let e): return "Decode error: \(e.localizedDescription)"
        case .serverError(let code): return "Server error: \(code)"
        case .networkError(let e): return e.localizedDescription
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    // ローカル開発時は http://localhost:8000、本番は URL を変更する
    private let baseURL = "http://192.168.201.39:8000"

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    private init() {}

    // MARK: - Feed

    func fetchFeed(pageToken: String? = nil, maxResults: Int = 10) async throws -> FeedResponse {
        var components = URLComponents(string: "\(baseURL)/api/feed")!
        var items: [URLQueryItem] = [.init(name: "max_results", value: "\(maxResults)")]
        if let token = pageToken {
            items.append(.init(name: "page_token", value: token))
        }
        components.queryItems = items
        return try await request(components.url!)
    }

    // MARK: - Search

    func searchTracks(query: String, pageToken: String? = nil) async throws -> FeedResponse {
        var components = URLComponents(string: "\(baseURL)/api/search")!
        var items: [URLQueryItem] = [.init(name: "q", value: query)]
        if let token = pageToken {
            items.append(.init(name: "page_token", value: token))
        }
        components.queryItems = items
        return try await request(components.url!)
    }

    // MARK: - Stream URL refresh

    func refreshStream(videoId: String) async throws -> StreamResponse {
        let url = URL(string: "\(baseURL)/api/stream/\(videoId)")!
        return try await request(url)
    }

    // MARK: - Private

    private func request<T: Decodable>(_ url: URL) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(from: url)
        } catch {
            throw APIError.networkError(error)
        }

        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.serverError(http.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }
}
