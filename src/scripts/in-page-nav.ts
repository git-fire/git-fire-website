/** In-page anchors only: smooth scroll on click; no global `scroll-behavior: smooth` on html. */
export function initInPageNav() {
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
		const href = anchor.getAttribute('href');
		if (!href || href === '#' || href.length < 2) return;

		anchor.addEventListener('click', (event) => {
			const id = href.slice(1);
			const target = document.getElementById(id);
			if (!target) return;

			event.preventDefault();
			target.scrollIntoView({
				behavior: reduce ? 'auto' : 'smooth',
				block: 'start',
			});
			history.pushState(null, '', href);
		});
	});
}
