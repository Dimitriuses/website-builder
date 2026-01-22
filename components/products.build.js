// Products Component Build Script
// Scans product folders and builds product cards

const fs = require('fs');
const path = require('path');

/**
 * Build the Products component
 * @param {object} vars - Component variables
 * @param {function} loadComponent - Function to load component files
 * @param {function} replaceVariables - Function to replace variables in template
 * @returns {string} - Compiled HTML
 */
function build(vars, loadComponent, replaceVariables) {
  const productsDir = vars.PRODUCTS_DIR || 'products';
  const buttonText = vars.BUTTON_TEXT || 'View Details';
  
  // Load the productCard template
  const productCardTemplate = loadComponent('productCard');
  
  // Build products HTML
  let productsHtml = '';
  
  // Check if products directory exists
  if (!fs.existsSync(productsDir)) {
    console.log(`  [PRODUCTS] Directory not found: ${productsDir}`);
    productsHtml = '<div class="col-12"><p class="text-center text-muted">No products available</p></div>';
  } else {
    // Get all subdirectories in products folder
    const productFolders = fs.readdirSync(productsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (productFolders.length === 0) {
      console.log(`  [PRODUCTS] No product folders found in ${productsDir}/`);
      productsHtml = '<div class="col-12"><p class="text-center text-muted">No products available</p></div>';
    } else {
      console.log(`  [PRODUCTS] Found ${productFolders.length} product(s)`);
      
      // Process each product folder
      productFolders.forEach(folderName => {
        const productPath = path.join(productsDir, folderName);
        const configPath = path.join(productPath, 'product.json');
        
        // Check if product.json exists
        if (!fs.existsSync(configPath)) {
          console.log(`  [WARNING] No product.json in ${folderName}/`);
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
            console.log(`  [WARNING] No images found in ${folderName}/`);
            return;
          }
          
          // Build carousel images HTML
          let carouselImagesHtml = '';
          imageFiles.forEach((imageFile, index) => {
            const imagePath = `${productsDir}/${folderName}/${imageFile}`;
            const activeClass = index === 0 ? 'active' : '';
            carouselImagesHtml += `
          <div class="carousel-item ${activeClass}">
            <img src="${imagePath}" class="d-block w-100 product-image" alt="${productConfig.name || 'Product'}">
          </div>`;
          });
          
          // Build carousel controls (only if multiple images)
          let carouselControlsHtml = '';
          if (imageFiles.length > 1) {
            carouselControlsHtml = `
        <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${folderName}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carousel-${folderName}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
        <div class="carousel-indicators">
          ${imageFiles.map((_, i) => `<button type="button" data-bs-target="#carousel-${folderName}" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ''}></button>`).join('')}
        </div>`;
          }
          
          // Prepare product card variables
          const cardVars = {
            PRODUCT_ID: folderName,
            CAROUSEL_IMAGES: carouselImagesHtml,
            CAROUSEL_CONTROLS: carouselControlsHtml,
            PRODUCT_NAME: productConfig.name || 'Untitled Product',
            PRODUCT_DESCRIPTION: productConfig.description || '',
            PRODUCT_PRICE: productConfig.price || 'Price not available',
            PRODUCT_LINK: `product-${folderName}.html`, // Link to generated product page
            BUTTON_TEXT: buttonText
          };
          
          // Build the product card
          const cardHtml = replaceVariables(productCardTemplate, cardVars);
          productsHtml += cardHtml + '\n';
          
        } catch (error) {
          console.log(`  [ERROR] Failed to process ${folderName}:`, error.message);
        }
      });
    }
  }
  
  // Add the generated products to vars
  vars.PRODUCTS_HTML = productsHtml;
  
  // Load and return the main products component
  const productsTemplate = loadComponent('products');
  return replaceVariables(productsTemplate, vars);
}

module.exports = { build };