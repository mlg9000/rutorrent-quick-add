/* Shared appearance preference; independent of server settings. */
(() => {
  const apply = value => {
    const mode = ['light','dark','system'].includes(value) ? value : 'system';
    document.documentElement.dataset.theme = mode;
  };
  apply('system');
  browser.storage.local.get('theme').then(({theme}) => apply(theme)).catch(() => {});
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.theme) apply(changes.theme.newValue);
  });
})();
