# Products Directory

This folder contains all your products. Each product has its own subfolder.

## Structure

```
products/
├── product-001/
│   ├── product.json    ← Product details
│   └── image.jpg       ← Product photo
├── product-002/
│   ├── product.json
│   └── image.png
└── product-003/
    ├── product.json
    └── photo.jpg
```

## Adding a New Product

### 1. Create Folder
```bash
mkdir products/my-product
```

### 2. Add Image
Copy your product image (preferably 800x800px):
```bash
cp photo.jpg products/my-product/
```

### 3. Create product.json
```json
{
  "name": "Product Name",
  "description": "Short description of the product.",
  "price": "$XX.XX",
  "link": "product.html?id=my-product"
}
```

### 4. Rebuild
```bash
node build.js
```

## Image Requirements

- **Format:** JPG, PNG, GIF, or WebP
- **Size:** 800x800px recommended (1:1 ratio)
- **File size:** Under 500KB for best performance
- **Naming:** Any name (e.g., `product.jpg`, `image.png`)

## product.json Fields

- `name` - Product name (required)
- `description` - 2-3 sentence description (required)
- `price` - Price as string, e.g., "$29.99" (required)
- `link` - Link when clicking button (optional)

## Tips

✅ Use consistent image sizes across all products  
✅ Keep folder names URL-friendly (lowercase, hyphens)  
✅ Optimize images before adding (use TinyPNG)  
✅ Keep descriptions concise  

## Example Products

See `product-001/`, `product-002/`, and `product-003/` for examples.

---

For full documentation, see: `PRODUCTS-COMPONENT.md`
