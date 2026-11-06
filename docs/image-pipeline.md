# Image pipeline

Image production and delivery share `packages/server/src/config/image-policy.json`.
The browser, SSR, upload CLI and metadata backfill use the pure functions in
`packages/fe/utils/image-core.cjs`. No credentials belong in either file.

## Produce

Use `uploadImage(file, app, preset)` from `@utils/oss` for website images.

| Preset | WebP quality | Maximum width |
| --- | --- | --- |
| cover | 90 | 2500 |
| body | 85 | 1920 |
| trash | 90 | 2500 |
| avatar | 90 | 1024 |

These retain the existing upload settings. Keep the aspect ratio, respect EXIF
orientation, and never upscale. Preserve GIF and SVG originals. Transparent
images retain alpha. Verify the encoder output signature and MIME type; a
browser that cannot encode WebP returns a truthfully named PNG instead.

Generate dimensions and ThumbHash from the prepared image **before** requesting
an upload signature. Return `filePath#w=…&h=…&th=…` only after upload succeeds.
Consumers and saved content must retain that complete URL. The fragment is local
metadata and is not sent to OSS. Keep any other fragment fields.

Uploads also send the generated metadata through `X-Image-Metadata` on the
signing request. The server validates this optional header and signs
`x-oss-meta-width`, `x-oss-meta-height` and `x-oss-meta-thumbhash` into PUT headers
or exact POST policy conditions. Header names live in the shared policy.
Browser and CLI upload every returned metadata header/field. Keeping this out
of the request body preserves compatibility with older strict API servers;
those servers still upload successfully, but need the new backend release to
persist object metadata. Release the backend before or with the frontend.

`MUCAA/tools/hong97_oss_image_meta_backfill.mjs` inspects a manifest of images
referenced by production and test databases. It decodes actual source bytes
before preparing a metadata-only self-copy. Apply requires an exact verified
dry-run snapshot, compares the original ETag/metadata, and checks preservation
of bytes' ETag/length, content/cache headers, ACL, storage class and custom
metadata. It retains tags and does not change image URLs or encoded bytes.

`uploadFile2Oss` remains the general file upload entry point. It preserves image
bytes, corrects misleading raster extensions/MIME types, and adds metadata for
images; non-image files pass through. Do not publish content after an image
upload fails. Multi-image retry retains successful uploads.

Root users use signed PUT uploads; standard users use the existing constrained
POST policy. Both retain the canonical immutable Cache-Control header. Upload
permissions, limits and signing remain server-owned.

The local authoring CLI `MUCAA/tools/blog_media_upload.py` reads the same policy
and metadata functions. `--max-width` overrides width; legacy `--max-edge`
explicitly limits both axes. Maintenance tool
`MUCAA/tools/hong97_image_meta_backfill.mjs` defaults to dry-run, supports draft
covers/content and optional avatars, and requires a verified backup label for
apply. Updates compare original field values to avoid overwriting concurrent
edits. It appends metadata without rewriting source images or other fields.

## Consume

Use `components/common/SiteImage.tsx`; page wrappers own layout and interaction.
It uses official `next/image` with the shared custom OSS loader. Next generates
`srcset` and `sizes`; the browser selects a variant for rendered width and DPR.
OSS performs orientation, width reduction and WebP delivery at quality 90.
Requests go straight to the existing bucket/CDN, without `/_next/image` or
application-server image transcoding. Width is capped by the source metadata.

Pass truthful `sizes` for the layout; shared cover/body/thumbnail defaults are
in the policy. Small thumbnails still need enough pixels for retina displays.
Use known intrinsic dimensions or `fill` inside the existing positioned parent.
Legacy images without dimensions retain native natural sizing.

ThumbHash becomes a small inline blur placeholder during SSR; displaying it
does not wait for an effect, a canvas, or a source-image request. Clear it once
the image loads, including cached images and transparent images. Below-fold
gallery/Trash visibility gates remain in their existing wrappers. Covers and
the first Trash rows load immediately.

`fadeIn` is an optional `SiteImage` prop, disabled by default and currently
enabled only by `BlogCoverImage`. The decoded image fades over an unchanged
ThumbHash layer for 200 ms. Remove the layer after the fade, including for
transparent images; cached images, source changes, fallback and reduced motion
are handled. No animation library or delayed image download is involved.
`noscript` keeps the original image visible without JavaScript.

Gallery containers must have a definite width before image bytes arrive.
`ImagesV2` fixes the carousel wrapper to its existing full content width and,
when dimensions are known, reserves the anchor's aspect ratio while rendering
the image with `fill`. A dormant image, active download and decoded image then
occupy exactly the same space; image intrinsic size cannot resize the page.

Only unsigned HTTPS URLs at the configured OSS host are transformed. Existing
OSS styles, signed links, GIF/SVG, other hosts and relative resources pass through.
If a generated variant fails, retry the original once, then propagate the error
to the existing fallback UI. `preserveOriginal` also explicitly bypasses variants.
Lightboxes and Live Photo playback keep original source URLs.

Plain Markdown images map to `MarkdownImage` through `mdx-components.tsx`.
The shared `remark-images.cjs` plugin also maps literal MDX `<img>` elements to
that adapter in static MDX, dynamic article rendering and editor previews.
The adapter preserves authored sizes/HTML attributes. An authored `srcSet`
uses the shared component's native compatibility branch and remains intact.
Registration avatar previews use `SiteImage` too; the Radix `AvatarImage`
primitive has no remaining application callers.
Dimension-less legacy galleries read lightbox dimensions from `SiteImage`'s
actual load event instead of creating a second image to probe the original URL.

## Regression

Run `node --test packages/fe/tests/performance-regressions.test.cjs`, frontend and
backend builds, and the relevant server tests. Browser verification must cover:

- Cover upload, draft save/reload, body file picker and clipboard paste.
- Avatar selection/crop/save/reload, Trash publish/retry, general file upload.
- Root PUT and standard-user POST permissions and immutable headers.
- Slow/failed images, SSR placeholders, cached images, transparency, EXIF,
  animation/vector preservation, external/signed links and non-image files.
- Desktop/mobile DPR, unchanged layout, carousels, original lightboxes, Live
  Photo playback, and LAN login/reload/navigation/token recovery/logout.

The isolated fixtures and auditable results for this consolidation live under
`MUCAA/output/hong97-unified-images-20261106`; fixture pages, proxy credentials
and test upload interception are never part of the application release.
