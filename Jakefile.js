/*
 Leaflet.draw building and linting scripts.

 To use, install Node, then run the following commands in the project root:

 npm install -g jake
 npm install

 To check the code for errors and build Leaflet from source, run "jake".
 To run the tests, run "jake test". To build the documentation, run "jake docs".

 For a custom build, open build/build.html in the browser and follow the instructions.
 */
let git = require("git-rev");
const { jake, task, desc } = require("jake");
const build = require("./build/build.js");
const buildDocs = require("./build/docs");
const { version } = require("./package.json").version;


function hint(msg, args) {
	return () => {
		console.log(msg);
		jake.exec(`node node_modules/eslint/bin/eslint.js ${args}`,
			{ printStdout: true }, () => {
				console.log("\tCheck passed.\n");
				complete();
			});
	};
}

// Returns the version string in package.json, plus a semver build metadata if
// this is not an official release
function calculateVersion(officialRelease, callback) {

	if (officialRelease) {
		callback(version);
	} else {
		git.short((str) => {
			callback(`${version}+${str}`);
		});
	}
}

desc("Check Leaflet.draw source for errors with ESHint");
task("lint", { async: true }, hint("Checking for JS errors...", "src"));

desc("Check Leaflet.draw specs source for errors with ESLint");
task("lintspec", { async: true }, hint("Checking for specs JS errors...", "spec/suites"));

desc("Combine and compress Leaflet Draw source files");
task("build", { async: true }, (compsBase32, buildName, officialRelease) => {
	calculateVersion(officialRelease, (v) => {
		build.build(complete, v, compsBase32, buildName);
	});
});

desc("Build documentation");
task("docs", {}, () => {
	buildDocs();
});

task("default", ["build", "test"]);
