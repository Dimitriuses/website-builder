// Product Pages Build Script
// Automatically generates a page for each product

const fs = require('fs');
const path = require('path');

/**
 * Generate product detail pages
 * This script is called during the build process to create individual pages for each product
 */
function generateProductPages() {
  const productsDir = 'build/custom';
  const pagesDir = 'pages';
  const templateFile = path.join(pagesDir, '_product-detail', '_custom-detail-template.html');
  
  console.log('[CUSTOM-PAGES] Generating individual product pages...');
  
  // Check if products directory exists
  if (!fs.existsSync(productsDir)) {
    console.log('[CUSTOM-PAGES] No products directory found, skipping...');
    return [];
  }

  // Check if template exists
  if (!fs.existsSync(templateFile)) {
    console.log('[CUSTOM-PAGES] Template not found, skipping...');
    return [];
  }

  // Load the template
  const template = fs.readFileSync(templateFile, 'utf8');

  // Get all product folders
  const productFolders = fs.readdirSync(productsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const generatedPages = [];

  productFolders.forEach(folderName => {
    const productPath = path.join(productsDir, folderName);
    const configPath = path.join(productPath, 'product.json');

    // Skip if no product.json
    if (!fs.existsSync(configPath)) {
      return;
    }

    try {
      // Load product configuration
      const productConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Find all images in the folder
      const files = fs.readdirSync(productPath);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const imageFiles = files.filter(file =>
        imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );

      if (imageFiles.length === 0) {
        console.log(`  [WARNING] No images in ${folderName}/`);
        return;
      }

      // Build carousel slides
      let carouselSlidesHtml = '';

      // Remove 'build/' prefix from path for HTML output
      const htmlPath = productsDir.replace(/^build\//, '');
      imageFiles.forEach((imgFile, index) => {
        const imgPath = `${htmlPath}/${folderName}/${imgFile}`;
        const activeClass = index === 0 ? 'active' : '';
        carouselSlidesHtml += `
            <div class="carousel-item ${activeClass}">
              <img src="${imgPath}" class="d-block w-100" alt="${productConfig.name}">
            </div>`;
      });

      // Build carousel controls (only if multiple images)
      let carouselControlsHtml = '';
      if (imageFiles.length > 1) {
        carouselControlsHtml = `
          <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
          </button>
          <div class="carousel-indicators">
            ${imageFiles.map((_, i) => 
              `<button type="button" data-bs-target="#productCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active" aria-current="true"' : ''}></button>`
            ).join('')}
          </div>`;
      }

      // Generate thumbnail gallery HTML
      let thumbnailsHtml = '';
      if (imageFiles.length > 1) {
        imageFiles.forEach((imgFile, index) => {
          const imgPath = `${htmlPath}/${folderName}/${imgFile}`;
          thumbnailsHtml += `
            <img src="${imgPath}" alt="${productConfig.name}" class="thumbnail-image" data-bs-target="#productCarousel" data-bs-slide-to="${index}">
          `;
        });
      }

      // Create page configuration object
      const pageConfig = {
        page: `product-${folderName}`,
        title: productConfig.name || 'Product',
        description: productConfig.description || '',
        layout: '_layout',
        header_theme: 'dark',
        components: [
          {"name": "contactIcons"}
        ],
        content: template
          .replace(/{{CAROUSEL_SLIDES}}/g, carouselSlidesHtml)
          .replace(/{{CAROUSEL_CONTROLS}}/g, carouselControlsHtml)
          .replace(/{{PRODUCT_NAME}}/g, productConfig.name || 'Untitled Product')
          .replace(/{{PRODUCT_PRICE}}/g, productConfig.price || 'Price not available')
          .replace(/{{PRODUCT_DESCRIPTION}}/g, productConfig.description || 'No description available')
          .replace(/{{PRODUCT_DETAILS}}/g, productConfig.details || productConfig.description || 'No additional details available')
          .replace(/{{THUMBNAIL_IMAGES}}/g, thumbnailsHtml)
      };

      // Write the page JSON file
      const pageJsonPath = path.join(pagesDir, '_generators', `_generated-product-${folderName}.json`);
      fs.writeFileSync(pageJsonPath, JSON.stringify(pageConfig, null, 2));

      generatedPages.push(pageJsonPath);

      console.log(`  [CUSTOM-PAGES] Generated page for ${folderName}`);

    } catch (error) {
      console.log(`  [ERROR] Failed to generate page for ${folderName}:`, error.message);
    }
  });

  console.log(`[CUSTOM-PAGES] Generated ${generatedPages.length} product page(s)`);
  return generatedPages;
}

module.exports = { generateProductPages };