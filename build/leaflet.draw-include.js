(function() {
	function getFiles() {
		let memo = {};
		let files = [];
		let i;
		let src;

		function addFiles(srcs) {
			for (let j = 0, len = srcs.length; j < len; j++) {
				memo[srcs[j]] = true;
			}
		}

		// eslint-disable-next-line guard-for-in
		for (i in deps) {
			addFiles(deps[i].src);
		}

		// eslint-disable-next-line guard-for-in
		for (src in memo) {
			files.push(src);
		}

		return files;
	}

	let scripts = getFiles();

	function getSrcUrl() {
		let scripts = document.getElementsByTagName("script");
		for (let i = 0; i < scripts.length; i++) {
			let { src } = scripts[i];
			if (src) {
				let res = src.match(/^(.*)leaflet.draw-include\.js$/);
				if (res) {
					return `${res[1]}../src/`;
				}
			}
		}
	}

	let path = getSrcUrl();
	for (let i = 0; i < scripts.length; i++) {
		document.writeln(`<script src="${path}${scripts[i]}"></script>`);
	}
})();
