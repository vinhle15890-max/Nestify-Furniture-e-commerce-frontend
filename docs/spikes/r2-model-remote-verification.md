# R2 model remote verification

Status: `REMOTE_BACKEND_DEPLOYMENT_REQUIRED`

The development-only route is `/__dev/r2-model`. The local frontend uses the
existing `VITE_API_BASE_URL`; this workspace's `.env.local` points it at
`https://api.nestify.asia/api`. Model uploads use the existing authenticated
`POST /admin/uploads` client path with multipart fields `kind=model` and
`file=<GLB>`. No R2 credential is sent to Vite or the browser.

## Deployment and browser verification

1. Deploy the backend changes to the remote server.
2. Confirm the server has `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET`, `R2_ENDPOINT`, and
   `R2_PUBLIC_BASE_URL=https://models.nestify.asia`.
3. Confirm the R2/custom-domain CORS allowlist includes the exact local origin
   `http://localhost:1309`.
4. Start the frontend with `npm run dev -- --host localhost --port 1309`.
5. Log in as an admin with `manage_products` or `manage_categories`, then open
   `http://localhost:1309/__dev/r2-model`.
6. Upload `../fixtures/sofa.glb` using **Upload GLB qua remote API**.
7. Record the returned `https://models.nestify.asia/...glb` URL.
8. In DevTools Network, confirm the public GET succeeds and its response allows
   the local origin (no browser CORS error).
9. Confirm the evidence panel shows `FETCH_OK` and `PARSE_OK`.
10. Record `MESH_COUNT` and `COMPUTED_BOUNDS` from the evidence panel.
11. Visually confirm the expected L-shaped sofa renders.
12. Confirm `RENDER` is `MODEL_RENDERED` and is not `FALLBACK_RENDERED`.

Do not claim runtime upload or model rendering success until the backend branch
has been deployed and these browser steps have completed.
