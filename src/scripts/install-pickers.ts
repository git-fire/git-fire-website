export type ProductId = 'git-fire' | 'git-rain';
type OsFamily = 'macos' | 'windows' | 'linux' | 'go';

const STORAGE_KEY_OS = 'git-fire-site-install-os';
const STORAGE_KEY_LINUX_METHOD = 'git-fire-site-install-linux-method';
const STORAGE_KEY_WIN_METHOD = 'git-fire-site-install-windows-method';

const PLATFORM_ORDER: OsFamily[] = ['macos', 'windows', 'linux', 'go'];

const LINUX_METHOD_LABELS: Record<string, string> = {
	deb: '.deb (APT)',
	rpm: '.rpm (DNF/YUM)',
	script: 'curl install script',
	brew: 'Homebrew (Linux)',
	manual: 'Binary archive (manual)',
};

const WIN_METHOD_LABELS: Record<string, string> = {
	winget: 'winget',
	manual: 'Binary (manual)',
};

function coerceOs(value: string | undefined): OsFamily | null {
	if (value === 'macos' || value === 'windows' || value === 'linux' || value === 'go') return value;
	return null;
}

function detectOs(): OsFamily {
	if (typeof navigator === 'undefined') return 'go';
	const uaData = navigator.userAgentData;
	if (uaData?.platform) {
		const p = uaData.platform.toLowerCase();
		if (p.includes('win')) return 'windows';
		if (p.includes('mac')) return 'macos';
		if (p.includes('linux')) return 'linux';
	}
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes('windows')) return 'windows';
	if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
	if (ua.includes('linux') || ua.includes('android')) return 'linux';
	return 'go';
}

/** Best-effort from browser user agent only — many Linux browsers omit distro. */
function detectLinuxPackageFamily(): 'deb' | 'rpm' | 'unknown' {
	if (typeof navigator === 'undefined') return 'unknown';
	const ua = navigator.userAgent.toLowerCase();
	if (
		/\b(fedora|rhel|red hat|centos|cent stream|rocky|alma|scientific|oracle linux|opensuse|tumbleweed|suse linux|gecko\s*linux|amazon linux|amzn|mageia|pclinuxos|miracle\s*linux|nobara|ultramarine|openmandriva)\b/.test(
			ua,
		)
	) {
		return 'rpm';
	}
	if (
		/\b(ubuntu|debian|linux mint|pop[_!]os|elementary|kali|raspberry|raspbian|neon|zorin|parrot|deepin|mx linux|bodhi|devuan|knoppix|bunsenlabs|linux lite|kubuntu|xubuntu|lubuntu|edubuntu|ubuntu studio|linuxfx)\b/.test(
			ua,
		)
	) {
		return 'deb';
	}
	return 'unknown';
}

function storedOs(): OsFamily | null {
	try {
		const v = sessionStorage.getItem(STORAGE_KEY_OS);
		if (v === 'macos' || v === 'windows' || v === 'linux' || v === 'go') return v;
	} catch {
		/* private mode */
	}
	return null;
}

function persistOs(value: OsFamily) {
	try {
		sessionStorage.setItem(STORAGE_KEY_OS, value);
	} catch {
		/* ignore */
	}
}

function storedLinuxMethod(): string | null {
	try {
		return sessionStorage.getItem(STORAGE_KEY_LINUX_METHOD);
	} catch {
		return null;
	}
}

function persistLinuxMethod(id: string) {
	try {
		sessionStorage.setItem(STORAGE_KEY_LINUX_METHOD, id);
	} catch {
		/* ignore */
	}
}

function storedWindowsMethod(): string | null {
	try {
		return sessionStorage.getItem(STORAGE_KEY_WIN_METHOD);
	} catch {
		return null;
	}
}

function persistWindowsMethod(id: string) {
	try {
		sessionStorage.setItem(STORAGE_KEY_WIN_METHOD, id);
	} catch {
		/* ignore */
	}
}

function orderedLinuxMethodIds(product: ProductId): string[] {
	const fam = detectLinuxPackageFamily();
	if (product === 'git-fire') {
		return orderPool(fam, ['script', 'deb', 'rpm', 'brew'] as const);
	}
	return orderPool(fam, ['script', 'deb', 'rpm', 'brew', 'manual'] as const);
}

