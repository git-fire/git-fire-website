const ATTR = 'data-reveal';

export function initRevealOnScroll() {
	const els = document.querySelectorAll<HTMLElement>(`[${ATTR}]`);
	if (!els.length) return;

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		for (const el of els) el.classList.add('is-revealed');
		return;
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const el = entry.target as HTMLElement;
				const delay = el.dataset.revealDelay;
				const ms = delay ? Number.parseInt(delay, 10) : 0;
				const run = () => {
					el.classList.add('is-revealed');
					io.unobserve(el);
				};
				if (ms > 0) window.setTimeout(run, ms);
				else run();
			}
		},
		{ root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
	);

	for (const el of els) io.observe(el);
}
