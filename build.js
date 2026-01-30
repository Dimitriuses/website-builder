const fs = require('fs');
const path = require('path');

// Configuration
const COMPONENTS_DIR = 'components';
const PAGES_DIR = 'pages';
const BUILD_DIR = 'build';
const ASSETS_DIR = 'assets';
const CONFIG_FILE = 'config.json';
const DATABASE_FILE = 'shared/database.json';

// Load site configuration
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// Load database configuration for collections
let database = { collections: [] };
if (fs.existsSync(DATABASE_FILE)) {
  database = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
}

// Flatten config for easier variable replacement
// Support both flat and nested config formats
function flattenConfig(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenConfig(value, prefix + key + '_'));
    } else {
      // Use uppercase with prefix for nested keys
      const flatKey = (prefix + key).toUpperCase();
      flattened[flatKey] = value;
    }
  }
  
  return flattened;
}

// Create both flat and original config
const flatConfig = flattenConfig(config);

// Also add common aliases for convenience
flatConfig.SITE_NAME = flatConfig.SITE_NAME || config.site?.name || 'My Website';
flatConfig.SITE_DESCRIPTION = flatConfig.SITE_DESCRIPTION || config.site?.description || '';
flatConfig.SITE_URL = flatConfig.SITE_URL || config.site?.url || '';
flatConfig.CONTACT_EMAIL = flatConfig.CONTACT_EMAIL || config.site?.contact?.email || '';
flatConfig.CONTACT_PHONE = flatConfig.CONTACT_PHONE || config.site?.contact?.phone || '';
flatConfig.YEAR = flatConfig.YEAR || new Date().getFullYear().toString();
flatConfig.COMPANY_NAME = flatConfig.COMPANY_NAME || flatConfig.SITE_NAME;

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper function to load component from folder structure
function loadComponent(componentName) {
  // Handle sub-components (e.g., faqItem, productCard)
  // These are stored in the parent component's folder
  const subComponentMappings = {
    'faqItem': 'faq',
    'productCard': 'products',
    'header-light': 'header',
    'header-dark': 'header'
  };
  
  let componentDir;
  let fileName = componentName;
  
  if (subComponentMappings[componentName]) {
    // Sub-component - look in parent folder
    componentDir = path.join(COMPONENTS_DIR, subComponentMappings[componentName]);
  } else {
    // Regular component
    componentDir = path.join(COMPONENTS_DIR, componentName);
  }
  
  // Try with exact filename first
  let componentFile = path.join(componentDir, `${fileName}.html`);
  
  if (fs.existsSync(componentFile)) {
    return fs.readFileSync(componentFile, 'utf8');
  }
  
  // Try without folder (for layout)
  componentFile = path.join(COMPONENTS_DIR, `${componentName}.html`);
  if (fs.existsSync(componentFile)) {
    return fs.readFileSync(componentFile, 'utf8');
  }
  
  throw new Error(`Component not found: ${componentName}`);
}

