/// SYLORA Dart/Flutter SDK foundation.
/// Wire with package:http in the host app; this file documents the surface.

class SyloraClient {
  SyloraClient({required this.baseUrl, this.token = '', this.apiKey = ''});

  final String baseUrl;
  final String token;
  final String apiKey;

  /// GET /api/ecosystem/status
  Uri statusUri() => Uri.parse('$baseUrl/api/ecosystem/status');

  /// GET /api/ecosystem/identity/me
  Uri identityUri() => Uri.parse('$baseUrl/api/ecosystem/identity/me');

  /// GET /api/ecosystem/agents
  Uri agentsUri({String q = ''}) =>
      Uri.parse('$baseUrl/api/ecosystem/agents').replace(queryParameters: {'q': q});

  Map<String, String> authHeaders() => {
        if (token.isNotEmpty) 'Authorization': 'Bearer $token',
        if (apiKey.isNotEmpty) 'X-Sylora-Key': apiKey,
        'Accept': 'application/json',
      };
}
