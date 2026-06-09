---
name: store-image
description: Use when implementing any Go Mama workflow that stores, uploads, caches, generates, imports, or persists image files for places, events, profiles, app assets, ingestion photos, hero photos, avatars, or admin-uploaded media. Always upload the image to the project's public Vercel Blob store first, then save the returned public blob URL in Supabase or app data.
---

# Store Image

Use Vercel Blob as the source of truth for image storage. Do not store raw image bytes, local filesystem paths, temporary `/public` paths, base64 strings, Google photo refs, or third-party hotlinks in the database when the image is meant to be durable in the app.

## Required Flow

1. Identify the image source: browser upload, local/generated file, external source image, Google Places photo proxy, or imported seed/ingestion image.
2. Choose the destination folder:
   - `places/` for place hero photos, place gallery photos, Google Places imported images.
   - `events/` for event photos and calendar/imported event images.
   - `profiles/` for user/mom profile photos and avatars.
   - `img/` for app-owned static/editorial images that are not tied to a specific place, event, or profile.
3. Upload to Vercel Blob using the read-write token from `BLOB_READ_WRITE_TOKEN` or the configured Vercel Blob env var. Never hardcode tokens or store IDs in code.
4. Use `access: 'public'` because the app expects public image URLs.
5. Persist only the returned `blob.url` in Supabase or source data. Do not construct the public URL manually, even though public Blob URLs include the store id.
6. If the database write fails after the upload, log the orphaned blob pathname/URL so it can be deleted or retried.

## Path Rules

Use stable, URL-safe pathnames:

```txt
places/{place-slug}/{purpose}-{timestamp-or-hash}.{ext}
events/{event-slug}/{purpose}-{timestamp-or-hash}.{ext}
profiles/{profile-id}/{purpose}-{timestamp-or-hash}.{ext}
img/{purpose}-{timestamp-or-hash}.{ext}
```

Rules:

- Lowercase path segments.
- Replace whitespace and punctuation with `-`.
- Preserve the real extension when known: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`.
- Prefer `.webp` for generated/compressed raster images when the app code controls encoding.
- Use `addRandomSuffix: true` for user uploads or repeated imports unless deterministic overwrite is explicitly required.
- Use `allowOverwrite: true` only for intentional replacements of the same logical app asset.

## Server Upload Pattern

Use server uploads for generated images, ingestion images, admin tools, and files already available to server-side code.

If `@vercel/blob` is not installed and code implementation is required, add it to `package.json` with the project package manager.

```js
import { put } from '@vercel/blob';

export async function uploadPublicImage({ pathname, body, contentType }) {
  const blob = await put(pathname, body, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}
```

Server uploads are appropriate only when the request body fits Vercel Function limits. For larger browser uploads, use the client upload flow.

## Client Upload Pattern

Use client uploads when a browser user uploads a larger image or when uploading directly from the client avoids sending file bytes through the app server.

Guardrails:

- Client code must use `@vercel/blob/client`.
- The server token exchange endpoint must authenticate/authorize the user before issuing an upload token.
- Limit `allowedContentTypes` to image MIME types actually supported by the UI.
- Use `onUploadCompleted` to validate completion and update Supabase with the returned URL.
- Never expose `BLOB_READ_WRITE_TOKEN` to browser code.

Allowed content types by default:

```js
[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]
```

## Database Writes

Upload first, then write the returned public URL to the relevant DB field.

Common Go Mama targets:

- Places: `places.hero_photo` for the selected hero image; `place_photos.url` for gallery/blob-backed images.
- Events: event image/photo field used by the events API/admin surface.
- Profiles: profile/avatar/photo URL fields only after user authorization.
- Static app images: store the blob URL in config/data only when the asset must be remotely managed; otherwise repo-owned static assets may stay in `public/`.

For ingestion, keep source provenance separately from the blob URL. The external source URL or Google photo reference is provenance; the Vercel Blob URL is the app-renderable image.

## Security And Review

- Never commit `BLOB_READ_WRITE_TOKEN`, store IDs, service-role keys, or `.env` values.
- Validate the file is an image before upload. Check MIME type and, when possible, magic bytes.
- Avoid uploading untrusted SVG unless the app has a reason to support it and sanitization is handled.
- Do not upload private user images until the user has permission to publish/use them in the app.
- Keep service-role Supabase writes server-side only.
- When importing from third-party URLs, respect source terms and avoid scraping private/authenticated content.

## Verification

After implementation:

1. Run a small upload against the intended folder.
2. Confirm the returned `blob.url` loads publicly.
3. Confirm the database row contains the blob URL, not a local path or source-only URL.
4. Confirm the app renders the image from the saved URL.
5. Run the smallest relevant test/build command for touched files.
