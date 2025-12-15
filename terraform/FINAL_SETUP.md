# Cloud Build Trigger - Final Setup (Personal GitHub Account)

## Prerequisites Completed ✅
- ✅ Terraform configured for dev environment
- ✅ All infrastructure deployed (Firestore, Cloud Run, etc.)
- ✅ Cloud Build module ready

## Step 1: Connect GitHub App (2 minutes, ONE TIME)

**Important:** This works with personal GitHub accounts - no enterprise needed!

1. **Open Cloud Build Triggers:**
   ```
   https://console.cloud.google.com/cloud-build/triggers/connect?project=motorscope-dev
   ```

2. **Click "CONNECT REPOSITORY"**

3. **Select "GitHub (Cloud Build GitHub App)"**
   - This is the FREE option that works with personal accounts
   - No enterprise features required

4. **Click "CONTINUE"** → **"AUTHENTICATE"**

5. **Authorize Google Cloud Build app** on GitHub
   - You'll be redirected to GitHub
   - Click "Authorize Google Cloud Build"
   - Select **`pbuchman/motorscope`** repository

6. **Click "CONNECT"**

7. **Click "DONE"** (do NOT create a trigger manually)

## Step 2: Apply Terraform

Now that GitHub is connected, Terraform can create the trigger:

```bash
cd ~/personal/motorscope/terraform/environments/dev
terraform init
terraform apply -lock=false
```

Expected output:
```
Plan: 1 to add, 0 to change, 0 to destroy

module.motorscope.module.cloud_build.google_cloudbuild_trigger.api_deploy: Creating...
module.motorscope.module.cloud_build.google_cloudbuild_trigger.api_deploy: Creation complete

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:
build_trigger_id = "..."
build_trigger_name = "motorscope-api-deploy-dev"
```

## Step 3: Test the Trigger

```bash
# Make a change to the API
cd ~/personal/motorscope
git checkout development
echo "# Test trigger" >> api/README.md
git add api/README.md
git commit -m "Test Cloud Build trigger"
git push origin development

# Watch the build
gcloud builds list --project=motorscope-dev --ongoing

# View build logs
gcloud builds log $(gcloud builds list --project=motorscope-dev --limit=1 --format='value(id)')
```

## How It Works

1. **You push** to `development` branch
2. **GitHub App** notifies Cloud Build automatically
3. **Trigger checks:** Are files in `api/**`? Is branch `development`?
4. **If YES:** Runs `api/cloudbuild.yaml`
5. **Builds** Docker image
6. **Pushes** to Artifact Registry (`europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api`)
7. **Deploys** to Cloud Run automatically
8. **✅ Done** - new API version live!

## Trigger Configuration

| Setting | Value |
|---------|-------|
| Name | `motorscope-api-deploy-dev` |
| Repository | `pbuchman/motorscope` |
| Branch | `development` |
| Files | `api/**` (only triggers on API changes) |
| Config | `api/cloudbuild.yaml` |
| Region | `europe-west1` |
| Managed by | Terraform |

## Verification Commands

```bash
# List all triggers
gcloud builds triggers list --project=motorscope-dev --region=europe-west1

# Describe the trigger
gcloud builds triggers describe motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1

# Manual trigger test
gcloud builds triggers run motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1 \
  --branch=development
```

## Troubleshooting

### "Error 400: Request contains an invalid argument"
**Solution:** Complete Step 1 first - GitHub must be connected before Terraform can create the trigger.

### "Repository not found"
**Solution:** Ensure you connected `pbuchman/motorscope` in Step 1, not a different repository.

### "Trigger doesn't fire on push"
**Check:**
- Branch is `development` (not `main`)
- Files changed are in `api/` directory
- Trigger is enabled (check in Cloud Console)

### "Build fails"
**Check logs:**
```bash
gcloud builds log BUILD_ID --project=motorscope-dev
```

Common issues:
- Missing secrets (run setup in DEPLOYMENT.md)
- Docker image build errors (check Dockerfile)
- IAM permissions (should be set by Terraform)

## Summary

✅ **No enterprise** GitHub account needed  
✅ **Free** Cloud Build GitHub App integration  
✅ **Automatic** builds on push to `development`  
✅ **Managed** by Terraform  
✅ **Only triggers** on `api/**` file changes  

## Ready to Deploy

Complete Step 1 (connect GitHub), then run Step 2 (`terraform apply`).

The setup is simple and works with personal GitHub accounts! 🚀

