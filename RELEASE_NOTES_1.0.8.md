# v1.0.8

- Firefox: authenticated same-origin page-context retry for torrent download endpoints requiring a website session.
- Chrome: equivalent retry using Chrome MV3 callback messaging and originating tab ID.
- Responsive destination grid and larger launcher window.
- Diagnostics for non-torrent HTML redirects without logging query parameters.

## Testing
Firefox fallback was confirmed working by the user in a temporary add-on. Chrome has been syntax-checked and packaged but requires browser testing against the affected site.

## Release
Run `python3 scripts/build.py` to create both unsigned ZIPs. Update the existing GitHub repository with these files, then tag `v1.0.8`. Firefox signing and Chrome Web Store submission are separate.
