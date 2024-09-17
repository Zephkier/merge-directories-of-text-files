let reset = `\x1b[0m`,
    cyan = `\x1b[96m`,
    yellow = `\x1b[33m`,
    red = `\x1b[91m`,
    green = `\x1b[32m`;

let fs = require("fs");
let path = require("path");
let readline = require("readline");
let PDFDocument = require("pdfkit");

let inputDirectoryPath = path.join(__dirname, "input");
let outputDirectoryPath = path.join(__dirname, "output");

let outputFilenamePath;
let outputFilename = "merged";

let invalidFiletypes = [".jpg", ".jpeg", ".png", ".svg", ".psd", ".gif", ".mp4", ".avi"];
let firstPage = true;

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

/**
 * Ensure there is an 'input' folder and that it has files in it.
 */
function ensureInputDirectory() {
    if (!fs.existsSync(inputDirectoryPath)) {
        console.log(red + "Error. No 'input' folder found.");
        console.log(yellow + "Creating 'input' folder...");
        console.log(yellow + "Ensure to put your files in that folder." + reset);
        fs.mkdirSync(inputDirectoryPath);
        process.exit(1);
    }

    if (fs.readdirSync(inputDirectoryPath).length == 0) {
        console.log(red + "Error. No files found in 'input' folder." + reset);
        process.exit(1);
    }
}

/**
 * Prompt user for desired output filetype, and then process it accordingly.
 */
function promptAndProcess_outputFile() {
    rl.question(cyan + "Enter output filetype ('txt' or 'pdf'): " + reset, (userInput) => {
        let outputFiletype = userInput.toLowerCase();
        if (outputFiletype != "txt" && outputFiletype != "pdf") {
            // Keep prompting until user enters valid filetype
            console.log(red + "Invalid filetype. Enter 'txt' or 'pdf' only.\n" + reset);
            promptAndProcess_outputFile();
        } else {
            // Ensure there is an 'output' folder
            if (!fs.existsSync(outputDirectoryPath)) {
                console.log(cyan + "You do not have an 'output' folder.\nCreating 'output' folder..." + reset);
                fs.mkdirSync(outputDirectoryPath);
            }

            // If output file already exists, then delete it
            outputFilenamePath = path.join(outputDirectoryPath, `${outputFilename}.${outputFiletype}`);
            if (fs.existsSync(outputFilenamePath)) fs.unlinkSync(outputFilenamePath);

            // Process output file
            if (outputFiletype == "txt") processOutputFile_txt(inputDirectoryPath);
            else if (outputFiletype == "pdf") processOutputFile_pdf(inputDirectoryPath);

            // Notify user of success
            console.log(green + "Success!");
            console.log(green + `'${outputFilename}.${outputFiletype}' has been created in 'output' folder.` + reset);
            rl.close();
        }
    });
}

/**
 * Process TXT filetype.
 */
function processOutputFile_txt(directory) {
    let objects = fs.readdirSync(directory, { withFileTypes: true });

    // 1. Process all files in current directory
    objects.forEach((object) => {
        let inputFilePath = path.join(directory, object.name);
        let relativeFilePath = path.relative(inputDirectoryPath, inputFilePath);

        if (object.isFile()) {
            // If processing file with any one of the invalid filetypes, then skip it
            let ext = path.extname(inputFilePath).toLowerCase();
            if (invalidFiletypes.includes(ext)) return;

            // Add instructions on first page with line breaks
            if (firstPage) {
                firstPage = false;
                fs.appendFileSync(outputFilenamePath, 'CTRL + F for "----- ----- " to find the start of each file.\n\n');
            }

            // Add file name and then its contents
            fs.appendFileSync(outputFilenamePath, `----- ----- .\\${relativeFilePath} ----- -----\n`);
            fs.appendFileSync(outputFilenamePath, fs.readFileSync(inputFilePath, "utf8") + "\n");
        }
    });

    // 2. Then enter its sub-directories
    objects.forEach((object) => {
        let inputFilePath = path.join(directory, object.name);
        if (object.isDirectory()) processOutputFile_txt(inputFilePath);
    });
}

/**
 * Process PDF filetype.
 */
function processOutputFile_pdf(directory) {
    let doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(outputFilenamePath));
    doc
        // Add instructions on first page
        .fontSize(11)
        .font("Helvetica")
        .text('CTRL + F for "----- ----- " to find the start of each file.')
        .moveDown();

    processPDF(directory, doc);

    doc.end();
}

/**
 * Helper function for processOutputFile_pdf().
 */
function processPDF(directory, doc) {
    let objects = fs.readdirSync(directory, { withFileTypes: true });

    // 1. Process all files in current directory
    objects.forEach((object) => {
        let inputFilePath = path.join(directory, object.name);
        let relativePath = path.relative(inputDirectoryPath, inputFilePath);

        if (object.isFile()) {
            // If processing file with any one of the invalid filetypes, then skip it
            let ext = path.extname(inputFilePath).toLowerCase();
            if (invalidFiletypes.includes(ext)) return;

            // Add page break on second page onwards
            if (firstPage) firstPage = false;
            else doc.addPage();

            doc
                // Add file name and then its contents
                .fontSize(11)
                .font("Helvetica-Bold")
                .text(`----- ----- .\\${relativePath} ----- -----`)
                .font("Courier")
                .fontSize(9)
                .text(fs.readFileSync(inputFilePath, "utf8").replace(/\r\n/g, "\n"));
        }
    });

    // 2. Then enter its sub-directories
    objects.forEach((object) => {
        if (object.isDirectory()) processPDF(path.join(directory, object.name), doc);
    });
}

ensureInputDirectory();
promptAndProcess_outputFile();
