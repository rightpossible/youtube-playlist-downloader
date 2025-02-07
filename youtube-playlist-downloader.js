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
            ? `bestvideo[height<=${maxHeight}]+bestaudio/best`
            : 'bestvideo+bestaudio/best';

        const command = `yt-dlp -f "${formatString}" -o "${downloadPath}/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s" ${playlistUrl}`;

        return new Promise((resolve, reject) => {
            const process = exec(command);

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
}

// Example usage
async function main() {
    const downloader = new YoutubePlaylistDownloader();
    
    // Check dependencies first
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    // Predefined playlists configuration
    const playlistsToDownload = [
        {
            playlistUrl: 'https://www.youtube.com/playlist?list=PLOuGMjEXHeeDa-NZ_Y3-fKuIN9rRTzD5G',
            maxHeight: 720
        },
        // {
        //     playlistUrl: 'https://www.youtube.com/playlist?list=YOUR_SECOND_PLAYLIST',
        //     maxHeight: 1080
        // }
        // Add more playlists as needed
    ];

    try {
        // Using the existing downloadMultiplePlaylists method
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