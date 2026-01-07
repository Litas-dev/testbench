const fs = require('fs');
const pngToIco = require('png-to-ico');
const path = require('path');
const Jimp = require('jimp');

async function convert() {
    const inputFile = path.join(__dirname, 'build/icon.png');
    const tempFile = path.join(__dirname, 'build/temp_icon_square.png');
    const outputFile = path.join(__dirname, 'build/icon.ico');

    console.log('Reading image...');
    
    // Old Jimp API: Jimp.read returns a promise
    const image = await Jimp.read(inputFile);
    
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    const maxDim = Math.max(w, h);

    console.log(`Original dimensions: ${w}x${h}`);

    if (w !== h) {
        console.log(`Containing to square ${maxDim}x${maxDim}...`);
        // contain centers the image in the new dimensions
        image.contain(maxDim, maxDim);
    } else {
        console.log('Image is already square.');
    }

    // Write temp file
    // Jimp 0.x uses writeAsync or write
    await image.writeAsync(tempFile);
    
    console.log(`Created temp square image at ${tempFile}`);

    // Now convert to ICO
    console.log('Converting to ICO...');
    
    // pngToIco takes file path
    const converter = pngToIco.default || pngToIco;
    
    try {
        const buf = await converter(tempFile);
        fs.writeFileSync(outputFile, buf);
        console.log('Successfully created build/icon.ico');
        
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    } catch (err) {
        console.error('Error converting to ICO:', err.message); // Log message only
        process.exit(1);
    }
}

convert().catch(err => {
    console.error('Unhandled error:', err.message);
    process.exit(1);
});
