# Cloud Build GitHub Integration - Complete Setup

## Step 1: Install GitHub App (One-time, 5 minutes)

1. **Go to Cloud Build GitHub App page:**
   ```
   https://console.cloud.google.com/cloud-build/triggers/connect?project=motorscope-dev
   ```

2. **Click "CONNECT REPOSITORY"**

3. **Select "GitHub (Cloud Build GitHub App)"**

4. **Click "CONTINUE"** → **"AUTHENTICATE"**

5. **Authorize with GitHub** → Select `pbuchman/motorscope`

6. **Click "CONNECT"**

7. **DO NOT create trigger yet - click "DONE"**

## Step 2: Get Connection Details

After connecting, get the installation ID:

```bash
# List connections
gcloud builds connections list --project=motorscope-dev --region=europe-west1

# Get installation ID from GitHub
# Go to: https://github.com/settings/installations
# Click on "Google Cloud Build" → Note the installation ID from URL
```

## Step 3: Configure Terraform Variables

Add to `/terraform/environments/dev/terraform.tfvars`:

```hcl
# GitHub App Configuration (get from Step 2)
github_app_installation_id   = "YOUR_INSTALLATION_ID"
github_token_secret_version  = "projects/motorscope-dev/secrets/github-token/versions/latest"
```

## Step 4: Create GitHub Token Secret

```bash
# Create Personal Access Token on GitHub
# Go to: https://github.com/settings/tokens/new
# Scopes needed: repo (full control)

# Store in Secret Manager
echo -n "YOUR_GITHUB_PAT" | \
  gcloud secrets create github-token \
    --project=motorscope-dev \
    --replication-policy="automatic" \
    --data-file=-
```

## Step 5: Apply Terraform

```bash
cd ~/personal/motorscope/terraform/environments/dev
terraform init
terraform apply -lock=false
```

This will:
- Create GitHub connection (link to existing)
- Create repository resource
- Create Cloud Build trigger

## Alternative: Simpler Approach Without GitHub App Variables

If the above seems complex, we can use a hybrid approach where Terraform creates the trigger but references a manually created connection.

Would you like me to implement the simpler hybrid approach instead?

