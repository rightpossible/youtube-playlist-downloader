const YoutubeDownloaderBase = require('./youtube-downloader-base');

class YoutubeSingleDownloader extends YoutubeDownloaderBase {
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
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

// Example usage
async function main() {
    const downloader = new YoutubeSingleDownloader();
    
    // Check dependencies first
    const dependenciesInstalled = await downloader.checkDependencies();
    if (!dependenciesInstalled) {
        console.log('Please install required dependencies and try again');
        return;
    }

    // Predefined videos configuration
    const videosToDownload = [
        {
            videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_1',
            maxHeight: 720
        },
        {
            videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_2',
            maxHeight: 1080
        }
        // Add more videos as needed
    ];

    try {
        // Download all videos sequentially
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