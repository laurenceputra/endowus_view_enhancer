const fs = require('fs');
const path = require('path');

function readPackageVersion() {
    const packagePath = path.resolve(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (!packageJson.version) {
        throw new Error('package.json is missing a version field.');
    }
    return packageJson.version;
}

function updateUserscriptVersion(version) {
    const userScriptPath = path.resolve(__dirname, '..', 'tampermonkey', 'goal_portfolio_viewer.user.js');
    const contents = fs.readFileSync(userScriptPath, 'utf8');
    const versionRegex = /^\/\/ @version\s+.+$/m;
    if (!versionRegex.test(contents)) {
        throw new Error('Unable to find // @version metadata in userscript.');
    }
    const updated = contents.replace(versionRegex, `// @version      ${version}`);
    if (updated === contents) {
        return false;
    }
    fs.writeFileSync(userScriptPath, updated);
    return true;
}

function run() {
    const version = readPackageVersion();
    const changed = updateUserscriptVersion(version);
    const message = changed
        ? `Updated userscript version to ${version}.`
        : `Userscript version already at ${version}.`;
    console.log(message);
}

run();
