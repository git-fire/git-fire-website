/** In-page anchors only: smooth scroll on click; no global `scroll-behavior: smooth` on html. */
export function initInPageNav() {
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const navLinks = document.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]');

	navLinks.forEach((anchor) => {
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

	// Highlight active nav link based on which section is in view
	const sectionIds = Array.from(navLinks)
		.map((a) => a.getAttribute('href')?.slice(1))
		.filter(Boolean) as string[];

	if (!sectionIds.length) return;

	const setActive = (id: string | null) => {
		navLinks.forEach((a) => {
			const matches = id && a.getAttribute('href') === `#${id}`;
			a.setAttribute('aria-current', matches ? 'true' : 'false');
		});
	};

	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					setActive(entry.target.id);
					break;
				}
			}
		},
		{ rootMargin: '-5% 0px -50% 0px', threshold: 0 },
	);

	sectionIds.forEach((id) => {
		const el = document.getElementById(id);
		if (el) io.observe(el);
	});
}
