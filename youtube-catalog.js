const API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY';
const CHANNEL_ID = 'UCSRaIF5ziUVYCdsjDFiNosw';

async function fetchChannelVideos() {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?key=${API_KEY}&id=${CHANNEL_ID}&part=contentDetails`
        );
        const channelData = await response.json();
        
        if (channelData.error) {
            console.error('YouTube API Error:', channelData.error.message);
            throw new Error(channelData.error.message);
        }
        
        if (!channelData.items || channelData.items.length === 0) {
            console.error('No channel found with ID:', CHANNEL_ID);
            throw new Error('Channel not found');
        }
        
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        
        const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?key=${API_KEY}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=50`
        );
        const data = await videosResponse.json();
        
        if (data.error) {
            console.error('YouTube API Error:', data.error.message);
            throw new Error(data.error.message);
        }
        
        if (!data.items || data.items.length === 0) {
            console.error('No videos found in channel');
            return [];
        }
        
        return data.items.map(item => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.default.url,
            publishedAt: new Date(item.snippet.publishedAt)
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        const isQuotaError = error.message.includes('quota');
        const blogContainer = document.getElementById('blogAccordion');
        blogContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Error Loading Videos</h4>
                <p>${isQuotaError ? 
                    'Daily API quota exceeded. Please try again tomorrow.' : 
                    'There was an error loading the videos.'}</p>
                <hr>
                <p class="mb-0">Please try again later.</p>
            </div>
        `;
        return [];
    }
}

function groupVideosByYear(videos) {
    return videos.reduce((acc, video) => {
        const year = video.publishedAt.getFullYear();
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(video);
        return acc;
    }, {});
}

function createYearSection(year, videos) {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'accordion-item';
    yearDiv.innerHTML = `
        <h2 class="accordion-header">
            <button class="accordion-button ${year !== new Date().getFullYear() ? 'collapsed' : ''}" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#collapse${year}">
                ${year}
            </button>
        </h2>
        <div id="collapse${year}" 
             class="accordion-collapse collapse ${year === new Date().getFullYear() ? 'show' : ''}"
             data-bs-parent="#blogAccordion">
            <div class="accordion-body">
                <ul class="list-unstyled video-list">
                    ${videos.map(video => `
                        <li class="video-item" data-video-id="${video.id}">
                            <a href="#" class="blog-link" onclick="loadVideo('${video.id}', '${video.title}', \`${video.description}\`); return false;">
                                <div class="video-thumbnail">
                                    <img src="${video.thumbnail}" alt="${video.title}">
                                </div>
                                <div class="video-info">
                                    <span class="video-title">${video.title}</span>
                                    <span class="video-date">${video.publishedAt.toLocaleDateString()}</span>
                                </div>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    return yearDiv;
}

async function loadVideo(videoId, title, description) {
    // Reset any existing mini video state
    const existingVideo = document.querySelector('.video-container.mini');
    if (existingVideo) {
        existingVideo.classList.remove('mini');
        existingVideo.style.transform = '';
    }

    // Update video container
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.innerHTML = `
        <iframe width="560" height="315" 
                src="https://www.youtube.com/embed/${videoId}?rel=0" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
    `;

    // Scroll to top when loading new video
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // Show loading state
    const blogText = document.querySelector('.blog-text');
    blogText.innerHTML = `
        <h1>${title}</h1>
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading location information...</span>
            </div>
        </div>
        <div class="content-marathi">
            <p>${description}</p>
        </div>
    `;

    try {
        // Extract location from title
        const locationName = extractLocationName(title);
        
        // Fetch location information from Wikipedia
        const locationInfo = await fetchLocationInfo(locationName);
        
        // Update blog text with location information
        blogText.innerHTML = `
            <h1>${title}</h1>
            <div class="location-info">
                <h2>About ${locationName}</h2>
                ${locationInfo}
            </div>
            <div class="content-marathi mt-4">
                <h3>Video Description</h3>
                <p>${description}</p>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching location info:', error);
        blogText.innerHTML = `
            <h1>${title}</h1>
            <div class="content-marathi">
                <p>${description}</p>
            </div>
        `;
    }
}

function extractLocationName(title) {
    // Common words to remove
    const removeWords = ['vlog', 'travel', 'trip', 'tour', 'visiting', 'exploring', 'journey', 'to', 'in', 'at', 'the'];
    const removePattern = new RegExp(`\\b(${removeWords.join('|')})\\b`, 'gi');
    
    // Clean the title
    let cleanTitle = title.toLowerCase()
        .replace(removePattern, '')  // Remove common words
        .replace(/[^\w\s]/g, '')    // Remove special characters
        .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
        .trim();
    
    // Split into words and take the longest word/phrase as it's likely the location name
    const words = cleanTitle.split(' ');
    return words.reduce((a, b) => a.length > b.length ? a : b);
}

async function fetchLocationInfo(locationName) {
    try {
        // First, search Wikipedia for the location
        const searchResponse = await fetch(
            `https://en.wikipedia.org/w/api.php?` +
            `action=query&list=search&srsearch=${encodeURIComponent(locationName)}` +
            `&format=json&origin=*`
        );
        const searchData = await searchResponse.json();
        
        if (!searchData.query.search.length) {
            throw new Error('No Wikipedia article found');
        }
        
        // Get the first result's page ID
        const pageId = searchData.query.search[0].pageid;
        
        // Fetch the actual content
        const contentResponse = await fetch(
            `https://en.wikipedia.org/w/api.php?` +
            `action=query&pageids=${pageId}&prop=extracts&exintro=1&explaintext=1` +
            `&format=json&origin=*`
        );
        const contentData = await contentResponse.json();
        
        const extract = contentData.query.pages[pageId].extract;
        
        // Format the content
        return `
            <div class="location-description">
                ${extract.split('\n').map(para => `<p>${para}</p>`).join('')}
                <p class="text-muted mt-3">
                    <small>Source: Wikipedia</small>
                </p>
            </div>
        `;
    } catch (error) {
        console.error('Wikipedia API error:', error);
        throw error;
    }
}

function generateBlogEntries(videos) {
    const blogContainer = document.getElementById('blogAccordion');
    const videosByYear = groupVideosByYear(videos);
    
    // Sort years in descending order (newest first)
    const sortedYears = Object.entries(videosByYear).sort((a, b) => b[0] - a[0]);
    
    sortedYears.forEach(([year, yearVideos]) => {
        // Sort videos within each year by date (newest first)
        yearVideos.sort((a, b) => b.publishedAt - a.publishedAt);
        const yearSection = createYearSection(year, yearVideos);
        blogContainer.appendChild(yearSection);
    });
    
    // Load the latest video by default
    if (videos.length > 0) {
        const latestVideo = videos.sort((a, b) => b.publishedAt - a.publishedAt)[0];
        loadVideo(latestVideo.id, latestVideo.title, latestVideo.description);
    }
}

// Initialize the catalog when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const videos = await fetchChannelVideos();
    generateBlogEntries(videos);

    // Throttled scroll handler
    window.addEventListener('scroll', throttle(function() {
        const videoContainer = document.getElementById('videoContainer');
        if (!videoContainer) return;

        const rect = videoContainer.getBoundingClientRect();
        const isOutOfView = rect.top < 70;

        if (isOutOfView && !videoContainer.classList.contains('mini')) {
            videoContainer.classList.add('mini');
            videoContainer.style.transform = '';
        } else if (!isOutOfView && videoContainer.classList.contains('mini')) {
            videoContainer.classList.remove('mini');
            videoContainer.style.transform = '';
        }
    }, 50));
});

// Throttle scroll event handler
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
} 