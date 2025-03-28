# PNG Gallery Webapp Pseudocode

## Core Components

### 1. Main Gallery Interface
```pseudocode
class Gallery {
    // State
    imageEntries = []
    directoryHandle = null
    originalImageOrder = []
    currentPage = 1
    itemsPerPage = 20
    cache = new Map()
    keywordCloud = new Map() // Stores keyword frequencies
    
    // UI Elements
    galleryContainer = null
    hamburgerMenu = null
    searchPanel = null
    modalViewer = null
    toastNotifications = null
    paginationControls = null
    keywordPanel = null
    
    // Initialize
    async function init() {
        try {
            // Wait for DOM to be ready
            await this.waitForDOMReady()
            
            // Initialize UI elements
            await this.initializeUIElements()
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Load saved state
            await this.loadSavedState()
            
            // Setup error boundary
            this.setupErrorBoundary()
            
            // Initial render
            this.renderGallery()
        } catch (error) {
            handleError(error, 'gallery_init')
            showToast('Failed to initialize gallery', 'error')
        }
    }
    
    // DOM Ready Check
    function waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve)
            } else {
                resolve()
            }
        })
    }
    
    // UI Element Initialization
    async function initializeUIElements() {
        const requiredElements = {
            galleryContainer: '#gallery-container',
            hamburgerMenu: '#hamburger-menu',
            searchPanel: '#search-panel',
            modalViewer: '#modal-viewer',
            toastNotifications: '#toast-notifications',
            paginationControls: '#pagination-controls',
            keywordPanel: '#keyword-panel'
        }
        
        for (const [elementName, selector] of Object.entries(requiredElements)) {
            const element = document.querySelector(selector)
            if (!element) {
                throw new Error(`Required element not found: ${selector}`)
            }
            this[elementName] = element
        }
    }
    
    // Event Listener Setup
    function setupEventListeners() {
        if (!this.galleryContainer) {
            throw new Error('Gallery container not initialized')
        }
        
        // Gallery container events
        this.galleryContainer.addEventListener('click', this.handleGalleryClick.bind(this))
        
        // Hamburger menu events
        if (this.hamburgerMenu) {
            this.hamburgerMenu.addEventListener('click', this.toggleMenu.bind(this))
        }
        
        // Search panel events
        if (this.searchPanel) {
            const searchInput = this.searchPanel.querySelector('#search-input')
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300))
            }
        }
        
        // Modal viewer events
        if (this.modalViewer) {
            this.modalViewer.addEventListener('click', this.handleModalClick.bind(this))
            document.addEventListener('keydown', this.handleModalKeyboard.bind(this))
        }
        
        // Pagination events
        if (this.paginationControls) {
            this.paginationControls.addEventListener('click', this.handlePagination.bind(this))
        }
    }
    
    // Event Handlers
    function handleGalleryClick(event) {
        const target = event.target
        const thumbnail = target.closest('.thumbnail')
        
        if (thumbnail) {
            const index = parseInt(thumbnail.dataset.index)
            if (!isNaN(index)) {
                this.showFullImage(index)
            }
        }
    }
    
    function handleSearch(event) {
        const query = event.target.value.trim()
        this.searchImages(query)
    }
    
    function handleModalClick(event) {
        if (event.target === this.modalViewer) {
            this.closeModal()
        }
    }
    
    function handleModalKeyboard(event) {
        if (event.key === 'Escape') {
            this.closeModal()
        } else if (event.key === 'ArrowLeft') {
            this.navigateModal('prev')
        } else if (event.key === 'ArrowRight') {
            this.navigateModal('next')
        }
    }
    
    function handlePagination(event) {
        const target = event.target
        if (target.matches('.page-button')) {
            const page = parseInt(target.dataset.page)
            if (!isNaN(page)) {
                this.goToPage(page)
            }
        }
    }
    
    // Utility Functions
    function debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }
    
    // Cleanup
    function cleanup() {
        // Remove event listeners
        if (this.galleryContainer) {
            this.galleryContainer.removeEventListener('click', this.handleGalleryClick)
        }
        if (this.hamburgerMenu) {
            this.hamburgerMenu.removeEventListener('click', this.toggleMenu)
        }
        if (this.searchPanel) {
            const searchInput = this.searchPanel.querySelector('#search-input')
            if (searchInput) {
                searchInput.removeEventListener('input', this.handleSearch)
            }
        }
        if (this.modalViewer) {
            this.modalViewer.removeEventListener('click', this.handleModalClick)
            document.removeEventListener('keydown', this.handleModalKeyboard)
        }
        if (this.paginationControls) {
            this.paginationControls.removeEventListener('click', this.handlePagination)
        }
        
        // Clear cache
        this.cache.clear()
        
        // Revoke object URLs
        this.imageEntries.forEach(entry => {
            if (entry.objectUrl) {
                URL.revokeObjectURL(entry.objectUrl)
            }
        })
    }
    
    // File Management
    async function loadDirectory() {
        try {
            const dirHandle = await window.showDirectoryPicker()
            directoryHandle = dirHandle
            await processDirectory(dirHandle)
            await saveState()
        } catch (error) {
            handleError(error, 'directory_load')
            showToast('Failed to load directory', 'error')
        }
    }
    
    async function addFiles() {
        try {
            const fileHandles = await window.showOpenFilePicker({
                types: [{ description: 'PNG Files', accept: { 'image/png': ['.png'] } }],
                multiple: true
            })
            await processFiles(fileHandles)
            await saveState()
        } catch (error) {
            handleError(error, 'file_add')
            showToast('Failed to add files', 'error')
        }
    }
    
    // Gallery Display
    function renderGallery() {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const pageItems = imageEntries.slice(startIndex, endIndex)
        
        // Clear existing thumbnails
        galleryContainer.innerHTML = ''
        
        // Create thumbnail elements with virtualization
        pageItems.forEach(item => {
            if (!cache.has(item.handle.name)) {
                const thumbnail = createThumbnail(item)
                cache.set(item.handle.name, thumbnail)
            }
            galleryContainer.appendChild(cache.get(item.handle.name).cloneNode(true))
        })
        
        updatePagination()
        this.updateKeywordCloud() // Update keyword cloud when gallery is rendered
    }
    
    // Search and Filter
    async function searchImages(query) {
        const sanitizedQuery = sanitizeInput(query)
        
        // Check for spelling errors
        const misspelledWords = spellChecker.checkText(sanitizedQuery)
        if (misspelledWords.length > 0) {
            showSpellingSuggestions(misspelledWords)
        }
        
        const results = imageEntries.filter(entry => {
            return (
                entry.handle.name.toLowerCase().includes(sanitizedQuery) ||
                entry.metadata.Keywords?.toLowerCase().includes(sanitizedQuery)
            )
        })
        updateSearchResults(results)
    }
    
    function showSpellingSuggestions(misspelledWords) {
        const suggestionsContainer = document.createElement('div')
        suggestionsContainer.className = 'spelling-suggestions'
        
        misspelledWords.forEach(({ word, suggestions }) => {
            const suggestionElement = document.createElement('div')
            suggestionElement.className = 'suggestion-item'
            suggestionElement.innerHTML = `
                <span class="misspelled">${word}</span>
                <span class="suggestions">
                    ${suggestions.map(s => `<button class="suggestion">${s}</button>`).join('')}
                </span>
            `
            suggestionsContainer.appendChild(suggestionElement)
        })
        
        searchPanel.appendChild(suggestionsContainer)
    }
    
    // State Management
    async function saveState() {
        try {
            const state = {
                imageEntries: imageEntries.map(entry => ({
                    handle: entry.handle,
                    metadata: entry.metadata
                })),
                currentPage,
                originalImageOrder
            }
            await StorageManager.saveState(state)
        } catch (error) {
            handleError(error, 'state_save')
        }
    }
    
    async function loadSavedState() {
        try {
            const state = await StorageManager.loadState()
            if (state) {
                imageEntries = state.imageEntries
                currentPage = state.currentPage
                originalImageOrder = state.originalImageOrder
            }
        } catch (error) {
            handleError(error, 'state_load')
        }
    }
    
    // Sorting Functions
    function sortByName()
    function sortByDate()
    function sortBySize()
    function sortByColor()
    function restoreOrder()
    
    // Image Operations
    function showFullImage(index) {
        // Display modal
        // Load high-res image
        // Setup navigation
        // Handle keyboard shortcuts
    }
    
    function deleteImage(index) {
        // Remove from entries
        // Update storage
        // Refresh gallery
    }
    
    // Add spell checker instance
    spellChecker = new SpellChecker()
    
    // Add new method to update keyword cloud
    function updateKeywordCloud() {
        keywordCloud.clear()
        
        // Collect keywords from all images
        imageEntries.forEach(entry => {
            if (entry.metadata?.Keywords) {
                const keywords = entry.metadata.Keywords.split(',').map(k => k.trim())
                keywords.forEach(keyword => {
                    if (keyword) {
                        keywordCloud.set(keyword, (keywordCloud.get(keyword) || 0) + 1)
                    }
                })
            }
        })
        
        // Render keyword cloud
        this.renderKeywordCloud()
    }
    
    // Add new method to render keyword cloud
    function renderKeywordCloud() {
        if (!this.keywordPanel) return
        
        // Clear existing keywords
        this.keywordPanel.innerHTML = ''
        
        // Create keyword elements
        const sortedKeywords = Array.from(keywordCloud.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by frequency
        
        sortedKeywords.forEach(([keyword, count]) => {
            const keywordElement = document.createElement('div')
            keywordElement.className = 'keyword-tag'
            keywordElement.innerHTML = `
                <span class="keyword-text">${keyword}</span>
                <span class="keyword-count">${count}</span>
            `
            
            // Add click handler for filtering
            keywordElement.addEventListener('click', () => {
                this.filterByKeyword(keyword)
            })
            
            this.keywordPanel.appendChild(keywordElement)
        })
    }
    
    // Add new method to filter by keyword
    function filterByKeyword(keyword) {
        const filteredEntries = imageEntries.filter(entry => {
            if (!entry.metadata?.Keywords) return false
            const keywords = entry.metadata.Keywords.split(',').map(k => k.trim())
            return keywords.includes(keyword)
        })
        
        this.updateSearchResults(filteredEntries)
        showToast(`Showing images with keyword: ${keyword}`, 'info')
    }
}
```

