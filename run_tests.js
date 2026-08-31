// Node.js test runner for test_standalone.html
const fs = require('fs');

const html = fs.readFileSync('test_standalone.html', 'utf8');

// Extract all <script> blocks
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
}

// Mock DOM
global.document = {
    getElementById: function(id) {
        return { textContent: '' };
    }
};
global.window = { onerror: null };

// Combine all scripts except the first one (which is just the error handler setup)
// and the last one (which is the test runner that uses document)
let combinedJs = '';
for (let i = 1; i < scripts.length; i++) {
    combinedJs += scripts[i] + '\n';
}

// Replace the DOM-based output with console output
// The last script block is the test runner
combinedJs = combinedJs.replace(
    /document\.getElementById\('output'\)\.textContent\s*=\s*lines\.join\('\\n'\)/g,
    'console.log(lines.join("\\n"))'
);
combinedJs = combinedJs.replace(
    /document\.getElementById\('output'\)\.textContent\s*=\s*'Tests defined: '\s*\+\s*T\.length\s*\+\s*' tests'/g,
    'console.log("Tests defined: " + T.length + " tests")'
);
combinedJs = combinedJs.replace(
    /document\.title\s*=\s*'DONE:'.*?;/g,
    ''
);
combinedJs = combinedJs.replace(
    /document\.getElementById\('output'\)\.textContent\s*\+=\s*'\\nRUN ERROR:.*?;/g,
    'console.log("RUN ERROR: " + e.message + "\\n" + e.stack);'
);

try {
    eval(combinedJs);
} catch(e) {
    console.log('EVAL ERROR: ' + e.message);
    console.log(e.stack);
}
