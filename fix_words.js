
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'specialist', 'words.ejs');

try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    // split by newline, preserving line breaks? No, just split
    const lines = fileContent.split(/\r?\n/);

    console.log(`Total lines: ${lines.length}`);

    if (lines.length > 370) {
        console.log(`Line 16 content: ${lines[15]}`);
        console.log(`Line 364 content: ${lines[363]}`);

        // Keep 0..14 (15 lines) and 363..end
        const newLines = [...lines.slice(0, 15), ...lines.slice(363)];

        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log('Successfully removed lines 16-363.');
    } else {
        console.log('File is too short, possibly already modified.');
    }

} catch (e) {
    console.error(`Error: ${e.message}`);
}