// Helper function to replace variables in template
function replaceVariables(template, vars) {
  let result = template;
  
  Object.entries(vars).forEach(([key, value]) => {
    // Skip arrays - they should be handled by component build scripts
    if (Array.isArray(value)) {
      return;
    }
    
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

// Function to build a single component
function buildComponent(componentName, vars = {}) {
  // Check if component has a build script
  const componentDir = path.join(COMPONENTS_DIR, componentName);
  const buildScriptPath = path.join(componentDir, `${componentName}.build.js`);
  
  if (fs.existsSync(buildScriptPath)) {
    // Component has custom build logic
    const absolutePath = path.resolve(buildScriptPath);
    delete require.cache[absolutePath]; // Clear cache to allow rebuilds
    
    const buildScript = require(absolutePath);
    return buildScript.build(vars, loadComponent, replaceVariables);
  }
  
  // Standard template replacement
  const template = loadComponent(componentName);
  return replaceVariables(template, vars);
}

// Function to build a page
function buildPage(pageConfig, pageName) {
  const pageData = typeof pageConfig === 'string' 
    ? JSON.parse(fs.readFileSync(pageConfig, 'utf8'))
    : pageConfig;
  
  // Load layout
  const layout = loadComponent(pageData.layout || '_layout');
  
  // Build components
  let componentsHtml = '';
  const usedComponents = new Set(); // Track which components have been placed
  
  // Check for component placeholders in HTML content
  let contentHtml = '';
  
  // Try to load content from various sources
  if (pageData.content_file) {
    // Explicit content_file specified
    const pageDir = path.dirname(pageConfig);
    const contentPath = path.join(pageDir, pageData.content_file);
    if (fs.existsSync(contentPath)) {
      contentHtml = fs.readFileSync(contentPath, 'utf8');
    }
  } else if (pageData.content) {
    // Inline content in JSON
    contentHtml = pageData.content;
  } else {
    // Auto-detect: look for HTML file with same name as page
    const pageDir = path.dirname(pageConfig);
    const autoContentPath = path.join(pageDir, `${pageData.page}.html`);
    if (fs.existsSync(autoContentPath)) {
      contentHtml = fs.readFileSync(autoContentPath, 'utf8');
      console.log(`  [CONTENT] Auto-loaded from ${pageData.page}.html`);
    }
  }
  
  if (pageData.components && pageData.components.length > 0) {
    console.log(`  [COMPONENTS] Building ${pageData.components.length} component(s)`);
    
    pageData.components.forEach(comp => {
      const componentHtml = buildComponent(comp.name, comp.vars || {});
      
      // Check if component has a placeholder in content
      const placeholder = `{{COMPONENT:${comp.name}}}`;
      
      if (contentHtml.includes(placeholder)) {
        // Replace placeholder with component
        contentHtml = contentHtml.replace(placeholder, componentHtml);
        usedComponents.add(comp.name);
      } else if (!usedComponents.has(comp.name)) {
        // No placeholder found and not used yet - add to top
        componentsHtml += componentHtml + '\n';
        usedComponents.add(comp.name);
      }
    });
  }
  
  // Combine components and content
  const mainContent = componentsHtml + contentHtml;
  
  // Build header based on theme
  const headerMode = pageData.header_theme || 'light';
  // const headerTemplate = headerMode === 'dark' ? 'header-dark' : 'header-light';
  const headerHtml = buildComponent("header", flatConfig);
  
  // Build footer
  const footerHtml = buildComponent('footer', flatConfig);
  
  // Collect all CSS files (including page-specific)
  const cssFiles = collectComponentCSS(pageData.components || [], pageData.page);
  const cssLinks = cssFiles.map(file => 
    `  <link href="${file}" rel="stylesheet">`
  ).join('\n');
  
  // Collect all JavaScript files (including page-specific)
  const jsFiles = collectComponentJS(pageData.components || [], pageData.page);
  const jsScripts = jsFiles.map(file =>
    `  <script src="${file}"></script>`
  ).join('\n');
  
  // Replace layout variables
  const pageVars = {
    ...flatConfig,  // Spread flatConfig FIRST so it can be overridden
    PAGE_TITLE: pageData.title || flatConfig.SITE_NAME,
    PAGE_DESCRIPTION: pageData.description || flatConfig.SITE_DESCRIPTION,
    SITE_NAME: flatConfig.SITE_NAME,
    HEADER: headerHtml,
    CONTENT: mainContent,
    FOOTER: footerHtml,
    HEADER_MODE: headerMode,
    HEAD_EXTRA: cssLinks,
    BODY_EXTRA: jsScripts
  };
  
  const finalHtml = replaceVariables(layout, pageVars);
  
  // Write output
  const outputFile = path.join(BUILD_DIR, `${pageData.page}.html`);
  fs.writeFileSync(outputFile, finalHtml);
  
  console.log(`[BUILD] ${pageData.page}.html - "${pageData.title}"`);
}

// Function to collect CSS files for components and pages
function collectComponentCSS(components, pageName) {
  const cssFiles = ['assets/css/global.css']; // Always include global
  const addedComponents = new Set();
  
  // Add CSS for header and footer (always present)
  cssFiles.push('assets/css/header.css');
  cssFiles.push('assets/css/footer.css');
  addedComponents.add('header');
  addedComponents.add('footer');
  
  // Add CSS for each component used
  if (components) {
    components.forEach(comp => {
      if (!addedComponents.has(comp.name)) {
        const componentDir = path.join(COMPONENTS_DIR, comp.name);
        const cssFile = path.join(componentDir, 'style.css');
        
        if (fs.existsSync(cssFile)) {
          cssFiles.push(`assets/css/${comp.name}.css`);
          addedComponents.add(comp.name);
        }
      }
    });
  }
  
  // Add page-specific CSS if it exists
  if (pageName) {
    // Check for page-specific CSS in pages folder structure
    // Try both the page folder and generated pages folder
    const pageFolders = [
      path.join(PAGES_DIR, pageName),
      path.join(PAGES_DIR, '_generators'),
      // Handle generated product pages (e.g., product-product-001)
      pageName.startsWith('product-') ? path.join(PAGES_DIR, '_product-detail') : null
    ].filter(Boolean);
    
    for (const pageFolder of pageFolders) {
      const pageCssFile = path.join(pageFolder, 'style.css');
      if (fs.existsSync(pageCssFile)) {
        // Use page name for the CSS file in build
        const cssFileName = pageName.startsWith('product-') ? 'product-detail' : pageName;
        cssFiles.push(`assets/css/pages/${cssFileName}.css`);
        break;
      }
    }
  }
  
  return cssFiles;
}

// Function to collect JavaScript files for components and pages
function collectComponentJS(components, pageName) {
  const jsFiles = ['assets/js/global.js']; // Always include global utilities
  const addedComponents = new Set();
  
  // Add JS for header (always present)
  jsFiles.push('assets/js/header.js');
  addedComponents.add('header');
  
  // Add JS for each component used
  if (components) {
    components.forEach(comp => {
      if (!addedComponents.has(comp.name)) {
        const componentDir = path.join(COMPONENTS_DIR, comp.name);
        const jsFile = path.join(componentDir, 'script.js');
        
        if (fs.existsSync(jsFile)) {
          jsFiles.push(`assets/js/${comp.name}.js`);
          addedComponents.add(comp.name);
        }
      }
    });
  }
  
  // Add page-specific JS if it exists
  if (pageName) {
    // Check for page-specific JS in pages folder structure
    const pageFolders = [
      path.join(PAGES_DIR, pageName),
      path.join(PAGES_DIR, '_generators'),
      // Handle generated product pages
      pageName.startsWith('product-') ? path.join(PAGES_DIR, '_product-detail') : null
    ].filter(Boolean);
    
    for (const pageFolder of pageFolders) {
      const pageJsFile = path.join(pageFolder, 'script.js');
      if (fs.existsSync(pageJsFile)) {
        // Use page name for the JS file in build
        const jsFileName = pageName.startsWith('product-') ? 'product-detail' : pageName;
        jsFiles.push(`assets/js/pages/${jsFileName}.js`);
        break;
      }
    }
  }
  
  return jsFiles;
}

// Function to copy component CSS to build
function copyComponentCSS() {
  const buildCSSDir = path.join(BUILD_DIR, 'assets', 'css');
  const buildPagesCSSDir = path.join(BUILD_DIR, 'assets', 'css', 'pages');
  
  // Ensure CSS directories exist
  if (!fs.existsSync(buildCSSDir)) {
    fs.mkdirSync(buildCSSDir, { recursive: true });
  }
  if (!fs.existsSync(buildPagesCSSDir)) {
    fs.mkdirSync(buildPagesCSSDir, { recursive: true });
  }
  
  // Copy global CSS
  const globalCSS = path.join(ASSETS_DIR, 'css', 'global.css');
  if (fs.existsSync(globalCSS)) {
    fs.copyFileSync(globalCSS, path.join(buildCSSDir, 'global.css'));
  }
  
  // Copy component CSS
  const componentsWithCSS = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  componentsWithCSS.forEach(compName => {
    const cssFile = path.join(COMPONENTS_DIR, compName, 'style.css');
    if (fs.existsSync(cssFile)) {
      fs.copyFileSync(cssFile, path.join(buildCSSDir, `${compName}.css`));
    }
  });
  
  // Copy page-specific CSS
  function copyPageCSS(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        const pageCSSFile = path.join(dir, entry.name, 'style.css');
        if (fs.existsSync(pageCSSFile)) {
          // For _product-detail, name it product-detail.css
          const cssFileName = entry.name.replace(/^_/, '') + '.css';
          fs.copyFileSync(pageCSSFile, path.join(buildPagesCSSDir, cssFileName));
        }
      }
    });
  }
  
  copyPageCSS(PAGES_DIR);
}

