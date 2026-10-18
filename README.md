# ruTorrent Quick Add

Send magnet links and `.torrent` files from Firefox or Chrome to your own ruTorrent server. Choose a destination directory from the launcher instead of downloading a torrent locally and uploading it manually.

**Current source version: 1.0.10** · [Release notes](RELEASE_NOTES_1.0.10.md)

> **Browser status:** The Firefox authenticated-download fix was confirmed working in v1.0.8. The v1.0.10 torrent-name preview and the Chrome authenticated-download fallback have not yet been confirmed in live browser testing. Build ZIPs are **unsigned**; Mozilla signs listed Firefox updates after review.

## Screenshots

![Torrent destination picker](screenshots/popup.png)

![Extension settings and destination icons](screenshots/settings.png)

*Screenshots show example settings; the interface may differ slightly from the current version.*

## Features

- Intercept magnet links and `.torrent` download links, including site-specific download endpoints matched with custom regular expressions
- Send torrents to a configured ruTorrent server using destination buttons
- Configure multiple servers, labels, icons, and remote download paths
- Support HTTP Basic authentication or browser-managed sessions for ruTorrent
- Verify submissions through ruTorrent HTTPRPC and close the launcher after confirmed success
- Import and export extension settings
- For torrent endpoints that return a login page to extension requests, retry from the originating website page context (Firefox tested; Chrome requires live verification)
- Display diagnostic information when a torrent URL returns HTML instead of a torrent file
- Asynchronously display the actual torrent metadata name for HTTP(S) downloads, including endpoints such as `dl.php`; preserve magnet-link display behavior

## Build

Requires Python 3. Run from the repository root:

```bash
python3 scripts/build.py
```

Or build one browser:

```bash
python3 scripts/build.py firefox
python3 scripts/build.py chrome
```

Output files:

```text
dist/rutorrent-quick-add-firefox-1.0.10-unsigned.zip
dist/rutorrent-quick-add-chrome-1.0.10-unsigned.zip
```

The ZIP contents have `manifest.json` at their root.

## Install for testing

**Firefox (temporary):**

1. Extract `dist/rutorrent-quick-add-firefox-1.0.10-unsigned.zip` into its own directory.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select the extracted `manifest.json`.
4. Refresh any already-open torrent website tabs before testing link interception.

Temporary add-ons are removed when Firefox restarts. For permanent installation in standard Firefox, use a Mozilla-signed `.xpi`.

**Chrome (unpacked):**

1. Extract `dist/rutorrent-quick-add-chrome-1.0.10-unsigned.zip` into its own directory.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose the extracted directory.
4. Refresh torrent website tabs before testing.

After installing, open the extension's settings to configure your ruTorrent server and destinations. **Destination paths are paths on the remote rTorrent server**, not your local computer.

## Custom torrent URL patterns

Some sites use download endpoints without a `.torrent` suffix. Add a custom regular expression for those sites in the extension's settings. For example:

```regex
^https?://example\.com/forum/dl\.php\?t=\d+(?:&.*)?$
```

A matching URL triggers interception; it does not guarantee that the server will return a torrent. Sites requiring a login may still have browser-specific restrictions.

## GitHub Actions and releases

The workflow in `.github/workflows/build.yml`:

- Checks JavaScript syntax and builds Firefox and Chrome packages on pushes and pull requests.
- Verifies ZIP integrity, manifest types, and matching browser versions.
- Checks that a `vX.Y.Z` tag matches the manifest version.
- Uploads unsigned ZIPs as workflow artifacts.
- On version-tag pushes, attempts a **listed Mozilla submission** using GitHub Actions secrets.
- **Creates a GitHub Release and attaches both unsigned ZIPs** if preceding steps succeed.

To publish a *new* release, first update **both** `browsers/firefox/manifest.json` and `browsers/chrome/manifest.json` to the intended version, commit and push, then tag that commit:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Replace `X.Y.Z` with the actual version. **If a tag already exists, do not recreate or force-move it without checking whether it has been distributed.** Fixing the workflow on `main` does not retroactively change the commit referenced by an existing tag; use a new version tag or intentionally rerun a workflow on the appropriate commit.

GitHub Releases do **not** sign Firefox extensions. On version-tag pushes, the workflow also attempts to submit the Firefox build to Mozilla as a **listed** update when the repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` are configured. The GitHub release step follows submission; a failed Mozilla submission can prevent that step from running. Mozilla approval and publication are not immediate or guaranteed. Chrome Web Store publication is not automated.

## Publishing to browser stores

**Firefox:** The GitHub Actions tag workflow uses `web-ext sign --channel listed` to submit an update to the existing [Mozilla Add-ons listing](https://addons.mozilla.org/developers/addons) when `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` are set as GitHub Actions secrets. Mozilla reviews and signs listed versions before distributing them. To submit manually, upload the **unsigned Firefox ZIP** as a **listed** new version in Developer Hub; do not run the unlisted `sign.sh` workflow for public updates. Previously uploaded/deleted version numbers cannot be reused. Do not submit the same version twice.

**Chrome:** Upload the Chrome package to the Chrome Web Store Developer Dashboard, or use **Load unpacked** for local testing. Test the authenticated download fallback in Chrome before publishing.

## Source layout

```text
src/                  Shared launcher UI, styles, icons, and settings
browsers/firefox/     Firefox Manifest V2 and browser-specific scripts
browsers/chrome/      Chrome Manifest V3 and service-worker scripts
scripts/build.py      Browser-specific ZIP packaging
.github/workflows/    CI validation and GitHub Release publishing
screenshots/          Example interface screenshots
dist/                 Generated unsigned ZIPs (not committed)
```

## Privacy and security

No analytics or advertising are included. The extension sends torrent URLs and data to the ruTorrent servers you configure. Credentials and configuration are held in extension storage; do not commit exported settings, session cookies, or tracker passkeys. Use HTTPS for remote servers and see [PRIVACY.md](PRIVACY.md).

## Contributing

Bug reports and pull requests are welcome. Remove private torrent URLs, passkeys, and credentials from logs before sharing. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

## Torrent name preview (v1.0.10)

For HTTP(S) torrent downloads, the launcher initially displays **Loading torrent name…** and asynchronously reads the torrent's `info.name.utf-8` or `info.name` metadata. This displays meaningful names even when the URL ends in `dl.php` or a hexadecimal ID. It uses the existing authenticated tab fallback when needed. If previewing fails, it falls back to the URL-derived name without preventing submission. Magnet-link naming and submission are unchanged. The preview may fetch the torrent separately from the submission request.
