import test from "node:test";
import assert from "node:assert/strict";
import {
  SCENE_SNAPSHOTS_BUCKET,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  dataUrlToBlob,
  getSignedSceneSnapshotUrl,
} from "../src/lib/supabase/storage.ts";

test("Phase 12 Storage: Configuration constraints and limits", () => {
  assert.equal(SCENE_SNAPSHOTS_BUCKET, "scene-snapshots");
  assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024); // 5 MB
  assert.deepEqual(ALLOWED_IMAGE_MIME_TYPES, ["image/jpeg", "image/png", "image/webp"]);
});

test("Phase 12 Storage: dataUrlToBlob converts base64 image data to Blob correctly", () => {
  // 1x1 transparent PNG data URL
  const samplePngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const result = dataUrlToBlob(samplePngDataUrl);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.blob instanceof Blob, true);
  assert.equal(result.blob.type, "image/png");
  assert.equal(result.blob.size > 0, true);
});

test("Phase 12 Storage: dataUrlToBlob throws on malformed data URLs", () => {
  assert.throws(
    () => dataUrlToBlob("not-a-valid-data-url"),
    /Invalid data URL format/
  );
});

test("Phase 12 Storage: getSignedSceneSnapshotUrl passes through data URLs and web URLs directly", async () => {
  const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const resolvedDataUrl = await getSignedSceneSnapshotUrl(null, dataUrl);
  assert.equal(resolvedDataUrl, dataUrl);

  const webUrl = "https://images.unsplash.com/photo-sample";
  const resolvedWebUrl = await getSignedSceneSnapshotUrl(null, webUrl);
  assert.equal(resolvedWebUrl, webUrl);

  const emptyResult = await getSignedSceneSnapshotUrl(null, "");
  assert.equal(emptyResult, null);
});

