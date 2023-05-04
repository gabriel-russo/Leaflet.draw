const fs = require("fs");
const UglifyJS = require("uglify-js");
const zlib = require("zlib");
const SourceNode = require("source-map").SourceNode;
const UglifyCss = require("uglifycss");

const deps = require("./deps.js").deps;

function getFiles(compsBase32) {
	let memo = {};
	let comps;

	if (compsBase32) {
		comps = parseInt(compsBase32, 32).toString(2).split("");
		console.log("Managing dependencies...");
	}

	function addFiles(srcs) {
		for (let j = 0, len = srcs.length; j < len; j++) {
			memo[srcs[j]] = true;
		}
	}

	for (let i in deps) {
		if (comps) {
			if (parseInt(comps.pop(), 2) === 1) {
				console.log(` * ${i}`);
				addFiles(deps[i].src);
			} else {
				console.log(`      ${i}`);
			}
		} else {
			addFiles(deps[i].src);
		}
	}

	console.log("");

	let files = [];

	// eslint-disable-next-line guard-for-in
	for (let src in memo) {
		files.push(`src/${src}`);
	}

	return files;
}

exports.getFiles = getFiles;

function getSizeDelta(newContent, oldContent, fixCRLF) {
	if (!oldContent) {
		return " (new)";
	}
	if (newContent === oldContent) {
		return " (unchanged)";
	}
	if (fixCRLF) {
		// eslint-disable-next-line no-param-reassign
		newContent = newContent.replace(/\r\n?/g, "\n");
		// eslint-disable-next-line no-param-reassign
		oldContent = oldContent.replace(/\r\n?/g, "\n");
	}

	let delta = newContent.length - oldContent.length;

	return delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta} bytes)`;
}

function loadSilently(path) {
	try {
		return fs.readFileSync(path, "utf8");
	} catch (e) {
		return null;
	}
}

// Concatenate the files while building up a sourcemap for the concatenation,
// and replace the line defining L.version with the string prepared in the jakefile
function bundleFiles(files, copy, version) {
	let node = new SourceNode(null, null, null, "");

	node.add(new SourceNode(null, null, null, `${copy}(function (window, document, undefined) {`));

	for (let i = 0, len = files.length; i < len; i++) {
		let contents = fs.readFileSync(files[i], "utf8");

		if (files[i] === "src/Leaflet.draw.js") {
			contents = contents.replace(
				/drawVersion = '.*'/,
				`drawVersion = ${JSON.stringify(version)}`,
			);
		}

		let lines = contents.split("\n");
		let lineCount = lines.length;
		let fileNode = new SourceNode(null, null, null, "");

		fileNode.setSourceContent(files[i], contents);

		for (let j = 0; j < lineCount; j++) {
			fileNode.add(new SourceNode(j + 1, 0, files[i], `${lines[j]}\n`));
		}
		node.add(fileNode);

		node.add(new SourceNode(null, null, null, "\n\n"));
	}

	node.add(new SourceNode(null, null, null, "}(window, document));"));

	let bundle = node.toStringWithSourceMap();
	return {
		src: bundle.code,
		srcmap: bundle.map.toString(),
	};
}

function bytesToKB(bytes) {
	return `${(bytes / 1024).toFixed(2)} KB`;
}


exports.build = (callback, version, compsBase32, buildName) => {

	let files = getFiles(compsBase32);

	console.log(`Bundling and compressing ${files.length} files...`);

	let copy = fs.readFileSync("src/copyright.js", "utf8").replace("{VERSION}", version);
	let filenamePart = `leaflet.draw${buildName ? `-${buildName}` : ""}`;
	let pathPart = `dist/${filenamePart}`;
	let srcPath = `${pathPart}-src.js`;
	let mapPath = `${pathPart}-src.map`;
	let srcFilename = `${filenamePart}-src.js`;
	let mapFilename = `${filenamePart}-src.map`;

	let bundle = bundleFiles(files, copy, version);
	let newSrc = `${bundle.src}\n//# sourceMappingURL=${mapFilename}`;

	let oldSrc = loadSilently(srcPath);
	let srcDelta = getSizeDelta(newSrc, oldSrc, true);

	let leafletDrawCssPath = "./src/leaflet.draw.css";
	let compressedCssPath = "./dist/leaflet.draw.css";
	let cssSource = loadSilently(leafletDrawCssPath);
	let oldCompressedCss = loadSilently(compressedCssPath);
	let cssSourcePath = "./dist/leaflet.draw-src.css";
	let newCompressedCss;

	try {
		newCompressedCss = UglifyCss.processFiles(
			[leafletDrawCssPath],
			{ maxLineLen: 500, expandVars: true },
		);
	} catch (e) {
		console.error("UglifyCss failed to minify the files");
		console.error(e);
		callback(e);
	}

	let cssSrcDelta = getSizeDelta(newCompressedCss, oldCompressedCss, true);

	console.log(`\tCompressed Css: ${bytesToKB(newCompressedCss.length)}${cssSrcDelta}`);
	try {
		if (newCompressedCss !== oldCompressedCss) {
			fs.writeFileSync(cssSourcePath, cssSource);
			fs.writeFileSync(compressedCssPath, newCompressedCss);
			console.log(`\tSaved to ${srcPath}`);
		}
	} catch (err) {
		console.error("UglifyCSS failed to minify the files");
		console.error(err);
		callback(err);
	}

	console.log(`\tUncompressed Js: ${bytesToKB(newSrc.length)}${srcDelta}`);
	if (newSrc !== oldSrc) {
		fs.writeFileSync(srcPath, newSrc);
		fs.writeFileSync(mapPath, bundle.srcmap);
		console.log(`\tSaved to ${srcPath}`);
	}

	let path = `${pathPart}.js`;
	let oldCompressed = loadSilently(path);
	let newCompressed;

	try {
		newCompressed = copy + UglifyJS.minify(newSrc, {
			warnings: true,
		}).code;
	} catch (err) {
		console.error("UglifyJS failed to minify the files");
		console.error(err);
		callback(err);
	}

	let delta = getSizeDelta(newCompressed, oldCompressed);

	console.log(`\tCompressed: ${bytesToKB(newCompressed.length)}${delta}`);

	let newGzipped;
	let gzippedDelta = "";

	function done() {
		if (newCompressed !== oldCompressed) {
			fs.writeFileSync(path, newCompressed);
			console.log(`\tSaved to ${path}`);
		}
		console.log(`\tGzipped: ${bytesToKB(newGzipped.length)}${gzippedDelta}`);
		callback();
	}

	zlib.gzip(newCompressed, (err, gzipped) => {
		if (err) {
			return;
		}
		newGzipped = gzipped;
		if (oldCompressed && (oldCompressed !== newCompressed)) {
			zlib.gzip(oldCompressed, (err, oldGzipped) => {
				if (err) {
					return;
				}
				gzippedDelta = getSizeDelta(gzipped, oldGzipped);
				done();
			});
		} else {
			done();
		}
	});
};