### 2. PNG Metadata Editor

```pseudocode
class PNGEditor {
    // State
    currentImage
    metadata
    originalImage
    undoStack = []
    redoStack = []
    
    // Initialize
    function init() {
        loadImageFromURL()
        setupEditorUI()
        loadExistingMetadata()
        setupValidation()
    }
    
    // Core Functions
    async function loadImage(imageUrl) {
        try {
            const response = await fetch(imageUrl)
            if (!response.ok) throw new Error('Failed to load image')
            
            const blob = await response.blob()
            if (!isValidPNG(blob)) throw new Error('Invalid PNG file')
            
            currentImage = blob
            originalImage = blob.clone()
            displayImage(blob)
        } catch (error) {
            handleError(error, 'image_load')
            showToast('Failed to load image', 'error')
        }
    }
    
    async function writeMetadata(metadata) {
        try {
            if (!validateMetadata(metadata)) {
                throw new Error('Invalid metadata')
            }
            
            const modifiedImage = await createModifiedPNG(currentImage, metadata)
            await saveImage(modifiedImage)
            showToast('Metadata saved successfully', 'success')
        } catch (error) {
            handleError(error, 'metadata_write')
            showToast('Failed to save metadata', 'error')
        }
    }
    
    // Validation
    async function validateMetadata(metadata) {
        const schema = {
            Title: { type: 'string', maxLength: 100 },
            Author: { type: 'string', maxLength: 50 },
            Description: { type: 'string', maxLength: 500 },
            Keywords: { type: 'string', maxLength: 200 }
        }
        
        const isValid = validateAgainstSchema(metadata, schema)
        if (!isValid) return false
        
        // Check spelling in text fields
        for (const [field, value] of Object.entries(metadata)) {
            if (typeof value === 'string') {
                const misspelledWords = spellChecker.checkText(value)
                if (misspelledWords.length > 0) {
                    showMetadataSpellingSuggestions(field, misspelledWords)
                }
            }
        }
        
        return true
    }
    
    function showMetadataSpellingSuggestions(field, misspelledWords) {
        const suggestionsContainer = document.createElement('div')
        suggestionsContainer.className = 'metadata-spelling-suggestions'
        
        misspelledWords.forEach(({ word, suggestions }) => {
            const suggestionElement = document.createElement('div')
            suggestionElement.className = 'metadata-suggestion-item'
            suggestionElement.innerHTML = `
                <span class="field">${field}:</span>
                <span class="misspelled">${word}</span>
                <span class="suggestions">
                    ${suggestions.map(s => `<button class="suggestion">${s}</button>`).join('')}
                </span>
            `
            suggestionsContainer.appendChild(suggestionElement)
        })
        
        metadataEditor.appendChild(suggestionsContainer)
    }
    
    // Cleanup
    function cleanup() {
        URL.revokeObjectURL(/* ... existing object URLs ... */)
        undoStack = []
        redoStack = []
        removeEventListeners()
    }
}
```

