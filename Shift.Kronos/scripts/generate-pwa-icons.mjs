import fs from "node:fs";
import path from "node:path";

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="120" fill="#09090B"/>
  <rect x="48" y="48" width="416" height="416" rx="96" fill="url(#paint0_linear)" fill-opacity="0.16"/>
  <path d="M167 122H345L390 168V342L345 390H167L122 342V168L167 122Z" stroke="#A78BFA" stroke-width="22"/>
  <path d="M191 212H321" stroke="#F5F7FB" stroke-width="22" stroke-linecap="round"/>
  <path d="M191 278H286" stroke="#F5F7FB" stroke-width="22" stroke-linecap="round"/>
  <path d="M191 344H247" stroke="#F5F7FB" stroke-width="22" stroke-linecap="round"/>
  <circle cx="334" cy="320" r="48" fill="#8B5CF6"/>
  <path d="M334 294V320L350 336" stroke="#F5F7FB" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="paint0_linear" x1="92" y1="74" x2="436" y2="438" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8B5CF6"/>
      <stop offset="1" stop-color="#34D399"/>
    </linearGradient>
  </defs>
</svg>`;

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAMKGlDQ1BJQ0MgUHJvZmlsZQAAeJztlwdUU9kWx+9fSUiAEFo6gkDVpYg0RERQQAwVxYpYsGHBhV2xd1lQ7LiCgoiiOIiA7jgL4qi44IQVEFzA2AcUQbCC0jv03vP9k5NQCG3Syb13zr33vOee2bNn7nkzk5wJAEAQBEGQv0Y3wAIgCIIgCEL8TQIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8RwIoCIIgCIJ8R/8BykFdbrEegPMAAAAASUVORK5CYII=";

const outputDir = path.join(process.cwd(), "public");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "icon.svg"), svg);

const png = Buffer.from(pngBase64, "base64");

for (const filename of ["icon-192.png", "icon-512.png", "apple-icon.png", "maskable-icon.png"]) {
  fs.writeFileSync(path.join(outputDir, filename), png);
}
