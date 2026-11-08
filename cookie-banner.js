// A tiny self-hosted cookie notice, styled after the wpcc.io one this site used before that service disappeared.
(function() {

	var STORAGE_KEY = 'cookie-notice-dismissed';
	var MESSAGE = 'This website uses cookies so I can have share buttons &amp; some analytics available.';
	var BUTTON_TEXT = 'Okay!';

	function isDismissed() {
		try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
	}

	function setDismissed() {
		try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* private mode etc., just show it again next time */ }
	}

	function show() {

		if (isDismissed()) {
			return;
		}

		var style = document.createElement('style');
		style.textContent =
			'#cookie-notice {' +
				'position: fixed; right: 1em; bottom: 1em; z-index: 9999;' +
				'max-width: 22em; box-sizing: border-box;' +
				'display: flex; align-items: center; gap: 1em;' +
				'padding: 0.8em 1em; border: 1px solid #555; border-radius: 4px;' +
				'background-color: #eee; color: #555;' +
				'font-family: "Open Sans", Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.4;' +
				'font-style: normal; text-transform: none; letter-spacing: normal; text-align: left;' +
				'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);' +
			'}' +
			'#cookie-notice button {' +
				'flex-shrink: 0; cursor: pointer;' +
				'padding: 0.5em 1em; border: none; border-radius: 4px;' +
				'background-color: #555; color: #eee;' +
				'font: inherit; font-weight: 700; text-transform: inherit;' +
			'}' +
			'#cookie-notice button:hover { background-color: #333; }' +
			'@media (max-width: 480px) { #cookie-notice { left: 1em; max-width: none; } }';
		document.head.appendChild(style);

		var notice = document.createElement('div');
		notice.id = 'cookie-notice';
		notice.setAttribute('role', 'region');
		notice.setAttribute('aria-label', 'Cookie notice');
		notice.innerHTML = '<span>' + MESSAGE + '</span><button type="button">' + BUTTON_TEXT + '</button>';
		notice.querySelector('button').addEventListener('click', function() {
			setDismissed();
			notice.parentNode.removeChild(notice);
		});
		document.body.appendChild(notice);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', show);
	} else {
		show();
	}

})();
