class ImageToPDFGenerator {
    constructor() {
        this.selectedImages = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.generateBtn = document.getElementById('generatePDF');
        this.clearBtn = document.getElementById('clearAll');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
    }

    bindEvents() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // File input change
        this.imageInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button events
        this.generateBtn.addEventListener('click', this.generatePDF.bind(this));
        this.clearBtn.addEventListener('click', this.clearAll.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = {
                        file: file,
                        dataURL: e.target.result,
                        name: file.name
                    };
                    this.selectedImages.push(imageData);
                    this.renderImagePreview();
                    this.updateGenerateButton();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    renderImagePreview() {
        this.imagePreview.innerHTML = '';
        this.selectedImages.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${image.dataURL}" alt="${image.name}">
                <button class="remove-btn" onclick="generator.removeImage(${index})">×</button>
                <div class="image-name">${image.name}</div>
            `;
            this.imagePreview.appendChild(imageItem);
        });
    }

    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.renderImagePreview();
        this.updateGenerateButton();
    }

    updateGenerateButton() {
        this.generateBtn.disabled = this.selectedImages.length === 0;
    }

    clearAll() {
        this.selectedImages = [];
        this.imagePreview.innerHTML = '';
        this.imageInput.value = '';
        this.updateGenerateButton();
        this.hideProgress();
    }

    async generatePDF() {
        if (this.selectedImages.length === 0) return;

        this.showProgress();

        try {
            const { jsPDF } = window.jspdf;

            // Get options
            const filename = document.getElementById('filename').value || 'images-document';
            const pageSize = document.getElementById('pageSize').value;
            const orientation = document.getElementById('orientation').value;
            const quality = parseFloat(document.getElementById('quality').value);
            const fitToPage = document.getElementById('fitToPage').checked;
            const maintainAspectRatio = document.getElementById('maintainAspectRatio').checked;

            // Create PDF
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: pageSize
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;

            for (let i = 0; i < this.selectedImages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                const img = this.selectedImages[i];
                this.updateProgress((i / this.selectedImages.length) * 100, `Processing ${img.name}...`);

                try {
                    // Load image to get dimensions
                    const imgElement = new Image();
                    await new Promise((resolve) => {
                        imgElement.onload = resolve;
                        imgElement.src = img.dataURL;
                    });

                    let imgWidth = imgElement.width;
                    let imgHeight = imgElement.height;

                    if (fitToPage) {
                        const availableWidth = pageWidth - (2 * margin);
                        const availableHeight = pageHeight - (2 * margin);

                        if (maintainAspectRatio) {
                            const aspectRatio = imgWidth / imgHeight;

                            if (imgWidth > imgHeight) {
                                imgWidth = availableWidth;
                                imgHeight = availableWidth / aspectRatio;

                                if (imgHeight > availableHeight) {
                                    imgHeight = availableHeight;
                                    imgWidth = availableHeight * aspectRatio;
                                }
                            } else {
                                imgHeight = availableHeight;
                                imgWidth = availableHeight * aspectRatio;

                                if (imgWidth > availableWidth) {
                                    imgWidth = availableWidth;
                                    imgHeight = availableWidth / aspectRatio;
                                }
                            }
                        } else {
                            imgWidth = availableWidth;
                            imgHeight = availableHeight;
                        }
                    } else {
                        // Convert pixels to mm (rough conversion)
                        imgWidth = imgWidth * 0.264583;
                        imgHeight = imgHeight * 0.264583;
                    }

                    // Center the image on the page
                    const x = (pageWidth - imgWidth) / 2;
                    const y = (pageHeight - imgHeight) / 2;

                    pdf.addImage(img.dataURL, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
                } catch (error) {
                    console.error(`Error processing ${img.name}:`, error);
                }
            }

            this.updateProgress(100, 'Generating PDF...');

            // Save the PDF
            pdf.save(`${filename}.pdf`);

            setTimeout(() => {
                this.hideProgress();
                this.showSuccessMessage();
            }, 500);

        } catch (error) {
            console.error('Error generating PDF:', error);
            this.hideProgress();
            alert('Error generating PDF. Please try again.');
        }
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.generateBtn.disabled = true;
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
        this.generateBtn.disabled = false;
        this.updateProgress(0, '');
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = text;
    }

    showSuccessMessage() {
        const originalText = this.generateBtn.textContent;
        this.generateBtn.textContent = '✅ PDF Generated Successfully!';
        this.generateBtn.style.background = 'linear-gradient(45deg, #43e97b, #38f9d7)';

        setTimeout(() => {
            this.generateBtn.textContent = originalText;
            this.generateBtn.style.background = 'linear-gradient(45deg, #4facfe, #00f2fe)';
        }, 3000);
    }
}

// Initialize the application
const generator = new ImageToPDFGenerator();

// Add some utility functions
document.addEventListener('DOMContentLoaded', function () {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});
