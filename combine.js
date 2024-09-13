let reset = `\x1b[0m`,
    cyan = `\x1b[96m`,
    yellow = `\x1b[33m`,
    red = `\x1b[91m`,
    green = `\x1b[32m`;

let fs = require("fs");
let path = require("path");
let readline = require("readline");
let PDFDocument = require("pdfkit");

let inputDirectory = path.join(__dirname, "input");
let outputDirectoryPath = path.join(__dirname, "output");

let outputFilename = "merged"; // This is set later
let outputFilenamePath; // This is set later

let invalidFiletypes = [".jpg", ".jpeg", ".png", ".svg", ".psd", ".gif", ".mp4", ".avi"];
let firstPage = true;

// Setup prompt for user input
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Prompt for user input and process output file
function promptAndProcess() {
    // Ensure input directory exists
    if (!fs.existsSync(inputDirectory)) {
        console.log(red + "Error. No 'input' folder found.");
        console.log(yellow + "Creating 'input' folder...");
        console.log(yellow + "Ensure to put your files in that folder." + reset);
        fs.mkdirSync(inputDirectory);
        process.exit(1);
    }

    // Ensure input directory has files inside
    if (fs.readdirSync(inputDirectory).length == 0) {
        console.log(red + "Error. No files found in 'input' folder." + reset);
        process.exit(1);
    }

    rl.question(cyan + "Enter output filetype ('txt' or 'pdf'): " + reset, (userInput) => {
        let outputFiletype = userInput.toLowerCase();
        if (outputFiletype != "txt" && outputFiletype != "pdf") {
            console.log(red + "Invalid filetype. Enter 'txt' or 'pdf' only.\n" + reset);
            promptAndProcess();
        } else {
            outputFilenamePath = path.join(outputDirectoryPath, `${outputFilename}.${outputFiletype}`);

            // Ensure output directory exists
            if (!fs.existsSync(outputDirectoryPath)) {
                console.log(cyan + "You do not have an 'output' folder.\nCreating 'output' folder..." + reset);
                fs.mkdirSync(outputDirectoryPath);
            }

            // If there is existing output file, then delete it
            if (fs.existsSync(outputFilenamePath)) fs.unlinkSync(outputFilenamePath);

            if (outputFiletype == "txt") processOutput_txt(inputDirectory);
            else if (outputFiletype == "pdf") processOutput_pdf(inputDirectory);

            console.log(green + "Success!");
            console.log(green + "Your merged file is saved in 'output' folder." + reset);
            rl.close();
        }
    });
}

// Process output as .txt file
function processOutput_txt(directory) {
    // Read current directory
    let objects = fs.readdirSync(directory, { withFileTypes: true });

    // Process all files in current directory first
    objects.forEach((object) => {
        let inputFilePath = path.join(directory, object.name);
        let relativePath = path.relative(inputDirectory, inputFilePath);

        // Process files
        if (object.isFile()) {
            // Ignore invalid filetypes
            let ext = path.extname(inputFilePath).toLowerCase();
            if (invalidFiletypes.includes(ext)) return;

            // Write file's contents into output file
            fs.appendFileSync(outputFilenamePath, `----- ----- ${relativePath} ----- -----\n`);
            fs.appendFileSync(outputFilenamePath, fs.readFileSync(inputFilePath, "utf8") + "\n");
        }
    });

    // Then process its sub-directories (recursive depth-first search)
    objects.forEach((object) => {
        let inputFilePath = path.join(directory, object.name);
        if (object.isDirectory()) processOutput_txt(inputFilePath);
    });
}

// Process output as .pdf file
function processOutput_pdf(directory) {
    let doc = new PDFDocument();

    // Pipe the PDF document to a writable stream
    doc.pipe(fs.createWriteStream(outputFilenamePath));

    // Write introduction page (with new line break)
    doc
        // Format
        .fontSize(11)
        .font("Helvetica")
        .text('CTRL + F for "----- ----- " to find the start of each file.')
        .moveDown();

    // Helper function for recursive depth-first search processing
    function processPDF(directory) {
        let objects = fs.readdirSync(directory, { withFileTypes: true });

        // Process all files in current directory first
        objects.forEach((object) => {
            let inputFilePath = path.join(directory, object.name);
            let relativePath = path.relative(inputDirectory, inputFilePath);

            if (object.isFile()) {
                // Ignore invalid filetypes
                let ext = path.extname(inputFilePath).toLowerCase();
                if (invalidFiletypes.includes(ext)) return;

                // Read file contents
                let fileContents = fs.readFileSync(inputFilePath, "utf8").replace(/\r\n/g, "\n");

                // Ensure no page break for first file
                if (firstPage) firstPage = false;
                else doc.addPage();

                // Write content
                doc
                    // Format
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .text(`----- ----- ${relativePath} ----- -----`)
                    .font("Courier")
                    .fontSize(9)
                    .text(fileContents);
            }
        });

        // Then process its sub-directories (recursive depth-first search)
        objects.forEach((object) => {
            if (object.isDirectory()) processPDF(path.join(directory, object.name));
        });
    }

    // Call helper function
    processPDF(directory);

    // Finalise PDF file
    doc.end();
}
// Start the prompt for file format
promptAndProcess();