function orderPool<T extends string>(fam: 'deb' | 'rpm' | 'unknown', neutralOrder: readonly T[]): T[] {
	const neutral = [...neutralOrder];
	if (fam === 'deb' && neutral.some((x) => x === 'deb')) {
		return ['deb' as T, ...neutral.filter((x) => x !== 'deb')];
	}
	if (fam === 'rpm' && neutral.some((x) => x === 'rpm')) {
		return ['rpm' as T, ...neutral.filter((x) => x !== 'rpm')];
	}
	return neutral;
}

function buildMethodDefs(product: ProductId, os: OsFamily): { id: string; label: string }[] {
	if (os === 'windows') {
		return [
			{ id: 'winget', label: WIN_METHOD_LABELS.winget },
			{ id: 'manual', label: WIN_METHOD_LABELS.manual },
		];
	}
	if (os === 'linux') {
		return orderedLinuxMethodIds(product).map((id) => ({
			id,
			label: LINUX_METHOD_LABELS[id] ?? id,
		}));
	}
	return [];
}

function coerceMethodForRoot(root: HTMLElement, choice: string): string {
	const product = root.dataset.product as ProductId;
	const os = selectedOs(root);
	const ids = buildMethodDefs(product, os).map((d) => d.id);
	if (ids.includes(choice)) return choice;
	return ids[0] ?? choice;
}

function getEffectiveMethodForRoot(root: HTMLElement): string {
	const product = root.dataset.product as ProductId;
	const os = selectedOs(root);
	const ids = buildMethodDefs(product, os).map((d) => d.id);
	if (ids.length === 0) return 'winget';
	const raw = os === 'linux' ? storedLinuxMethod() : os === 'windows' ? storedWindowsMethod() : null;
	if (raw && ids.includes(raw)) return raw;
	return ids[0]!;
}

function linuxDetectHint(): string {
	const fam = detectLinuxPackageFamily();
	if (fam === 'deb') {
		return 'Your browser’s user agent looks DEB-based (best-effort). Installers that match are listed first.';
	}
	return 'Your browser’s user agent looks RPM-based (best-effort). Installers that match are listed first.';
}

function commandMacosGo(product: ProductId, os: OsFamily): { command: string; note: string } {
	if (product === 'git-fire') {
		if (os === 'macos') {
			return {
				command: 'brew tap git-fire/tap\nbrew install git-fire',
				note: 'Requires Homebrew. Same commands work on Linuxbrew.',
			};
		}
		return {
			command: 'go install github.com/git-fire/git-fire@latest',
			note: 'Requires Go 1.24.2+. Ensure $HOME/go/bin is on your PATH.',
		};
	}
	if (os === 'macos') {
		return {
			command: 'brew tap git-fire/tap\nbrew install git-rain',
			note: 'Requires Homebrew.',
		};
	}
	return {
		command: 'go install github.com/git-fire/git-rain@latest',
		note: 'Requires Go 1.24.2+. Ensure $HOME/go/bin is on your PATH.',
	};
}

function fireLinuxDeb(): { command: string; note: string } {
	return {
		command: 'sudo dpkg -i ./git-fire_<version>_amd64.deb',
		note: 'Download the matching .deb from GitHub Releases and replace <version> with the release tag (for example v0.2.0). Verify checksums when you can.',
	};
}

function fireLinuxRpm(): { command: string; note: string } {
	return {
		command: 'sudo dnf install ./git-fire_<version>_amd64.rpm',
		note: 'Download the matching .rpm from GitHub Releases and replace <version> with the release tag. On older systems you can use yum instead of dnf. Verify checksums when you can.',
	};
}

function fireLinuxScript(): { command: string; note: string } {
	return {
		command:
			'curl -fsSL https://raw.githubusercontent.com/git-fire/git-fire/main/scripts/install.sh | bash',
		note: 'Remote code — inspect scripts/install.sh in the repo first when you have time. Prefer release assets + checksums for production rollouts.',
	};
}

function fireLinuxBrew(): { command: string; note: string } {
	return {
		command: 'brew tap git-fire/tap\nbrew install git-fire',
		note: 'Homebrew on Linux (Linuxbrew). Same tap as macOS.',
	};
}

