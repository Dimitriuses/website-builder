# Component-Based Website Builder

A simple but powerful static site generator that lets you build websites using reusable components and JSON configuration files.

## Project Structure

```
website-builder/
├── build.js                    (Build script)
├── config.json                 (Global site configuration)
├── package.json
├── components/                 (Reusable HTML components)
│   ├── _layout.html           (Base page layout)
│   ├── header.html            (Site header/navigation)
│   ├── footer.html            (Site footer)
│   └── hero.html              (Hero section)
├── pages/                      (Page configurations + content)
│   ├── index.json             (Home page config)
│   ├── index.html             (Home page content - easy to edit!)
│   ├── about.json             (About page config)
│   └── about.html             (About page content - easy to edit!)
├── assets/                     (Static files)
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── images/
└── build/                      (Generated - ready to deploy!)
    ├── index.html
    ├── about.html
    └── assets/
```

## How It Works

1. **Components** - Reusable HTML snippets with variable placeholders
2. **Pages** - JSON files that define page content and which components to use
3. **Build Script** - Combines components + content → complete HTML pages
4. **Variables** - Use `{{VAR_NAME}}` anywhere for dynamic content

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org/ if needed.

### 2. Build Your Site
```bash
node build.js
```

### 3. Deploy
Upload the `build/` folder to Netlify Drop or any static host.

## Creating Components

Components are HTML files in `components/` folder. They can include variable placeholders.

**Example: components/card.html**
```html
<div class="card">
  <img src="{{IMAGE}}" class="card-img-top" alt="{{TITLE}}">
  <div class="card-body">
    <h5 class="card-title">{{TITLE}}</h5>
    <p class="card-text">{{DESCRIPTION}}</p>
    <a href="{{LINK}}" class="btn btn-primary">{{BUTTON_TEXT}}</a>
  </div>
</div>
```

## Creating Pages

Pages are JSON files in `pages/` folder that define the page structure.

**Example: pages/services.json**
```json
{
  "page": "services",
  "title": "Our Services",
  "description": "What we offer",
  "layout": "_layout",
  "components": [
    {
      "name": "hero",
      "vars": {
        "HERO_TITLE": "Our Services",
        "HERO_SUBTITLE": "Excellence in everything we do",
        "HERO_BUTTON_TEXT": "Get Started",
        "HERO_BUTTON_LINK": "contact.html"
      }
    }
  ]
}
```

## Page Content: Two Options

### Option 1: Separate HTML File (Recommended)

Create a matching `.html` file next to your `.json` file:

**pages/services.json:**
```json
{
  "page": "services",
  "title": "Our Services",
  "description": "What we offer",
  "layout": "_layout",
  "components": [
    {
      "name": "hero",
      "vars": { "HERO_TITLE": "Our Services" }
    }
  ]
}
```

**pages/services.html:**
```html
<div class="container my-5">
  <h2>What We Offer</h2>
  <p>This is much easier to edit than JSON!</p>
  
  <div class="row">
    <div class="col-md-6">
      <h3>Service 1</h3>
      <p>No need to escape quotes or worry about line breaks.</p>
    </div>
    <div class="col-md-6">
      <h3>Service 2</h3>
      <p>Just write HTML normally!</p>
    </div>
  </div>
</div>
```

**Benefits:**
- ✅ Much easier to edit HTML
- ✅ No JSON escaping needed
- ✅ Better syntax highlighting in editors
- ✅ Can use multi-line content naturally

### Option 2: Inline in JSON

You can also put content directly in the JSON file:

```json
{
  "page": "services",
  "title": "Our Services",
  "content": "<div class=\"container my-5\">\n  <h2>Content here</h2>\n</div>"
}
```

**Use this when:**
- Content is very short
- You want everything in one file

### Content Priority

If both exist, the build script will:
1. Check for `pages/pagename.html` - use this if found
2. Otherwise, use `content` from JSON file
3. If neither exists, only components are shown

**Page Configuration Options:**
- `page` - Output filename (without .html)
- `title` - Page title (appears in `<title>` tag)
- `description` - Meta description
- `layout` - Which layout component to use (usually `_layout`)
- `components` - Array of components to include
- `content` - Custom HTML content
- `head_extra` - Extra HTML for `<head>` section (optional)
- `body_extra` - Extra HTML before `</body>` (optional)

## Global Variables

These are automatically available in ALL components:

- `{{SITE_NAME}}` - From config.json
- `{{SITE_DESCRIPTION}}` - From config.json
- `{{SITE_URL}}` - From config.json
- `{{CONTACT_EMAIL}}` - From config.json
- `{{CONTACT_PHONE}}` - From config.json
- `{{YEAR}}` - Current year (auto-generated)
- `{{PAGE_TITLE}}` - Current page title
- `{{PAGE_DESCRIPTION}}` - Current page description

## Global Configuration

Edit `config.json` to change site-wide settings:

```json
{
  "site": {
    "name": "My Website",
    "description": "A beautiful website",
    "url": "https://mywebsite.com",
    "contact": {
      "email": "info@mywebsite.com",
      "phone": "+1 (555) 123-4567"
    }
  },
  "build": {
    "output_dir": "build",
    "components_dir": "components",
    "pages_dir": "pages",
    "assets_dir": "assets"
  }
}
```

