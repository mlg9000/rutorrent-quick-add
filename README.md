# ruTorrent Quick Add

A Firefox extension for sending **magnet links** and **`.torrent` files** to a remote **ruTorrent / rTorrent** server with one click.

Choose a destination button, and Quick Add submits the torrent with its configured label and download directory. It checks for the torrent in rTorrent, shows a clear result, and automatically closes the popup after a successful submission.

> **Status:** Public release candidate (v1.0.3). Tested in a user's Firefox/ruTorrent environment during development; this release package has not yet completed Mozilla review or a full public compatibility/security audit.

## Screenshots

**Quick Add popup** — choose a server and a destination without filling in a form every time.

![Quick Add popup showing server selector and destination buttons](screenshots/popup.png)

**Settings** — add or remove servers and destinations, and choose monochrome icons.

![Settings page with server configuration and destination icon selectors](screenshots/settings.png)

*Screenshots use fictional demonstration server names, paths, and torrent titles. They were rendered from the extension UI with sample configuration, not a live ruTorrent connection.*

## Features

- Intercepts magnet links and `.torrent` download links in Firefox.
- One-click destination buttons with independent **name, ruTorrent label, directory, and icon**.
- 11 monochrome destination icons: TV, Movies, Video, Pictures, Applications, Games, Music, Books, Magazines, Anime, and General.
- Multiple ruTorrent server profiles with a popup server selector.
- HTTP Basic authentication or browser-managed authentication/session.
- Supports custom torrent URL matching expressions.
- Advanced per-submission overrides for directory, label, and paused state.
- Confirms submitted torrents through ruTorrent's HTTPRPC torrent list when available.
- Shows failures or inconclusive results instead of silently retrying ambiguous submissions.
- Configurable automatic popup close after confirmation (default: two seconds).
- Settings import/export and a link to open the selected server.

## Requirements

- Firefox with WebExtensions support.
- A reachable ruTorrent installation backed by rTorrent.
- The ruTorrent `httprpc` plugin enabled for reliable verification.
- HTTPS strongly recommended for remote access, especially with Basic authentication.

## Install

### Development / temporary installation

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Select **Load Temporary Add-on**.
4. Choose `manifest.json` in the repository root.
5. Open the extension settings and configure a server and at least one destination.

Temporary add-ons disappear after restarting Firefox.

### Permanent installation

The source ZIP is **not signed**. For normal Firefox installations, the extension must be signed by Mozilla.

When the extension is published on [Firefox Add-ons](https://addons.mozilla.org/), install it from its official listing. Until then, you can submit this source as a listed or unlisted add-on through the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/). Do not rename an unsigned ZIP to `.xpi` and expect it to install permanently.

## Configuration

Open **Add-ons and Themes → ruTorrent Quick Add → Preferences**.

### Add a server

Provide a name, the ruTorrent web UI URL (including any subpath), and the authentication mode. For example:

```text
Server name: My ruTorrent
Server URL:  https://torrent.example.org/rutorrent/
Authentication: HTTP Basic
```

Do not enter the raw rTorrent SCGI address. Use the accessible ruTorrent web URL.

### Add a destination

| Button | ruTorrent label | Download directory | Icon |
| --- | --- | --- | --- |
| Movies | movies | `/downloads/movies` | Movies |
| TV Shows | tv | `/downloads/tv` | TV |
| Music | music | `/downloads/music` | Music |
| General | other | `/downloads/other` | General |

These are examples only. **Directories must be paths visible to rTorrent on the remote host**, not paths on your local computer. Create as many destinations as you need, then save.

### Using the extension

Click a magnet or `.torrent` link on a website. Select the server (if you configured multiple) and click the destination button. Quick Add submits the torrent, checks for its info hash, and displays the result. On confirmation, the popup closes after the configured delay.

## Privacy and security

- No analytics, advertising, or developer-operated collection service is included.
- The extension communicates with **servers you configure** to submit torrents and check their status. For `.torrent` URLs, it also downloads the torrent file from the source website.
- Configuration, including Basic-auth passwords, is saved in Firefox extension local storage. **Passwords are not encrypted by this extension.**
- Exported settings may include passwords. Treat exports as secrets; **never commit them to Git**.
- The extension requests broad website access to detect torrent links and reach user-configured servers. Review the permissions before installing.
- Use HTTPS for remote servers; do not send Basic-auth credentials over untrusted HTTP.
- Authentication modes currently implemented are Basic and browser-managed/no explicit credentials. OAuth, OIDC, and custom bearer-token authentication are **not implemented**.

See [PRIVACY.md](PRIVACY.md) for details.

## Troubleshooting

**Magnet links are not intercepted:** Refresh the page after installing the extension, confirm link interception is enabled, and inspect the extension console at `about:debugging`.

**The torrent loads but a warning appears:** The server may redirect after accepting the submission, or the HTTPRPC verification endpoint may be unavailable. Check ruTorrent before retrying to avoid duplicates.

**HTTP 401 / 403:** Check authentication credentials and reverse-proxy access rules.

**Verification HTTP 500:** Confirm the `httprpc` plugin is enabled and accessible through the reverse proxy.

**The popup doesn't close:** It closes only after a confirmed success; ambiguous submissions stay open.

## Development

The extension uses vanilla JavaScript, HTML, and CSS with no build dependencies. Source files are at the repository root. The `destination-icons/` directory contains locally bundled SVG icons.

To create an uploadable ZIP from the repository root:

```bash
python3 scripts/package.py
```

The script creates an unsigned ZIP in `dist/`, excluding screenshots, documentation, and development files. Submit that ZIP to Mozilla for signing. For a public Firefox Add-ons listing, let Mozilla manage updates; do not add a self-hosted `update_url` unless you deliberately choose self-distribution.

Before publishing, test the extension with your ruTorrent version, review permissions and credential handling, and run Mozilla's validation process.

## Contributing

Bug reports and pull requests are welcome. Please remove torrent names, tracker passkeys, server URLs, credentials, and other private information from logs and screenshots before opening an issue.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — copyright holders/contributors.
