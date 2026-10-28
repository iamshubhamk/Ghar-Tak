# Storage and backups runbook (T1-13, T1-14)

Owner: infrastructure. The human does every Cloudflare, Atlas, Render and GitHub dashboard click and enters the
secrets themselves. **No secret value goes in chat, git, inbox files or logs.**

## 1. Cloudflare R2 (free tier)
1. Sign up at https://dash.cloudflare.com/sign-up (email + password; verify the email). No card is needed for the
   free plan, but R2 asks you to add a payment method to enable R2 (free allowance: 10 GB storage). Note the
   **Account ID** (R2 overview page, right side).
2. R2 → Create bucket → name `ghartak-uploads`, location hint **Asia-Pacific**, keep **public access OFF**.
3. Create a second bucket `ghartak-backups`, public access OFF.
4. On `ghartak-backups` → Settings → Object lifecycle rules → add a rule: delete objects with prefix `daily/`
   after **30 days**.
5. R2 → Manage API tokens → Create API token → permission **Object Read & Write** → apply to the two buckets only
   → create. Copy the **Access Key ID** and **Secret Access Key** once into your password manager.
   (Use a separate token for uploads and for backups if you prefer; the steps below work either way.)

## 2. Where the secrets go
| Secret | Render API service | GitHub repo secrets |
|---|---|---|
| `MONGODB_URL` (prod) | already set | add as `MONGODB_URL` |
| R2 account id / key / secret | add when backend ships the R2 adapter (backend AR-008): names will be in `backend/.env.production.example` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| backup bucket name | n/a | `R2_BACKUP_BUCKET` = `ghartak-backups` |
GitHub: repo → Settings → Secrets and variables → Actions → New repository secret.

## 3. Daily backup
`.github/workflows/backup.yml` runs at 03:00 IST (and on demand: Actions → MongoDB backup → Run workflow). It runs
`mongodump --archive --gzip` against prod and uploads `daily/ghartak-<UTC time>.archive.gz`. Failed runs show red in
GitHub Actions and email the repo owner. It reads prod only; it never writes to it.

## 4. Restore test (do once, then every quarter)
Never restore into prod without the human's OK. Restore into the **staging** database:
```bash
aws s3 cp s3://ghartak-backups/daily/<file> backup.archive.gz --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
mongorestore --uri="$STAGING_MONGODB_URL" --archive=backup.archive.gz --gzip --nsFrom='ghartak.*' --nsTo='ghartak_staging.*'
```
Then start the API with `MONGODB_URL` pointing at staging and check `GET /api/v1/health`, a login and the booking list.

## 5. Staging (free)
Atlas → create a second free cluster is not allowed on M0 (one per project); instead create a **new database
`ghartak_staging` and a separate database user** limited to it on the existing cluster, or a second Atlas project.
Staging API = a second Render free service (`ghartak-api-staging`) with its own `JWT_SECRET_KEY`,
`ENVIRONMENT=staging`, and the staging `MONGODB_URL`.

## 6. Migrating existing uploads
Render's disk is ephemeral, so only files since the last deploy exist. After backend's R2 adapter is live:
run the audit (`python -m scripts.audit_uploads --json`), then copy what remains with `aws s3 sync` to
`ghartak-uploads` under `public/` and `private/`. Nothing is deleted from Render or R2 without the human's OK.