function rainLinuxBrew(): { command: string; note: string } {
	return {
		command: 'brew tap git-fire/tap\nbrew install git-rain',
		note: 'Homebrew on Linux (Linuxbrew). Same tap as macOS.',
	};
}

function rainLinuxScript(): { command: string; note: string } {
	return {
		command:
			'curl -fsSL https://raw.githubusercontent.com/git-fire/git-rain/main/scripts/install.sh | bash',
		note: 'Installs from GitHub release assets with checksum verification. Inspect scripts/install.sh in git-fire/git-rain before piping to bash if you want to review it first.',
	};
}

function rainLinuxDeb(): { command: string; note: string } {
	return {
		command: 'sudo dpkg -i ./git-rain_<version>_amd64.deb',
		note: 'Download the .deb from GitHub Releases and replace <version> with the published tag. Verify checksums when you can.',
	};
}

function rainLinuxRpm(): { command: string; note: string } {
	return {
		command: 'sudo dnf install ./git-rain_<version>_amd64.rpm',
		note: 'Download the .rpm from GitHub Releases and replace <version> with the published tag. Verify checksums when you can.',
	};
}

function rainLinuxManual(): { command: string; note: string } {
	return {
		command:
			'# Download the archive for your platform from GitHub Releases, extract, then:\nchmod +x git-rain\nsudo mv git-rain /usr/local/bin/',
		note: 'Official “binary archive” path from the git-rain README — place the binary on your PATH.',
	};
}

function fireWindowsWinget(): { command: string; note: string } {
	return {
		command: 'winget install git-fire',
		note: 'If the short ID is not available yet: winget install git-fire.git-fire',
	};
}

function fireWindowsManual(): { command: string; note: string } {
	return {
		command:
			'# Download git-fire.exe for your arch from GitHub Releases, then in PowerShell:\nNew-Item -ItemType Directory -Force "$env:USERPROFILE\\bin" | Out-Null\nMove-Item .\\git-fire.exe "$env:USERPROFILE\\bin\\git-fire.exe" -Force',
		note: 'Add %USERPROFILE%\\bin to your user PATH if it is not already there (see git-fire README).',
	};
}

function rainWindowsWinget(): { command: string; note: string } {
	return {
		command: 'winget install git-rain',
		note: 'Windows Package Manager (winget). If the short ID is not available yet: winget install git-rain.git-rain',
	};
}

function rainWindowsManual(): { command: string; note: string } {
	return {
		command:
			'# Download git-rain.exe for your arch from GitHub Releases, then in PowerShell:\nNew-Item -ItemType Directory -Force "$env:USERPROFILE\\bin" | Out-Null\nMove-Item .\\git-rain.exe "$env:USERPROFILE\\bin\\git-rain.exe" -Force',
		note: 'Add %USERPROFILE%\\bin to your user PATH if it is not already there (see git-rain README).',
	};
}

function resolveCommand(product: ProductId, os: OsFamily, methodId: string): { command: string; note: string } {
	if (os === 'macos' || os === 'go') return commandMacosGo(product, os);
	if (os === 'windows') {
		if (product === 'git-fire') {
			return methodId === 'manual' ? fireWindowsManual() : fireWindowsWinget();
		}
		return methodId === 'manual' ? rainWindowsManual() : rainWindowsWinget();
	}
	if (product === 'git-fire') {
		switch (methodId) {
			case 'deb':
				return fireLinuxDeb();
			case 'rpm':
				return fireLinuxRpm();
			case 'brew':
				return fireLinuxBrew();
			case 'script':
			default:
				return fireLinuxScript();
		}
	}
	switch (methodId) {
		case 'rpm':
			return rainLinuxRpm();
		case 'brew':
			return rainLinuxBrew();
		case 'manual':
			return rainLinuxManual();
		case 'script':
			return rainLinuxScript();
		case 'deb':
		default:
			return rainLinuxDeb();
	}
}

function selectedOs(root: HTMLElement): OsFamily {
	const active = root.querySelector<HTMLButtonElement>(
		'[data-install-platform][aria-checked="true"]',
	);
	return coerceOs(active?.dataset.installPlatform) ?? PLATFORM_ORDER[0];
}

