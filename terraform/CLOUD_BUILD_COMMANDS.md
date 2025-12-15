# Cloud Build Trigger - Quick Command Reference

## Deploy Terraform Configuration

```bash
cd ~/personal/motorscope/terraform/environments/dev
terraform init -upgrade
terraform apply -lock=false
```

## Set Webhook Secret

```bash
# Generate secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Webhook Secret: $WEBHOOK_SECRET"

# Store in Secret Manager
echo -n "$WEBHOOK_SECRET" | \
  gcloud secrets versions add github-webhook-secret \
    --project=motorscope-dev \
    --data-file=-
```

## Get Webhook Configuration Details

```bash
cd ~/personal/motorscope/terraform/environments/dev

# Get webhook URL
terraform output github_webhook_url

# Get all outputs
terraform output
```

## GitHub Webhook Configuration

**Repository Settings URL:**
```
https://github.com/pbuchman/motorscope/settings/hooks
```

**Webhook Settings:**
- Payload URL: `<from terraform output>`
- Content type: `application/json`
- Secret: `<WEBHOOK_SECRET>`
- SSL verification: Enabled
- Events: Just the push event
- Active: ✅

## Test the Trigger

### Manual Test
```bash
gcloud builds triggers run motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1 \
  --branch=development
```

### Automatic Test (Push)
```bash
cd ~/personal/motorscope
git checkout development
git add .
git commit -m "Test CI/CD trigger"
git push origin development
```

## Monitor Builds

```bash
# List ongoing builds
gcloud builds list --project=motorscope-dev --ongoing

# List all recent builds
gcloud builds list --project=motorscope-dev --limit=10

# View specific build logs
gcloud builds log BUILD_ID --project=motorscope-dev

# Stream logs from latest build
gcloud builds log $(gcloud builds list --project=motorscope-dev --limit=1 --format='value(id)') \
  --project=motorscope-dev \
  --stream
```

## Verify Configuration

```bash
# List triggers
gcloud builds triggers list --project=motorscope-dev

# Describe trigger
gcloud builds triggers describe motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1

# Check IAM permissions
gcloud projects get-iam-policy motorscope-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:cloudbuild" \
  --format="table(bindings.role)"
```

## Set Other Secrets (if not done yet)

```bash
# JWT Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
    --project=motorscope-dev \
    --data-file=-

# OAuth Client ID
echo -n "YOUR_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id \
    --project=motorscope-dev \
    --data-file=-

# Extension Origin
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension \
    --project=motorscope-dev \
    --data-file=-
```

## Troubleshooting

```bash
# Check GitHub webhook deliveries
# Go to: https://github.com/pbuchman/motorscope/settings/hooks
# Click on the webhook → "Recent Deliveries" tab

# Check trigger configuration
gcloud builds triggers describe motorscope-api-deploy-dev \
  --project=motorscope-dev \
  --region=europe-west1

# View Cloud Build service account
gcloud iam service-accounts describe \
  $(gcloud projects describe motorscope-dev --format='value(projectNumber)')@cloudbuild.gserviceaccount.com \
  --project=motorscope-dev

# Test webhook manually (requires webhook secret)
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=YOUR_SIGNATURE" \
  -d '{"ref":"refs/heads/development","pusher":{"name":"pbuchman"}}' \
  $(terraform output -raw github_webhook_url)
```

