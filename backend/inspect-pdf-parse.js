const pdfParse = require('pdf-parse');
console.log('Type of pdfParse:', typeof pdfParse);
if (typeof pdfParse === 'function') {
    console.log('pdfParse is a function');
} else {
    console.log('Keys:', Object.keys(pdfParse));
    console.log('Has default?', !!pdfParse.default);
}