function syncPlatformButtons(root: HTMLElement, os: OsFamily) {
	root.querySelectorAll<HTMLButtonElement>('[data-install-platform]').forEach((btn) => {
		const v = coerceOs(btn.dataset.installPlatform);
		const isSelected = v === os;
		btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
		btn.tabIndex = isSelected ? 0 : -1;
		btn.classList.toggle('install-picker__platform-btn--active', isSelected);
	});
}

function syncMethodButtons(root: HTMLElement, methodId: string) {
	root.querySelectorAll<HTMLButtonElement>('[data-install-method]').forEach((btn) => {
		const isSelected = btn.dataset.installMethod === methodId;
		btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
		btn.tabIndex = isSelected ? 0 : -1;
		btn.classList.toggle('install-picker__method-btn--active', isSelected);
	});
}

function ensureMethodControls(root: HTMLElement, product: ProductId, os: OsFamily) {
	const area = root.querySelector<HTMLElement>('[data-install-method-area]');
	const group = root.querySelector<HTMLElement>('[data-install-method-radiogroup]');
	if (!area || !group) return;

	if (os !== 'linux' && os !== 'windows') {
		area.hidden = true;
		area.setAttribute('aria-hidden', 'true');
		return;
	}

	area.hidden = false;
	area.removeAttribute('aria-hidden');

	const rebuildKey = `${product}:${os}`;
	if (root.dataset.installMethodBuilt !== rebuildKey) {
		root.dataset.installMethodBuilt = rebuildKey;
		group.replaceChildren();
		for (const def of buildMethodDefs(product, os)) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.role = 'radio';
			btn.setAttribute('aria-checked', 'false');
			btn.className = 'install-picker__method-btn';
			btn.dataset.installMethod = def.id;
			btn.textContent = def.label;
			btn.tabIndex = -1;
			group.append(btn);
		}
	}

	const effective = getEffectiveMethodForRoot(root);
	syncMethodButtons(root, effective);
}

function updateDetectHint(root: HTMLElement, os: OsFamily) {
	const hint = root.querySelector<HTMLElement>('[data-install-detect-hint]');
	if (!hint) return;
	if (os === 'linux' && detectLinuxPackageFamily() !== 'unknown') {
		hint.hidden = false;
		hint.textContent = linuxDetectHint();
	} else {
		hint.hidden = true;
		hint.textContent = '';
	}
}

function updateCommandBlock(root: HTMLElement) {
	const product = root.dataset.product as ProductId;
	if (product !== 'git-fire' && product !== 'git-rain') return;

	const pre = root.querySelector<HTMLElement>('[data-install-command]');
	const noteEl = root.querySelector<HTMLElement>('[data-install-note]');
	if (!pre || !noteEl) return;

	const os = selectedOs(root);
	const block =
		os === 'linux' || os === 'windows'
			? resolveCommand(product, os, getEffectiveMethodForRoot(root))
			: commandMacosGo(product, os);
	pre.textContent = block.command;
	noteEl.textContent = block.note;
}

function renderPicker(root: HTMLElement) {
	const product = root.dataset.product as ProductId;
	if (product !== 'git-fire' && product !== 'git-rain') return;

	const os = selectedOs(root);
	ensureMethodControls(root, product, os);
	updateDetectHint(root, os);
	updateCommandBlock(root);
}

function setPlatformEverywhere(os: OsFamily) {
	persistOs(os);
	document.querySelectorAll<HTMLElement>('[data-install-picker]').forEach((root) => {
		syncPlatformButtons(root, os);
		renderPicker(root);
	});
}

function setInstallMethodEverywhere(os: OsFamily, rawMethodId: string) {
	if (os === 'linux') persistLinuxMethod(rawMethodId);
	else if (os === 'windows') persistWindowsMethod(rawMethodId);
	else return;

	document.querySelectorAll<HTMLElement>('[data-install-picker]').forEach((root) => {
		if (selectedOs(root) !== os) return;
		const effective = coerceMethodForRoot(root, rawMethodId);
		syncMethodButtons(root, effective);
		updateCommandBlock(root);
	});
}

