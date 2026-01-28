const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Directories
const COMPONENTS_DIR = config.build.components_dir;
const PAGES_DIR = config.build.pages_dir;
const BUILD_DIR = config.build.output_dir;
const ASSETS_DIR = config.build.assets_dir;

// Global variables that can be used in any component
const globalVars = {
  SITE_NAME: config.site.name,
  SITE_DESCRIPTION: config.site.description,
  SITE_URL: config.site.url,
  CONTACT_EMAIL: config.site.contact.email,
  CONTACT_PHONE: config.site.contact.phone,
  YEAR: new Date().getFullYear().toString()
};

// Clean and create build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Load a component file
function loadComponent(componentName) {
  const componentPath = path.join(COMPONENTS_DIR, `${componentName}.html`);
  
  if (!fs.existsSync(componentPath)) {
    console.warn(`[WARNING] Component not found: ${componentName}`);
    return '';
  }
  
  return fs.readFileSync(componentPath, 'utf8');
}

// Replace variables in a string
function replaceVariables(content, vars) {
  let result = content;
  
  // Replace all variables in the format {{VAR_NAME}}
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    
    // Check if value is an array (for repeating sections)
    if (Array.isArray(value)) {
      // For arrays, we'll handle them specially in components
      // For now, just skip them in basic replacement
      continue;
    }
    
    result = result.replace(regex, value || '');
  }
  
  return result;
}

// Build a component with variables
function buildComponent(componentName, vars = {}) {
  let componentContent = loadComponent(componentName);
  const allVars = { ...globalVars, ...vars };
  
  // Check if component has a custom build script
  const buildScriptPath = path.join(COMPONENTS_DIR, `${componentName}.build.js`);
  
  if (fs.existsSync(buildScriptPath)) {
    // Component has custom build script - use it
    try {
      // Get absolute path for require
      const absoluteBuildScriptPath = path.resolve(buildScriptPath);
      
      // Clear require cache to get fresh version
      delete require.cache[absoluteBuildScriptPath];
      
      const componentBuilder = require(absoluteBuildScriptPath);
      
      if (componentBuilder.build && typeof componentBuilder.build === 'function') {
        // Call the component's build function
        return componentBuilder.build(allVars, loadComponent, replaceVariables);
      }
    } catch (error) {
      console.error(`[ERROR] Build script failed for ${componentName}:`, error.message);
      // Fall back to standard template replacement
    }
  }
  
  // Standard component (no build script) - just replace variables
  return replaceVariables(componentContent, allVars);
}

// Build a complete page
function buildPage(pageConfig, pageFileName) {
  // Load layout
  const layout = loadComponent(pageConfig.layout || '_layout');
  
  // Build header (use custom header if specified, otherwise use default)
  const headerComponent = pageConfig.header || 'header';
  const navbarStyle = pageConfig.header_theme || pageConfig.navbar_style || 'light';
  const header = buildComponent(headerComponent, { NAVBAR_STYLE: navbarStyle });
  
  // Build footer (always included)
  const footer = buildComponent('footer');
  
  // Build custom components for this page
  const componentMap = {}; // Store components by name for placeholder replacement
  
  if (pageConfig.components && pageConfig.components.length > 0) {
    console.log(`  [COMPONENTS] Building ${pageConfig.components.length} component(s)`);
    for (const comp of pageConfig.components) {
      const componentHtml = buildComponent(comp.name, comp.vars || {});
      // Store in map for later use
      componentMap[comp.name] = componentHtml;
    }
  }
  
  // Load content from separate HTML file or inline from JSON
  let mainContent = '';
  let htmlContent = '';
  const usedComponents = new Set(); // Track which components are used in placeholders
  
  // Check if there's a separate HTML file for content
  const htmlFileName = pageFileName.replace('.json', '.html');
  const htmlFilePath = path.join(PAGES_DIR, htmlFileName);
  
  if (fs.existsSync(htmlFilePath)) {
    // Load content from separate HTML file
    htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    console.log(`  [CONTENT] Loaded from ${htmlFileName}`);
  } else if (pageConfig.content) {
    // Use inline content from JSON
    htmlContent = pageConfig.content;
  }
  
  // Find which components are used as placeholders in the HTML
  for (const name of Object.keys(componentMap)) {
    const placeholder = `{{COMPONENT:${name}}}`;
    if (htmlContent.includes(placeholder)) {
      usedComponents.add(name);
    }
  }
  
  // Add components that are NOT used as placeholders to the top
  for (const [name, html] of Object.entries(componentMap)) {
    if (!usedComponents.has(name)) {
      mainContent += html;
    }
  }
  
  // Now replace component placeholders in HTML content
  for (const [name, html] of Object.entries(componentMap)) {
    const placeholder = `{{COMPONENT:${name}}}`;
    htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), html);
  }
  
  // Add the HTML content after the auto-placed components
  mainContent += htmlContent;
  
  // Page-specific variables
  const pageVars = {
    ...globalVars,
    PAGE_TITLE: pageConfig.title,
    PAGE_DESCRIPTION: pageConfig.description,
    HEADER_MODE: pageConfig.header_theme || 'light', // 'light' or 'dark'
    HEADER: header,
    FOOTER: footer,
    CONTENT: mainContent,
    HEAD_EXTRA: pageConfig.head_extra || '',
    BODY_EXTRA: pageConfig.body_extra || ''
  };
  
  // Replace all variables in layout
  return replaceVariables(layout, pageVars);
}

