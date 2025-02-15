const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const YoutubeDownloaderBase = require('./youtube-downloader-base');

class YoutubePlaylistDownloader extends YoutubeDownloaderBase {
    constructor() {
        super();
        this.basePath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'playlists');
        
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }

        // Enhanced options to bypass restrictions
        this.defaultOptions = [
            '--no-check-certificates',
            '--geo-bypass',
            '--format-sort-force',
            '--ignore-errors',
            '--no-warnings',
            '--extractor-retries 3',
            '--cookies-from-browser chrome',  // Use Chrome cookies
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"',
            '--add-header "Accept-Language: en-US,en;q=0.9"',
            '--sleep-interval 5',  // Add delay between downloads
            '--max-sleep-interval 10',
            '--fragment-retries 10',
            '--force-ipv4'  // Force IPv4 to avoid some restrictions
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
     * Downloads a YouTube playlist
     * @param {Object} config - Playlist configuration
     * @param {string} config.playlistUrl - The YouTube playlist URL
     * @param {number} config.maxHeight - Maximum video height (optional)
     * @param {string} config.outputPath - Custom output path (optional)
     */
    async downloadPlaylist({ playlistUrl, maxHeight, outputPath }) {
        if (!playlistUrl) {
            throw new Error('Playlist URL is required');
        }

        const downloadPath = outputPath || this.basePath;
        
        const formatString = maxHeight 
            ? `bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`
            : 'bestvideo+bestaudio/best';

        const command = `yt-dlp ${this.defaultOptions} -f "${formatString}" -o "${downloadPath}/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s" "${playlistUrl}"`;

        console.log('Debug: Starting download with command:', command);

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                return await new Promise((resolve, reject) => {
                    const process = exec(command);
                    let outputLog = '';
                    let errorLog = '';

                    process.stdout.on('data', (data) => {
                        outputLog += data;
                        console.log(data.toString());
                    });

                    process.stderr.on('data', (data) => {
                        errorLog += data;
                        console.error(data.toString());
                    });

                    process.on('close', (code) => {
                        if (code === 0 || code === 1) { // Accept code 1 as some videos might fail
                            resolve('Download completed with some videos');
                        } else {
                            reject(new Error(`Download failed with code ${code}\nError log: ${errorLog}`));
                        }
                    });
                });
            } catch (error) {
                retryCount++;
                console.log(`Retry attempt ${retryCount}/${maxRetries}...`);
                if (retryCount === maxRetries) {
                    throw error;
                }
                // Wait longer between retries
                await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
            }
        }
    }
}

// Example usage
async function main() {
    const downloader = new YoutubePlaylistDownloader();
    
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    const playlistsToDownload = [
        {
            playlistUrl: 'https://www.youtube.com/playlist?list=PLFLYQXBx1eBnq7bHJUkdH_C_rOXM17mLw',
            maxHeight: 720
        }
    ];

    try {
        await downloader.downloadMultiplePlaylists(playlistsToDownload);
    } catch (error) {
        console.error('Download failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = YoutubePlaylistDownloader; 