### 3. Storage Management
```pseudocode
class StorageManager {
    // Constants
    MAX_STORAGE_SIZE = 5MB
    COMPRESSION_THRESHOLD = 1MB
    
    // Functions
    async function saveState(state) {
        try {
            const serializedState = JSON.stringify(state)
            if (serializedState.length > MAX_STORAGE_SIZE) {
                await compressState(state)
            }
            await localStorage.setItem('gallery_state', serializedState)
        } catch (error) {
            handleError(error, 'state_save')
        }
    }
    
    async function compressState(state) {
        // Implement compression logic
        // Consider using IndexedDB for larger states
    }
    
    async function loadState() {
        try {
            const serializedState = localStorage.getItem('gallery_state')
            return serializedState ? JSON.parse(serializedState) : null
        } catch (error) {
            handleError(error, 'state_load')
            return null
        }
    }
    
    async function saveCustomWords(words) {
        try {
            await localStorage.setItem('custom_words', JSON.stringify(words))
        } catch (error) {
            handleError(error, 'custom_words_save')
        }
    }
    
    async function getCustomWords() {
        try {
            const words = localStorage.getItem('custom_words')
            return words ? JSON.parse(words) : []
        } catch (error) {
            handleError(error, 'custom_words_load')
            return []
        }
    }
}
```

