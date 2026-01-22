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
    console.warn(`⚠️  Component not found: ${componentName}`);
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
  
  // Special handling for FAQ component with items array
  if (componentName === 'faq' && vars.FAQ_ITEMS && Array.isArray(vars.FAQ_ITEMS)) {
    // Generate FAQ items HTML
    let faqItemsHtml = '';
    vars.FAQ_ITEMS.forEach((item, index) => {
      const itemNum = index + 1;
      faqItemsHtml += `
          <!-- FAQ Item ${itemNum} -->
          <div class="accordion-item">
            <h3 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq${itemNum}">
                <span class="faq-icon me-3">
                  <img src="assets/images/faq.svg" alt="?" width="24" height="24">
                </span>
                ${item.question}
              </button>
            </h3>
            <div id="faq${itemNum}" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <div class="accordion-body">
                ${item.answer}
              </div>
            </div>
          </div>
`;
    });
    
    // Replace the FAQ_ITEMS placeholder with generated HTML
    componentContent = componentContent.replace('{{FAQ_ITEMS}}', faqItemsHtml);
  }
  
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
    console.log(`   📄 Loaded content from ${htmlFileName}`);
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
console.log('🚀 Starting website build...\n');

// Copy assets to build directory
if (fs.existsSync(ASSETS_DIR)) {
  copyDirectory(ASSETS_DIR, path.join(BUILD_DIR, ASSETS_DIR));
  console.log(`📦 Copied assets to ${BUILD_DIR}/${ASSETS_DIR}/`);
}

// Build all pages
const pageFiles = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.json'));

if (pageFiles.length === 0) {
  console.error('❌ No pages found in pages/ directory');
  process.exit(1);
}

console.log(`📄 Building ${pageFiles.length} pages:\n`);

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
    
    console.log(`✅ ${outputFile} - "${pageConfig.title}"`);
  } catch (error) {
    console.error(`❌ Error building ${pageFile}:`, error.message);
  }
});

console.log('\n✨ Build complete!');
console.log(`📦 Website ready in "${BUILD_DIR}" folder`);
console.log(`🌐 Upload the "${BUILD_DIR}" folder to Netlify Drop`);
