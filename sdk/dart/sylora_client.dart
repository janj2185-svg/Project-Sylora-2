/// SYLORA Flutter/Dart SDK foundation.
/// Wire with package:http in the host app; this file documents the client shape.
library sylora_client;

class SyloraClient {
  SyloraClient({required this.baseUrl, this.apiKey});

  final String baseUrl;
  final String? apiKey;

  Map<String, String> get headers => {
        'content-type': 'application/json',
        if (apiKey != null) 'authorization': 'Bearer $apiKey',
      };

  Uri uri(String path) => Uri.parse('${baseUrl.replaceAll(RegExp(r"/$"), "")}$path');

  // Example:
  // final res = await http.get(uri('/api/v1/identity/me'), headers: headers);
  // final me = jsonDecode(res.body);
}
