const { exec } = require('child_process');
const YoutubeDownloaderBase = require('./youtube-downloader-base');

class YoutubeSingleDownloader extends YoutubeDownloaderBase {
    constructor() {
        super();
        // Simplified options that don't require browser cookies
        this.defaultOptions = [
            '--no-check-certificates',
            '--geo-bypass',
            '--format-sort-force',
            '--ignore-errors',
            '--no-warnings',
            '--extractor-retries 3',
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
            '--add-header "Accept-Language: en-US,en;q=0.9"',
            '--sleep-interval 2',  // Reduced delay between downloads
            '--max-sleep-interval 4',
            '--fragment-retries 10',
            '--force-ipv4',
            '--no-playlist',      // Ensure single video download
            '--merge-output-format mp4'  // Force MP4 output
        ].join(' ');
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
                            resolve('Download completed successfully');
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
    const downloader = new YoutubeSingleDownloader();
    
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    // Predefined videos configuration
    const videosToDownload = [
        {
            videoUrl: 'https://www.youtube.com/watch?v=9e3D5Ed4rRs',
            maxHeight: 360
        },
        // Example of another video
        {
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            maxHeight: 720
        }
    ];

    try {
        for (const video of videosToDownload) {
            console.log(`Starting download for: ${video.videoUrl}`);
            await downloader.downloadSingleVideo(video);
            console.log(`Completed download for: ${video.videoUrl}`);
        }
        console.log('All videos downloaded successfully!');
    } catch (error) {
        console.error('Download failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = YoutubeSingleDownloader; 