### 4. UI Components
```pseudocode
class UIComponents {
    // Toast Notifications
    function showToast(message, type) {
        // Create toast element
        // Add to container
        // Animate in/out
        // Auto-remove
    }
    
    // Modal Viewer
    function showModal(image) {
        // Create modal
        // Load image
        // Setup navigation
        // Handle keyboard
    }
    
    // Thumbnail Grid
    function createThumbnail(imageData) {
        // Create container
        // Add image
        // Add metadata
        // Add controls
    }
    
    // Search Panel
    function updateSearchPanel() {
        // Update results count
        // Update filters
        // Update tags
    }
    
    // Add new method for keyword tag styling
    function createKeywordTag(keyword, count) {
        const tag = document.createElement('div')
        tag.className = 'keyword-tag'
        
        // Calculate font size based on frequency (min 12px, max 24px)
        const fontSize = Math.min(24, Math.max(12, 12 + (count * 2)))
        tag.style.fontSize = `${fontSize}px`
        
        tag.innerHTML = `
            <span class="keyword-text">${keyword}</span>
            <span class="keyword-count">${count}</span>
        `
        
        return tag
    }
}
```

## Data Structures

### Image Entry
```pseudocode
class ImageEntry {
    handle: {
        name: string
        size: number
        lastModified: number
    }
    base64Data: string
    metadata: {
        Name: string
        Size: string
        Type: string
        Last Modified: string
        Title?: string
        Author?: string
        Description?: string
        Keywords?: string
    }
}
```

### PNG Metadata
```pseudocode
class PNGMetadata {
    // Text Chunks
    tEXt: {
        Title: string
        Author: string
        Description: string
        Keywords: string
        Software: string
        Creation Time: string
    }
    
    // Functions
    function readChunks(pngData)
    function writeChunks(pngData)
    function validateMetadata()
}
```

## Event Flow

1. Application Start
   - Load saved state
   - Initialize UI
   - Setup event listeners

2. File Operations
   - User selects directory/files
   - Process files
   - Extract metadata
   - Store in gallery
   - Update UI

3. Gallery Operations
   - Display thumbnails
   - Handle search/filter
   - Manage sorting
   - Handle selection

4. Image Editing
   - Open editor
   - Load image
   - Edit metadata
   - Save changes
   - Update gallery

5. Storage Management
   - Monitor space
   - Compress when needed
   - Handle errors
   - Maintain state

## Error Handling

```pseudocode
function handleError(error, context) {
    console.error(`Error in ${context}:`, error)
    // Log to error tracking service
    // Attempt recovery if possible
    // Prevent data loss
}
```

## Performance Considerations

1. Image Loading
   - Lazy loading
   - Thumbnail generation
   - Progressive loading

2. Storage
   - Compression
   - Size limits
   - Cleanup

3. UI
   - Debounced search
   - Virtual scrolling
   - Cached thumbnails

4. Memory
   - URL.revokeObjectURL
   - Canvas cleanup
   - Event listener cleanup 