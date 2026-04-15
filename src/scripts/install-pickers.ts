export type ProductId = 'git-fire' | 'git-rain';
type OsFamily = 'macos' | 'windows' | 'linux' | 'go';

const STORAGE_KEY = 'git-fire-site-install-os';

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

function storedOs(): OsFamily | null {
	try {
		const v = sessionStorage.getItem(STORAGE_KEY);
		if (v === 'macos' || v === 'windows' || v === 'linux' || v === 'go') return v;
	} catch {
		/* private mode */
	}
	return null;
}

function persistOs(value: OsFamily) {
	try {
		sessionStorage.setItem(STORAGE_KEY, value);
	} catch {
		/* ignore */
	}
}

function commandBlock(product: ProductId, os: OsFamily): { command: string; note: string } {
	if (product === 'git-fire') {
		switch (os) {
			case 'macos':
				return {
					command: 'brew tap git-fire/tap\nbrew install git-fire',
					note: 'Requires Homebrew. Same commands work on Linuxbrew.',
				};
			case 'windows':
				return {
					command: 'winget install git-fire',
					note: 'If the short ID is not available yet: winget install git-fire.git-fire',
				};
			case 'linux':
				return {
					command:
						'curl -fsSL https://raw.githubusercontent.com/git-fire/git-fire/main/scripts/install.sh | bash',
					note: 'Remote code — inspect scripts/install.sh in the repo first when you have time. Prefer release assets + checksums for production rollouts.',
				};
			case 'go':
			default:
				return {
					command: 'go install github.com/git-fire/git-fire@latest',
					note: 'Requires Go 1.24.2+. Ensure $HOME/go/bin is on your PATH.',
				};
		}
	}

	// git-rain
	switch (os) {
		case 'macos':
			return {
				command: 'brew tap git-fire/tap\nbrew install git-rain',
				note: 'Requires Homebrew.',
			};
		case 'windows':
			return {
				command: 'winget install git-rain.git-rain',
				note: 'Windows Package Manager (winget).',
			};
		case 'linux':
			return {
				command:
					'# Download .deb or .rpm from GitHub Releases, then:\n# Debian/Ubuntu:\nsudo dpkg -i ./git-rain_<version>_amd64.deb\n\n# Fedora/RHEL:\nsudo dnf install ./git-rain_<version>_amd64.rpm',
				note: 'There is no first-party curl installer for git-rain — use packages from Releases or Go install.',
			};
		case 'go':
		default:
			return {
				command: 'go install github.com/git-fire/git-rain@latest',
				note: 'Requires Go 1.24.2+. Ensure $HOME/go/bin is on your PATH.',
			};
	}
}

function bindPicker(root: HTMLElement) {
	const product = root.dataset.product as ProductId;
	if (product !== 'git-fire' && product !== 'git-rain') return;

	const select = root.querySelector<HTMLSelectElement>('[data-install-select]');
	const pre = root.querySelector<HTMLElement>('[data-install-command]');
	const noteEl = root.querySelector<HTMLElement>('[data-install-note]');
	const copyBtn = root.querySelector<HTMLButtonElement>('[data-install-copy]');

	if (!select || !pre || !noteEl || !copyBtn) return;

	const initial = storedOs() ?? detectOs();
	select.value = initial;

	function render() {
		const os = select.value as OsFamily;
		const { command, note } = commandBlock(product, os);
		pre.textContent = command;
		noteEl.textContent = note;
	}

	select.addEventListener('change', () => {
		persistOs(select.value as OsFamily);
		render();
	});

	copyBtn.addEventListener('click', async () => {
		const text = pre.textContent ?? '';
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

	render();
}

export function initInstallPickers() {
	document.querySelectorAll<HTMLElement>('[data-install-picker]').forEach(bindPicker);
}
