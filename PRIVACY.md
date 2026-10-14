# Privacy

ruTorrent Quick Add does not contain analytics, advertisements, or telemetry endpoints.

The extension sends magnet links, torrent metadata, destination labels, and download paths to the ruTorrent server explicitly selected by the user. It may retrieve `.torrent` files from third-party websites when the user activates a matching link. It queries the configured ruTorrent server to verify torrent presence.

Server profiles and credentials are stored locally using Firefox extension storage. The extension does not independently encrypt stored passwords. Exporting settings may export credentials in plaintext JSON. Do not upload exports to public repositories or issue trackers.

Broad website permissions are used to intercept magnet/torrent links and communicate with configured servers. No data is sent to the extension developer.

For support, sanitize diagnostic logs, magnet links, tracker URLs, and screenshots before sharing them.