// Function to copy component JavaScript to build
function copyComponentJS() {
  const buildJSDir = path.join(BUILD_DIR, 'assets', 'js');
  const buildPagesJSDir = path.join(BUILD_DIR, 'assets', 'js', 'pages');
  
  // Ensure JS directories exist
  if (!fs.existsSync(buildJSDir)) {
    fs.mkdirSync(buildJSDir, { recursive: true });
  }
  if (!fs.existsSync(buildPagesJSDir)) {
    fs.mkdirSync(buildPagesJSDir, { recursive: true });
  }
  
  // Copy global JS
  const globalJS = path.join(ASSETS_DIR, 'js', 'global.js');
  if (fs.existsSync(globalJS)) {
    fs.copyFileSync(globalJS, path.join(buildJSDir, 'global.js'));
  }
  
  // Copy component JS
  const componentsWithJS = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  componentsWithJS.forEach(compName => {
    const jsFile = path.join(COMPONENTS_DIR, compName, 'script.js');
    if (fs.existsSync(jsFile)) {
      fs.copyFileSync(jsFile, path.join(buildJSDir, `${compName}.js`));
    }
  });
  
  // Copy page-specific JS
  function copyPageJS(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        const pageJSFile = path.join(dir, entry.name, 'script.js');
        if (fs.existsSync(pageJSFile)) {
          // For _product-detail, name it product-detail.js
          const jsFileName = entry.name.replace(/^_/, '') + '.js';
          fs.copyFileSync(pageJSFile, path.join(buildPagesJSDir, jsFileName));
        }
      }
    });
  }
  
  copyPageJS(PAGES_DIR);
}