function bindPlatformRadiogroup(root: HTMLElement) {
	const group = root.querySelector<HTMLElement>('.install-picker__platforms');
	const buttons = root.querySelectorAll<HTMLButtonElement>('[data-install-platform]');
	if (!group || buttons.length === 0) return;

	group.addEventListener('keydown', (event) => {
		if (!(event.target instanceof HTMLButtonElement)) return;
		if (!event.target.matches('[data-install-platform]')) return;

		const current = coerceOs(event.target.dataset.installPlatform);
		if (!current) return;

		let next: OsFamily | null = null;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown': {
				event.preventDefault();
				const i = PLATFORM_ORDER.indexOf(current);
				next = PLATFORM_ORDER[Math.min(i + 1, PLATFORM_ORDER.length - 1)];
				break;
			}
			case 'ArrowLeft':
			case 'ArrowUp': {
				event.preventDefault();
				const i = PLATFORM_ORDER.indexOf(current);
				next = PLATFORM_ORDER[Math.max(i - 1, 0)];
				break;
			}
			case 'Home': {
				event.preventDefault();
				next = PLATFORM_ORDER[0];
				break;
			}
			case 'End': {
				event.preventDefault();
				next = PLATFORM_ORDER[PLATFORM_ORDER.length - 1];
				break;
			}
			default:
				return;
		}

		if (next) {
			setPlatformEverywhere(next);
			queueMicrotask(() => {
				root.querySelector<HTMLButtonElement>(`[data-install-platform="${next}"]`)?.focus();
			});
		}
	});

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const os = coerceOs(btn.dataset.installPlatform);
			if (os) setPlatformEverywhere(os);
		});
	});
}

function bindMethodInteraction(root: HTMLElement) {
	root.addEventListener('click', (event) => {
		const t = event.target;
		if (!(t instanceof Element)) return;
		const btn = t.closest<HTMLButtonElement>('[data-install-method]');
		if (!btn || !root.contains(btn)) return;
		const os = selectedOs(root);
		if (os !== 'linux' && os !== 'windows') return;
		const id = btn.dataset.installMethod;
		if (!id) return;
		setInstallMethodEverywhere(os, id);
	});

	root.addEventListener('keydown', (event) => {
		if (!(event.target instanceof HTMLButtonElement)) return;
		if (!event.target.matches('[data-install-method]')) return;
		const os = selectedOs(root);
		if (os !== 'linux' && os !== 'windows') return;

		const group = root.querySelector<HTMLElement>('[data-install-method-radiogroup]');
		if (!group?.contains(event.target)) return;

		const order = [...group.querySelectorAll<HTMLButtonElement>('[data-install-method]')].map(
			(b) => b.dataset.installMethod ?? '',
		);
		const current = event.target.dataset.installMethod ?? '';
		const idx = order.indexOf(current);
		if (idx < 0) return;

		let nextIdx: number | null = null;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				nextIdx = Math.min(idx + 1, order.length - 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				nextIdx = Math.max(idx - 1, 0);
				break;
			case 'Home':
				event.preventDefault();
				nextIdx = 0;
				break;
			case 'End':
				event.preventDefault();
				nextIdx = order.length - 1;
				break;
			default:
				return;
		}
		if (nextIdx === null) return;
		const nextId = order[nextIdx];
		if (nextId) {
			setInstallMethodEverywhere(os, nextId);
			queueMicrotask(() => {
				root.querySelector<HTMLButtonElement>(`[data-install-method="${nextId}"]`)?.focus();
			});
		}
	});
}

function bindPicker(root: HTMLElement) {
	const product = root.dataset.product as ProductId;
	if (product !== 'git-fire' && product !== 'git-rain') return;

	const copyBtn = root.querySelector<HTMLButtonElement>('[data-install-copy]');
	if (!copyBtn) return;

	const initial = storedOs() ?? detectOs();
	syncPlatformButtons(root, initial);
	renderPicker(root);

	bindPlatformRadiogroup(root);
	bindMethodInteraction(root);

	copyBtn.addEventListener('click', async () => {
		const pre = root.querySelector<HTMLElement>('[data-install-command]');
		const text = pre?.textContent ?? '';
		try {
			await navigator.clipboard.writeText(text);
			copyBtn.textContent = 'Copied';
			setTimeout(() => {
				copyBtn.textContent = 'Copy';
			}, 1600);
		} catch {
			copyBtn.textContent = 'Copy failed';
			setTimeout(() => {
				copyBtn.textContent = 'Copy';
			}, 1600);
		}
	});
}

export function initInstallPickers() {
	document.querySelectorAll<HTMLElement>('[data-install-picker]').forEach(bindPicker);
}
