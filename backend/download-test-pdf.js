const fs = require('fs');
const path = require('path');
const axios = require('axios');

const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const outputPath = path.join(__dirname, 'uploads', 'test.pdf');

async function downloadPDF() {
    try {
        console.log(`Downloading PDF from ${pdfUrl}...`);
        const response = await axios({
            method: 'get',
            url: pdfUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`PDF downloaded successfully to ${outputPath}`);
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading PDF:', error.message);
    }
}

downloadPDF();