// Function to copy collections (products, custom items, etc.) based on database.json
function copyCollections() {
  if (!database.collections || database.collections.length === 0) {
    console.log('[COLLECTIONS] No collections configured in database.json');
    return;
  }
  
  const enabledCollections = database.collections.filter(c => c.enabled);
  
  if (enabledCollections.length === 0) {
    console.log('[COLLECTIONS] No enabled collections found');
    return;
  }
  
  console.log(`[COLLECTIONS] Found ${enabledCollections.length} enabled collection(s)`);
  
  enabledCollections.forEach(collection => {
    const sourcePath = collection.source;
    const destPath = path.join(BUILD_DIR, collection.destination);
    
    if (fs.existsSync(sourcePath)) {
      copyDirectory(sourcePath, destPath);
      console.log(`  [FOLDER] ${collection.name}: ${sourcePath} → ${collection.destination}`);
    } else {
      console.log(`  [ERROR] ${collection.name}: Source not found (${sourcePath})`);
    }
  });
  
  console.log('');
}

// Main build process
console.log('========================================');
console.log('Starting website build process...');
console.log(`Time: ${new Date().toLocaleString()}`);
console.log('========================================\n');

const buildStart = Date.now();

// Clean build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Copy assets (excluding CSS and JS which we handle separately)
copyDirectory(path.join(ASSETS_DIR, 'images'), path.join(BUILD_DIR, ASSETS_DIR, 'images'));
console.log(`[ASSETS] Copied images to ${BUILD_DIR}/${ASSETS_DIR}/`);

// Copy component CSS and JS
copyComponentCSS();
console.log(`[CSS] Component styles copied to ${BUILD_DIR}/${ASSETS_DIR}/css/`);

copyComponentJS();
console.log(`[JS] Component scripts copied to ${BUILD_DIR}/${ASSETS_DIR}/js/\n`);

// Copy collections (products, custom items, etc.) from shared folder
copyCollections();

// Execute page build scripts (for generating dynamic pages)
const generatorsDir = path.join(PAGES_DIR, '_generators');
if (fs.existsSync(generatorsDir)) {
  const pageBuildScripts = fs.readdirSync(generatorsDir)
    .filter(f => f.endsWith('.build.js'));

  if (pageBuildScripts.length > 0) {
    console.log(`[PAGE-SCRIPTS] Found ${pageBuildScripts.length} page build script(s)\n`);
    
    pageBuildScripts.forEach(scriptFile => {
      try {
        const scriptPath = path.resolve(path.join(generatorsDir, scriptFile));
        delete require.cache[scriptPath];
        
        const pageScript = require(scriptPath);
        
        if (pageScript.generateProductPages && typeof pageScript.generateProductPages === 'function') {
          pageScript.generateProductPages();
        }
        
      } catch (error) {
        console.error(`[ERROR] Page build script ${scriptFile} failed:`, error.message);
      }
    });
    
    console.log('');
  }
}

// Build all pages
const pageFiles = [];

// Recursively find all .json files in pages directory
function findPageFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findPageFiles(fullPath);
    } else if (entry.name.endsWith('.json')) {
      pageFiles.push(fullPath);
    }
  });
}

findPageFiles(PAGES_DIR);

console.log(`[PAGES] Found ${pageFiles.length} page(s) to build\n`);

let pagesBuilt = 0;
pageFiles.forEach(pageFile => {
  try {
    const pageName = path.basename(pageFile, '.json');
    buildPage(pageFile, pageName);
    pagesBuilt++;
  } catch (error) {
    console.error(`[ERROR] Failed to build ${pageFile}:`, error.message);
  }
});

const buildTime = ((Date.now() - buildStart) / 1000).toFixed(2);

console.log('\n========================================');
console.log('Build completed successfully');
console.log(`Output directory: ${BUILD_DIR}/`);
console.log(`Pages built: ${pagesBuilt}`);
console.log(`Build time: ${buildTime}s`);
console.log('========================================\n');
