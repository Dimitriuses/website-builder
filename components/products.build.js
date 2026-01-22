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
          
          // Find the first image in the folder
          const files = fs.readdirSync(productPath);
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
          const imageFile = files.find(file => 
            imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
          );
          
          if (!imageFile) {
            console.log(`  [WARNING] No image found in ${folderName}/`);
            return;
          }
          
          // Build image path relative to build output
          const imagePath = `${productsDir}/${folderName}/${imageFile}`;
          
          // Prepare product card variables
          const cardVars = {
            IMAGE_PATH: imagePath,
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
