# Project Checklist

## Core Functionality

### 1. Image Addition
- [x] Can images be added using the file input?
- [x] Can images be added via drag and drop?
- [x] Are duplicates handled correctly (preventing adding the exact same image file)?

### 2. IndexedDB Storage
- [x] Is the file handle stored correctly in IndexedDB?
- [x] Is the extracted metadata (tEXt chunks) stored correctly?
- [x] Are thumbnails generated and stored (if applicable)?
- [x] Does the storage usage update correctly?

### 3. Gallery Display
- [x] Are added images displayed in the gallery?
- [x] Are thumbnails used for the initial display?
- [x] Does lazy loading work correctly (if implemented)?

### 4. Image Interaction
- [x] Can individual images be deleted from the gallery and IndexedDB?
- [x] Does selecting an image display its details correctly?
- [ ] Can multiple images be selected and tagged simultaneously?

### 5. Metadata Handling
- [x] Is PNG metadata (tEXt chunks) parsed and displayed correctly?
- [ ] Does the filtering/search based on metadata work as expected?
- [ ] Display a list of all unique metadata keywords found across all images in the gallery.

### 6. Error Handling
- [x] What happens when trying to add non-PNG files?
- [x] Are errors during file reading or IndexedDB operations handled gracefully?
- [ ] Is there a mechanism to handle potential IndexedDB storage limits?

### 7. UI State
- [ ] Do loading indicators appear during lengthy operations?
- [ ] Are buttons/controls enabled/disabled appropriately based on the state? 