// Main build process
const buildStartTime = Date.now();

console.log('========================================');
console.log('Starting website build process...');
console.log(`Time: ${new Date().toLocaleString()}`);
console.log('========================================\n');

// Copy assets to build directory
if (fs.existsSync(ASSETS_DIR)) {
  copyDirectory(ASSETS_DIR, path.join(BUILD_DIR, ASSETS_DIR));
  console.log(`[ASSETS] Copied to ${BUILD_DIR}/${ASSETS_DIR}/`);
}

// Copy products to build directory
const PRODUCTS_DIR = 'products';
if (fs.existsSync(PRODUCTS_DIR)) {
  copyDirectory(PRODUCTS_DIR, path.join(BUILD_DIR, PRODUCTS_DIR));
  console.log(`[PRODUCTS] Copied to ${BUILD_DIR}/${PRODUCTS_DIR}/`);
}

// Copy custom to build directory
const CUSTOM_DIR = 'custom';
if (fs.existsSync(CUSTOM_DIR)) {
  copyDirectory(CUSTOM_DIR, path.join(BUILD_DIR, CUSTOM_DIR));
  console.log(`[CUSTOM] Copied to ${BUILD_DIR}/${CUSTOM_DIR}/`);
}

// Execute page build scripts (for generating dynamic pages)
const pageBuildScripts = fs.readdirSync(PAGES_DIR)
  .filter(f => f.endsWith('.build.js'));

if (pageBuildScripts.length > 0) {
  console.log(`[PAGE-SCRIPTS] Found ${pageBuildScripts.length} page build script(s)\n`);
  
  pageBuildScripts.forEach(scriptFile => {
    try {
      const scriptPath = path.resolve(path.join(PAGES_DIR, scriptFile));
      delete require.cache[scriptPath]; // Clear cache
      
      const pageScript = require(scriptPath);
      
      // Check for generateProductPages or other generation functions
      if (pageScript.generateProductPages && typeof pageScript.generateProductPages === 'function') {
        pageScript.generateProductPages();
      }
      
    } catch (error) {
      console.error(`[ERROR] Page build script ${scriptFile} failed:`, error.message);
    }
  });
  
  console.log('');
}

// Build all pages
const pageFiles = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.json'));

if (pageFiles.length === 0) {
  console.error('[ERROR] No pages found in pages/ directory');
  process.exit(1);
}

console.log(`[PAGES] Found ${pageFiles.length} page(s) to build\n`);

pageFiles.forEach(pageFile => {
  try {
    // Load page configuration
    const pageConfig = JSON.parse(
      fs.readFileSync(path.join(PAGES_DIR, pageFile), 'utf8')
    );
    
    // Build the page HTML
    const html = buildPage(pageConfig, pageFile);
    
    // Write to build directory
    const outputFile = `${pageConfig.page}.html`;
    fs.writeFileSync(path.join(BUILD_DIR, outputFile), html);
    
    console.log(`[BUILD] ${outputFile} - "${pageConfig.title}"`);
  } catch (error) {
    console.error(`[ERROR] Failed to build ${pageFile}:`, error.message);
  }
});

const buildEndTime = Date.now();
const buildDuration = ((buildEndTime - buildStartTime) / 1000).toFixed(2);

console.log('\n========================================');
console.log('Build completed successfully');
console.log(`Output directory: ${BUILD_DIR}/`);
console.log(`Pages built: ${pageFiles.length}`);
console.log(`Build time: ${buildDuration}s`);
console.log('========================================');