## Workflow Examples

### Adding a New Page

**1. Create the JSON config:**

`pages/contact.json`:
```json
{
  "page": "contact",
  "title": "Contact Us",
  "description": "Get in touch",
  "layout": "_layout",
  "components": []
}
```

**2. Create the HTML content:**

`pages/contact.html`:
```html
<div class="container my-5">
  <h1>Contact Us</h1>
  
  <div class="row">
    <div class="col-md-6">
      <form>
        <div class="mb-3">
          <label class="form-label">Name</label>
          <input type="text" class="form-control">
        </div>
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control">
        </div>
        <div class="mb-3">
          <label class="form-label">Message</label>
          <textarea class="form-control" rows="5"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Send</button>
      </form>
    </div>
    <div class="col-md-6">
      <h3>Our Office</h3>
      <p>123 Main Street<br>City, State 12345</p>
      <p>Email: info@example.com<br>Phone: (555) 123-4567</p>
    </div>
  </div>
</div>
```

**3. Add link to navigation:**

Edit `components/header.html` to add the link.

**4. Build:**
```bash
node build.js
```

**5. Deploy:**

Upload `build/` folder to Netlify Drop.

### Creating a Custom Component

1. Create `components/testimonial.html`:
```html
<div class="testimonial">
  <blockquote>
    <p>"{{QUOTE}}"</p>
    <footer>— {{AUTHOR}}, {{COMPANY}}</footer>
  </blockquote>
</div>
```

2. Use it in a page:
```json
{
  "components": [
    {
      "name": "testimonial",
      "vars": {
        "QUOTE": "Amazing service!",
        "AUTHOR": "John Doe",
        "COMPANY": "ACME Corp"
      }
    }
  ]
}
```

### Adding Custom Styles

Edit `assets/css/style.css` - changes are automatically copied to `build/`.

### Adding Images

1. Put images in `assets/images/`
2. Reference them: `<img src="assets/images/photo.jpg">`
3. Images are automatically copied to build folder

## Advanced Features

### Multiple Instances of Same Component

```json
{
  "components": [
    {
      "name": "card",
      "vars": { "TITLE": "Service 1", "DESCRIPTION": "..." }
    },
    {
      "name": "card",
      "vars": { "TITLE": "Service 2", "DESCRIPTION": "..." }
    },
    {
      "name": "card",
      "vars": { "TITLE": "Service 3", "DESCRIPTION": "..." }
    }
  ]
}
```

### Custom Layouts

Create `components/simple-layout.html` for pages that need different structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{PAGE_TITLE}}</title>
</head>
<body>
  {{CONTENT}}
</body>
</html>
```

Then in page config: `"layout": "simple-layout"`

### Injecting Custom Scripts

```json
{
  "page": "gallery",
  "title": "Gallery",
  "body_extra": "<script src=\"https://cdn.jsdelivr.net/npm/lightbox2@2.11.3/dist/js/lightbox.min.js\"></script>",
  "head_extra": "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/lightbox2@2.11.3/dist/css/lightbox.min.css\">"
}
```

## Integrating Your Gallery System

To add your image gallery from the previous project:

1. Copy gallery HTML to `components/gallery-card.html`
2. Create `pages/gallery.json` that uses the component
3. Build and deploy together!

Or keep them separate and link between them:
- Main site: `https://yoursite.netlify.app`
- Gallery: `https://gallery.netlify.app`

## Deployment

### Netlify Drop
```bash
node build.js
# Drag build/ folder to https://app.netlify.com/drop
```

### Netlify CLI
```bash
npm install -g netlify-cli
node build.js
cd build
netlify deploy --prod
```

### GitHub Pages
1. Push project to GitHub
2. Set up GitHub Actions to run `node build.js`
3. Deploy `build/` folder to gh-pages branch

## Tips & Best Practices

✅ **Keep components small and focused** - One component = one purpose  
✅ **Use descriptive variable names** - `{{HERO_TITLE}}` not `{{H1}}`  
✅ **Test locally** - Open `build/index.html` in browser after building  
✅ **Version control** - Git ignore `build/` folder (it's regenerated)  
✅ **Organize components** - Group related components in subfolders  
✅ **Document your variables** - Add comments in components  

## Migrating from Google Sites

1. **Identify sections** - Header, footer, hero, content blocks, etc.
2. **Create components** - One component per section type
3. **Extract content** - Copy text/images from Google Sites
4. **Create pages** - One JSON file per page
5. **Build & test** - Run build script and check output
6. **Deploy** - Upload to Netlify

## Troubleshooting

**"Component not found"**
→ Check component name matches filename (without .html)

**Variables not replaced**
→ Ensure format is exactly `{{VAR_NAME}}` with double braces

**Assets not loading**
→ Paths should be `assets/...` (relative to build root)

**Page not generated**
→ Check JSON syntax in page file (use a JSON validator)

## Examples of What You Can Build

- Personal portfolio
- Business website
- Landing pages
- Documentation sites
- Blogs (with manual post management)
- Product showcases
- Event websites

---

**Pro Tip:** The build folder is completely regenerated each time. Never edit files in `build/` directly - always edit components, pages, or assets!
