const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class YoutubeDownloader {
    constructor() {
        // Default download path - you can modify this
        this.basePath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'playlists');
        
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
     * Downloads multiple YouTube playlists concurrently
     * @param {Array<Object>} playlists - Array of playlist configurations
     * @param {string} playlists[].playlistUrl - The YouTube playlist URL
     * @param {number} playlists[].maxHeight - Maximum video height (optional)
     * @param {string} playlists[].outputPath - Custom output path (optional)
     */
    async downloadMultiplePlaylists(playlists) {
        if (!Array.isArray(playlists) || playlists.length === 0) {
            throw new Error('Please provide an array of playlist configurations');
        }

        console.log(`Starting download of ${playlists.length} playlists...`);

        try {
            // Download all playlists concurrently
            const downloadPromises = playlists.map((playlist, index) => {
                return this.downloadPlaylist(playlist)
                    .then(() => console.log(`Playlist ${index + 1} completed successfully`))
                    .catch(error => console.error(`Playlist ${index + 1} failed:`, error.message));
            });

            await Promise.all(downloadPromises);
            console.log('All downloads completed!');
        } catch (error) {
            console.error('Error in batch download:', error.message);
            throw error;
        }
    }

    /**
     * Downloads a YouTube playlist in best quality
     * @param {string} playlistUrl - The YouTube playlist URL
     * @param {Object} options - Download options
     * @param {number} options.maxHeight - Maximum video height (e.g., 1080)
     * @param {string} options.outputPath - Custom output path (optional)
     */
    async downloadPlaylist({ playlistUrl, maxHeight, outputPath }) {
        if (!playlistUrl) {
            throw new Error('Playlist URL is required');
        }

        const downloadPath = outputPath || this.basePath;
        
        // Construct the format string based on maxHeight
        const formatString = maxHeight 
            ? `bestvideo[height<=${maxHeight}]+bestaudio/best`
            : 'bestvideo+bestaudio/best';

        const command = `yt-dlp -f "${formatString}" -o "${downloadPath}/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s" ${playlistUrl}`;

        return new Promise((resolve, reject) => {
            const process = exec(command);

            // Stream the output to console
            process.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            process.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve('Download completed successfully');
                } else {
                    reject(new Error(`Download failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Downloads a single YouTube video with enhanced error handling
     * @param {Object} videoConfig - Video download configuration
     * @param {string} videoConfig.videoUrl - The YouTube video URL
     * @param {number} videoConfig.maxHeight - Maximum video height (e.g., 1080)
     * @param {string} videoConfig.outputPath - Custom output path (optional)
     * @returns {Promise} - Resolves when download completes
     */
    async downloadSingleVideo({ videoUrl, maxHeight, outputPath }) {
        if (!videoUrl) {
            throw new Error('Video URL is required');
        }

        console.log(`Starting download for video: ${videoUrl}`);
        const downloadPath = outputPath || this.basePath;
        
        // Construct the format string based on maxHeight
        const formatString = maxHeight 
            ? `bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`
            : 'bestvideo+bestaudio/best';

        const command = `yt-dlp ${this.defaultOptions} -f "${formatString}" --output "${downloadPath}/%(title)s.%(ext)s" "${videoUrl}"`;

        console.log('Debug: Executing command:', command); // Debug log

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                return await new Promise((resolve, reject) => {
                    const process = exec(command);
                    let outputLog = '';
                    let errorLog = '';

                    // Stream the output to console for debugging
                    process.stdout.on('data', (data) => {
                        outputLog += data;
                        console.log(data.toString());
                    });

                    process.stderr.on('data', (data) => {
                        errorLog += data;
                        console.error(data.toString());
                    });

                    process.on('close', (code) => {
                        if (code === 0) {
                            resolve('Video download completed successfully');
                        } else {
                            // Create detailed error message
                            const errorMessage = `Download failed (attempt ${retryCount + 1}/${maxRetries}):\nExit code: ${code}\nError log: ${errorLog}`;
                            reject(new Error(errorMessage));
                        }
                    });
                });
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw error;
                }
                console.log(`Retry attempt ${retryCount}/${maxRetries}...`);
                // Wait for 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
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

// Replace the main function with these separate functions
async function downloadSingle() {
    const downloader = new YoutubeDownloader();
    
    // Check dependencies first
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    // Example for downloading a single video
    // const singleVideo = {
    //     videoUrl: 'https://www.youtube.com/watch?v=7f50sQYjNRA',
    //     maxHeight: 1080,
    // };

    try {
        console.log('Starting single video download...');
        await downloader.downloadSingleVideo(singleVideo);
        console.log('Single video download completed!');
    } catch (error) {
        console.error('Download failed with details:', error.message);
        process.exit(1);
    }
}

async function downloadPlaylist() {
    const downloader = new YoutubeDownloader();
    
    // Check dependencies first
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    const playlistsToDownload = [
        {
            playlistUrl: 'https://www.youtube.com/playlist?list=PLOuGMjEXHeeDa-NZ_Y3-fKuIN9rRTzD5G',
            maxHeight: 720,
        },
        // Add more playlists as needed
    ];

    try {
        console.log('Starting playlist downloads...');
        await downloader.downloadMultiplePlaylists(playlistsToDownload);
    } catch (error) {
        console.error('Download failed with details:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments to determine which function to run
const command = process.argv[2];

switch (command) {
    case 'single':
        downloadSingle();
        break;
    case 'playlist':
        downloadPlaylist();
        break;
    default:
        console.log(`
Usage: node youtube-downloader.js <command>

Commands:
  single    Download a single video
  playlist  Download playlist(s)

Examples:
  node youtube-downloader.js single
  node youtube-downloader.js playlist
        `);
} 