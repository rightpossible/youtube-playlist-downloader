const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class YoutubeDownloaderBase {
    constructor() {
        // Default download path - you can modify this
        this.basePath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'youtube-downloads');
        
        // Create base directory if it doesn't exist
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }

        // Add default options for yt-dlp
        this.defaultOptions = [
            '--no-check-certificates',  // Skip HTTPS verification
            '--geo-bypass',            // Bypass geo-restriction
            '--format-sort-force',     // Force format sorting
            '--ignore-errors',         // Continue on download errors
            '--no-warnings',           // Suppress warnings
            '--extractor-retries 3'    // Retry 3 times if extraction fails
        ].join(' ');
    }

    /**
     * Checks if required dependencies are installed
     */
    async checkDependencies() {
        try {
            await Promise.all([
                this.executeCommand('yt-dlp --version'),
                this.executeCommand('ffmpeg -version')
            ]);
            return true;
        } catch (error) {
            console.error('Missing dependencies. Please install yt-dlp and ffmpeg');
            return false;
        }
    }

    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });
    }
}

module.exports = YoutubeDownloaderBase; 