# Cloud Build Trigger - Simple 2-Step Setup

## Overview
This setup connects GitHub to Cloud Build using Terraform, but requires ONE manual step first.

## Step 1: Connect GitHub (Manual - 2 minutes, ONE TIME)

1. Open this URL:
   ```
   https://console.cloud.google.com/cloud-build/triggers/connect?project=motorscope-dev
   ```

2. Click **"CONNECT REPOSITORY"**

3. Select **"GitHub (Cloud Build GitHub App)"**

4. Click **"CONTINUE"** then **"AUTHENTICATE"**

5. Authorize with GitHub and select **`pbuchman/motorscope`**

6. Click **"CONNECT"**

7. **DO NOT create a trigger** - just click **"DONE"**

That's it! The connection is created.

## Step 2: Apply Terraform (Automatic)

Now Terraform can create the trigger:

```bash
cd ~/personal/motorscope/terraform/environments/dev
terraform init
terraform apply -lock=false
```

This will:
- ✅ Find the GitHub connection you just created
- ✅ Link to the motorscope repository  
- ✅ Create the Cloud Build trigger
- ✅ Configure it to trigger on `development` branch
- ✅ Only trigger on `api/**` file changes

## What Gets Created

- **Connection:** `github-connection` (already exists from Step 1)
- **Repository:** `pbuchman-motorscope` (Terraform references it)
- **Trigger:** `motorscope-api-deploy-dev` (Terraform creates it)

## How It Works

1. Push to `development` branch
2. If files in `api/` changed → trigger fires
3. Cloud Build runs `api/cloudbuild.yaml`
4. Image built, pushed, and deployed to Cloud Run

## Verification

```bash
# List triggers
gcloud builds triggers list --project=motorscope-dev --region=europe-west1

# Test manual trigger
gcloud builds triggers run motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1 \
  --branch=development
```

## Why This Approach?

- ✅ Simple: Only ONE manual step
- ✅ Secure: Uses official GitHub App integration
- ✅ Maintainable: Trigger managed by Terraform
- ✅ No secrets: GitHub App handles authentication
- ✅ No webhooks: Cloud Build manages everything

Ready to proceed with Step 1?

